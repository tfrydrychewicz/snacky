export interface PlanConfig {
  duration_days: number;
  meals_per_day: number;
  excluded_ingredients: string[];
  cuisine_preferences: string[];
  cooking_time_pref: 'quick' | 'moderate' | 'elaborate';
  max_prep_time_min?: number;
  /** Percentage of daily target_kcal allocated to planned meals (70–100, default 85) */
  meal_budget_pct?: number;
}

export interface PlanIngredient {
  name: string;
  amount_g: number;
  usda_fdc_id: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  micronutrients?: Record<string, number>;
}

export interface PlanMeal {
  id: string;
  diet_plan_id: string;
  day_number: number;
  meal_slot: string;
  recipe_name: string;
  recipe_instructions: string | null;
  prep_time_min: number | null;
  ingredients: PlanIngredient[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  micronutrients: Record<string, number> | null;
  image_url: string | null;
  skipped: boolean;
  sort_order: number;
}

export interface ShoppingListItem {
  name: string;
  total_g: number;
  display_qty: string;
  category: string;
}

export interface ValidationResult {
  allergen_flags: Array<{
    meal_day: number;
    meal_slot: string;
    allergen: string;
    found_in: string;
  }>;
  nutrition_drift_pct: number;
  passed: boolean;
}

export interface DietPlan {
  id: string;
  name: string | null;
  status: string;
  start_date: string;
  end_date: string;
  meals_per_day: number;
  config: PlanConfig;
  target_kcal: number;
  target_macros: { protein_g: number; carbs_g: number; fat_g: number };
  shopping_list: ShoppingListItem[] | null;
  validation: ValidationResult | null;
  created_at: string;
}

export interface DietPlanWithMeals extends DietPlan {
  meals: PlanMeal[];
}
