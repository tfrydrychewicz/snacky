import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import type {
  Pass1Response,
  USDAFood,
  ValidatedMeal,
  ValidatedIngredient,
  ValidationResult,
  UserProfile,
} from './schemas.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('nutrition-validator');

// ---------------------------------------------------------------------------
// Ingredient aliases: maps LLM English names → USDA-friendly search terms
// for items missing from or poorly matched in the USDA database.
// ---------------------------------------------------------------------------

const INGREDIENT_ALIASES: Record<string, string> = {
  'skyr': 'yogurt plain nonfat',
  'natural skyr': 'yogurt plain nonfat',
  'plain skyr': 'yogurt plain nonfat',
  'skyr plain': 'yogurt plain nonfat',
  'quark': 'cheese cottage lowfat',
  'lean quark': 'cheese cottage lowfat',
  'quark lean': 'cheese cottage lowfat',
  'lean cottage cheese': 'cheese cottage lowfat',
  'cottage cheese lean': 'cheese cottage lowfat',
  'low fat cottage cheese': 'cheese cottage lowfat',
  'seitan': 'wheat gluten vital',
  'jasmine rice': 'rice white long grain regular raw',
  'jasmine rice dry': 'rice white long grain regular raw',
  'white jasmine rice': 'rice white long grain regular raw',
  'white rice dry': 'rice white long grain regular raw',
  'white rice': 'rice white long grain regular raw',
  'basmati rice': 'rice white long grain regular raw',
  'basmati rice dry': 'rice white long grain regular raw',
  'brown rice': 'rice brown long grain raw',
  'brown rice dry': 'rice brown long grain raw',
  'oat flakes': 'oats regular',
  'rolled oats': 'oats regular',
  'oats': 'oats regular',
  'passata': 'tomato puree canned',
  'tomato passata': 'tomato puree canned',
  'rapeseed oil': 'oil canola',
  'canola oil': 'oil canola',
  'mozzarella light': 'cheese mozzarella part skim milk',
  'light mozzarella': 'cheese mozzarella part skim milk',
  'yellow cheese light': 'cheese mozzarella part skim milk',
  'light yellow cheese': 'cheese mozzarella part skim milk',
  'coconut milk light': 'coconut milk canned',
  'light coconut milk': 'coconut milk canned',
  'egg whites': 'egg white raw fresh',
  'egg white': 'egg white raw fresh',
  'lime': 'limes raw',
  'chives': 'chives raw',
  'kefir': 'kefir lowfat milk',
  'buttermilk': 'buttermilk lowfat',
  'buckwheat groats': 'buckwheat',
  'bulgur': 'bulgur dry',
  'millet': 'millet raw',
  'couscous': 'couscous dry',
  'halloumi': 'cheese feta',
  'tempeh': 'tempeh',
  'edamame': 'edamame frozen prepared',
  'curry paste': 'spices curry powder',
  'red curry paste': 'spices curry powder',
  'oat flour': 'flour oat',
  'fresh ginger': 'ginger root raw',
  'fresh cilantro': 'coriander leaves raw',
  'fresh coriander': 'coriander leaves raw',
  'fresh basil': 'basil fresh',
  'fresh parsley': 'parsley fresh',
  'fresh spinach': 'spinach raw',
  'icelandic yogurt': 'yogurt plain nonfat',
  'icelandic style yogurt': 'yogurt plain nonfat',
  'skyr yogurt': 'yogurt plain nonfat',
  'cherry tomatoes': 'tomatoes red ripe raw',
  'cocktail tomatoes': 'tomatoes red ripe raw',
  'red onion': 'onions raw',
  'yellow onion': 'onions raw',
  'onion': 'onions raw',
  'red bell pepper': 'peppers sweet red raw',
  'bell pepper': 'peppers sweet red raw',
  'green bell pepper': 'peppers sweet green raw',
  'smoked paprika': 'spices paprika',
  'ground cumin': 'spices cumin seed',
  'cinnamon': 'spices cinnamon ground',
  'ground cinnamon': 'spices cinnamon ground',
  'ground turmeric': 'spices turmeric ground',
  'ground ginger': 'spices ginger ground',
  'ground pepper': 'spices pepper black',
  'black pepper': 'spices pepper black',
  'granulated garlic': 'spices garlic powder',
  'garlic powder': 'spices garlic powder',
  'sesame seeds': 'seeds sesame whole dried',
  'sesame oil': 'oil sesame',
  'soy sauce': 'soy sauce made from soy',
  'whole wheat pasta': 'pasta whole wheat dry',
  'whole wheat pasta dry': 'pasta whole wheat dry',
  'canned corn': 'corn sweet canned drained',
  'canned corn drained': 'corn sweet canned drained',
  'canned kidney beans': 'beans kidney red canned drained',
  'canned red beans': 'beans kidney red canned drained',
  'red kidney beans canned': 'beans kidney red canned drained',
  'baking powder': 'leavening agents baking powder',
  'salt': 'salt table',
  'low fat cottage cheese': 'cheese cottage lowfat',
  'low-fat cottage cheese': 'cheese cottage lowfat',
  'curd cheese': 'cheese cottage lowfat',
  'farmers cheese': 'cheese cottage lowfat',
  'low fat quark': 'cheese cottage lowfat',
  'low-fat quark': 'cheese cottage lowfat',
  'paneer': 'cheese ricotta whole milk',
  'paneer cheese': 'cheese ricotta whole milk',
  'paneer light': 'cheese ricotta part skim milk',
  'egg': 'egg whole raw fresh',
  'eggs': 'egg whole raw fresh',
  'whole egg': 'egg whole raw fresh',
  'whole eggs': 'egg whole raw fresh',
  'cooked red lentils': 'lentils mature seeds cooked boiled',
  'cooked lentils': 'lentils mature seeds cooked boiled',
  'red lentils cooked': 'lentils mature seeds cooked boiled',
  'cooked chickpeas': 'chickpeas mature seeds cooked boiled',
  'canned chickpeas': 'chickpeas mature seeds canned drained',
  'cooked quinoa': 'quinoa cooked',
  'milk': 'milk whole milkfat',
  'whole milk': 'milk whole milkfat',
  'low fat milk': 'milk lowfat fluid milkfat',
  '1.5% milk': 'milk lowfat fluid milkfat',
  '2% milk': 'milk reduced fat fluid milkfat',
  'skim milk': 'milk nonfat fluid',
  'soy sauce': 'soy sauce made from soy wheat',
  'parmesan': 'cheese parmesan hard',
  'parmesan cheese': 'cheese parmesan hard',
  'kidney beans': 'beans kidney red mature seeds canned',
  'canned kidney beans drained': 'beans kidney red mature seeds canned drained',
  'mixed berries': 'strawberries frozen unsweetened',
  'mixed berries frozen': 'strawberries frozen unsweetened',
  'frozen mixed berries': 'strawberries frozen unsweetened',
  'frozen berries': 'strawberries frozen unsweetened',
  'frozen raspberries': 'raspberries raw',
  'raspberries frozen': 'raspberries raw',
  'spinach': 'spinach raw',
  'firm tofu': 'tofu firm prepared calcium sulfate magnesium',
  'natural tofu': 'tofu firm prepared calcium sulfate magnesium',
  'corn': 'corn sweet yellow raw',
  'sweet corn': 'corn sweet yellow raw',
  'peanut butter': 'peanut butter smooth style',
  'peanut butter smooth': 'peanut butter smooth style',
  'garam masala': 'spices curry powder',
  'high protein yogurt': 'yogurt greek plain nonfat',
  'high-protein yogurt': 'yogurt greek plain nonfat',
  'high protein natural yogurt': 'yogurt greek plain nonfat',
  'high-protein natural yogurt': 'yogurt greek plain nonfat',
  'greek yogurt': 'yogurt greek plain nonfat',
  'greek yogurt plain': 'yogurt greek plain nonfat',
  'potatoes': 'potatoes white flesh and skin raw',
  'potato': 'potatoes white flesh and skin raw',
};

const USDA_SELECT =
  'fdc_id, description, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g' as const;

// ---------------------------------------------------------------------------
// Public: USDA cache builder
// ---------------------------------------------------------------------------

export async function buildUSDACache(
  ingredientNames: string[],
  supabase: SupabaseClient,
): Promise<Map<string, USDAFood>> {
  const cache = new Map<string, USDAFood>();
  if (ingredientNames.length === 0) return cache;

  const unique = [...new Set(ingredientNames.map((n) => n.toLowerCase().trim()))];

  const BATCH = 20;
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const searches = batch.map((name) => searchUSDA(name, supabase));
    const results = await Promise.all(searches);

    for (let j = 0; j < batch.length; j++) {
      const match = results[j];
      if (match) {
        cache.set(batch[j], match);
      }
    }
  }

  log.info('USDA cache built', { queried: unique.length, matched: cache.size });
  return cache;
}

// ---------------------------------------------------------------------------
// Public: USDA text search (ranked, with alias resolution)
// ---------------------------------------------------------------------------

export async function searchUSDA(
  ingredientName: string,
  supabase: SupabaseClient,
): Promise<USDAFood | null> {
  const resolved = resolveAlias(ingredientName);

  const words = resolved
    .replace(/[,()%#]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^\d+\.?\d*$/.test(w))
    .slice(0, 5);

  if (words.length === 0) return null;

  const trySearch = async (terms: string): Promise<USDAFood[]> => {
    const { data } = await supabase
      .from('usda_foods')
      .select(USDA_SELECT)
      .textSearch('search_vector', terms, { type: 'websearch' })
      .not('calories_per_100g', 'is', null)
      .limit(10);
    return (data ?? []) as USDAFood[];
  };

  // 1) All words ANDed
  let candidates = await trySearch(words.join(' '));

  // 2) Drop the first word (usually a modifier like "fresh", "ground")
  if (candidates.length === 0 && words.length > 1) {
    candidates = await trySearch(words.slice(1).join(' '));
  }

  // 3) Just the last word (the food name itself)
  if (candidates.length === 0 && words.length > 2) {
    candidates = await trySearch(words[words.length - 1]);
  }

  if (candidates.length > 0) {
    const best = pickBestMatch(candidates, resolved);
    if (best) {
      log.debug?.('USDA match', {
        query: ingredientName,
        resolved,
        matched: best.description,
        kcal_100g: best.calories_per_100g,
      });
      return best;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Internals: alias resolution + scoring
// ---------------------------------------------------------------------------

function resolveAlias(name: string): string {
  const key = name.toLowerCase().trim();

  // Exact match
  if (INGREDIENT_ALIASES[key]) return INGREDIENT_ALIASES[key];

  // Check if any alias key appears as a whole word in the name
  // (handles "jogurt skyr naturalny" matching the "skyr" alias)
  for (const [aliasKey, aliasValue] of Object.entries(INGREDIENT_ALIASES)) {
    if (aliasKey.length < 3) continue;
    const re = new RegExp(`\\b${aliasKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (re.test(key)) return aliasValue;
  }

  return name;
}

function pickBestMatch(candidates: USDAFood[], originalQuery: string): USDAFood | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  let bestScore = -Infinity;
  let best: USDAFood = candidates[0];

  for (const c of candidates) {
    const s = scoreUSDAMatch(c.description, originalQuery);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }

  return best;
}

/**
 * Scores a USDA description against the original query.
 * Higher = better match for a raw/basic ingredient lookup.
 *
 * Key principle: the last word of the query is usually the food name
 * (e.g. "ground cumin" → "cumin"), so it gets the highest weight.
 * Raw/fresh bonuses only apply when the food name itself matches,
 * preventing "Pork, fresh, belly, raw" from winning for "fresh cilantro".
 */
function scoreUSDAMatch(description: string, query: string): number {
  const desc = description.toLowerCase();
  const q = query.toLowerCase();
  const qWords = q.split(/\s+/).filter((w) => w.length > 2);
  let score = 0;

  // Later words in the query are the food name and get exponentially more weight
  for (let i = 0; i < qWords.length; i++) {
    const stem = qWords[i].length > 4 ? qWords[i].slice(0, -1) : qWords[i];
    const weight = Math.pow(2, i);
    if (desc.includes(stem)) score += weight * 5;
  }

  // Only boost raw/fresh/plain if the food name (last query word) actually matched
  const lastWord = qWords[qWords.length - 1] ?? '';
  const lastStem = lastWord.length > 4 ? lastWord.slice(0, -1) : lastWord;
  const foodNameMatched = lastStem ? desc.includes(lastStem) : false;

  if (foodNameMatched) {
    if (desc.includes('raw')) score += 5;
    if (desc.includes('fresh')) score += 3;
    if (desc.includes('plain')) score += 3;
    if (desc.includes('fluid')) score += 2;
    if (desc.includes('regular')) score += 2;
  }

  // Penalize processed forms (only if the query didn't ask for them)
  const penalize = (word: string, penalty: number) => {
    if (desc.includes(word) && !q.includes(word)) score -= penalty;
  };

  penalize('dried', 15);
  penalize('dehydrated', 15);
  penalize('powder', 12);
  penalize('powdered', 12);
  penalize('stabilized', 10);
  penalize('concentrate', 8);
  penalize('fried', 8);
  penalize('baked', 5);
  penalize('frozen', 2);
  penalize('sweetened', 8);

  // Always penalize mixed/prepared dishes
  if (desc.includes('made with')) score -= 15;
  if (desc.includes('recipe')) score -= 12;
  if (desc.includes('restaurant')) score -= 12;

  // Penalize brand-name entries (e.g., "DENNY'S", "APPLEBEE'S")
  if (/[A-Z]{4,}/.test(description)) score -= 12;

  // Prefer USDA-standard descriptions (comma-separated format)
  const commaCount = (description.match(/,/g) ?? []).length;
  score += Math.min(commaCount, 3) * 2;

  // Bonus when the description starts with a query word (direct match)
  const firstDescWord = desc.split(/[\s,]+/)[0] ?? '';
  for (const w of qWords) {
    const stem = w.length > 4 ? w.slice(0, -1) : w;
    if (firstDescWord.startsWith(stem)) {
      score += 5;
      break;
    }
  }

  // Prefer shorter descriptions (more generic/basic food entries)
  score -= Math.floor(desc.length / 25);

  return score;
}

// ---------------------------------------------------------------------------
// Public: Convert Pass 1 output + USDA cache -> ValidatedMeals
// ---------------------------------------------------------------------------

/**
 * Takes Pass 1 LLM output (recipes without nutrition) and enriches with USDA data.
 * Returns ValidatedMeals with computed nutrition and a map of localized->English names.
 */
export async function enrichWithUSDA(
  pass1: Pass1Response,
  supabase: SupabaseClient,
): Promise<{
  meals: ValidatedMeal[];
  usdaCache: Map<string, USDAFood>;
  ingredientEnMap: Map<string, string>;
  matchRate: number;
}> {
  const ingredientEnMap = new Map<string, string>();
  const allEnglishNames: string[] = [];

  for (const day of pass1.days) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients) {
        const localKey = ing.name.toLowerCase().trim();
        const enName = ing.name_en?.trim() || ing.name.trim();
        ingredientEnMap.set(localKey, enName);
        allEnglishNames.push(enName);
      }
    }
  }

  const usdaCache = await buildUSDACache(allEnglishNames, supabase);

  let matched = 0;
  let total = 0;
  const meals: ValidatedMeal[] = [];

  for (const day of pass1.days) {
    for (const meal of day.meals) {
      const ingredients: ValidatedIngredient[] = [];
      let mealCal = 0;
      let mealPro = 0;
      let mealCarb = 0;
      let mealFat = 0;

      for (const ing of meal.ingredients) {
        total++;
        const localKey = ing.name.toLowerCase().trim();
        const enName = ingredientEnMap.get(localKey) ?? ing.name;
        const usdaMatch = usdaCache.get(enName.toLowerCase()) ?? usdaCache.get(localKey);

        let validated: ValidatedIngredient;

        if (usdaMatch) {
          matched++;
          const scale = ing.amount_g / 100;
          const cal = round(usdaMatch.calories_per_100g * scale);
          const pro = round(usdaMatch.protein_per_100g * scale, 1);
          const carb = round(usdaMatch.carbs_per_100g * scale, 1);
          const fat = round(usdaMatch.fat_per_100g * scale, 1);

          validated = {
            name: ing.name,
            amount_g: ing.amount_g,
            calories: cal,
            protein_g: pro,
            carbs_g: carb,
            fat_g: fat,
            usda_fdc_id: usdaMatch.fdc_id,
            usda_validated: true,
          };
        } else {
          validated = {
            name: ing.name,
            amount_g: ing.amount_g,
            calories: 0,
            protein_g: 0,
            carbs_g: 0,
            fat_g: 0,
            usda_fdc_id: null,
            usda_validated: false,
          };
        }

        mealCal += validated.calories;
        mealPro += validated.protein_g;
        mealCarb += validated.carbs_g;
        mealFat += validated.fat_g;
        ingredients.push(validated);
      }

      meals.push({
        day_number: day.day_number,
        meal_slot: meal.slot,
        recipe_name: meal.recipe_name,
        recipe_instructions: meal.recipe_instructions,
        prep_time_min: meal.prep_time_min,
        presentation_tips: meal.presentation_tips ?? '',
        ingredients,
        total_calories: round(mealCal),
        total_protein_g: round(mealPro, 1),
        total_carbs_g: round(mealCarb, 1),
        total_fat_g: round(mealFat, 1),
      });
    }
  }

  const matchRate = total > 0 ? round((matched / total) * 100, 1) : 0;
  log.info('USDA enrichment complete', { matched, total, match_rate_pct: matchRate });

  return { meals, usdaCache, ingredientEnMap, matchRate };
}

// ---------------------------------------------------------------------------
// Public: Recompute nutrition after portion adjustment (Pass 2)
// ---------------------------------------------------------------------------

/**
 * After Pass 2 adjusts amounts, recompute nutrition from USDA data.
 */
export function recomputeNutrition(
  meals: ValidatedMeal[],
  adjustedAmounts: Map<string, Map<string, number>>,
  usdaCache: Map<string, USDAFood>,
  ingredientEnMap: Map<string, string>,
): ValidatedMeal[] {
  let totalAdjusted = 0;
  let totalKept = 0;
  let mealsWithNoAdjustments = 0;

  const result = meals.map((meal) => {
    const key = `${meal.day_number}:${meal.meal_slot}`;
    const mealAdjustments = adjustedAmounts.get(key);

    if (!mealAdjustments) mealsWithNoAdjustments++;

    let mealCal = 0;
    let mealPro = 0;
    let mealCarb = 0;
    let mealFat = 0;

    const ingredients: ValidatedIngredient[] = meal.ingredients.map((ing) => {
      const localKey = ing.name.toLowerCase().trim();
      const enName = ingredientEnMap.get(localKey) ?? ing.name;
      const newAmount = mealAdjustments?.get(enName.toLowerCase()) ?? ing.amount_g;

      if (mealAdjustments?.has(enName.toLowerCase())) {
        totalAdjusted++;
      } else {
        totalKept++;
      }

      const usda = usdaCache.get(enName.toLowerCase()) ?? usdaCache.get(localKey);

      let cal = 0, pro = 0, carb = 0, fat = 0;
      if (usda) {
        const scale = newAmount / 100;
        cal = round(usda.calories_per_100g * scale);
        pro = round(usda.protein_per_100g * scale, 1);
        carb = round(usda.carbs_per_100g * scale, 1);
        fat = round(usda.fat_per_100g * scale, 1);
      }

      mealCal += cal;
      mealPro += pro;
      mealCarb += carb;
      mealFat += fat;

      return {
        ...ing,
        amount_g: newAmount,
        calories: cal,
        protein_g: pro,
        carbs_g: carb,
        fat_g: fat,
      };
    });

    return {
      ...meal,
      ingredients,
      total_calories: round(mealCal),
      total_protein_g: round(mealPro, 1),
      total_carbs_g: round(mealCarb, 1),
      total_fat_g: round(mealFat, 1),
    };
  });

  console.log(`[recomputeNutrition] ${totalAdjusted} ingredients adjusted, ${totalKept} kept original, ${mealsWithNoAdjustments}/${meals.length} meals had no matching adjustments`);

  return result;
}

/**
 * Deterministic fallback: scale every ingredient in each day proportionally
 * so the day's total calories match the target. No LLM needed.
 */
export function scalePortionsToTarget(
  meals: ValidatedMeal[],
  usdaCache: Map<string, USDAFood>,
  ingredientEnMap: Map<string, string>,
  targetKcal: number,
): ValidatedMeal[] {
  const mealsByDay = new Map<number, ValidatedMeal[]>();
  for (const meal of meals) {
    const arr = mealsByDay.get(meal.day_number) ?? [];
    arr.push(meal);
    mealsByDay.set(meal.day_number, arr);
  }

  const scaled: ValidatedMeal[] = [];

  for (const [, dayMeals] of mealsByDay) {
    const dayCal = dayMeals.reduce((s, m) => s + m.total_calories, 0);
    if (dayCal <= 0) {
      scaled.push(...dayMeals);
      continue;
    }

    const scaleFactor = Math.min(Math.max(targetKcal / dayCal, 0.3), 2.5);

    for (const meal of dayMeals) {
      let mealCal = 0, mealPro = 0, mealCarb = 0, mealFat = 0;

      const ingredients: ValidatedIngredient[] = meal.ingredients.map((ing) => {
        const newAmount = round(ing.amount_g * scaleFactor);
        const clamped = Math.min(Math.max(newAmount, 5), 500);

        const localKey = ing.name.toLowerCase().trim();
        const enName = ingredientEnMap.get(localKey) ?? ing.name;
        const usda = usdaCache.get(enName.toLowerCase()) ?? usdaCache.get(localKey);

        let cal = 0, pro = 0, carb = 0, fat = 0;
        if (usda) {
          const scale = clamped / 100;
          cal = round(usda.calories_per_100g * scale);
          pro = round(usda.protein_per_100g * scale, 1);
          carb = round(usda.carbs_per_100g * scale, 1);
          fat = round(usda.fat_per_100g * scale, 1);
        }

        mealCal += cal;
        mealPro += pro;
        mealCarb += carb;
        mealFat += fat;

        return { ...ing, amount_g: clamped, calories: cal, protein_g: pro, carbs_g: carb, fat_g: fat };
      });

      scaled.push({
        ...meal,
        ingredients,
        total_calories: round(mealCal),
        total_protein_g: round(mealPro, 1),
        total_carbs_g: round(mealCarb, 1),
        total_fat_g: round(mealFat, 1),
      });
    }
  }

  return scaled;
}

/**
 * Per-meal scaling: each meal is scaled independently toward its slot target,
 * fixing the root cause of uneven distribution (e.g. 1000 kcal breakfast).
 */
export function scalePortionsPerMeal(
  meals: ValidatedMeal[],
  usdaCache: Map<string, USDAFood>,
  ingredientEnMap: Map<string, string>,
  mealTargets: Record<string, number>,
): ValidatedMeal[] {
  return meals.map((meal) => {
    const slotTarget = mealTargets[meal.meal_slot];
    if (!slotTarget || meal.total_calories <= 0) return meal;

    const scaleFactor = Math.min(Math.max(slotTarget / meal.total_calories, 0.3), 2.5);
    if (Math.abs(scaleFactor - 1) < 0.05) return meal;

    let mealCal = 0, mealPro = 0, mealCarb = 0, mealFat = 0;

    const ingredients: ValidatedIngredient[] = meal.ingredients.map((ing) => {
      const newAmount = round(ing.amount_g * scaleFactor);
      const clamped = Math.min(Math.max(newAmount, 5), 500);

      const localKey = ing.name.toLowerCase().trim();
      const enName = ingredientEnMap.get(localKey) ?? ing.name;
      const usda = usdaCache.get(enName.toLowerCase()) ?? usdaCache.get(localKey);

      let cal = 0, pro = 0, carb = 0, fat = 0;
      if (usda) {
        const scale = clamped / 100;
        cal = round(usda.calories_per_100g * scale);
        pro = round(usda.protein_per_100g * scale, 1);
        carb = round(usda.carbs_per_100g * scale, 1);
        fat = round(usda.fat_per_100g * scale, 1);
      }

      mealCal += cal;
      mealPro += pro;
      mealCarb += carb;
      mealFat += fat;

      return { ...ing, amount_g: clamped, calories: cal, protein_g: pro, carbs_g: carb, fat_g: fat };
    });

    return {
      ...meal,
      ingredients,
      total_calories: round(mealCal),
      total_protein_g: round(mealPro, 1),
      total_carbs_g: round(mealCarb, 1),
      total_fat_g: round(mealFat, 1),
    };
  });
}

// ---------------------------------------------------------------------------
// Public: Drift & validation
// ---------------------------------------------------------------------------

export function computeDrift(
  meals: ValidatedMeal[],
  profile: UserProfile,
  durationDays: number,
  budgetPct = 100,
): number {
  const totalCal = meals.reduce((s, m) => s + m.total_calories, 0);
  const totalPro = meals.reduce((s, m) => s + m.total_protein_g, 0);
  const totalCarb = meals.reduce((s, m) => s + m.total_carbs_g, 0);
  const totalFat = meals.reduce((s, m) => s + m.total_fat_g, 0);

  const factor = budgetPct / 100;
  const expectedCal = profile.target_kcal * durationDays * factor;
  const expectedPro = profile.target_protein_g * durationDays * factor;
  const expectedCarb = profile.target_carbs_g * durationDays * factor;
  const expectedFat = profile.target_fat_g * durationDays * factor;

  const drifts = [
    pctDiff(totalCal, expectedCal),
    pctDiff(totalPro, expectedPro),
    pctDiff(totalCarb, expectedCarb),
    pctDiff(totalFat, expectedFat),
  ];

  return round(Math.max(...drifts), 1);
}

export function buildValidation(
  driftPct: number,
  matchRate: number,
): ValidationResult {
  return {
    nutrition_drift_pct: driftPct,
    usda_match_rate: matchRate,
    passed: driftPct <= 15,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function round(n: number, decimals = 0): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function pctDiff(actual: number, expected: number): number {
  if (expected === 0) return 0;
  return Math.abs(actual - expected) / expected * 100;
}
