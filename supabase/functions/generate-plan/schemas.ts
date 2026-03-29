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
  solver_metadata: {
    method: string;
    solver_time_ms: number;
    objective_value: number;
    iterations: number;
    unique_ingredients: number;
  };
}
