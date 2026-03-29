import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import type { PlannedMeal, GeneratedRecipe, UserProfile, PlanRequest } from './schemas.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('recipe-generator');

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const MODEL = 'gpt-4.1';
const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIM = 1024;
const MAX_CONCURRENT_DAYS = 7;

// ---------------------------------------------------------------------------
// RAG: fetch user taste profile from comment embeddings
// ---------------------------------------------------------------------------

async function fetchTasteContext(
  supabase: SupabaseClient,
  userId: string,
  apiKey: string,
): Promise<string> {
  try {
    const embResp = await fetch(OPENAI_EMBED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: 'What foods does this user enjoy? What are their taste preferences, favorite flavors, and cooking style?',
        dimensions: EMBED_DIM,
      }),
    });

    if (!embResp.ok) {
      log.warn('Taste profile embedding failed', { status: embResp.status });
      return '';
    }

    const embJson = (await embResp.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    const queryEmb = embJson.data[0].embedding;

    const { data, error } = await supabase.rpc('match_embeddings', {
      query_embedding: `[${queryEmb.join(',')}]`,
      p_user_id: userId,
      p_namespace: 'user_comments',
      p_match_count: 5,
      p_match_threshold: 0.3,
    });

    if (error || !data || (data as unknown[]).length === 0) {
      return '';
    }

    const chunks = data as Array<{ content_text: string; similarity: number }>;
    return chunks
      .map((c) => c.content_text)
      .join('\n');
  } catch (err) {
    log.warn('Taste context retrieval failed', { error: String(err) });
    return '';
  }
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

function buildUserContextBlock(
  profile: UserProfile,
  request: PlanRequest,
  tasteNotes: string,
): string {
  const parts: string[] = [];

  if (profile.cooking_skill) {
    parts.push(`Cooking skill level: ${profile.cooking_skill}`);
  }
  parts.push(`Cooking time preference: ${request.cooking_time_pref}`);

  if (request.max_prep_time_min) {
    parts.push(`Maximum prep time per meal: ${request.max_prep_time_min} minutes`);
  }

  const cuisines = request.cuisine_preferences.length > 0
    ? request.cuisine_preferences
    : profile.cuisine_preferences;
  if (cuisines.length > 0) {
    parts.push(`Preferred cuisines: ${cuisines.join(', ')}`);
  }

  if (profile.allergies.length > 0) {
    parts.push(`ALLERGIES (NEVER include these): ${profile.allergies.join(', ')}`);
  }
  if (profile.dietary_restrictions.length > 0) {
    parts.push(`Dietary restrictions: ${profile.dietary_restrictions.join(', ')}`);
  }

  if (tasteNotes) {
    parts.push(`\nUser taste notes (from past comments):\n${tasteNotes}`);
  }

  return parts.join('\n');
}

interface DayMealInput {
  slot: string;
  ingredients: Array<{ name: string; amount_g: number }>;
}

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  pl: 'Polish (polski)',
  de: 'German (Deutsch)',
  es: 'Spanish (español)',
  fr: 'French (français)',
  it: 'Italian (italiano)',
  pt: 'Portuguese (português)',
};

function buildDayPrompt(
  dayNumber: number,
  meals: DayMealInput[],
  userContext: string,
  locale: string,
): string {
  const mealDescriptions = meals
    .map((m) => {
      const ingList = m.ingredients
        .map((i) => `  - ${i.name}: ${i.amount_g}g`)
        .join('\n');
      return `### ${m.slot}\n${ingList}`;
    })
    .join('\n\n');

  const langLabel = LOCALE_LABELS[locale] ?? LOCALE_LABELS['en'];
  const langInstruction = locale !== 'en'
    ? `\nLANGUAGE: Write ALL recipe names, instructions, and presentation tips in ${langLabel}. Ingredient names in the input are from USDA (English) — translate them naturally in instructions. Meal slot keys (breakfast, lunch, etc.) must stay in English.`
    : '';

  return `You are a professional chef and nutritionist creating recipes for a personalized diet plan.

USER CONTEXT:
${userContext}
${langInstruction}

DAY ${dayNumber} — INGREDIENT ASSIGNMENTS:
${mealDescriptions}

INSTRUCTIONS:
For each meal slot above, generate a cohesive recipe that uses the listed ingredients with the specified amounts.
You may suggest minimal additional seasonings/herbs/spices (salt, pepper, olive oil, garlic, etc.) but do NOT add significant caloric ingredients.
The recipe must be practical and delicious.

Respond with ONLY valid JSON — no markdown fences, no commentary.
The JSON must be an array of objects, one per meal slot, with these exact fields:
[
  {
    "slot": "<meal_slot>",
    "recipe_name": "<appetizing, concise recipe name>",
    "recipe_instructions": "<numbered step-by-step instructions, each step on its own line>",
    "prep_time_min": <integer minutes>,
    "presentation_tips": "<1-2 sentences on plating/serving>"
  }
]

Keep instructions concise (3-8 steps per recipe). Adjust complexity to match the user's cooking skill level.
Prep time should reflect the ${meals[0]?.slot?.startsWith('snack') ? 'quick preparation typical of snacks' : 'actual cooking effort required'}.`;
}

// ---------------------------------------------------------------------------
// OpenAI call with retry
// ---------------------------------------------------------------------------

async function callOpenAI(
  prompt: string,
  apiKey: string,
  retries = 2,
): Promise<GeneratedRecipe[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      log.warn('OpenAI recipe call failed', {
        status: resp.status,
        attempt,
        body: errText.slice(0, 200),
      });
      if (attempt < retries) continue;
      throw new Error(`OpenAI API error: ${resp.status}`);
    }

    const json = (await resp.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const raw = json.choices[0]?.message?.content ?? '';

    try {
      const parsed = JSON.parse(raw);
      const recipes: GeneratedRecipe[] = Array.isArray(parsed)
        ? parsed
        : parsed.meals ?? parsed.recipes ?? [];

      if (recipes.length === 0 && attempt < retries) {
        log.warn('Empty recipe array, retrying', { attempt });
        continue;
      }

      return recipes.map((r) => ({
        slot: String(r.slot ?? ''),
        recipe_name: String(r.recipe_name ?? 'Untitled Recipe'),
        recipe_instructions: String(r.recipe_instructions ?? ''),
        prep_time_min: Number(r.prep_time_min) || 15,
        presentation_tips: String(r.presentation_tips ?? ''),
      }));
    } catch {
      log.warn('Failed to parse recipe JSON', { attempt, raw: raw.slice(0, 300) });
      if (attempt < retries) continue;
      return [];
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// Concurrency limiter
// ---------------------------------------------------------------------------

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function generateRecipes(
  meals: PlannedMeal[],
  profile: UserProfile,
  request: PlanRequest,
  supabase: SupabaseClient,
): Promise<PlannedMeal[]> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    log.warn('OPENAI_API_KEY not set, skipping recipe generation');
    return meals;
  }

  const startTime = performance.now();

  // Fetch taste context via RAG
  const tasteNotes = await fetchTasteContext(supabase, profile.user_id, apiKey);
  log.info('Taste context fetched', {
    user_id: profile.user_id,
    taste_length: tasteNotes.length,
  });

  const userContext = buildUserContextBlock(profile, request, tasteNotes);

  // Group meals by day
  const dayGroups = new Map<number, PlannedMeal[]>();
  for (const meal of meals) {
    const existing = dayGroups.get(meal.day_number) ?? [];
    existing.push(meal);
    dayGroups.set(meal.day_number, existing);
  }

  const dayEntries = [...dayGroups.entries()].sort(([a], [b]) => a - b);

  // Generate recipes per day with concurrency limit
  await mapWithConcurrency(dayEntries, MAX_CONCURRENT_DAYS, async ([day, dayMeals]) => {
    const dayInputs: DayMealInput[] = dayMeals.map((m) => ({
      slot: m.meal_slot,
      ingredients: m.foods.map((f) => ({
        name: f.food.description,
        amount_g: f.portion_g,
      })),
    }));

    const prompt = buildDayPrompt(day, dayInputs, userContext, profile.locale);
    const recipes = await callOpenAI(prompt, apiKey);

    for (const recipe of recipes) {
      const matchingMeal = dayMeals.find(
        (m) => m.meal_slot === recipe.slot,
      );
      if (matchingMeal) {
        matchingMeal.recipe_name = recipe.recipe_name;
        matchingMeal.recipe_instructions = recipe.recipe_instructions;
        matchingMeal.prep_time_min = recipe.prep_time_min;
        matchingMeal.presentation_tips = recipe.presentation_tips;
      }
    }
  });

  const elapsed = Math.round(performance.now() - startTime);
  const recipesGenerated = meals.filter((m) => m.recipe_name).length;

  log.info('Recipe generation complete', {
    user_id: profile.user_id,
    total_meals: meals.length,
    recipes_generated: recipesGenerated,
    elapsed_ms: elapsed,
  });

  return meals;
}
