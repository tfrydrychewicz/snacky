import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import type { SolverResult, PlanRequest, UserProfile, PlanResponse } from './schemas.ts';
import { FOOD_COL_TO_RDA_KEY } from './rda.ts';

export async function storePlan(
  supabase: SupabaseClient,
  userId: string,
  request: PlanRequest,
  profile: UserProfile,
  result: SolverResult,
): Promise<PlanResponse> {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + request.duration_days - 1);

  const startDateStr = startDate.toISOString().slice(0, 10);
  const endDateStr = endDate.toISOString().slice(0, 10);

  const config = {
    duration_days: request.duration_days,
    meals_per_day: request.meals_per_day,
    excluded_ingredients: request.excluded_ingredients,
    cuisine_preferences: request.cuisine_preferences,
    max_prep_time_min: request.max_prep_time_min ?? null,
    cooking_time_pref: request.cooking_time_pref,
  };

  const solverMeta = {
    method: result.method,
    solver_time_ms: result.solver_time_ms,
    objective_value: result.objective_value,
    iterations: result.iterations,
    unique_ingredients: result.unique_ingredients,
  };

  // Deactivate any existing active plans
  await supabase
    .from('diet_plans')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active');

  // Insert new plan
  const { data: plan, error: planError } = await supabase
    .from('diet_plans')
    .insert({
      user_id: userId,
      name: `${request.duration_days}-Day Plan`,
      status: 'active',
      start_date: startDateStr,
      end_date: endDateStr,
      meals_per_day: request.meals_per_day,
      config,
      target_kcal: profile.target_kcal,
      target_macros: {
        protein_g: profile.target_protein_g,
        carbs_g: profile.target_carbs_g,
        fat_g: profile.target_fat_g,
      },
      solver_metadata: solverMeta,
    })
    .select('id')
    .single();

  if (planError || !plan) {
    throw new Error(`Failed to create diet plan: ${planError?.message ?? 'no data'}`);
  }

  const planId = (plan as { id: string }).id;

  // Insert plan meals in batches
  const mealRows = result.meals.map((meal, idx) => ({
    diet_plan_id: planId,
    day_number: meal.day_number,
    meal_slot: meal.meal_slot,
    recipe_name: buildRecipeName(meal.foods.map((f) => f.food.description)),
    recipe_instructions: null,
    prep_time_min: null,
    ingredients: meal.foods.map((f) => {
      const scale = f.portion_g / 100;
      const micros: Record<string, number> = {};
      for (const [col, key] of Object.entries(FOOD_COL_TO_RDA_KEY)) {
        const val = (f.food as unknown as Record<string, number | null>)[col];
        if (val != null) {
          micros[key] = Math.round(val * scale * 100) / 100;
        }
      }
      return {
        name: f.food.description,
        amount_g: f.portion_g,
        usda_fdc_id: f.food.fdc_id,
        calories: Math.round((f.food.calories_per_100g ?? 0) * scale),
        protein_g: Math.round((f.food.protein_per_100g ?? 0) * scale * 10) / 10,
        carbs_g: Math.round((f.food.carbs_per_100g ?? 0) * scale * 10) / 10,
        fat_g: Math.round((f.food.fat_per_100g ?? 0) * scale * 10) / 10,
        micronutrients: micros,
      };
    }),
    calories: meal.total_calories,
    protein_g: meal.total_protein_g,
    carbs_g: meal.total_carbs_g,
    fat_g: meal.total_fat_g,
    micronutrients: meal.micronutrients,
    image_url: null,
    sort_order: idx,
  }));

  const BATCH_SIZE = 50;
  for (let i = 0; i < mealRows.length; i += BATCH_SIZE) {
    const batch = mealRows.slice(i, i + BATCH_SIZE);
    const { error: mealError } = await supabase
      .from('diet_plan_meals')
      .insert(batch);

    if (mealError) {
      throw new Error(`Failed to insert plan meals: ${mealError.message}`);
    }
  }

  return {
    plan_id: planId,
    status: 'active',
    start_date: startDateStr,
    end_date: endDateStr,
    duration_days: request.duration_days,
    meals_per_day: request.meals_per_day,
    meals: result.meals,
    solver_metadata: solverMeta,
  };
}

function buildRecipeName(foodNames: string[]): string {
  if (foodNames.length === 0) return 'Empty meal';
  if (foodNames.length === 1) return foodNames[0];

  const shortened = foodNames.map((name) => {
    const parts = name.split(',');
    return parts[0].trim();
  });

  if (shortened.length <= 3) {
    return shortened.join(' with ');
  }

  return `${shortened.slice(0, 2).join(' with ')} and ${shortened.length - 2} more`;
}
