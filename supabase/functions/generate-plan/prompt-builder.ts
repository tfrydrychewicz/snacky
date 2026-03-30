import type { UserProfile, PlanRequest, ValidatedMeal, USDAFood } from './schemas.ts';

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  pl: 'Polish',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  pt: 'Portuguese',
};

const COUNTRY_LABELS: Record<string, string> = {
  PL: 'Poland',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  AT: 'Austria',
  CH: 'Switzerland',
  BE: 'Belgium',
  PT: 'Portugal',
  IE: 'Ireland',
  CZ: 'Czech Republic',
  SK: 'Slovakia',
  HU: 'Hungary',
  RO: 'Romania',
  BG: 'Bulgaria',
  HR: 'Croatia',
  GR: 'Greece',
  UA: 'Ukraine',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  JP: 'Japan',
  KR: 'South Korea',
  IN: 'India',
  MX: 'Mexico',
  BR: 'Brazil',
  AR: 'Argentina',
  ZA: 'South Africa',
  IL: 'Israel',
  TR: 'Turkey',
  AE: 'UAE',
  SA: 'Saudi Arabia',
  SG: 'Singapore',
};

const COOKING_SKILL_LABELS: Record<string, string> = {
  beginner: 'beginner (simple techniques, few ingredients)',
  intermediate: 'intermediate (comfortable with most techniques)',
  advanced: 'advanced (complex techniques, wide repertoire)',
};

const PREP_TIME_LABELS: Record<string, string> = {
  quick: 'under 20 minutes',
  moderate: '20-45 minutes',
  elaborate: '45+ minutes',
};

export interface PromptPair {
  system: string;
  user: string;
}

// ---------------------------------------------------------------------------
// Per-meal calorie distribution (evidence-based defaults)
// ---------------------------------------------------------------------------

const MEAL_CALORIE_DISTRIBUTION: Record<number, Record<string, number>> = {
  2: { breakfast: 0.45, dinner: 0.55 },
  3: { breakfast: 0.3, lunch: 0.4, dinner: 0.3 },
  4: { breakfast: 0.25, lunch: 0.35, dinner: 0.25, snack_1: 0.15 },
  5: { breakfast: 0.25, lunch: 0.3, dinner: 0.25, snack_1: 0.1, snack_2: 0.1 },
};

/**
 * Compute per-slot kcal targets after applying the meal budget percentage.
 * Returns e.g. { breakfast: 510, lunch: 680, dinner: 510 } for a 2000 kcal
 * target at 85% budget with 3 meals.
 */
export function getMealTargets(
  mealsPerDay: number,
  targetKcal: number,
  budgetPct: number,
): Record<string, number> {
  const budgetKcal = Math.round((targetKcal * budgetPct) / 100);
  const dist = MEAL_CALORIE_DISTRIBUTION[mealsPerDay] ?? MEAL_CALORIE_DISTRIBUTION[3]!;
  const result: Record<string, number> = {};
  for (const [slot, pct] of Object.entries(dist)) {
    result[slot] = Math.round(budgetKcal * pct);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Pass 1: Recipe generation (no nutrition data)
// ---------------------------------------------------------------------------

export interface RecipePromptOpts {
  previousDaySummary?: string;
  /** Parallel batch hint — tells the LLM what sibling chunks cover so it differentiates */
  parallelHint?: string;
}

export function buildRecipePrompt(
  profile: UserProfile,
  request: PlanRequest,
  chunkStart: number,
  chunkEnd: number,
  opts?: RecipePromptOpts,
): PromptPair {
  const lang = LOCALE_LABELS[profile.locale] ?? 'English';
  const country = profile.location ? (COUNTRY_LABELS[profile.location] ?? profile.location) : null;
  const isNonEnglish = profile.locale !== 'en';

  const system = [
    'You are a world-class professional chef and certified sports nutritionist.',
    `You create meal plans exclusively in ${lang}.`,
    isNonEnglish
      ? `CRITICAL: ALL text you produce — recipe names, instructions, ingredient names, tips — MUST be in ${lang}. NEVER write in English.`
      : '',
    'You create delicious, practical meal plans using real recipes that people actually cook.',
    'Every meal must be a coherent dish where ingredients complement each other.',
    'You always respond with valid JSON — no markdown fences, no commentary.',
  ]
    .filter(Boolean)
    .join('\n');

  const constraints: string[] = [];

  const budgetPct = request.meal_budget_pct ?? 85;
  const mealTargets = getMealTargets(request.meals_per_day, profile.target_kcal, budgetPct);
  const budgetKcal = Math.round((profile.target_kcal * budgetPct) / 100);
  const budgetPro = Math.round((profile.target_protein_g * budgetPct) / 100);
  const budgetCarbs = Math.round((profile.target_carbs_g * budgetPct) / 100);
  const budgetFat = Math.round((profile.target_fat_g * budgetPct) / 100);

  const perMealLine = Object.entries(mealTargets)
    .map(([slot, kcal]) => `${slot} ~${kcal} kcal`)
    .join(', ');

  constraints.push(
    budgetPct < 100
      ? `DAILY MEAL BUDGET: ${budgetKcal} kcal (${budgetPct}% of ${profile.target_kcal} kcal goal — rest is for drinks/snacks), ${budgetPro}g protein, ${budgetCarbs}g carbs, ${budgetFat}g fat`
      : `DAILY NUTRITION TARGETS: ${profile.target_kcal} kcal, ${profile.target_protein_g}g protein, ${profile.target_carbs_g}g carbs, ${profile.target_fat_g}g fat`,
  );
  constraints.push(`PER-MEAL TARGETS (approximate): ${perMealLine}`);
  constraints.push(`MEALS PER DAY: ${request.meals_per_day}`);
  constraints.push(`GENERATE DAYS: ${chunkStart} through ${chunkEnd}`);

  if (profile.dietary_restrictions.length > 0) {
    constraints.push(`DIETARY RESTRICTIONS (STRICT): ${profile.dietary_restrictions.join(', ')}`);
  }

  if (profile.allergies.length > 0) {
    constraints.push(`ALLERGIES (NEVER include these): ${profile.allergies.join(', ')}`);
  }

  if (request.excluded_ingredients.length > 0) {
    constraints.push(`EXCLUDED INGREDIENTS: ${request.excluded_ingredients.join(', ')}`);
  }

  const cuisines =
    request.cuisine_preferences.length > 0
      ? request.cuisine_preferences
      : profile.cuisine_preferences;
  if (cuisines.length > 0) {
    constraints.push(`PREFERRED CUISINES: ${cuisines.join(', ')}`);
  }

  if (country) {
    constraints.push(
      `USER LOCATION: ${country} — use ingredients commonly available in local supermarkets`,
    );
  }

  const skill = COOKING_SKILL_LABELS[profile.cooking_skill ?? 'intermediate'] ?? 'intermediate';
  constraints.push(`COOKING SKILL: ${skill}`);

  const prepTime = PREP_TIME_LABELS[request.cooking_time_pref] ?? '20-45 minutes';
  constraints.push(`PREP TIME PER MEAL: ${prepTime}`);

  if (opts?.previousDaySummary) {
    constraints.push(`PREVIOUS DAYS (avoid repeating recipes): ${opts.previousDaySummary}`);
  }

  if (opts?.parallelHint) {
    constraints.push(opts.parallelHint);
  }

  const slotNames = buildSlotNames(request.meals_per_day);
  constraints.push(`MEAL SLOTS (use exactly these): ${slotNames.join(', ')}`);

  const user = [
    'Create a meal plan with the following constraints:',
    '',
    constraints.join('\n'),
    '',
    'RULES:',
    '- Each meal must be a real, coherent recipe — not random ingredients thrown together',
    '- Ingredients must be specific and practical (e.g., "chicken breast" not "protein source")',
    '- Include realistic gram amounts for each ingredient',
    '- Aim for the PER-MEAL calorie targets when sizing each meal — do NOT put all calories in one meal',
    '- Vary recipes across days — no meal should repeat within the plan',
    '- recipe_instructions: each step on its OWN LINE, prefixed "1. ", "2. ", etc. Use "\\n" to separate steps inside the JSON string',
    isNonEnglish
      ? `- ALL text (recipe_name, recipe_instructions, ingredient names, presentation_tips) MUST be in ${lang}`
      : '',
    '- name_en must be the English translation of the ingredient (for nutritional database lookup)',
    '',
    'Respond with ONLY valid JSON matching this schema:',
    '{',
    '  "days": [',
    '    {',
    '      "day_number": <integer>,',
    '      "meals": [',
    '        {',
    '          "slot": "<meal slot name>",',
    '          "recipe_name": "<appetizing name>",',
    '          "recipe_instructions": "1. First step\\n2. Second step\\n3. Third step",',
    '          "prep_time_min": <integer>,',
    '          "presentation_tips": "<1-2 sentences>",',
    '          "ingredients": [',
    '            { "name": "<ingredient in user language>", "name_en": "<ingredient in English>", "amount_g": <number> }',
    '          ]',
    '        }',
    '      ]',
    '    }',
    '  ]',
    '}',
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user };
}

// ---------------------------------------------------------------------------
// Pass 2: Portion optimization (mini model)
// ---------------------------------------------------------------------------

interface IngredientWithNutrition {
  name_en: string;
  amount_g: number;
  per_100g: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  current: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

interface DayNutritionSummary {
  day_number: number;
  meals: Array<{
    slot: string;
    ingredients: IngredientWithNutrition[];
  }>;
  day_totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

export function buildPortionPrompt(
  meals: ValidatedMeal[],
  usdaCache: Map<string, USDAFood>,
  profile: UserProfile,
  ingredientEnMap: Map<string, string>,
  mealTargets?: Record<string, number>,
): PromptPair {
  const mealsByDay = new Map<number, ValidatedMeal[]>();
  for (const meal of meals) {
    const arr = mealsByDay.get(meal.day_number) ?? [];
    arr.push(meal);
    mealsByDay.set(meal.day_number, arr);
  }

  const daySummaries: DayNutritionSummary[] = [];

  for (const [dayNum, dayMeals] of [...mealsByDay.entries()].sort((a, b) => a[0] - b[0])) {
    let dayCal = 0,
      dayPro = 0,
      dayCarb = 0,
      dayFat = 0;
    const mealSummaries: DayNutritionSummary['meals'] = [];

    for (const meal of dayMeals) {
      const ings: IngredientWithNutrition[] = [];
      for (const ing of meal.ingredients) {
        const enName = ingredientEnMap.get(ing.name.toLowerCase().trim()) ?? ing.name;
        const usda = usdaCache.get(enName.toLowerCase());
        const per100 = usda
          ? {
              calories: usda.calories_per_100g,
              protein_g: usda.protein_per_100g,
              carbs_g: usda.carbs_per_100g,
              fat_g: usda.fat_per_100g,
            }
          : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
        const scale = ing.amount_g / 100;
        const current = {
          calories: round(per100.calories * scale),
          protein_g: round(per100.protein_g * scale, 1),
          carbs_g: round(per100.carbs_g * scale, 1),
          fat_g: round(per100.fat_g * scale, 1),
        };
        dayCal += current.calories;
        dayPro += current.protein_g;
        dayCarb += current.carbs_g;
        dayFat += current.fat_g;
        ings.push({ name_en: enName, amount_g: ing.amount_g, per_100g: per100, current });
      }
      mealSummaries.push({ slot: meal.meal_slot, ingredients: ings });
    }

    daySummaries.push({
      day_number: dayNum,
      meals: mealSummaries,
      day_totals: {
        calories: round(dayCal),
        protein_g: round(dayPro, 1),
        carbs_g: round(dayCarb, 1),
        fat_g: round(dayFat, 1),
      },
    });
  }

  const system =
    'You are a nutrition calculator. You adjust ingredient gram amounts so daily macro totals match targets. You respond with valid JSON only.';

  const perMealLine = mealTargets
    ? '\nPER-MEAL CALORIE TARGETS: ' +
      Object.entries(mealTargets)
        .map(([s, k]) => `${s} ~${k} kcal`)
        .join(', ')
    : '';

  const dailyBudget = mealTargets
    ? Object.values(mealTargets).reduce((s, v) => s + v, 0)
    : profile.target_kcal;

  const user = [
    "Adjust the amount_g for each ingredient so each day's totals are within ±10% of the targets.",
    'Each meal should individually hit its per-meal calorie target — do NOT over-concentrate calories in one meal.',
    '',
    `DAILY TARGETS: ${dailyBudget} kcal, ${profile.target_protein_g}g protein, ${profile.target_carbs_g}g carbs, ${profile.target_fat_g}g fat`,
    perMealLine,
    '',
    'CURRENT PLAN:',
    JSON.stringify(daySummaries, null, 0),
    '',
    'RULES:',
    '- Keep amounts realistic: minimum 5g, maximum 500g per ingredient',
    '- Prefer adjusting protein-rich or carb-rich ingredients over oils/spices',
    '- Do not add or remove ingredients — only change amount_g',
    '- Nutrition scales linearly: new_cal = per_100g.calories * new_amount_g / 100',
    '- Each meal should be close to its per-meal target — scale UP under-sized meals and DOWN over-sized meals',
    '',
    'Respond with ONLY this JSON:',
    '{ "days": [ { "day_number": <int>, "meals": [ { "slot": "<slot>", "ingredients": [ { "name_en": "<name>", "amount_g": <adjusted> } ] } ] } ] }',
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSlotNames(mealsPerDay: number): string[] {
  switch (mealsPerDay) {
    case 2:
      return ['breakfast', 'dinner'];
    case 3:
      return ['breakfast', 'lunch', 'dinner'];
    case 4:
      return ['breakfast', 'lunch', 'dinner', 'snack_1'];
    case 5:
      return ['breakfast', 'lunch', 'dinner', 'snack_1', 'snack_2'];
    default:
      return ['breakfast', 'lunch', 'dinner'];
  }
}

const VARIETY_THEMES = [
  'comfort food with hearty stews, casseroles, and baked dishes',
  'light and fresh meals with salads, bowls, and raw preparations',
  'Asian-inspired dishes with stir-fries, curries, and noodles',
  'Mediterranean cuisine with olive oil, herbs, grains, and legumes',
  'Latin American flavors with beans, rice, spices, and wraps',
  'Nordic-style meals with wholegrains, root vegetables, and fish',
];

/**
 * Build a parallel-batch hint that steers each sibling chunk
 * toward a distinct culinary theme so they don't converge.
 */
export function buildParallelHint(
  chunkIndex: number,
  totalInBatch: number,
  siblingDayRanges: string[],
): string {
  if (totalInBatch <= 1) return '';

  const theme = VARIETY_THEMES[chunkIndex % VARIETY_THEMES.length]!;
  const siblingLabel = siblingDayRanges.join(', ');

  return [
    `PARALLEL VARIETY (CRITICAL): Days ${siblingLabel} are being generated at the same time as these days.`,
    `You MUST use completely different recipes, main proteins, grains, and cooking methods from what a typical plan would repeat.`,
    `For THESE days, lean toward: ${theme}.`,
    `Never duplicate recipe concepts across days within this plan.`,
  ].join(' ');
}

export function buildDaySummary(dayRecipeNames: string[][]): string {
  return dayRecipeNames.map((names, i) => `Day ${i + 1}: ${names.join(', ')}`).join('; ');
}

function round(n: number, decimals = 0): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
