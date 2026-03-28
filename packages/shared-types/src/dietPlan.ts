import { z } from 'zod';
import { TimestampedSchema } from './common';
import { MacroBreakdownSchema } from './macros';
import { MealTypeSchema } from './meals';

export const RecipeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  instructions: z.array(z.string()),
  prep_time_min: z.number().int().nonnegative(),
  cook_time_min: z.number().int().nonnegative(),
  servings: z.number().int().positive(),
  ingredients_list: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      unit: z.string(),
    }),
  ),
  macros_per_serving: MacroBreakdownSchema,
});

export type Recipe = z.infer<typeof RecipeSchema>;

export const DietPlanDaySchema = z.object({
  date: z.string().date(),
  slots: z.array(
    z.object({
      meal_type: MealTypeSchema,
      recipe_id: z.string().uuid(),
      macros: MacroBreakdownSchema,
    }),
  ),
  total_macros: MacroBreakdownSchema,
});

export type DietPlanDay = z.infer<typeof DietPlanDaySchema>;

export const DietPlanSchema = TimestampedSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  start_date: z.string().date(),
  end_date: z.string().date(),
  days: z.array(DietPlanDaySchema),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
});

export type DietPlan = z.infer<typeof DietPlanSchema>;
