import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MealScanResultSchema, type MealScanResult, type MealType } from '@snacky/shared-types';
import { getSupabase } from '~/shared/api/client';
import { tryRefreshSession, isJwtError } from '~/shared/api/sessionRecovery';

const MAX_CLARIFICATION_ROUNDS = 3;

export type ScanRequest = {
  images: string[];
  mealType: MealType;
  locale: string;
  clarifications?: Array<{ question: string; answer: string }>;
};

export type ScanState = {
  result: MealScanResult | null;
  clarificationRound: number;
  error: string | null;
};

const invokeEdgeFunction = async (request: ScanRequest) => {
  const supabase = getSupabase();
  return supabase.functions.invoke<unknown>('meal-scan', {
    body: {
      images: request.images,
      meal_type: request.mealType,
      locale: request.locale,
      clarifications: request.clarifications ?? [],
    },
  });
};

const analyzeMeal = async (request: ScanRequest): Promise<MealScanResult> => {
  console.log('[MealScan] Invoking meal-scan edge function…', {
    imageCount: request.images.length,
  });

  let response = await invokeEdgeFunction(request);

  if (response.error && isJwtError(response.error)) {
    console.log('[MealScan] JWT error detected, attempting session refresh…');
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      console.log('[MealScan] Session refreshed, retrying…');
      response = await invokeEdgeFunction(request);
    } else {
      console.error('[MealScan] Session refresh failed — user needs to re-authenticate');
      await getSupabase().auth.signOut();
      throw new Error('SESSION_EXPIRED');
    }
  }

  if (response.error) {
    let detail = '';
    const err = response.error as Record<string, unknown>;
    if (err.context && typeof (err.context as Response).text === 'function') {
      try {
        const body = await (err.context as Response).text();
        detail = body;
      } catch {
        // response body already consumed
      }
    }
    const message =
      response.error instanceof Error ? response.error.message : 'Scan analysis failed';
    console.error('[MealScan] Edge function error:', message, detail || response.error);
    throw new Error(detail || message);
  }

  const data: unknown = response.data;
  console.log('[MealScan] Response received, validating schema…');

  const parsed = MealScanResultSchema.safeParse(data);
  if (!parsed.success) {
    console.error('[MealScan] Zod validation failed:', JSON.stringify(parsed.error.format()));
    throw new Error('Invalid scan result format');
  }

  console.log(
    '[MealScan] Analysis complete:',
    parsed.data.ingredients.length,
    'ingredients,',
    parsed.data.model_used,
  );
  return parsed.data;
};

export const useScanAnalysis = () => {
  const { i18n } = useTranslation();
  const [clarificationRound, setClarificationRound] = useState(0);
  const [accumulatedClarifications, setAccumulatedClarifications] = useState<
    Array<{ question: string; answer: string }>
  >([]);

  const mutation = useMutation({
    mutationFn: analyzeMeal,
    onSuccess: (result) => {
      if (result.clarification_needed && clarificationRound < MAX_CLARIFICATION_ROUNDS) {
        setClarificationRound((prev) => prev + 1);
      }
    },
    onError: (err) => {
      console.error('[MealScan] Mutation failed:', err.message);
    },
  });

  const analyze = useCallback(
    (imageBase64s: string[], mealType: MealType) => {
      setClarificationRound(0);
      setAccumulatedClarifications([]);
      mutation.mutate({ images: imageBase64s, mealType, locale: i18n.language });
    },
    [mutation, i18n.language],
  );

  const submitClarification = useCallback(
    (question: string, answer: string) => {
      if (clarificationRound >= MAX_CLARIFICATION_ROUNDS) return;

      const newClarifications = [...accumulatedClarifications, { question, answer }];
      setAccumulatedClarifications(newClarifications);

      const lastRequest = mutation.variables;
      if (lastRequest) {
        mutation.mutate({
          images: lastRequest.images,
          mealType: lastRequest.mealType,
          locale: i18n.language,
          clarifications: newClarifications,
        });
      }
    },
    [clarificationRound, accumulatedClarifications, mutation, i18n.language],
  );

  const reset = useCallback(() => {
    mutation.reset();
    setClarificationRound(0);
    setAccumulatedClarifications([]);
  }, [mutation]);

  const canClarify =
    mutation.data?.clarification_needed === true && clarificationRound < MAX_CLARIFICATION_ROUNDS;

  return {
    analyze,
    submitClarification,
    reset,
    result: mutation.data ?? null,
    isAnalyzing: mutation.isPending,
    error: mutation.error?.message ?? null,
    clarificationRound,
    canClarify,
    maxClarificationRounds: MAX_CLARIFICATION_ROUNDS,
  };
};
