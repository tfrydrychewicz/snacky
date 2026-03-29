import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import type { UserProfile, CandidateFood, PlanRequest } from './schemas.ts';

const MIN_CANDIDATES = 80;
const MAX_CANDIDATES = 300;

const FOOD_SELECT_COLS = [
  'fdc_id', 'description', 'food_category',
  'calories_per_100g', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g',
  'fiber_per_100g', 'sugar_per_100g', 'sodium_per_100g', 'saturated_fat_per_100g',
  'serving_size_g',
  'vitamin_a_ug_per_100g', 'vitamin_c_mg_per_100g', 'vitamin_d_ug_per_100g',
  'vitamin_e_mg_per_100g', 'vitamin_k_ug_per_100g',
  'thiamin_mg_per_100g', 'riboflavin_mg_per_100g', 'niacin_mg_per_100g',
  'vitamin_b6_mg_per_100g', 'folate_ug_per_100g', 'vitamin_b12_ug_per_100g',
  'choline_mg_per_100g',
  'calcium_mg_per_100g', 'iron_mg_per_100g', 'magnesium_mg_per_100g',
  'phosphorus_mg_per_100g', 'potassium_mg_per_100g', 'zinc_mg_per_100g',
  'copper_mg_per_100g', 'selenium_ug_per_100g',
].join(', ');

export async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(
      'target_kcal, target_protein_g, target_carbs_g, target_fat_g, allergies, dietary_restrictions, cooking_skill, cuisine_preferences, date_of_birth, biological_sex, locale',
    )
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error(`User profile not found: ${error?.message ?? 'no data'}`);
  }

  const p = data as Record<string, unknown>;
  return {
    user_id: userId,
    target_kcal: (p.target_kcal as number) ?? 2000,
    target_protein_g: (p.target_protein_g as number) ?? 100,
    target_carbs_g: (p.target_carbs_g as number) ?? 250,
    target_fat_g: (p.target_fat_g as number) ?? 65,
    allergies: (p.allergies as string[]) ?? [],
    dietary_restrictions: (p.dietary_restrictions as string[]) ?? [],
    cooking_skill: (p.cooking_skill as string) ?? null,
    cuisine_preferences: (p.cuisine_preferences as string[]) ?? [],
    date_of_birth: (p.date_of_birth as string) ?? null,
    biological_sex: (p.biological_sex as string) ?? null,
    locale: (p.locale as string) ?? 'en',
  };
}

/**
 * Fetches candidate foods from usda_foods, filtering out allergens
 * and respecting dietary restrictions.
 */
export async function fetchCandidateFoods(
  supabase: SupabaseClient,
  profile: UserProfile,
  request: PlanRequest,
): Promise<CandidateFood[]> {
  const excluded = [
    ...profile.allergies,
    ...profile.dietary_restrictions,
    ...request.excluded_ingredients,
  ].map((s) => s.toLowerCase());

  let query = supabase
    .from('usda_foods')
    .select(FOOD_SELECT_COLS)
    .not('calories_per_100g', 'is', null)
    .gt('calories_per_100g', 0)
    .order('food_category', { ascending: true })
    .limit(MAX_CANDIDATES);

  const preferredCategories = request.cuisine_preferences.length > 0
    ? request.cuisine_preferences
    : profile.cuisine_preferences;

  if (preferredCategories.length > 0) {
    query = query.or(
      preferredCategories.map((c) => `food_category.ilike.%${c}%`).join(','),
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch candidate foods: ${error.message}`);
  }

  if (!data || data.length === 0) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('usda_foods')
      .select(FOOD_SELECT_COLS)
      .not('calories_per_100g', 'is', null)
      .gt('calories_per_100g', 0)
      .limit(MAX_CANDIDATES);

    if (fallbackError || !fallbackData) {
      throw new Error('No candidate foods available');
    }

    return filterExcluded(fallbackData as CandidateFood[], excluded);
  }

  let candidates = filterExcluded(data as CandidateFood[], excluded);

  if (candidates.length < MIN_CANDIDATES) {
    const existingIds = new Set(candidates.map((c) => c.fdc_id));
    const { data: moreData } = await supabase
      .from('usda_foods')
      .select(FOOD_SELECT_COLS)
      .not('calories_per_100g', 'is', null)
      .gt('calories_per_100g', 0)
      .limit(MAX_CANDIDATES);

    if (moreData) {
      const extras = filterExcluded(moreData as CandidateFood[], excluded)
        .filter((f) => !existingIds.has(f.fdc_id));
      candidates = [...candidates, ...extras].slice(0, MAX_CANDIDATES);
    }
  }

  return candidates;
}

function filterExcluded(foods: CandidateFood[], excluded: string[]): CandidateFood[] {
  if (excluded.length === 0) return foods;

  return foods.filter((food) => {
    const desc = food.description.toLowerCase();
    const cat = (food.food_category ?? '').toLowerCase();
    return !excluded.some((ex) => desc.includes(ex) || cat.includes(ex));
  });
}

/**
 * Categorize foods into meal-appropriate groups based on food_category.
 */
export function categorizeFoods(
  candidates: CandidateFood[],
): Record<string, CandidateFood[]> {
  const categories: Record<string, CandidateFood[]> = {
    protein: [],
    grain: [],
    vegetable: [],
    fruit: [],
    dairy: [],
    fat: [],
    other: [],
  };

  for (const food of candidates) {
    const cat = (food.food_category ?? '').toLowerCase();
    const desc = food.description.toLowerCase();

    if (
      cat.includes('meat') || cat.includes('poultry') || cat.includes('fish') ||
      cat.includes('seafood') || cat.includes('egg') || cat.includes('legume') ||
      cat.includes('bean') || cat.includes('nut') || desc.includes('chicken') ||
      desc.includes('beef') || desc.includes('pork') || desc.includes('salmon') ||
      desc.includes('tofu')
    ) {
      categories.protein.push(food);
    } else if (
      cat.includes('grain') || cat.includes('cereal') || cat.includes('bread') ||
      cat.includes('pasta') || cat.includes('rice') || desc.includes('rice') ||
      desc.includes('bread') || desc.includes('oat')
    ) {
      categories.grain.push(food);
    } else if (
      cat.includes('vegetable') || desc.includes('broccoli') ||
      desc.includes('spinach') || desc.includes('carrot') ||
      desc.includes('tomato')
    ) {
      categories.vegetable.push(food);
    } else if (
      cat.includes('fruit') || desc.includes('apple') || desc.includes('banana') ||
      desc.includes('berry')
    ) {
      categories.fruit.push(food);
    } else if (
      cat.includes('dairy') || cat.includes('milk') || cat.includes('cheese') ||
      cat.includes('yogurt')
    ) {
      categories.dairy.push(food);
    } else if (
      cat.includes('oil') || cat.includes('fat') || desc.includes('butter') ||
      desc.includes('olive oil')
    ) {
      categories.fat.push(food);
    } else {
      categories.other.push(food);
    }
  }

  return categories;
}
