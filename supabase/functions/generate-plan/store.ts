import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import type {
  PlanRequest,
  UserProfile,
  ValidatedMeal,
  ShoppingListItem,
  ValidationResult,
} from './schemas.ts';

interface GenerationMeta {
  model: string;
  generation_time_ms: number;
  chunks_generated: number;
}

/**
 * Creates the plan row with status='generating' so the client can
 * start polling for meals immediately via the returned planId.
 * Does NOT archive existing active plans — that happens in finalizePlan.
 */
export async function createPlanRow(
  supabase: SupabaseClient,
  userId: string,
  request: PlanRequest,
  profile: UserProfile,
): Promise<string> {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + request.duration_days - 1);

  const config = {
    duration_days: request.duration_days,
    meals_per_day: request.meals_per_day,
    excluded_ingredients: request.excluded_ingredients,
    cuisine_preferences: request.cuisine_preferences,
    max_prep_time_min: request.max_prep_time_min ?? null,
    cooking_time_pref: request.cooking_time_pref,
  };

  const { data: plan, error } = await supabase
    .from('diet_plans')
    .insert({
      user_id: userId,
      name: `${request.duration_days}-Day Plan`,
      status: 'generating',
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      meals_per_day: request.meals_per_day,
      config,
      target_kcal: profile.target_kcal,
      target_macros: {
        protein_g: profile.target_protein_g,
        carbs_g: profile.target_carbs_g,
        fat_g: profile.target_fat_g,
      },
    })
    .select('id')
    .single();

  if (error || !plan) {
    throw new Error(`Failed to create diet plan: ${error?.message ?? 'no data'}`);
  }

  return (plan as { id: string }).id;
}

/**
 * Inserts a batch of meals (one chunk) into diet_plan_meals.
 * Called after each 2-day chunk is USDA-enriched so the client
 * can see meals appear progressively via polling.
 */
export async function insertChunkMeals(
  supabase: SupabaseClient,
  planId: string,
  meals: ValidatedMeal[],
  sortOffset: number,
): Promise<void> {
  const mealRows = meals.map((meal, idx) => ({
    diet_plan_id: planId,
    day_number: meal.day_number,
    meal_slot: meal.meal_slot,
    recipe_name: meal.recipe_name,
    recipe_instructions: meal.recipe_instructions,
    prep_time_min: meal.prep_time_min,
    ingredients: meal.ingredients.map((ing) => ({
      name: ing.name,
      amount_g: ing.amount_g,
      usda_fdc_id: ing.usda_fdc_id,
      calories: ing.calories,
      protein_g: ing.protein_g,
      carbs_g: ing.carbs_g,
      fat_g: ing.fat_g,
    })),
    calories: meal.total_calories,
    protein_g: meal.total_protein_g,
    carbs_g: meal.total_carbs_g,
    fat_g: meal.total_fat_g,
    micronutrients: null,
    image_url: null,
    sort_order: sortOffset + idx,
  }));

  const { error } = await supabase.from('diet_plan_meals').insert(mealRows);

  if (error) {
    throw new Error(`Failed to insert chunk meals: ${error.message}`);
  }
}

/**
 * Replaces pre-optimization meals with Pass 2 results,
 * archives any existing active plans, and sets this plan to 'active'.
 */
export async function finalizePlan(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
  finalMeals: ValidatedMeal[],
  shoppingList: ShoppingListItem[],
  validation: ValidationResult,
  meta: GenerationMeta,
): Promise<void> {
  await supabase.from('diet_plan_meals').delete().eq('diet_plan_id', planId);

  const mealRows = finalMeals.map((meal, idx) => ({
    diet_plan_id: planId,
    day_number: meal.day_number,
    meal_slot: meal.meal_slot,
    recipe_name: meal.recipe_name,
    recipe_instructions: meal.recipe_instructions,
    prep_time_min: meal.prep_time_min,
    ingredients: meal.ingredients.map((ing) => ({
      name: ing.name,
      amount_g: ing.amount_g,
      usda_fdc_id: ing.usda_fdc_id,
      calories: ing.calories,
      protein_g: ing.protein_g,
      carbs_g: ing.carbs_g,
      fat_g: ing.fat_g,
    })),
    calories: meal.total_calories,
    protein_g: meal.total_protein_g,
    carbs_g: meal.total_carbs_g,
    fat_g: meal.total_fat_g,
    micronutrients: null,
    image_url: null,
    sort_order: idx,
  }));

  const BATCH = 50;
  for (let i = 0; i < mealRows.length; i += BATCH) {
    const batch = mealRows.slice(i, i + BATCH);
    const { error } = await supabase.from('diet_plan_meals').insert(batch);
    if (error) {
      throw new Error(`Failed to insert final meals: ${error.message}`);
    }
  }

  await archiveAndActivate(supabase, userId, planId, shoppingList, validation, meta);
}

/**
 * Lightweight finalize — meals are already optimized and in DB.
 * Archives old active plans, sets this plan to 'active' with metadata.
 */
export async function finalizePlanMetadata(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
  shoppingList: ShoppingListItem[],
  validation: ValidationResult,
  meta: GenerationMeta,
): Promise<void> {
  await archiveAndActivate(supabase, userId, planId, shoppingList, validation, meta);
}

/**
 * Update a single meal's image_url after async image generation.
 */
export async function updateMealImageUrl(
  supabase: SupabaseClient,
  mealId: string,
  imageUrl: string,
): Promise<void> {
  const { error } = await supabase
    .from('diet_plan_meals')
    .update({ image_url: imageUrl })
    .eq('id', mealId);

  if (error) {
    throw new Error(`Failed to update meal image: ${error.message}`);
  }
}

async function archiveAndActivate(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
  shoppingList: ShoppingListItem[],
  validation: ValidationResult,
  meta: GenerationMeta,
): Promise<void> {
  await supabase
    .from('diet_plans')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active');

  const { error: updateError } = await supabase
    .from('diet_plans')
    .update({
      status: 'active',
      solver_metadata: { ...meta, method: 'llm' },
      shopping_list: shoppingList,
      validation,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId);

  if (updateError) {
    throw new Error(`Failed to finalize plan: ${updateError.message}`);
  }
}
