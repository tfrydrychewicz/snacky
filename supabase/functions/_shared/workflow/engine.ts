// ─────────────────────────────────────────────────────────────
// Durable Workflow Engine — Execution Engine
//
// The engine processes two kinds of messages:
//   1. "event"  — find matching workflow definitions, create
//                 runs, execute from the beginning
//   2. "resume" — load an existing run, replay completed steps,
//                 continue from the next unfinished step
//
// Runs are executed in a "run-to-completion" mode: all
// synchronous steps execute in a single Edge Function
// invocation. Only sleep / waitForEvent / invoke pause the
// workflow and cause a later re-invocation.
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import type {
  WorkflowDefinition,
  WorkflowRunRow,
  WorkflowStepRow,
  QueueMessage,
  QueueEventMessage,
  QueueResumeMessage,
  RunStatus,
} from './types.ts';
import { WorkflowPaused } from './types.ts';
import { StepExecutor } from './step.ts';
import { createLogger } from '../logger.ts';

const log = createLogger('workflow-engine');

export class WorkflowEngine {
  private registry = new Map<string, WorkflowDefinition[]>();

  constructor(
    private supabase: SupabaseClient,
    workflows: WorkflowDefinition[],
  ) {
    for (const wf of workflows) {
      for (const trigger of wf.triggers) {
        const list = this.registry.get(trigger) ?? [];
        list.push(wf);
        this.registry.set(trigger, list);
      }
    }
    log.info('Engine initialized', {
      workflow_count: workflows.length,
      triggers: [...this.registry.keys()],
    });
  }

  /** Main entry point — dispatch a queue message. */
  async handle(msg: QueueMessage): Promise<void> {
    if (msg.type === 'event') {
      await this.handleEvent(msg);
    } else if (msg.type === 'resume') {
      await this.handleResume(msg);
    } else {
      log.warn('Unknown message type', { message: msg });
    }
  }

  // ────────────────────────────────────────────────────────────
  // Event handling — create runs for each matching workflow
  // ────────────────────────────────────────────────────────────

  private async handleEvent(msg: QueueEventMessage): Promise<void> {
    const workflows = this.registry.get(msg.event_name) ?? [];
    if (workflows.length === 0) {
      log.debug('No workflows registered for event', { event_name: msg.event_name });
      return;
    }

    log.info('Dispatching event to workflows', {
      event_name: msg.event_name,
      event_id: msg.event_id,
      workflow_count: workflows.length,
    });

    for (const wf of workflows) {
      const idempotencyKey = `evt:${msg.event_id}:${wf.id}`;

      const { data: run, error } = await this.supabase
        .from('workflow_runs')
        .insert({
          workflow_id: wf.id,
          status: 'pending' as RunStatus,
          trigger_event: {
            name: msg.event_name,
            payload: msg.payload,
            id: msg.event_id,
          },
          max_retries: wf.retries ?? 3,
          idempotency_key: idempotencyKey,
        })
        .select('id, trace_id')
        .single();

      if (error) {
        if (error.code === '23505') {
          log.info('Duplicate event, run already exists — skipping', {
            event_id: msg.event_id,
            workflow_id: wf.id,
          });
          continue;
        }
        log.error('Failed to create workflow run', {
          workflow_id: wf.id,
          event_name: msg.event_name,
          error: error.message,
        });
        continue;
      }

      if (!run) continue;

      const typedRun = run as { id: string; trace_id: string };
      log.info('Workflow run created', {
        run_id: typedRun.id,
        workflow_id: wf.id,
        trace_id: typedRun.trace_id,
      });

      await this.executeRun(typedRun.id, wf);
    }
  }

  // ────────────────────────────────────────────────────────────
  // Resume handling — reload and continue an existing run
  // ────────────────────────────────────────────────────────────

  private async handleResume(msg: QueueResumeMessage): Promise<void> {
    const { data: run, error } = await this.supabase
      .from('workflow_runs')
      .select('*')
      .eq('id', msg.run_id)
      .single();

    if (error || !run) {
      log.error('Resume: run not found', { run_id: msg.run_id, error: error?.message });
      return;
    }

    const typedRun = run as unknown as WorkflowRunRow;

    if (['completed', 'failed', 'cancelled'].includes(typedRun.status)) {
      log.debug('Resume: run already terminal', { run_id: msg.run_id, status: typedRun.status });
      return;
    }

    // Find the workflow definition
    let wfDef: WorkflowDefinition | undefined;
    for (const [, wfs] of this.registry) {
      wfDef = wfs.find((w) => w.id === typedRun.workflow_id);
      if (wfDef) break;
    }

    if (!wfDef) {
      log.error('Resume: workflow definition not found', {
        run_id: msg.run_id,
        workflow_id: typedRun.workflow_id,
      });
      await this.failRun(
        msg.run_id,
        `Workflow definition "${typedRun.workflow_id}" not registered`,
      );
      return;
    }

    log.info('Resuming workflow', {
      run_id: msg.run_id,
      workflow_id: typedRun.workflow_id,
      reason: msg.reason,
      trace_id: typedRun.trace_id,
    });

    await this.executeRun(msg.run_id, wfDef);
  }

  // ────────────────────────────────────────────────────────────
  // Core execution loop
  // ────────────────────────────────────────────────────────────

  private async executeRun(runId: string, wfDef: WorkflowDefinition): Promise<void> {
    // Load the run
    const { data: run, error: runError } = await this.supabase
      .from('workflow_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      log.error('Execute: failed to load run', { run_id: runId, error: runError?.message });
      return;
    }

    const typedRun = run as unknown as WorkflowRunRow;

    // Mark as running
    await this.supabase
      .from('workflow_runs')
      .update({
        status: 'running' as RunStatus,
        started_at: typedRun.started_at ?? new Date().toISOString(),
        attempt: typedRun.attempt + 1,
      })
      .eq('id', runId);

    // Load completed steps for replay
    const { data: steps } = await this.supabase
      .from('workflow_steps')
      .select('*')
      .eq('run_id', runId)
      .eq('status', 'completed');

    const completedSteps = (steps ?? []) as unknown as WorkflowStepRow[];

    const stepExecutor = new StepExecutor(this.supabase, runId, typedRun.trace_id, completedSteps);

    const triggerEvent = typedRun.trigger_event as {
      name: string;
      payload: Record<string, unknown>;
      id?: string;
    };

    try {
      const result = await wfDef.fn({
        event: {
          name: triggerEvent.name ?? wfDef.triggers[0],
          payload: triggerEvent.payload ?? {},
          id: triggerEvent.id,
        },
        step: stepExecutor,
        runId,
        traceId: typedRun.trace_id,
        attempt: typedRun.attempt + 1,
      });

      // Workflow completed successfully
      await this.supabase
        .from('workflow_runs')
        .update({
          status: 'completed' as RunStatus,
          output: result as Record<string, unknown>,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId);

      log.info('Workflow completed', {
        run_id: runId,
        workflow_id: wfDef.id,
        trace_id: typedRun.trace_id,
      });

      // If this is a child workflow, emit a completion event for the parent
      if (typedRun.parent_run_id) {
        await this.supabase.from('workflow_events').insert({
          event_name: `workflow.completed.${runId}`,
          payload: { run_id: runId, output: result },
          source: `workflow:${runId}`,
        });
      }
    } catch (err) {
      if (err instanceof WorkflowPaused) {
        const pauseStatus: RunStatus =
          err.reason === 'sleep'
            ? 'sleeping'
            : err.reason === 'wait_for_event'
              ? 'waiting_for_event'
              : 'waiting_for_event'; // invoke also waits

        await this.supabase.from('workflow_runs').update({ status: pauseStatus }).eq('id', runId);

        log.info('Workflow paused', {
          run_id: runId,
          workflow_id: wfDef.id,
          trace_id: typedRun.trace_id,
          reason: err.reason,
          step_id: err.stepId,
        });
        return;
      }

      // Real error — decide whether to retry
      const errMsg = err instanceof Error ? err.message : String(err);
      const attempt = typedRun.attempt + 1;
      const maxRetries = typedRun.max_retries;

      if (attempt < maxRetries) {
        log.warn('Workflow failed, scheduling retry', {
          run_id: runId,
          workflow_id: wfDef.id,
          trace_id: typedRun.trace_id,
          attempt,
          max_retries: maxRetries,
          error: errMsg,
        });

        await this.supabase
          .from('workflow_runs')
          .update({ status: 'pending' as RunStatus, error: errMsg })
          .eq('id', runId);

        // Exponential backoff: 2^attempt seconds (2s, 4s, 8s, ...)
        const delaySec = Math.round(Math.pow(2, attempt));
        await this.supabase.rpc('workflow_enqueue', {
          p_message: { type: 'resume', run_id: runId, reason: 'retry' },
          p_delay_seconds: delaySec,
        });
      } else {
        log.error('Workflow failed permanently', {
          run_id: runId,
          workflow_id: wfDef.id,
          trace_id: typedRun.trace_id,
          attempt,
          error: errMsg,
        });

        await this.supabase
          .from('workflow_runs')
          .update({
            status: 'failed' as RunStatus,
            error: errMsg,
            completed_at: new Date().toISOString(),
          })
          .eq('id', runId);
      }
    }
  }

  // ────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────

  private async failRun(runId: string, error: string): Promise<void> {
    await this.supabase
      .from('workflow_runs')
      .update({
        status: 'failed' as RunStatus,
        error,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);
  }
}
