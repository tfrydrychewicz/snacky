import { useState, useCallback, useEffect } from 'react';
import { MMKV } from 'react-native-mmkv';
import Config from 'react-native-config';
import { useQueryClient } from '@tanstack/react-query';
import { ensureValidSession } from '~/shared/api/sessionRecovery';
import { getSupabase } from '~/shared/api/client';
import type { PlanConfig } from '../types';

const generationStorage = new MMKV({ id: 'diet-plan-generation' });

const STORAGE_KEY = 'active_generation';

interface PersistedGeneration {
  planId: string;
  startedAt: string;
}

function persistGeneration(planId: string): void {
  generationStorage.set(
    STORAGE_KEY,
    JSON.stringify({ planId, startedAt: new Date().toISOString() } satisfies PersistedGeneration),
  );
}

export function clearPersistedGeneration(): void {
  generationStorage.delete(STORAGE_KEY);
}

export function getPersistedGeneration(): PersistedGeneration | null {
  const raw = generationStorage.getString(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedGeneration;
  } catch {
    return null;
  }
}

interface GenerateResponse {
  plan_id: string;
  event_id: string;
  status: string;
}

export interface WorkflowGenerationState {
  isGenerating: boolean;
  planId: string | null;
  error: string | null;
}

export function useWorkflowGeneration() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<WorkflowGenerationState>(() => {
    const persisted = getPersistedGeneration();
    if (persisted) {
      return { isGenerating: true, planId: persisted.planId, error: null };
    }
    return { isGenerating: false, planId: null, error: null };
  });

  const generate = useCallback(async (config: PlanConfig) => {
    setState({ isGenerating: true, planId: null, error: null });

    try {
      const accessToken = await ensureValidSession();
      if (!accessToken) {
        await getSupabase().auth.signOut();
        throw new Error('SESSION_EXPIRED');
      }

      const baseUrl = Config.SUPABASE_URL ?? '';
      const anonKey = Config.SUPABASE_ANON_KEY ?? '';

      const resp = await fetch(`${baseUrl}/functions/v1/generate-plan`, {
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

      const data = (await resp.json()) as GenerateResponse;

      persistGeneration(data.plan_id);

      setState({
        isGenerating: true,
        planId: data.plan_id,
        error: null,
      });

      void queryClient.invalidateQueries({ queryKey: ['diet-plan'] });
    } catch (err) {
      console.error('[WorkflowGeneration] Failed:', (err as Error).message);
      clearPersistedGeneration();
      setState({
        isGenerating: false,
        planId: null,
        error: (err as Error).message,
      });
    }
  }, [queryClient]);

  const setCompleted = useCallback(() => {
    clearPersistedGeneration();
    setState((prev) => ({ ...prev, isGenerating: false }));
    void queryClient.invalidateQueries({ queryKey: ['diet-plan'] });
  }, [queryClient]);

  const setError = useCallback((error: string) => {
    clearPersistedGeneration();
    setState((prev) => ({ ...prev, isGenerating: false, error }));
  }, []);

  // On mount, verify persisted generation is still valid
  useEffect(() => {
    if (!state.planId || !state.isGenerating) return;

    const verify = async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('diet_plans')
        .select('status')
        .eq('id', state.planId!)
        .single();

      if (!data || data.status === 'active' || data.status === 'failed') {
        clearPersistedGeneration();
        setState({ isGenerating: false, planId: null, error: null });
        void queryClient.invalidateQueries({ queryKey: ['diet-plan'] });
      }
    };

    void verify();
  }, []);

  return { ...state, generate, setCompleted, setError };
}
