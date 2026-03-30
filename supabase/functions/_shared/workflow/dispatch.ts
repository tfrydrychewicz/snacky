// ─────────────────────────────────────────────────────────────
// Durable Workflow Engine — Event Dispatch Helpers
//
// Two dispatch modes:
//   1. dispatchEvent()       — inserts into workflow_events;
//      the DB trigger enqueues to PGMQ, pg_cron polls, and
//      pg_net invokes the runner. Fully durable.
//   2. dispatchEventDirect() — inserts the event AND calls the
//      workflow-runner Edge Function immediately via pg_net for
//      lower latency (queue is still populated as backup).
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import type { WorkflowEvent, WorkflowEventRow } from './types.ts';
import { createLogger } from '../logger.ts';

const log = createLogger('workflow-dispatch');

interface DispatchOpts {
  idempotencyKey?: string;
  source?: string;
}

/**
 * Insert an event into workflow_events. The DB trigger handles
 * PGMQ enqueue; pg_cron + pg_net invoke the runner.
 */
export async function dispatchEvent(
  supabase: SupabaseClient,
  event: WorkflowEvent,
  opts?: DispatchOpts,
): Promise<WorkflowEventRow> {
  const { data, error } = await supabase
    .from('workflow_events')
    .insert({
      event_name: event.name,
      payload: event.payload,
      user_id: event.user_id ?? null,
      source: opts?.source ?? null,
      idempotency_key: opts?.idempotencyKey ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    log.error('Failed to dispatch event', { event_name: event.name, error: error?.message });
    throw new Error(`Event dispatch failed: ${error?.message ?? 'unknown'}`);
  }

  const row = data as unknown as WorkflowEventRow;
  log.info('Event dispatched', { event_id: row.id, event_name: event.name });
  return row;
}

/**
 * Same as dispatchEvent but ALSO fires an immediate pg_net
 * HTTP POST to the workflow-runner, bypassing the pg_cron
 * polling delay. The PGMQ message from the trigger still
 * exists as a durable fallback.
 */
export async function dispatchEventDirect(
  supabase: SupabaseClient,
  event: WorkflowEvent,
  opts?: DispatchOpts,
): Promise<WorkflowEventRow> {
  const row = await dispatchEvent(supabase, event, opts);

  // Fire-and-forget: call the runner immediately via pg_net
  try {
    await supabase.rpc('workflow_invoke_runner_now', {
      p_event_id: row.id,
      p_event_name: row.event_name,
      p_payload: row.payload,
    });
  } catch (err) {
    // Non-fatal — the pg_cron poller will pick it up
    log.warn('Direct dispatch via pg_net failed (non-fatal)', {
      event_id: row.id, error: err instanceof Error ? err.message : String(err),
    });
  }

  return row;
}
