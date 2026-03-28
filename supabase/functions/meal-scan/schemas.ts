/**
 * Zod schemas for meal-scan Edge Function I/O.
 * Mirrors @snacky/shared-types/src/meals.ts — keep in sync.
 */
import { z } from 'https://esm.sh/zod@3.24.0';

export const MacroBreakdownSchema = z.object({
  calories_kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbohydrates_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  fiber_g: z.number().nonnegative().optional(),
  sugar_g: z.number().nonnegative().optional(),
  sodium_mg: z.number().nonnegative().optional(),
});

export const IngredientAnalysisSchema = z.object({
  name: z.string(),
  quantity_g: z.number().positive(),
  confidence: z.number().min(0).max(1),
  macros: MacroBreakdownSchema,
  usda_fdc_id: z.number().int().positive().nullable(),
});

export type IngredientAnalysis = z.infer<typeof IngredientAnalysisSchema>;

export const ClarificationQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2),
  field: z.string(),
});

export const VisionResponseSchema = z.object({
  ingredients: z.array(IngredientAnalysisSchema),
  total: MacroBreakdownSchema,
  overall_confidence: z.number().min(0).max(1),
  nova_classification: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  clarification_needed: z.boolean(),
  clarification_questions: z.array(ClarificationQuestionSchema).default([]),
});

export type VisionResponse = z.infer<typeof VisionResponseSchema>;

export const ClarificationAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const MealScanRequestSchema = z.object({
  image: z.string().min(1),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'unknown']).default('unknown'),
  locale: z.string().default('en'),
  clarifications: z.array(ClarificationAnswerSchema).optional(),
});

export type MealScanRequest = z.infer<typeof MealScanRequestSchema>;
