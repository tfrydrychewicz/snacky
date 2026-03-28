const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

/**
 * Mifflin-St Jeor equation for Basal Metabolic Rate.
 * Male:   (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
 * Female: (10 × weight_kg) + (6.25 × height_cm) − (5 × age) − 161
 */
function calculateBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: 'male' | 'female',
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === 'male' ? base + 5 : base - 161;
}

function getAgeFromDateOfBirth(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function calculateTDEE(
  weightKg: number,
  heightCm: number,
  dateOfBirth: string,
  sex: 'male' | 'female',
  activityLevel: string,
): number {
  const age = getAgeFromDateOfBirth(dateOfBirth);
  const bmr = calculateBMR(weightKg, heightCm, age, sex);
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55;
  return Math.round(bmr * multiplier);
}

interface MacroTargets {
  targetKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Compute daily macro targets based on goal type and TDEE.
 *
 * - lose_weight:         −500 kcal deficit, protein 2.0 g/kg
 * - gain_muscle:         +300 kcal surplus, protein 2.2 g/kg
 * - maintain:            no adjustment,     protein 1.8 g/kg
 * - improve_nutrition:   no adjustment,     protein 2.0 g/kg
 *
 * Fat is 25–30% of target kcal, carbs fill the remainder.
 */
export function calculateMacros(tdee: number, weightKg: number, goalType: string): MacroTargets {
  let targetKcal: number;
  let proteinPerKg: number;
  let fatPct: number;

  switch (goalType) {
    case 'lose_weight':
      targetKcal = tdee - 500;
      proteinPerKg = 2.0;
      fatPct = 0.25;
      break;
    case 'gain_muscle':
      targetKcal = tdee + 300;
      proteinPerKg = 2.2;
      fatPct = 0.25;
      break;
    case 'improve_nutrition':
      targetKcal = tdee;
      proteinPerKg = 2.0;
      fatPct = 0.3;
      break;
    default: // maintain
      targetKcal = tdee;
      proteinPerKg = 1.8;
      fatPct = 0.3;
      break;
  }

  const proteinG = Math.round(weightKg * proteinPerKg);
  const fatG = Math.round((targetKcal * fatPct) / 9);
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbsG = Math.round(Math.max(0, targetKcal - proteinKcal - fatKcal) / 4);

  return { targetKcal, proteinG, carbsG, fatG };
}
