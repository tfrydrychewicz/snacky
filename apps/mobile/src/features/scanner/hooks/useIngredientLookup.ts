import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MacroBreakdown } from '@snacky/shared-types';
import { getSupabase } from '~/shared/api/client';

interface LookupResult {
  fdc_id: number;
  description: string;
  macros_per_100g: MacroBreakdown;
}

interface UseIngredientLookupReturn {
  baseMacros: MacroBreakdown | null;
  fdcId: number | null;
  isSearching: boolean;
  noMatch: boolean;
}

const DEBOUNCE_MS = 1500;
const MIN_CHARS = 2;

export const useIngredientLookup = (name: string, enabled: boolean): UseIngredientLookupReturn => {
  const { i18n } = useTranslation();
  const [baseMacros, setBaseMacros] = useState<MacroBreakdown | null>(null);
  const [fdcId, setFdcId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [noMatch, setNoMatch] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || name.trim().length < MIN_CHARS) {
      setBaseMacros(null);
      setFdcId(null);
      setIsSearching(false);
      setNoMatch(false);
      return;
    }

    setIsSearching(true);
    setNoMatch(false);

    const lookup = () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const supabase = getSupabase();
      supabase.functions
        .invoke<LookupResult | null>('ingredient-lookup', {
          body: { name: name.trim(), locale: i18n.language },
        })
        .then((result) => {
          if (controller.signal.aborted) return;

          if (result.error) {
            console.warn('[IngredientLookup] Edge function error:', result.error);
            setIsSearching(false);
            setNoMatch(true);
            return;
          }

          const lookupData: LookupResult | null = result.data ?? null;
          if (lookupData) {
            setBaseMacros(lookupData.macros_per_100g);
            setFdcId(lookupData.fdc_id);
            setNoMatch(false);
          } else {
            setBaseMacros(null);
            setFdcId(null);
            setNoMatch(true);
          }
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          console.warn('[IngredientLookup] Lookup failed:', err);
          setNoMatch(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    };

    const timer = setTimeout(lookup, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [name, enabled, i18n.language]);

  return { baseMacros, fdcId, isSearching, noMatch };
};
