import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSupabase } from '~/shared/api/client';
import type { IngredientAnalysis, NutrientInsightsResult } from '@snacky/shared-types';

const DEBOUNCE_MS = 800;

export const useNutrientInsights = (ingredients: IngredientAnalysis[]) => {
  const { i18n } = useTranslation();
  const [insights, setInsights] = useState<NutrientInsightsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fingerprint = useMemo(
    () =>
      ingredients
        .map((ing) => `${ing.name}:${ing.quantity_g}:${ing.usda_fdc_id ?? ''}`)
        .sort()
        .join('|'),
    [ingredients],
  );

  const analyze = useCallback(async (ings: IngredientAnalysis[]) => {
    if (ings.length === 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

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
              english_search_term: ing.english_search_term ?? null,
            })),
            locale: i18n.language,
          },
        },
      );

      if (controller.signal.aborted) return;
      if (fnError) throw new Error(fnError.message);
      if (!data) throw new Error('Empty response');

      setInsights(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.warn('[NutrientInsights] Analysis failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [i18n.language]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void analyze(ingredients);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [fingerprint, analyze]); // eslint-disable-line react-hooks/exhaustive-deps

  return { insights, isLoading, error };
};
