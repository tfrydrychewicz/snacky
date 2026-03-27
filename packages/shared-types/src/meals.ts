import { z } from 'zod';
import { TimestampedSchema } from './common';
import { MacroBreakdownSchema } from './macros';

export const MealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof MealTypeSchema>;

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

export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;

export const MealScanResultSchema = z.object({
  ingredients: z.array(IngredientAnalysisSchema),
  total: MacroBreakdownSchema,
  overall_confidence: z.number().min(0).max(1),
  nova_classification: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  clarification_needed: z.boolean(),
  clarification_questions: z.array(ClarificationQuestionSchema).default([]),
  model_used: z.string(),
  processing_time_ms: z.number().int().positive(),
});

export type MealScanResult = z.infer<typeof MealScanResultSchema>;

export const MealSchema = TimestampedSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  meal_type: MealTypeSchema,
  logged_at: z.string().datetime(),
  photo_url: z.string().url().nullable(),
  ingredients: z.array(IngredientAnalysisSchema),
  total_macros: MacroBreakdownSchema,
  user_comment: z.string().nullable(),
  scan_confidence: z.number().min(0).max(1),
});

export type Meal = z.infer<typeof MealSchema>;
