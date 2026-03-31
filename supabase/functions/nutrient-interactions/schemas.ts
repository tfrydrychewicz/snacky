/**
 * Deno-side Zod schemas — keep aligned with @snacky/shared-types/nutrient-interactions
 */
import { z } from 'https://esm.sh/zod@3.23.8';

// ── Request ──

const MacroBreakdownSchema = z.object({
  calories_kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbohydrates_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  fiber_g: z.number().nonnegative().optional(),
  sugar_g: z.number().nonnegative().optional(),
  sodium_mg: z.number().nonnegative().optional(),
  saturated_fat_g: z.number().nonnegative().optional(),
});

const IngredientInputSchema = z.object({
  name: z.string(),
  usda_fdc_id: z.number().int().positive().nullable(),
  quantity_g: z.number().positive(),
  macros: MacroBreakdownSchema,
});

export type IngredientInput = z.infer<typeof IngredientInputSchema>;

export const RequestSchema = z.object({
  ingredients: z.array(IngredientInputSchema).min(1),
  locale: z.string().default('en'),
});

// ── Response ──

export const NutrientWarningSchema = z.object({
  id: z.string(),
  severity: z.enum(['strong', 'moderate', 'mild']),
  title: z.string(),
  description: z.string(),
  suggestion: z.string(),
  nutrients: z.array(z.string()),
});

export const NutrientSynergySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  nutrients: z.array(z.string()),
});

export const NutrientInsightsResultSchema = z.object({
  has_insights: z.boolean(),
  insight_count: z.number().int().nonnegative(),
  warnings: z.array(NutrientWarningSchema),
  synergies: z.array(NutrientSynergySchema),
});

export type NutrientInsightsResult = z.infer<typeof NutrientInsightsResultSchema>;
