import { createServiceClient } from '../_shared/supabase-client.ts';
import { createLogger } from '../_shared/logger.ts';
import type { IngredientAnalysis } from './schemas.ts';

const log = createLogger('meal-scan:usda');

interface UsdaFood {
  fdc_id: number;
  description: string;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  fiber_per_100g: number | null;
  sugar_per_100g: number | null;
  sodium_per_100g: number | null;
}

interface MacroTotals {
  calories_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

export interface CrossRefResult {
  ingredients: IngredientAnalysis[];
  adjustedTotal: MacroTotals;
  adjustedCount: number;
}

const DEVIATION_THRESHOLD = 0.3;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Cross-reference AI-detected ingredients against the local USDA foods table.
 * - Direct FDC ID lookup when the AI supplied one
 * - Websearch full-text fallback on ingredient name
 * - If caloric estimate deviates >30 % from USDA, anchor to USDA values
 */
export async function crossReferenceUSDA(
  ingredients: IngredientAnalysis[],
): Promise<CrossRefResult> {
  const supabase = createServiceClient();
  const adjusted: IngredientAnalysis[] = [];
  let adjustedCount = 0;

  for (const ing of ingredients) {
    let match: UsdaFood | null = null;

    if (ing.usda_fdc_id) {
      const { data } = await supabase
        .from('usda_foods')
        .select('*')
        .eq('fdc_id', ing.usda_fdc_id)
        .maybeSingle();
      if (data) match = data as UsdaFood;
    }

    if (!match) {
      const searchTerms = ing.name.replace(/[^\w\s]/g, '');
      const { data } = await supabase
        .from('usda_foods')
        .select('*')
        .textSearch('search_vector', searchTerms, { type: 'websearch' })
        .limit(1);
      if (data && data.length > 0) match = data[0] as UsdaFood;
    }

    if (!match && ing.english_search_term) {
      const englishTerms = ing.english_search_term.replace(/[^\w\s]/g, '');
      const { data } = await supabase
        .from('usda_foods')
        .select('*')
        .textSearch('search_vector', englishTerms, { type: 'websearch' })
        .limit(1);
      if (data && data.length > 0) match = data[0] as UsdaFood;
    }

    if (!match || match.calories_per_100g == null) {
      log.warn('No USDA match found', { ingredient: ing.name });
      adjusted.push(ing);
      continue;
    }

    const expectedCal = (match.calories_per_100g / 100) * ing.quantity_g;
    const deviation =
      expectedCal > 0 ? Math.abs(ing.macros.calories_kcal - expectedCal) / expectedCal : 0;

    if (deviation > DEVIATION_THRESHOLD) {
      log.info('USDA deviation detected, adjusting', {
        ingredient: ing.name,
        ai_cal: ing.macros.calories_kcal,
        usda_expected_cal: round1(expectedCal),
        deviation_pct: Math.round(deviation * 100),
      });

      const r = ing.quantity_g / 100;
      adjusted.push({
        ...ing,
        usda_fdc_id: match.fdc_id,
        macros: {
          calories_kcal: round1((match.calories_per_100g ?? 0) * r),
          protein_g: round1((match.protein_per_100g ?? 0) * r),
          carbohydrates_g: round1((match.carbs_per_100g ?? 0) * r),
          fat_g: round1((match.fat_per_100g ?? 0) * r),
          fiber_g:
            match.fiber_per_100g != null ? round1(match.fiber_per_100g * r) : ing.macros.fiber_g,
          sugar_g:
            match.sugar_per_100g != null ? round1(match.sugar_per_100g * r) : ing.macros.sugar_g,
          sodium_mg:
            match.sodium_per_100g != null
              ? round1(match.sodium_per_100g * r)
              : ing.macros.sodium_mg,
        },
      });
      adjustedCount++;
    } else {
      adjusted.push({ ...ing, usda_fdc_id: match.fdc_id });
    }
  }

  const adjustedTotal = adjusted.reduce<MacroTotals>(
    (acc, i) => ({
      calories_kcal: acc.calories_kcal + i.macros.calories_kcal,
      protein_g: acc.protein_g + i.macros.protein_g,
      carbohydrates_g: acc.carbohydrates_g + i.macros.carbohydrates_g,
      fat_g: acc.fat_g + i.macros.fat_g,
      fiber_g: acc.fiber_g + (i.macros.fiber_g ?? 0),
      sugar_g: acc.sugar_g + (i.macros.sugar_g ?? 0),
      sodium_mg: acc.sodium_mg + (i.macros.sodium_mg ?? 0),
    }),
    {
      calories_kcal: 0,
      protein_g: 0,
      carbohydrates_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
    },
  );

  for (const key of Object.keys(adjustedTotal) as (keyof MacroTotals)[]) {
    adjustedTotal[key] = round1(adjustedTotal[key]);
  }

  return { ingredients: adjusted, adjustedTotal, adjustedCount };
}
