import { z } from 'zod';

export const NutrientWarningSeverity = z.enum(['strong', 'moderate', 'mild']);

export const NutrientWarningSchema = z.object({
  id: z.string(),
  severity: NutrientWarningSeverity,
  title: z.string(),
  description: z.string(),
  suggestion: z.string(),
  nutrients: z.array(z.string()),
});

export type NutrientWarning = z.infer<typeof NutrientWarningSchema>;

export const NutrientSynergySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  nutrients: z.array(z.string()),
});

export type NutrientSynergy = z.infer<typeof NutrientSynergySchema>;

export const NutrientInsightsResultSchema = z.object({
  has_insights: z.boolean(),
  insight_count: z.number().int().nonnegative(),
  warnings: z.array(NutrientWarningSchema),
  synergies: z.array(NutrientSynergySchema),
});

export type NutrientInsightsResult = z.infer<typeof NutrientInsightsResultSchema>;
