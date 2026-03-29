import { z } from 'zod';
import { TimestampedSchema } from './common';

export const ChatRoleSchema = z.enum(['user', 'assistant']);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatMessageSchema = TimestampedSchema.extend({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  role: ChatRoleSchema,
  content: z.string(),
  metadata: z.record(z.unknown()).nullable(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatSessionSchema = TimestampedSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().nullable(),
  message_count: z.number().int().nonnegative(),
});

export type ChatSession = z.infer<typeof ChatSessionSchema>;

// ---------------------------------------------------------------------------
// Rich content blocks returned in chat message attachments
// ---------------------------------------------------------------------------

export const MealIngredientBlockSchema = z.object({
  name: z.string(),
  portion_g: z.number(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
});

export type MealIngredientBlock = z.infer<typeof MealIngredientBlockSchema>;

export const MealBlockDataSchema = z.object({
  meal_id: z.string().uuid(),
  meal_type: z.string(),
  logged_at: z.string(),
  image_key: z.string().nullable(),
  total_calories: z.number(),
  total_protein_g: z.number(),
  total_carbs_g: z.number(),
  total_fat_g: z.number(),
  ingredients: z.array(MealIngredientBlockSchema),
});

export type MealBlockData = z.infer<typeof MealBlockDataSchema>;

export const DayAggregateBlockSchema = z.object({
  date: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
});

export type DayAggregateBlock = z.infer<typeof DayAggregateBlockSchema>;

export const WeightPointBlockSchema = z.object({
  date: z.string(),
  weight_kg: z.number(),
});

export type WeightPointBlock = z.infer<typeof WeightPointBlockSchema>;

export const MealSummaryBlockSchema = z.object({
  type: z.literal('meal_summary'),
  meals: z.array(MealBlockDataSchema),
});

export const NutrientChartBlockSchema = z.object({
  type: z.literal('nutrient_chart'),
  data: z.array(DayAggregateBlockSchema),
  target_protein_g: z.number().nullable(),
  target_carbs_g: z.number().nullable(),
  target_fat_g: z.number().nullable(),
});

export const CalorieChartBlockSchema = z.object({
  type: z.literal('calorie_chart'),
  data: z.array(DayAggregateBlockSchema),
  target_kcal: z.number().nullable(),
});

export const WeightChartBlockSchema = z.object({
  type: z.literal('weight_chart'),
  data: z.array(WeightPointBlockSchema),
  goal_kg: z.number().nullable(),
});

export const ChatBlockSchema = z.discriminatedUnion('type', [
  MealSummaryBlockSchema,
  NutrientChartBlockSchema,
  CalorieChartBlockSchema,
  WeightChartBlockSchema,
]);

export type ChatBlock = z.infer<typeof ChatBlockSchema>;

export const ChatAttachmentsSchema = z.object({
  blocks: z.array(ChatBlockSchema),
});

export type ChatAttachments = z.infer<typeof ChatAttachmentsSchema>;
