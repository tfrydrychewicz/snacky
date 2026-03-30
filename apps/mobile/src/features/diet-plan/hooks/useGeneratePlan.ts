import { useMutation } from '@tanstack/react-query';
import Config from 'react-native-config';
import { ensureValidSession } from '~/shared/api/sessionRecovery';
import { getSupabase } from '~/shared/api/client';
import type { PlanConfig } from '../types';

interface GeneratePlanResponse {
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  meals_per_day: number;
}

async function callGeneratePlan(config: PlanConfig): Promise<GeneratePlanResponse> {
  const accessToken = await ensureValidSession();
  if (!accessToken) {
    await getSupabase().auth.signOut();
    throw new Error('SESSION_EXPIRED');
  }

  const baseUrl = Config.SUPABASE_URL ?? '';
  const anonKey = Config.SUPABASE_ANON_KEY ?? '';
  const url = `${baseUrl}/functions/v1/generate-plan`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'x-user-token': accessToken,
    },
    body: JSON.stringify(config),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => `HTTP ${resp.status}`);
    throw new Error(errBody);
  }

  return (await resp.json()) as GeneratePlanResponse;
}

export const useGeneratePlan = () => {
  return useMutation({
    mutationFn: callGeneratePlan,
    onError: (err) => {
      console.error('[GeneratePlan] Failed:', err.message);
    },
  });
};
