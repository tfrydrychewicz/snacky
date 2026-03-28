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

export const MealRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  meal_type: z.string(),
  logged_at: z.string(),
  timezone_offset: z.number().nullable(),
  image_key: z.string().nullable(),
  ai_analysis: z.record(z.unknown()).nullable(),
  total_calories: z.number(),
  total_protein_g: z.number(),
  total_carbs_g: z.number(),
  total_fat_g: z.number(),
  total_fiber_g: z.number(),
  total_sugar_g: z.number(),
  total_sodium_mg: z.number(),
  user_modified: z.boolean(),
  modification_diff: z.record(z.unknown()).nullable(),
  source: z.string(),
  nova_class: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type MealRow = z.infer<typeof MealRowSchema>;

export const MealIngredientRowSchema = z.object({
  id: z.string().uuid(),
  meal_id: z.string().uuid(),
  name: z.string(),
  usda_fdc_id: z.number().nullable(),
  portion_g: z.number(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  confidence: z.number(),
  user_verified: z.boolean(),
  sort_order: z.number(),
});

export type MealIngredientRow = z.infer<typeof MealIngredientRowSchema>;

export const MealCommentRowSchema = z.object({
  id: z.string().uuid(),
  meal_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string(),
  created_at: z.string(),
});

export type MealCommentRow = z.infer<typeof MealCommentRowSchema>;

export const MealWithIngredientsSchema = MealRowSchema.extend({
  meal_ingredients: z.array(MealIngredientRowSchema),
});

export type MealWithIngredients = z.infer<typeof MealWithIngredientsSchema>;
