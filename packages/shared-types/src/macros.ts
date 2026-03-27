import { z } from 'zod';

export const MacroBreakdownSchema = z.object({
  calories_kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbohydrates_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  fiber_g: z.number().nonnegative().optional(),
  sugar_g: z.number().nonnegative().optional(),
  sodium_mg: z.number().nonnegative().optional(),
  saturated_fat_g: z.number().nonnegative().optional(),
});

export type MacroBreakdown = z.infer<typeof MacroBreakdownSchema>;
