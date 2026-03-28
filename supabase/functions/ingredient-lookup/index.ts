import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { badRequest, internalError } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';

const log = createLogger('ingredient-lookup');

const AI_TIMEOUT_MS = 10_000;
const USDA_API_TIMEOUT_MS = 10_000;
const USDA_API_KEY = Deno.env.get('USDA_API_KEY') ?? 'DEMO_KEY';

interface MacrosPer100g {
  calories_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
}

const NUTRIENT_ID = {
  ENERGY: [1008, 2047, 2048],
  PROTEIN: 1003,
  FAT: 1004,
  CARBS: 1005,
  FIBER: 1079,
  SUGAR: 2000,
  SODIUM: 1093,
} as const;

// -----------------------------------------------------------------------
// OpenAI helper — translate + estimate nutrition in a single call
// -----------------------------------------------------------------------

interface AiNutritionResult {
  english_name: string;
  usda_query: string;
  macros_per_100g: MacrosPer100g;
}

async function aiTranslateAndEstimate(
  name: string,
  locale: string,
): Promise<AiNutritionResult | null> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    log.warn('OPENAI_API_KEY not configured');
    return null;
  }

  const needsTranslation = locale !== 'en';
  const prompt = needsTranslation
    ? `The user entered a food ingredient name "${name}" in language "${locale}".
1. Translate the name to English.
2. Provide a USDA-style search query (e.g. "Apples, raw, with skin" not just "Apple").
3. Estimate the nutritional values per 100g for that food.

Reply with ONLY valid JSON, no markdown:
{"english_name":"...","usda_query":"...","calories_kcal":...,"protein_g":...,"carbohydrates_g":...,"fat_g":...,"fiber_g":...,"sugar_g":...,"sodium_mg":...}`
    : `For this food ingredient: "${name}":
1. Provide a USDA-style search query (e.g. "Apples, raw, with skin" not just "Apple").
2. Estimate the nutritional values per 100g.

Reply with ONLY valid JSON, no markdown:
{"english_name":"${name}","usda_query":"...","calories_kcal":...,"protein_g":...,"carbohydrates_g":...,"fat_g":...,"fiber_g":...,"sugar_g":...,"sodium_mg":...}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        messages: [
          {
            role: 'system',
            content:
              'You are a nutrition database. Given a food ingredient name, return accurate USDA-equivalent nutritional values per 100g. Always respond with valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: 200,
        temperature: 0,
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      log.warn('AI estimation API error', { status: resp.status, error: errorText });
      return null;
    }

    const data = await resp.json();
    let content: string = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) return null;

    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(content);

    log.info('AI nutrition estimate', {
      name,
      english_name: parsed.english_name,
      calories: parsed.calories_kcal,
    });

    return {
      english_name: parsed.english_name ?? name,
      usda_query: parsed.usda_query ?? parsed.english_name ?? name,
      macros_per_100g: {
        calories_kcal: Number(parsed.calories_kcal) || 0,
        protein_g: Number(parsed.protein_g) || 0,
        carbohydrates_g: Number(parsed.carbohydrates_g) || 0,
        fat_g: Number(parsed.fat_g) || 0,
        fiber_g: parsed.fiber_g != null ? Number(parsed.fiber_g) : null,
        sugar_g: parsed.sugar_g != null ? Number(parsed.sugar_g) : null,
        sodium_mg: parsed.sodium_mg != null ? Number(parsed.sodium_mg) : null,
      },
    };
  } catch (err) {
    log.warn('AI estimation failed', { error: String(err) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// -----------------------------------------------------------------------
// USDA FDC API search
// -----------------------------------------------------------------------

interface FdcSearchNutrient {
  nutrientId: number;
  value?: number;
}

interface FdcSearchFood {
  fdcId: number;
  description: string;
  foodCategory?: string;
  brandName?: string;
  foodNutrients?: FdcSearchNutrient[];
}

function extractNutrient(
  nutrients: FdcSearchNutrient[] | undefined,
  id: number | readonly number[],
): number | null {
  if (!nutrients) return null;
  const ids = Array.isArray(id) ? id : [id];
  for (const nid of ids) {
    const hit = nutrients.find((n) => n.nutrientId === nid);
    if (hit?.value != null) return hit.value;
  }
  return null;
}

async function searchUsdaApi(query: string): Promise<FdcSearchFood | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), USDA_API_TIMEOUT_MS);

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}`;
    const resp = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        dataType: ['SR Legacy', 'Foundation'],
        pageSize: 1,
        pageNumber: 1,
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      log.warn('USDA API search failed', { status: resp.status, error: errorText });
      return null;
    }

    const data = await resp.json();
    const foods = data.foods as FdcSearchFood[] | undefined;
    if (!foods || foods.length === 0) return null;

    return foods[0];
  } catch (err) {
    log.warn('USDA API request failed', { error: String(err) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// -----------------------------------------------------------------------
// Main handler
// -----------------------------------------------------------------------

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return badRequest('Only POST requests are accepted');
  }

  try {
    const body: unknown = await req.json();
    const { name, locale } = body as { name: string; locale: string };

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return badRequest('name must be a string with at least 2 characters');
    }

    const trimmedName = name.trim();
    const effectiveLocale = locale ?? 'en';

    log.info('Ingredient lookup requested', { name: trimmedName, locale: effectiveLocale });

    // 1. Translate to English + get USDA-style query + estimate nutrition
    const aiResult = await aiTranslateAndEstimate(trimmedName, effectiveLocale);
    const englishName = aiResult?.english_name ?? trimmedName;
    const usdaQuery = aiResult?.usda_query ?? englishName;
    const searchTerms = usdaQuery.replace(/[^\w\s]/g, '');

    const supabase = createServiceClient();

    // 2. Check local cache (usda_foods table)
    const { data: cached } = await supabase
      .from('usda_foods')
      .select(
        'fdc_id, description, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, sodium_per_100g',
      )
      .textSearch('search_vector', searchTerms, { type: 'websearch' })
      .not('calories_per_100g', 'is', null)
      .limit(1);

    if (cached && cached.length > 0) {
      const match = cached[0];
      log.info('Cache hit', { name: trimmedName, fdc_id: match.fdc_id });
      return jsonResponse({
        fdc_id: match.fdc_id,
        description: match.description,
        macros_per_100g: rowToMacros(match),
      });
    }

    // 3. Try USDA FDC API
    log.info('Cache miss, querying USDA API', { query: searchTerms });
    const usdaResult = await searchUsdaApi(searchTerms);

    if (usdaResult) {
      const n = usdaResult.foodNutrients;
      const row = {
        fdc_id: usdaResult.fdcId,
        description: usdaResult.description.slice(0, 500),
        food_category: usdaResult.foodCategory ?? null,
        brand_name: usdaResult.brandName ?? null,
        data_source: 'sr_legacy',
        calories_per_100g: extractNutrient(n, NUTRIENT_ID.ENERGY),
        protein_per_100g: extractNutrient(n, NUTRIENT_ID.PROTEIN),
        carbs_per_100g: extractNutrient(n, NUTRIENT_ID.CARBS),
        fat_per_100g: extractNutrient(n, NUTRIENT_ID.FAT),
        fiber_per_100g: extractNutrient(n, NUTRIENT_ID.FIBER),
        sugar_per_100g: extractNutrient(n, NUTRIENT_ID.SUGAR),
        sodium_per_100g: extractNutrient(n, NUTRIENT_ID.SODIUM),
      };

      const { error: upsertError } = await supabase
        .from('usda_foods')
        .upsert(row, { onConflict: 'fdc_id' });

      if (upsertError) {
        log.warn('Failed to cache USDA result', { error: upsertError.message });
      } else {
        log.info('Cached USDA result', { fdc_id: row.fdc_id, description: row.description });
      }

      return jsonResponse({
        fdc_id: row.fdc_id,
        description: row.description,
        macros_per_100g: {
          calories_kcal: row.calories_per_100g ?? 0,
          protein_g: row.protein_per_100g ?? 0,
          carbohydrates_g: row.carbs_per_100g ?? 0,
          fat_g: row.fat_per_100g ?? 0,
          fiber_g: row.fiber_per_100g ?? null,
          sugar_g: row.sugar_per_100g ?? null,
          sodium_mg: row.sodium_per_100g ?? null,
        } satisfies MacrosPer100g,
      });
    }

    // 4. USDA unavailable — use AI estimation (already computed in step 1)
    if (aiResult) {
      log.info('Using AI nutrition estimate', {
        name: trimmedName,
        english_name: englishName,
        source: 'ai',
      });
      return jsonResponse({
        fdc_id: null,
        description: englishName,
        macros_per_100g: aiResult.macros_per_100g,
      });
    }

    log.info('No match from any source', { name: trimmedName });
    return jsonResponse(null);
  } catch (err) {
    log.error('Ingredient lookup failed', { error: String(err) });
    return internalError('Failed to look up ingredient');
  }
});

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function rowToMacros(row: Record<string, unknown>): MacrosPer100g {
  return {
    calories_kcal: (row.calories_per_100g as number) ?? 0,
    protein_g: (row.protein_per_100g as number) ?? 0,
    carbohydrates_g: (row.carbs_per_100g as number) ?? 0,
    fat_g: (row.fat_per_100g as number) ?? 0,
    fiber_g: (row.fiber_per_100g as number) ?? null,
    sugar_g: (row.sugar_per_100g as number) ?? null,
    sodium_mg: (row.sodium_per_100g as number) ?? null,
  };
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
