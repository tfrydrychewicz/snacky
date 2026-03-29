import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MealScanResultSchema, type MealScanResult, type MealType } from '@snacky/shared-types';
import Config from 'react-native-config';
import { getSupabase } from '~/shared/api/client';
import { ensureValidSession } from '~/shared/api/sessionRecovery';

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

const analyzeMeal = async (request: ScanRequest): Promise<MealScanResult> => {
  console.log('[MealScan] Invoking meal-scan edge function…', {
    imageCount: request.images.length,
  });

  const accessToken = await ensureValidSession();
  if (!accessToken) {
    await getSupabase().auth.signOut();
    throw new Error('SESSION_EXPIRED');
  }

  const baseUrl = Config.SUPABASE_URL ?? '';
  const anonKey = Config.SUPABASE_ANON_KEY ?? '';
  const url = `${baseUrl}/functions/v1/meal-scan`;

  console.log('[MealScan] Calling:', url, 'token prefix:', accessToken.slice(0, 20));

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'x-user-token': accessToken,
    },
    body: JSON.stringify({
      images: request.images,
      meal_type: request.mealType,
      locale: request.locale,
      clarifications: request.clarifications ?? [],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => `HTTP ${resp.status}`);
    console.error('[MealScan] Edge function error:', resp.status, errBody);

    Alert.alert(
      `Scan failed (${resp.status})`,
      `URL: ${url}\nToken: ${accessToken.slice(0, 30)}…\n\n${errBody}`,
    );

    throw new Error(errBody);
  }

  const data: unknown = await resp.json();
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
