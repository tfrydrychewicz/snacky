import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export const MealSlotSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack_1', 'snack_2']);
export type MealSlot = z.infer<typeof MealSlotSchema>;

export const PlanRequestSchema = z.object({
  duration_days: z.number().int().min(1).max(30),
  meals_per_day: z.number().int().min(2).max(5),
  excluded_ingredients: z.array(z.string()).default([]),
  cuisine_preferences: z.array(z.string()).default([]),
  max_prep_time_min: z.number().int().positive().optional(),
  budget_weekly: z.number().positive().optional(),
  cooking_time_pref: z.enum(['quick', 'moderate', 'elaborate']).default('moderate'),
  meal_budget_pct: z.number().int().min(50).max(100).default(85),
});
export type PlanRequest = z.infer<typeof PlanRequestSchema>;

// ---------------------------------------------------------------------------
// User profile (fetched from DB for plan generation)
// ---------------------------------------------------------------------------

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
  location: string | null;
}

// ---------------------------------------------------------------------------
// Pass 1: Recipe generation (no nutrition data)
// ---------------------------------------------------------------------------

export const Pass1IngredientSchema = z.object({
  name: z.string(),
  name_en: z.string().optional().default(''),
  amount_g: z.number().positive(),
});
export type Pass1Ingredient = z.infer<typeof Pass1IngredientSchema>;

export const Pass1MealSchema = z.object({
  slot: z.string(),
  recipe_name: z.string(),
  recipe_instructions: z.string(),
  prep_time_min: z.number().int().nonnegative(),
  presentation_tips: z.string().optional().default(''),
  ingredients: z.array(Pass1IngredientSchema).min(1),
});
export type Pass1Meal = z.infer<typeof Pass1MealSchema>;

export const Pass1DaySchema = z.object({
  day_number: z.number().int().positive(),
  meals: z.array(Pass1MealSchema).min(1),
});

export const Pass1ResponseSchema = z.object({
  days: z.array(Pass1DaySchema).min(1),
});
export type Pass1Response = z.infer<typeof Pass1ResponseSchema>;

// ---------------------------------------------------------------------------
// Pass 2: Portion optimization (mini model adjusts amounts)
// ---------------------------------------------------------------------------

export const Pass2IngredientSchema = z.object({
  name_en: z.string(),
  amount_g: z.number().positive(),
});

export const Pass2MealSchema = z.object({
  slot: z.string(),
  ingredients: z.array(Pass2IngredientSchema).min(1),
});

export const Pass2DaySchema = z.object({
  day_number: z.number().int().positive(),
  meals: z.array(Pass2MealSchema).min(1),
});

export const Pass2ResponseSchema = z.object({
  days: z.array(Pass2DaySchema).min(1),
});
export type Pass2Response = z.infer<typeof Pass2ResponseSchema>;

// ---------------------------------------------------------------------------
// USDA lookup result
// ---------------------------------------------------------------------------

export interface USDAFood {
  fdc_id: number;
  description: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

// ---------------------------------------------------------------------------
// Final validated meal (after USDA nutrition + portion optimization)
// ---------------------------------------------------------------------------

export interface ValidatedIngredient {
  name: string;
  amount_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  usda_fdc_id: number | null;
  usda_validated: boolean;
}

export interface ValidatedMeal {
  day_number: number;
  meal_slot: string;
  recipe_name: string;
  recipe_instructions: string;
  prep_time_min: number;
  presentation_tips: string;
  ingredients: ValidatedIngredient[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

// ---------------------------------------------------------------------------
// Shopping list
// ---------------------------------------------------------------------------

export interface ShoppingListItem {
  name: string;
  total_g: number;
  display_qty: string;
  category: ShoppingCategory;
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

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  nutrition_drift_pct: number;
  usda_match_rate: number;
  passed: boolean;
}

// ---------------------------------------------------------------------------
// API response
// ---------------------------------------------------------------------------

export interface PlanResponse {
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  meals_per_day: number;
  meals: ValidatedMeal[];
  shopping_list: ShoppingListItem[];
  validation: ValidationResult;
  generation_metadata: {
    model: string;
    generation_time_ms: number;
    chunks_generated: number;
  };
}
