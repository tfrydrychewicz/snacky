import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';

interface WorkflowStep {
  id: string;
  step_id: string;
  status: string;
  error: string | null;
  duration_ms: number | null;
}

interface WorkflowRunRow {
  id: string;
  status: string;
  error: string | null;
  trigger_event: { payload?: { plan_id?: string } } | null;
}

export interface WorkflowProgress {
  runId: string;
  runStatus: string;
  runError: string | null;
  steps: WorkflowStep[];
  completedSteps: string[];
  currentStep: string | null;
  isTerminal: boolean;
}

const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled'];

async function fetchWorkflowProgress(planId: string): Promise<WorkflowProgress | null> {
  const supabase = getSupabase();

  // Fetch recent runs for this workflow and match by plan_id in trigger_event
  const { data: runs, error: runError } = await supabase
    .from('workflow_runs')
    .select('id, status, error, trigger_event')
    .eq('workflow_id', 'generate-diet-plan')
    .order('created_at', { ascending: false })
    .limit(10);

  if (runError || !runs || runs.length === 0) return null;

  const typedRuns = runs as unknown as WorkflowRunRow[];
  const run = typedRuns.find(
    (r) => r.trigger_event?.payload?.plan_id === planId,
  );

  if (!run) return null;

  const { data: steps, error: stepError } = await supabase
    .from('workflow_steps')
    .select('id, step_id, status, error, duration_ms')
    .eq('run_id', run.id)
    .order('created_at', { ascending: true });

  if (stepError) return null;

  const typedSteps = (steps ?? []) as unknown as WorkflowStep[];
  const completedSteps = typedSteps
    .filter((s) => s.status === 'completed')
    .map((s) => s.step_id);

  const currentStep = typedSteps.find(
    (s) => s.status === 'running' || s.status === 'sleeping' || s.status === 'waiting_for_event',
  )?.step_id ?? null;

  const isTerminal = TERMINAL_STATUSES.includes(run.status);

  return {
    runId: run.id,
    runStatus: run.status,
    runError: run.error,
    steps: typedSteps,
    completedSteps,
    currentStep,
    isTerminal,
  };
}

export const useWorkflowProgress = (planId: string | null) => {
  const query = useQuery({
    queryKey: ['workflow-progress', planId],
    queryFn: () => fetchWorkflowProgress(planId!),
    enabled: !!planId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.isTerminal) return false;
      return 3000;
    },
    staleTime: 0,
  });

  return query;
};
