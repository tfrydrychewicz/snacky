import { createServiceClient } from '../_shared/supabase-client.ts';
import { createLogger } from '../_shared/logger.ts';
import {
  MEAL_RELEVANT_RULES,
  USDA_COL_TO_KEY,
  USDA_MICRO_SELECT,
  type NutrientKey,
  type InteractionRule,
} from '../nutrient-interactions/rules.ts';

const log = createLogger('chat:tools');

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

async function translateToEnglishFoodTerm(term: string): Promise<string | null> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return null;

  try {
    const resp = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [
          {
            role: 'system',
            content:
              'Translate the given food name to English. Return ONLY the English food name, nothing else. Use USDA-friendly terms (e.g. "arugula" not "rocket salad"). If already English, return it as-is.',
          },
          { role: 'user', content: term },
        ],
        max_completion_tokens: 30,
        temperature: 0,
      }),
    });

    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const translated = json.choices[0]?.message?.content?.trim().toLowerCase();
    if (translated && translated !== term.toLowerCase()) {
      log.info('Translated food term', { from: term, to: translated });
      return translated;
    }
  } catch {
    log.warn('Food term translation failed', { term });
  }
  return null;
}

// ---------------------------------------------------------------------------
// OpenAI tool definitions
// ---------------------------------------------------------------------------

const USDA_LOOKUP_SCHEMA = {
  type: 'function' as const,
  function: {
    name: 'lookup_usda_food',
    description:
      'Search the USDA FoodData Central database for foods by name or FDC ID. Returns macro and micronutrient data per 100g. Use this when the user asks about specific food nutrition, wants to compare foods, or needs nutrient data for a specific ingredient.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'English text search query (e.g. "spinach raw", "cheddar cheese", "chicken breast"). Uses full-text search.',
        },
        fdc_id: {
          type: 'integer',
          description: 'Exact USDA FDC ID. If provided, query is ignored.',
        },
        category: {
          type: 'string',
          description:
            'Filter by food_category (e.g. "Vegetables and Vegetable Products", "Dairy and Egg Products").',
        },
        limit: {
          type: 'integer',
          description: 'Max results (1-10, default 3).',
        },
      },
    },
  },
};

const NUTRIENT_INTERACTIONS_SCHEMA = {
  type: 'function' as const,
  function: {
    name: 'evaluate_nutrient_interactions',
    description:
      'Evaluate nutrient-nutrient interactions for a meal or combination of foods. Detects absorption inhibitions, depletions, synergies, and enhancements based on 48 science-backed rules. Use this when the user asks about food combinations, nutrient absorption, whether foods interact well together, or wants to optimize a meal.',
    parameters: {
      type: 'object',
      required: ['ingredients'],
      properties: {
        ingredients: {
          type: 'array',
          description: 'List of ingredients/foods in the meal with quantities.',
          items: {
            type: 'object',
            required: ['name', 'quantity_g'],
            properties: {
              name: {
                type: 'string',
                description: 'Food name (for display).',
              },
              quantity_g: {
                type: 'number',
                description: 'Portion weight in grams.',
              },
              fdc_id: {
                type: 'integer',
                description:
                  'USDA FDC ID if known. Enables precise micronutrient lookup.',
              },
              english_search_term: {
                type: 'string',
                description:
                  'English name for USDA search fallback if fdc_id is unknown (e.g. "spinach raw").',
              },
            },
          },
        },
      },
    },
  },
};

export const CHAT_TOOLS = [USDA_LOOKUP_SCHEMA, NUTRIENT_INTERACTIONS_SCHEMA];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

interface ToolCallInput {
  name: string;
  arguments: string;
}

export async function executeTool(call: ToolCallInput): Promise<string> {
  try {
    const args = JSON.parse(call.arguments);

    switch (call.name) {
      case 'lookup_usda_food':
        return await executeUsdaLookup(args);
      case 'evaluate_nutrient_interactions':
        return await executeNutrientInteractions(args);
      default:
        return `Unknown tool: ${call.name}`;
    }
  } catch (err) {
    log.error('Tool execution failed', { tool: call.name, error: String(err) });
    return `Tool error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ---------------------------------------------------------------------------
// USDA lookup
// ---------------------------------------------------------------------------

const FULL_SELECT = [
  'fdc_id', 'description', 'food_category',
  'calories_per_100g', 'protein_per_100g', 'carbs_per_100g',
  'fat_per_100g', 'fiber_per_100g', 'sugar_per_100g',
  'sodium_per_100g', 'saturated_fat_per_100g',
  'serving_size_g', 'serving_description',
  ...Object.keys(USDA_COL_TO_KEY),
].join(',');

async function executeUsdaLookup(args: {
  query?: string;
  fdc_id?: number;
  category?: string;
  limit?: number;
}): Promise<string> {
  const supabase = createServiceClient();
  const limit = Math.min(Math.max(args.limit ?? 3, 1), 10);

  if (args.fdc_id) {
    const { data, error } = await supabase
      .from('usda_foods')
      .select(FULL_SELECT)
      .eq('fdc_id', args.fdc_id)
      .limit(1);

    if (error) return `Database error: ${error.message}`;
    if (!data?.length) return `No food found with fdc_id=${args.fdc_id}`;
    return formatFoods(data);
  }

  if (!args.query && !args.category) {
    return 'Provide at least a query or category to search.';
  }

  if (args.query) {
    const clean = args.query.replace(/[^\w\s]/g, '');

    const searchWithTerm = async (term: string) => {
      let builder = supabase.from('usda_foods').select(FULL_SELECT);
      builder = builder.textSearch('search_vector', term.replace(/[^\w\s]/g, ''), {
        type: 'websearch',
      });
      if (args.category) builder = builder.ilike('food_category', `%${args.category}%`);
      return builder.limit(limit);
    };

    const { data, error } = await searchWithTerm(clean);
    if (error) return `Database error: ${error.message}`;
    if (data?.length) return formatFoods(data);

    log.info('Full-text search missed, trying English translation', { query: args.query });
    const englishTerm = await translateToEnglishFoodTerm(args.query);
    if (englishTerm) {
      const { data: translatedData } = await searchWithTerm(englishTerm);
      if (translatedData?.length) return formatFoods(translatedData);
    }

    const { data: ilikeData } = await supabase
      .from('usda_foods')
      .select(FULL_SELECT)
      .ilike('description', `%${clean}%`)
      .limit(limit);

    if (ilikeData?.length) return formatFoods(ilikeData);

    return `No foods found for "${args.query}"${englishTerm ? ` (also tried "${englishTerm}")` : ''}. The USDA database may not have this food.`;
  }

  let builder = supabase.from('usda_foods').select(FULL_SELECT);
  if (args.category) builder = builder.ilike('food_category', `%${args.category}%`);

  const { data, error } = await builder.limit(limit);
  if (error) return `Database error: ${error.message}`;
  if (!data?.length) return `No foods found for category "${args.category}"`;

  return formatFoods(data);
}

function formatFoods(foods: Record<string, unknown>[]): string {
  return foods
    .map((f) => {
      const lines = [`${f.description} (FDC ID: ${f.fdc_id})`];
      if (f.food_category) lines.push(`Category: ${f.food_category}`);
      if (f.serving_size_g)
        lines.push(`Serving: ${f.serving_size_g}g ${f.serving_description ?? ''}`);

      lines.push('Macros per 100g:');
      lines.push(
        `  Cal: ${f.calories_per_100g ?? '?'} | P: ${f.protein_per_100g ?? '?'}g | C: ${f.carbs_per_100g ?? '?'}g | F: ${f.fat_per_100g ?? '?'}g | Fiber: ${f.fiber_per_100g ?? '?'}g | Sugar: ${f.sugar_per_100g ?? '?'}g | Na: ${f.sodium_per_100g ?? '?'}mg`,
      );

      const microLines: string[] = [];
      for (const col of Object.keys(USDA_COL_TO_KEY)) {
        const val = f[col];
        if (val != null && (val as number) > 0) {
          const label = col.replace(/_per_100g$/, '').replace(/_/g, ' ');
          microLines.push(`${label}: ${val}`);
        }
      }
      if (microLines.length > 0) {
        lines.push(`Micronutrients per 100g: ${microLines.join(', ')}`);
      }

      return lines.join('\n');
    })
    .join('\n---\n');
}

// ---------------------------------------------------------------------------
// Nutrient interactions
// ---------------------------------------------------------------------------

type UsdaRow = Record<string, number | null> & { fdc_id: number };

interface IngredientArg {
  name: string;
  quantity_g: number;
  fdc_id?: number;
  english_search_term?: string;
}

const MIN_PRESENCE: Record<string, number> = {
  iron_mg: 0.5, zinc_mg: 0.3, calcium_mg: 20, magnesium_mg: 10,
  copper_mg: 0.05, phosphorus_mg: 20, vitamin_a_ug: 10, vitamin_c_mg: 2,
  vitamin_d_ug: 0.2, vitamin_e_mg: 0.3, vitamin_k_ug: 2, thiamin_mg: 0.02,
  riboflavin_mg: 0.02, niacin_mg: 0.3, vitamin_b6_mg: 0.02, folate_ug: 5,
  vitamin_b12_ug: 0.1, selenium_ug: 1, choline_mg: 5, protein_g: 1,
  fat_g: 0.5, fiber_g: 0.5, sugar_g: 1, sodium_mg: 10, calories_kcal: 10,
};

async function executeNutrientInteractions(args: {
  ingredients: IngredientArg[];
}): Promise<string> {
  const supabase = createServiceClient();
  const totals: Record<string, number> = {};
  const ingredientNames: string[] = [];

  const fdcIds = args.ingredients
    .filter((i) => i.fdc_id != null)
    .map((i) => i.fdc_id!);

  let usdaRows: UsdaRow[] = [];
  if (fdcIds.length > 0) {
    const { data } = await supabase
      .from('usda_foods')
      .select(USDA_MICRO_SELECT)
      .in('fdc_id', fdcIds);
    usdaRows = (data ?? []) as UsdaRow[];
  }

  const usdaMap = new Map(usdaRows.map((r) => [r.fdc_id, r]));

  for (const ing of args.ingredients) {
    ingredientNames.push(ing.name);
    const ratio = ing.quantity_g / 100;

    let row: UsdaRow | undefined;
    if (ing.fdc_id != null) row = usdaMap.get(ing.fdc_id);

    if (!row && ing.english_search_term) {
      const clean = ing.english_search_term.replace(/[^\w\s]/g, '');
      const { data } = await supabase
        .from('usda_foods')
        .select(USDA_MICRO_SELECT)
        .textSearch('search_vector', clean, { type: 'websearch' })
        .limit(1);
      if (data?.length) row = data[0] as UsdaRow;
    }

    if (!row && ing.name) {
      const clean = ing.name.replace(/[^\w\s]/g, '');
      const { data } = await supabase
        .from('usda_foods')
        .select(USDA_MICRO_SELECT)
        .textSearch('search_vector', clean, { type: 'websearch' })
        .limit(1);
      if (data?.length) {
        row = data[0] as UsdaRow;
      } else {
        const translated = await translateToEnglishFoodTerm(ing.name);
        if (translated) {
          const { data: trData } = await supabase
            .from('usda_foods')
            .select(USDA_MICRO_SELECT)
            .textSearch('search_vector', translated.replace(/[^\w\s]/g, ''), {
              type: 'websearch',
            })
            .limit(1);
          if (trData?.length) row = trData[0] as UsdaRow;
        }
      }
    }

    if (row) {
      for (const [col, nKey] of Object.entries(USDA_COL_TO_KEY)) {
        const per100 = row[col];
        if (per100 != null && per100 > 0) {
          totals[nKey] = (totals[nKey] ?? 0) + per100 * ratio;
        }
      }
    }
  }

  const isPresent = (key: string, val: number) =>
    val >= (MIN_PRESENCE[key] ?? 0.01);

  const warnings: string[] = [];
  const synergies: string[] = [];

  for (const rule of MEAL_RELEVANT_RULES) {
    const valA = totals[rule.nutrientA] ?? 0;
    const valB = totals[rule.nutrientB] ?? 0;

    if (!isPresent(rule.nutrientB, valB)) continue;

    if (rule.id === 'low_fat_fatsol_warning') {
      const hasFatSol =
        (totals['vitamin_a_ug'] ?? 0) > 10 ||
        (totals['vitamin_d_ug'] ?? 0) > 0.2 ||
        (totals['vitamin_e_mg'] ?? 0) > 0.3 ||
        (totals['vitamin_k_ug'] ?? 0) > 2;
      if (hasFatSol && valA < 5) {
        warnings.push(formatInteraction(rule, valA, valB));
      }
      continue;
    }

    if (!isPresent(rule.nutrientA, valA)) continue;

    let triggered = false;
    if (rule.ratioTrigger) {
      const match = rule.ratioTrigger.match(
        /^a:b\s*(>=|>|<=|<|==)\s*([\d.]+)$/,
      );
      if (match && valB > 0) {
        const ratio = valA / valB;
        const target = parseFloat(match[2]);
        switch (match[1]) {
          case '>=': triggered = ratio >= target; break;
          case '>': triggered = ratio > target; break;
          case '<=': triggered = ratio <= target; break;
          case '<': triggered = ratio < target; break;
          case '==': triggered = Math.abs(ratio - target) < 0.01; break;
        }
      }
    } else if (rule.thresholdA != null) {
      triggered = valA >= rule.thresholdA;
    } else {
      triggered = true;
    }

    if (!triggered) continue;

    const isWarning =
      rule.type === 'absorption_inhibition' ||
      rule.type === 'depletion' ||
      rule.type === 'competition' ||
      rule.direction === 'a_inhibits_b' ||
      rule.direction === 'b_inhibits_a' ||
      rule.direction === 'depletion';

    if (isWarning && rule.direction !== 'synergy') {
      warnings.push(formatInteraction(rule, valA, valB));
    } else {
      synergies.push(formatInteraction(rule, valA, valB));
    }
  }

  const nutrientLines = Object.entries(totals)
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}: ${Math.round(v * 100) / 100}`)
    .join(', ');

  const parts = [
    `Meal nutrients: ${nutrientLines || 'No USDA data found for these ingredients.'}`,
  ];

  if (warnings.length > 0) {
    parts.push(`\nWARNINGS (${warnings.length}):\n${warnings.join('\n')}`);
  }
  if (synergies.length > 0) {
    parts.push(`\nSYNERGIES (${synergies.length}):\n${synergies.join('\n')}`);
  }
  if (warnings.length === 0 && synergies.length === 0) {
    parts.push('\nNo significant nutrient interactions detected for this combination.');
  }

  return parts.join('\n');
}

function formatInteraction(
  rule: InteractionRule,
  valA: number,
  valB: number,
): string {
  const sev = rule.severity === 'strong' ? 'STRONG' : rule.severity === 'moderate' ? 'MODERATE' : 'MILD';
  return `[${sev}] ${rule.id}: ${rule.nutrientA}=${round(valA)} ${rule.direction} ${rule.nutrientB}=${round(valB)} — ${rule.mechanism} Suggestion: ${rule.suggestionHint}`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
