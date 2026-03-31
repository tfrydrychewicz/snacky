import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSupabase } from '~/shared/api/client';
import type { IngredientAnalysis, NutrientInsightsResult } from '@snacky/shared-types';

export const useNutrientInsights = (ingredients: IngredientAnalysis[]) => {
  const { i18n } = useTranslation();
  const [insights, setInsights] = useState<NutrientInsightsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (ings: IngredientAnalysis[]) => {
    if (ings.length === 0) return;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { data, error: fnError } = await supabase.functions.invoke<NutrientInsightsResult>(
        'nutrient-interactions',
        {
          body: {
            ingredients: ings.map((ing) => ({
              name: ing.name,
              usda_fdc_id: ing.usda_fdc_id,
              quantity_g: ing.quantity_g,
              macros: ing.macros,
            })),
            locale: i18n.language,
          },
        },
      );

      if (fnError) throw new Error(fnError.message);
      if (!data) throw new Error('Empty response');

      setInsights(data);
    } catch (err) {
      console.warn('[NutrientInsights] Analysis failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    void analyze(ingredients);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return { insights, isLoading, error };
};
