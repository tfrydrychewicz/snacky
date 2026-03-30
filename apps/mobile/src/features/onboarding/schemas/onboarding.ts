import { z } from 'zod';

export const biologicalSexOptions = ['male', 'female'] as const;
export const goalTypeOptions = [
  'lose_weight',
  'gain_muscle',
  'maintain',
  'improve_nutrition',
] as const;
export const activityLevelOptions = [
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'extra_active',
] as const;
export const cookingSkillOptions = ['beginner', 'intermediate', 'advanced'] as const;
export const cookingTimePrefOptions = ['quick', 'moderate', 'elaborate'] as const;
export const snackingPatternOptions = ['none', 'occasional', 'frequent'] as const;

export const dietaryRestrictionOptions = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'lactose_free',
  'keto',
  'paleo',
  'halal',
  'kosher',
] as const;

export const allergyOptions = [
  'nuts',
  'peanuts',
  'shellfish',
  'dairy',
  'eggs',
  'soy',
  'wheat',
  'fish',
] as const;

export const cuisineOptions = [
  'polish',
  'italian',
  'mediterranean',
  'asian',
  'mexican',
  'indian',
  'american',
  'french',
  'middle_eastern',
  'japanese',
] as const;

export const eatingTriggerOptions = [
  'stress',
  'boredom',
  'social',
  'emotional',
  'habit',
  'reward',
] as const;

export const countryOptions = [
  'PL',
  'US',
  'GB',
  'DE',
  'FR',
  'IT',
  'ES',
  'NL',
  'SE',
  'NO',
  'DK',
  'FI',
  'AT',
  'CH',
  'BE',
  'PT',
  'IE',
  'CZ',
  'SK',
  'HU',
  'RO',
  'BG',
  'HR',
  'GR',
  'UA',
  'CA',
  'AU',
  'NZ',
  'JP',
  'KR',
  'IN',
  'MX',
  'BR',
  'AR',
  'ZA',
  'IL',
  'TR',
  'AE',
  'SA',
  'SG',
] as const;

export const biometricsSchema = z.object({
  dateOfBirth: z.string().min(1),
  biologicalSex: z.enum(biologicalSexOptions),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(300),
  country: z.string().length(2),
});

export const goalSchema = z.object({
  goalType: z.enum(goalTypeOptions),
});

export const targetSchema = z.object({
  goalWeightKg: z.number().min(30).max(300),
  goalTimelineWeeks: z.number().min(4).max(104),
});

export const dietarySchema = z.object({
  dietaryRestrictions: z.array(z.string()),
  allergies: z.array(z.string()),
  customAllergy: z.string(),
});

export const lifestyleSchema = z.object({
  activityLevel: z.enum(activityLevelOptions),
  cookingSkill: z.enum(cookingSkillOptions),
  cookingTimePref: z.enum(cookingTimePrefOptions),
  cuisinePreferences: z.array(z.string()).min(1),
});

export const psychBehavioralSchema = z.object({
  eatingTriggers: z.array(z.string()),
  snackingPattern: z.enum(snackingPatternOptions),
  cfcScore: z.number().min(1).max(5),
});

export const notificationPrefsSchema = z.object({
  notificationsEnabled: z.boolean(),
  mealReminders: z.boolean(),
  nudges: z.boolean(),
  weeklyReport: z.boolean(),
});

export const onboardingSchema = biometricsSchema
  .merge(goalSchema)
  .merge(targetSchema)
  .merge(dietarySchema)
  .merge(lifestyleSchema)
  .merge(psychBehavioralSchema)
  .merge(notificationPrefsSchema);

export type OnboardingFormData = z.infer<typeof onboardingSchema>;

export const STEP_SCHEMAS = [
  biometricsSchema,
  goalSchema,
  targetSchema,
  dietarySchema,
  lifestyleSchema,
  psychBehavioralSchema,
  notificationPrefsSchema,
] as const;

export const DEFAULT_VALUES: OnboardingFormData = {
  dateOfBirth: '',
  biologicalSex: 'male',
  heightCm: 170,
  weightKg: 70,
  country: '',
  goalType: 'maintain',
  goalWeightKg: 70,
  goalTimelineWeeks: 12,
  dietaryRestrictions: [],
  allergies: [],
  customAllergy: '',
  activityLevel: 'moderately_active',
  cookingSkill: 'intermediate',
  cookingTimePref: 'moderate',
  cuisinePreferences: [],
  eatingTriggers: [],
  snackingPattern: 'occasional',
  cfcScore: 3,
  notificationsEnabled: true,
  mealReminders: true,
  nudges: true,
  weeklyReport: true,
};
