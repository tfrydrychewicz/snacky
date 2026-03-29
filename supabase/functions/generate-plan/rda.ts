/**
 * Recommended Dietary Allowances (RDA) / Adequate Intakes (AI)
 * per day for adults, sourced from the DRI tables (NIH / NASEM).
 *
 * Values are indexed by biological sex and age group.
 */

export interface RdaValues {
  vitamin_a_ug: number;
  vitamin_c_mg: number;
  vitamin_d_ug: number;
  vitamin_e_mg: number;
  vitamin_k_ug: number;
  thiamin_mg: number;
  riboflavin_mg: number;
  niacin_mg: number;
  vitamin_b6_mg: number;
  folate_ug: number;
  vitamin_b12_ug: number;
  choline_mg: number;
  calcium_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  phosphorus_mg: number;
  potassium_mg: number;
  zinc_mg: number;
  copper_mg: number;
  selenium_ug: number;
}

export const MICRONUTRIENT_KEYS: ReadonlyArray<keyof RdaValues> = [
  'vitamin_a_ug',
  'vitamin_c_mg',
  'vitamin_d_ug',
  'vitamin_e_mg',
  'vitamin_k_ug',
  'thiamin_mg',
  'riboflavin_mg',
  'niacin_mg',
  'vitamin_b6_mg',
  'folate_ug',
  'vitamin_b12_ug',
  'choline_mg',
  'calcium_mg',
  'iron_mg',
  'magnesium_mg',
  'phosphorus_mg',
  'potassium_mg',
  'zinc_mg',
  'copper_mg',
  'selenium_ug',
] as const;

type AgeGroup = '19-30' | '31-50' | '51-70' | '71+';

const RDA_TABLE: Record<'male' | 'female', Record<AgeGroup, RdaValues>> = {
  male: {
    '19-30': {
      vitamin_a_ug: 900,
      vitamin_c_mg: 90,
      vitamin_d_ug: 15,
      vitamin_e_mg: 15,
      vitamin_k_ug: 120,
      thiamin_mg: 1.2,
      riboflavin_mg: 1.3,
      niacin_mg: 16,
      vitamin_b6_mg: 1.3,
      folate_ug: 400,
      vitamin_b12_ug: 2.4,
      choline_mg: 550,
      calcium_mg: 1000,
      iron_mg: 8,
      magnesium_mg: 400,
      phosphorus_mg: 700,
      potassium_mg: 3400,
      zinc_mg: 11,
      copper_mg: 0.9,
      selenium_ug: 55,
    },
    '31-50': {
      vitamin_a_ug: 900,
      vitamin_c_mg: 90,
      vitamin_d_ug: 15,
      vitamin_e_mg: 15,
      vitamin_k_ug: 120,
      thiamin_mg: 1.2,
      riboflavin_mg: 1.3,
      niacin_mg: 16,
      vitamin_b6_mg: 1.3,
      folate_ug: 400,
      vitamin_b12_ug: 2.4,
      choline_mg: 550,
      calcium_mg: 1000,
      iron_mg: 8,
      magnesium_mg: 420,
      phosphorus_mg: 700,
      potassium_mg: 3400,
      zinc_mg: 11,
      copper_mg: 0.9,
      selenium_ug: 55,
    },
    '51-70': {
      vitamin_a_ug: 900,
      vitamin_c_mg: 90,
      vitamin_d_ug: 15,
      vitamin_e_mg: 15,
      vitamin_k_ug: 120,
      thiamin_mg: 1.2,
      riboflavin_mg: 1.3,
      niacin_mg: 16,
      vitamin_b6_mg: 1.7,
      folate_ug: 400,
      vitamin_b12_ug: 2.4,
      choline_mg: 550,
      calcium_mg: 1000,
      iron_mg: 8,
      magnesium_mg: 420,
      phosphorus_mg: 700,
      potassium_mg: 3400,
      zinc_mg: 11,
      copper_mg: 0.9,
      selenium_ug: 55,
    },
    '71+': {
      vitamin_a_ug: 900,
      vitamin_c_mg: 90,
      vitamin_d_ug: 20,
      vitamin_e_mg: 15,
      vitamin_k_ug: 120,
      thiamin_mg: 1.2,
      riboflavin_mg: 1.3,
      niacin_mg: 16,
      vitamin_b6_mg: 1.7,
      folate_ug: 400,
      vitamin_b12_ug: 2.4,
      choline_mg: 550,
      calcium_mg: 1200,
      iron_mg: 8,
      magnesium_mg: 420,
      phosphorus_mg: 700,
      potassium_mg: 3400,
      zinc_mg: 11,
      copper_mg: 0.9,
      selenium_ug: 55,
    },
  },
  female: {
    '19-30': {
      vitamin_a_ug: 700,
      vitamin_c_mg: 75,
      vitamin_d_ug: 15,
      vitamin_e_mg: 15,
      vitamin_k_ug: 90,
      thiamin_mg: 1.1,
      riboflavin_mg: 1.1,
      niacin_mg: 14,
      vitamin_b6_mg: 1.3,
      folate_ug: 400,
      vitamin_b12_ug: 2.4,
      choline_mg: 425,
      calcium_mg: 1000,
      iron_mg: 18,
      magnesium_mg: 310,
      phosphorus_mg: 700,
      potassium_mg: 2600,
      zinc_mg: 8,
      copper_mg: 0.9,
      selenium_ug: 55,
    },
    '31-50': {
      vitamin_a_ug: 700,
      vitamin_c_mg: 75,
      vitamin_d_ug: 15,
      vitamin_e_mg: 15,
      vitamin_k_ug: 90,
      thiamin_mg: 1.1,
      riboflavin_mg: 1.1,
      niacin_mg: 14,
      vitamin_b6_mg: 1.3,
      folate_ug: 400,
      vitamin_b12_ug: 2.4,
      choline_mg: 425,
      calcium_mg: 1000,
      iron_mg: 18,
      magnesium_mg: 320,
      phosphorus_mg: 700,
      potassium_mg: 2600,
      zinc_mg: 8,
      copper_mg: 0.9,
      selenium_ug: 55,
    },
    '51-70': {
      vitamin_a_ug: 700,
      vitamin_c_mg: 75,
      vitamin_d_ug: 15,
      vitamin_e_mg: 15,
      vitamin_k_ug: 90,
      thiamin_mg: 1.1,
      riboflavin_mg: 1.1,
      niacin_mg: 14,
      vitamin_b6_mg: 1.5,
      folate_ug: 400,
      vitamin_b12_ug: 2.4,
      choline_mg: 425,
      calcium_mg: 1200,
      iron_mg: 8,
      magnesium_mg: 320,
      phosphorus_mg: 700,
      potassium_mg: 2600,
      zinc_mg: 8,
      copper_mg: 0.9,
      selenium_ug: 55,
    },
    '71+': {
      vitamin_a_ug: 700,
      vitamin_c_mg: 75,
      vitamin_d_ug: 20,
      vitamin_e_mg: 15,
      vitamin_k_ug: 90,
      thiamin_mg: 1.1,
      riboflavin_mg: 1.1,
      niacin_mg: 14,
      vitamin_b6_mg: 1.5,
      folate_ug: 400,
      vitamin_b12_ug: 2.4,
      choline_mg: 425,
      calcium_mg: 1200,
      iron_mg: 8,
      magnesium_mg: 320,
      phosphorus_mg: 700,
      potassium_mg: 2600,
      zinc_mg: 8,
      copper_mg: 0.9,
      selenium_ug: 55,
    },
  },
};

function resolveAgeGroup(dateOfBirth: string): AgeGroup {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }

  if (age >= 71) return '71+';
  if (age >= 51) return '51-70';
  if (age >= 31) return '31-50';
  return '19-30';
}

/**
 * Returns the RDA/AI values for a user based on biological sex and date of
 * birth.  Falls back to male 31-50 if demographics are unknown.
 */
export function getRda(
  biologicalSex: string | null,
  dateOfBirth: string | null,
): RdaValues {
  const sex: 'male' | 'female' =
    biologicalSex === 'female' ? 'female' : 'male';
  const ageGroup: AgeGroup = dateOfBirth
    ? resolveAgeGroup(dateOfBirth)
    : '31-50';

  return RDA_TABLE[sex][ageGroup];
}

/**
 * Maps CandidateFood per-100g column names to RdaValues keys.
 * Used to sum micronutrients from food portions against daily RDA.
 */
export const FOOD_COL_TO_RDA_KEY: Record<string, keyof RdaValues> = {
  vitamin_a_ug_per_100g: 'vitamin_a_ug',
  vitamin_c_mg_per_100g: 'vitamin_c_mg',
  vitamin_d_ug_per_100g: 'vitamin_d_ug',
  vitamin_e_mg_per_100g: 'vitamin_e_mg',
  vitamin_k_ug_per_100g: 'vitamin_k_ug',
  thiamin_mg_per_100g: 'thiamin_mg',
  riboflavin_mg_per_100g: 'riboflavin_mg',
  niacin_mg_per_100g: 'niacin_mg',
  vitamin_b6_mg_per_100g: 'vitamin_b6_mg',
  folate_ug_per_100g: 'folate_ug',
  vitamin_b12_ug_per_100g: 'vitamin_b12_ug',
  choline_mg_per_100g: 'choline_mg',
  calcium_mg_per_100g: 'calcium_mg',
  iron_mg_per_100g: 'iron_mg',
  magnesium_mg_per_100g: 'magnesium_mg',
  phosphorus_mg_per_100g: 'phosphorus_mg',
  potassium_mg_per_100g: 'potassium_mg',
  zinc_mg_per_100g: 'zinc_mg',
  copper_mg_per_100g: 'copper_mg',
  selenium_ug_per_100g: 'selenium_ug',
} as const;
