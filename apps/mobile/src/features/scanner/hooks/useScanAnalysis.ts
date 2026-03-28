import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MealScanResultSchema, type MealScanResult, type MealType } from '@snacky/shared-types';
import { getSupabase } from '~/shared/api/client';

const MAX_CLARIFICATION_ROUNDS = 3;

export type ScanRequest = {
  imageBase64: string;
  mealType: MealType;
  clarifications?: Array<{ question: string; answer: string }>;
};

export type ScanState = {
  result: MealScanResult | null;
  clarificationRound: number;
  error: string | null;
};

const analyzeMeal = async (request: ScanRequest): Promise<MealScanResult> => {
  const supabase = getSupabase();
  const response = await supabase.functions.invoke<unknown>('meal-scan', {
    body: {
      image: request.imageBase64,
      meal_type: request.mealType,
      clarifications: request.clarifications ?? [],
    },
  });

  if (response.error) {
    const message =
      response.error instanceof Error ? response.error.message : 'Scan analysis failed';
    throw new Error(message);
  }

  const data: unknown = response.data;

  const parsed = MealScanResultSchema.safeParse(data);
  if (!parsed.success) {
    console.error('Scan result validation failed:', parsed.error.format());
    throw new Error('Invalid scan result format');
  }

  return parsed.data;
};

export const useScanAnalysis = () => {
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
  });

  const analyze = useCallback(
    (imageBase64: string, mealType: MealType) => {
      setClarificationRound(0);
      setAccumulatedClarifications([]);
      mutation.mutate({ imageBase64, mealType });
    },
    [mutation],
  );

  const submitClarification = useCallback(
    (question: string, answer: string) => {
      if (clarificationRound >= MAX_CLARIFICATION_ROUNDS) return;

      const newClarifications = [...accumulatedClarifications, { question, answer }];
      setAccumulatedClarifications(newClarifications);

      const lastRequest = mutation.variables;
      if (lastRequest) {
        mutation.mutate({
          imageBase64: lastRequest.imageBase64,
          mealType: lastRequest.mealType,
          clarifications: newClarifications,
        });
      }
    },
    [clarificationRound, accumulatedClarifications, mutation],
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
