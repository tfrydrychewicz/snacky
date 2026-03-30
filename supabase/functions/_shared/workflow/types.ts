// ─────────────────────────────────────────────────────────────
// Durable Workflow Engine — Core Types
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

// ── Run & Step statuses (mirror the SQL enums) ──────────────

export type RunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'sleeping'
  | 'waiting_for_event';

export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'sleeping'
  | 'waiting_for_event';

// ── Database row shapes ─────────────────────────────────────

export interface WorkflowRunRow {
  id: string;
  workflow_id: string;
  status: RunStatus;
  trigger_event: Record<string, unknown>;
  context: Record<string, unknown>;
  output: unknown;
  error: string | null;
  attempt: number;
  max_retries: number;
  idempotency_key: string | null;
  parent_run_id: string | null;
  trace_id: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface WorkflowStepRow {
  id: string;
  run_id: string;
  step_id: string;
  status: StepStatus;
  output: unknown;
  error: string | null;
  attempt: number;
  max_retries: number;
  sleep_until: string | null;
  wait_event_name: string | null;
  wait_timeout: string | null;
  wait_match: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface WorkflowEventRow {
  id: string;
  event_name: string;
  payload: Record<string, unknown>;
  user_id: string | null;
  source: string | null;
  idempotency_key: string | null;
  created_at: string;
}

// ── Workflow definition ─────────────────────────────────────

export interface WorkflowEvent<T = Record<string, unknown>> {
  name: string;
  payload: T;
  id?: string;
  user_id?: string;
}

export interface StepTools {
  /** Execute a named step. Memoized — returns cached output on replay. */
  run: <T>(stepId: string, fn: () => Promise<T>) => Promise<T>;

  /** Pause the workflow for a duration (e.g. '30s', '5m', '2h', '1d'). */
  sleep: (stepId: string, duration: string) => Promise<void>;

  /** Pause until a matching event arrives or timeout expires. */
  waitForEvent: <T = Record<string, unknown>>(
    stepId: string,
    opts: WaitForEventOpts,
  ) => Promise<{ event: WorkflowEvent<T> | null; timed_out: boolean }>;

  /** Emit an event that can trigger other workflows (fan-out). */
  sendEvent: (stepId: string, event: WorkflowEvent) => Promise<void>;

  /** Spawn a child workflow and wait for its result. */
  invoke: <T = unknown>(stepId: string, opts: InvokeOpts) => Promise<T>;

  /**
   * Run multiple tasks concurrently with an optional concurrency limit.
   * Each task is individually checkpointed as `{groupId}/{task.id}`.
   * Returns results in the same order as the input tasks.
   */
  parallel: <T>(
    groupId: string,
    tasks: Array<{ id: string; fn: () => Promise<T> }>,
    opts?: ParallelOpts,
  ) => Promise<T[]>;
}

export interface ParallelOpts {
  concurrency?: number;
}

export interface WaitForEventOpts {
  event: string;
  timeout: string;
  match?: Record<string, unknown>;
}

export interface InvokeOpts {
  workflowId: string;
  event: WorkflowEvent;
}

export interface WorkflowContext<T = Record<string, unknown>> {
  event: WorkflowEvent<T>;
  step: StepTools;
  runId: string;
  traceId: string;
  attempt: number;
}

export type WorkflowFn<TEvent = Record<string, unknown>, TResult = unknown> = (
  ctx: WorkflowContext<TEvent>,
) => Promise<TResult>;

export interface WorkflowDefinition<TEvent = Record<string, unknown>, TResult = unknown> {
  id: string;
  triggers: string[];
  retries?: number;
  concurrency?: number;
  fn: WorkflowFn<TEvent, TResult>;
}

// ── Queue message shapes ────────────────────────────────────

export interface QueueEventMessage {
  type: 'event';
  event_id: string;
  event_name: string;
  payload: Record<string, unknown>;
}

export interface QueueResumeMessage {
  type: 'resume';
  run_id: string;
  reason: 'sleep_complete' | 'event_received' | 'wait_timeout' | 'retry';
  step?: string;
  event_id?: string;
}

export type QueueMessage = QueueEventMessage | QueueResumeMessage;

// ── Internal control-flow signals ───────────────────────────

export class WorkflowPaused extends Error {
  constructor(
    public readonly reason: 'sleep' | 'wait_for_event' | 'invoke',
    public readonly stepId: string,
  ) {
    super(`Workflow paused: ${reason} at step "${stepId}"`);
    this.name = 'WorkflowPaused';
  }
}

// ── Engine configuration ────────────────────────────────────

export interface EngineConfig {
  supabase: SupabaseClient;
  workflows: WorkflowDefinition[];
}
