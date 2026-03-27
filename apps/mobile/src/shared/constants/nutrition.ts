/** Reference Daily Allowances (adult, 2000 kcal diet) */
export const RDA = {
  calories_kcal: 2000,
  protein_g: 50,
  carbohydrates_g: 275,
  fat_g: 78,
  fiber_g: 28,
  sodium_mg: 2300,
  sugar_g: 50,
  saturated_fat_g: 20,
} as const;

/** Acceptable Macronutrient Distribution Ranges (AMDR) as percentage of total calories */
export const AMDR = {
  protein: { min: 0.10, max: 0.35 },
  carbohydrates: { min: 0.45, max: 0.65 },
  fat: { min: 0.20, max: 0.35 },
} as const;

/** Calories per gram for each macronutrient */
export const KCAL_PER_GRAM = {
  protein: 4,
  carbohydrates: 4,
  fat: 9,
  fiber: 2,
} as const;
