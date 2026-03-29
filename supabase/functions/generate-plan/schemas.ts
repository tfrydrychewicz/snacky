import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

export const MealSlotSchema = z.enum([
  'breakfast',
  'lunch',
  'dinner',
  'snack_1',
  'snack_2',
]);
export type MealSlot = z.infer<typeof MealSlotSchema>;

export const PlanRequestSchema = z.object({
  duration_days: z.number().int().min(1).max(30),
  meals_per_day: z.number().int().min(2).max(5),
  excluded_ingredients: z.array(z.string()).default([]),
  cuisine_preferences: z.array(z.string()).default([]),
  max_prep_time_min: z.number().int().positive().optional(),
  budget_weekly: z.number().positive().optional(),
  cooking_time_pref: z.enum(['quick', 'moderate', 'elaborate']).default('moderate'),
});
export type PlanRequest = z.infer<typeof PlanRequestSchema>;

export interface UserProfile {
  user_id: string;
  target_kcal: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  allergies: string[];
  dietary_restrictions: string[];
  cooking_skill: string | null;
  cuisine_preferences: string[];
  date_of_birth: string | null;
  biological_sex: string | null;
  locale: string;
}

export interface CandidateFood {
  fdc_id: number;
  description: string;
  food_category: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
  sugar_per_100g: number | null;
  sodium_per_100g: number | null;
  saturated_fat_per_100g: number | null;
  serving_size_g: number | null;
  // Vitamins
  vitamin_a_ug_per_100g: number | null;
  vitamin_c_mg_per_100g: number | null;
  vitamin_d_ug_per_100g: number | null;
  vitamin_e_mg_per_100g: number | null;
  vitamin_k_ug_per_100g: number | null;
  thiamin_mg_per_100g: number | null;
  riboflavin_mg_per_100g: number | null;
  niacin_mg_per_100g: number | null;
  vitamin_b6_mg_per_100g: number | null;
  folate_ug_per_100g: number | null;
  vitamin_b12_ug_per_100g: number | null;
  choline_mg_per_100g: number | null;
  // Minerals
  calcium_mg_per_100g: number | null;
  iron_mg_per_100g: number | null;
  magnesium_mg_per_100g: number | null;
  phosphorus_mg_per_100g: number | null;
  potassium_mg_per_100g: number | null;
  zinc_mg_per_100g: number | null;
  copper_mg_per_100g: number | null;
  selenium_ug_per_100g: number | null;
}

export interface MicronutrientTotals {
  vitamin_a_ug: number;
  vitamin_c_mg: number;
  vitamin_d_ug: number;
  vitamin_e_mg: number;
  vitamin_k_ug: number;
  thiamin_mg: number;
  riboflavin_mg: number;
  niacin_mg: number;
  vitamin_b6_mg: number;
  folate_ug: number;
  vitamin_b12_ug: number;
  choline_mg: number;
  calcium_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  phosphorus_mg: number;
  potassium_mg: number;
  zinc_mg: number;
  copper_mg: number;
  selenium_ug: number;
}

export interface SlotAssignment {
  food: CandidateFood;
  portion_g: number;
}

export interface PlannedMeal {
  day_number: number;
  meal_slot: MealSlot;
  foods: SlotAssignment[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  micronutrients: MicronutrientTotals;
  recipe_name?: string;
  recipe_instructions?: string;
  prep_time_min?: number;
  presentation_tips?: string;
}

export interface GeneratedRecipe {
  slot: string;
  recipe_name: string;
  recipe_instructions: string;
  prep_time_min: number;
  presentation_tips: string;
}

export interface ShoppingListItem {
  name: string;
  total_g: number;
  display_qty: string;
  category: ShoppingCategory;
  usda_fdc_ids: number[];
}

export type ShoppingCategory =
  | 'produce'
  | 'meat_seafood'
  | 'dairy_eggs'
  | 'grains_bread'
  | 'pantry'
  | 'oils_condiments'
  | 'frozen'
  | 'other';

export interface AllergenFlag {
  meal_day: number;
  meal_slot: string;
  allergen: string;
  found_in: string;
}

export interface ValidationResult {
  allergen_flags: AllergenFlag[];
  nutrition_drift_pct: number;
  passed: boolean;
}

export interface SolverResult {
  meals: PlannedMeal[];
  objective_value: number;
  solver_time_ms: number;
  method: 'heuristic' | 'milp';
  iterations: number;
  unique_ingredients: number;
}

export interface PlanResponse {
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  meals_per_day: number;
  meals: PlannedMeal[];
  shopping_list: ShoppingListItem[];
  validation: ValidationResult;
  solver_metadata: {
    method: string;
    solver_time_ms: number;
    objective_value: number;
    iterations: number;
    unique_ingredients: number;
  };
}
