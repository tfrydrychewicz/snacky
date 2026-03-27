import { z } from 'zod';
import { TimestampedSchema } from './common';

export const GenderSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);
export type Gender = z.infer<typeof GenderSchema>;

export const GoalTypeSchema = z.enum(['lose_weight', 'maintain_weight', 'gain_weight', 'build_muscle', 'improve_health']);
export type GoalType = z.infer<typeof GoalTypeSchema>;

export const ActivityLevelSchema = z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active']);
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;

export const UserProfileSchema = TimestampedSchema.extend({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().min(1).max(100),
  avatar_url: z.string().url().nullable(),
  date_of_birth: z.string().date(),
  gender: GenderSchema,
  height_cm: z.number().positive(),
  weight_kg: z.number().positive(),
  goal: GoalTypeSchema,
  activity_level: ActivityLevelSchema,
  dietary_restrictions: z.array(z.string()).default([]),
  target_calories_kcal: z.number().int().positive().nullable(),
  locale: z.enum(['pl', 'en']).default('en'),
  onboarding_completed: z.boolean().default(false),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
