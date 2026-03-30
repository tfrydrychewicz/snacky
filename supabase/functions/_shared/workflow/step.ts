// ─────────────────────────────────────────────────────────────
// Durable Workflow Engine — Step Primitives
//
// Each method is memoized: if the step has already completed
// in a previous invocation, it returns the cached output
// instantly.  If the step hasn't run yet, it executes the
// provided function and checkpoints the result.
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import type {
  WorkflowStepRow,
  StepTools,
  WaitForEventOpts,
  InvokeOpts,
  ParallelOpts,
  WorkflowEvent,
} from './types.ts';
import { WorkflowPaused } from './types.ts';
import { createLogger } from '../logger.ts';

const log = createLogger('workflow-step');

/** Parse a human duration string into milliseconds. */
export function parseDuration(d: string): number {
  const match = d.match(/^(\d+(?:\.\d+)?)\s*(s|sec|m|min|h|hr|d|day)s?$/i);
  if (!match) throw new Error(`Invalid duration: "${d}"`);
  const n = parseFloat(match[1]);
  switch (match[2].toLowerCase()) {
    case 's':
    case 'sec':
      return n * 1_000;
    case 'm':
    case 'min':
      return n * 60_000;
    case 'h':
    case 'hr':
      return n * 3_600_000;
    case 'd':
    case 'day':
      return n * 86_400_000;
    default:
      throw new Error(`Unknown unit in duration: "${d}"`);
  }
}

export class StepExecutor implements StepTools {
  private completedSteps: Map<string, WorkflowStepRow>;

  constructor(
    private supabase: SupabaseClient,
    private runId: string,
    private traceId: string,
    completedSteps: WorkflowStepRow[],
  ) {
    this.completedSteps = new Map(completedSteps.map((s) => [s.step_id, s]));
  }

  async run<T>(stepId: string, fn: () => Promise<T>): Promise<T> {
    const cached = this.completedSteps.get(stepId);
    if (cached?.status === 'completed') {
      log.debug('Step replayed from cache', {
        step_id: stepId,
        run_id: this.runId,
        trace_id: this.traceId,
      });
      return cached.output as T;
    }

    log.info('Step executing', { step_id: stepId, run_id: this.runId, trace_id: this.traceId });

    // Heartbeat: touch workflow_runs.updated_at so the stall-recovery
    // watchdog knows this run is still actively executing.
    await this.supabase
      .from('workflow_runs')
      .update({ status: 'running' })
      .eq('id', this.runId);

    // Upsert a "running" row
    await this.supabase.from('workflow_steps').upsert(
      {
        run_id: this.runId,
        step_id: stepId,
        status: 'running' as const,
        started_at: new Date().toISOString(),
        attempt: (cached?.attempt ?? 0) + 1,
      },
      { onConflict: 'run_id,step_id' },
    );

    const t0 = performance.now();
    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - t0);

      await this.supabase.from('workflow_steps').upsert(
        {
          run_id: this.runId,
          step_id: stepId,
          status: 'completed' as const,
          output: result as unknown as Record<string, unknown>,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
        },
        { onConflict: 'run_id,step_id' },
      );

      // Cache locally so subsequent steps in the same invocation don't re-query
      this.completedSteps.set(stepId, {
        id: '',
        run_id: this.runId,
        step_id: stepId,
        status: 'completed',
        output: result,
        error: null,
        attempt: (cached?.attempt ?? 0) + 1,
        max_retries: 3,
        sleep_until: null,
        wait_event_name: null,
        wait_timeout: null,
        wait_match: null,
        started_at: null,
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        created_at: '',
      });

      log.info('Step completed', {
        step_id: stepId,
        run_id: this.runId,
        trace_id: this.traceId,
        duration_ms: durationMs,
      });

      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - t0);
      const errMsg = err instanceof Error ? err.message : String(err);

      await this.supabase.from('workflow_steps').upsert(
        {
          run_id: this.runId,
          step_id: stepId,
          status: 'failed' as const,
          error: errMsg,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
        },
        { onConflict: 'run_id,step_id' },
      );

      log.error('Step failed', {
        step_id: stepId,
        run_id: this.runId,
        trace_id: this.traceId,
        error: errMsg,
        duration_ms: durationMs,
      });
      throw err;
    }
  }

  async sleep(stepId: string, duration: string): Promise<void> {
    const cached = this.completedSteps.get(stepId);
    if (cached?.status === 'completed') {
      log.debug('Sleep replayed from cache', { step_id: stepId, run_id: this.runId });
      return;
    }

    const ms = parseDuration(duration);
    const sleepUntil = new Date(Date.now() + ms).toISOString();

    log.info('Step sleeping', {
      step_id: stepId,
      run_id: this.runId,
      trace_id: this.traceId,
      duration,
      sleep_until: sleepUntil,
    });

    await this.supabase.from('workflow_steps').upsert(
      {
        run_id: this.runId,
        step_id: stepId,
        status: 'sleeping' as const,
        started_at: new Date().toISOString(),
        sleep_until: sleepUntil,
      },
      { onConflict: 'run_id,step_id' },
    );

    throw new WorkflowPaused('sleep', stepId);
  }

  async waitForEvent<T = Record<string, unknown>>(
    stepId: string,
    opts: WaitForEventOpts,
  ): Promise<{ event: WorkflowEvent<T> | null; timed_out: boolean }> {
    const cached = this.completedSteps.get(stepId);
    if (cached?.status === 'completed') {
      log.debug('WaitForEvent replayed from cache', { step_id: stepId, run_id: this.runId });
      const out = cached.output as { event: WorkflowEvent<T> | null; timed_out: boolean };
      return out;
    }

    const timeoutMs = parseDuration(opts.timeout);
    const waitTimeout = new Date(Date.now() + timeoutMs).toISOString();

    log.info('Step waiting for event', {
      step_id: stepId,
      run_id: this.runId,
      trace_id: this.traceId,
      event: opts.event,
      timeout: opts.timeout,
    });

    await this.supabase.from('workflow_steps').upsert(
      {
        run_id: this.runId,
        step_id: stepId,
        status: 'waiting_for_event' as const,
        started_at: new Date().toISOString(),
        wait_event_name: opts.event,
        wait_timeout: waitTimeout,
        wait_match: (opts.match ?? {}) as Record<string, unknown>,
      },
      { onConflict: 'run_id,step_id' },
    );

    throw new WorkflowPaused('wait_for_event', stepId);
  }

  async sendEvent(stepId: string, event: WorkflowEvent): Promise<void> {
    const cached = this.completedSteps.get(stepId);
    if (cached?.status === 'completed') {
      log.debug('SendEvent replayed from cache', { step_id: stepId, run_id: this.runId });
      return;
    }

    log.info('Step sending event', {
      step_id: stepId,
      run_id: this.runId,
      trace_id: this.traceId,
      event_name: event.name,
    });

    // Insert into workflow_events — the DB trigger will dispatch to matching workflows
    await this.supabase.from('workflow_events').insert({
      event_name: event.name,
      payload: event.payload,
      user_id: event.user_id ?? null,
      source: `workflow:${this.runId}:${stepId}`,
    });

    await this.supabase.from('workflow_steps').upsert(
      {
        run_id: this.runId,
        step_id: stepId,
        status: 'completed' as const,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: 0,
      },
      { onConflict: 'run_id,step_id' },
    );

    this.completedSteps.set(stepId, {
      id: '',
      run_id: this.runId,
      step_id: stepId,
      status: 'completed',
      output: null,
      error: null,
      attempt: 1,
      max_retries: 3,
      sleep_until: null,
      wait_event_name: null,
      wait_timeout: null,
      wait_match: null,
      started_at: null,
      completed_at: new Date().toISOString(),
      duration_ms: 0,
      created_at: '',
    });
  }

  async invoke<T = unknown>(stepId: string, opts: InvokeOpts): Promise<T> {
    const cached = this.completedSteps.get(stepId);
    if (cached?.status === 'completed') {
      log.debug('Invoke replayed from cache', { step_id: stepId, run_id: this.runId });
      return cached.output as T;
    }

    log.info('Step invoking child workflow', {
      step_id: stepId,
      run_id: this.runId,
      trace_id: this.traceId,
      child_workflow: opts.workflowId,
    });

    // Create child run directly
    const { data: childRun, error } = await this.supabase
      .from('workflow_runs')
      .insert({
        workflow_id: opts.workflowId,
        status: 'pending' as const,
        trigger_event: { name: opts.event.name, payload: opts.event.payload },
        parent_run_id: this.runId,
        trace_id: this.traceId,
      })
      .select('id')
      .single();

    if (error || !childRun) {
      throw new Error(`Failed to create child workflow: ${error?.message ?? 'unknown'}`);
    }

    // Enqueue the child for execution
    await this.supabase.rpc('workflow_enqueue', {
      p_message: {
        type: 'resume',
        run_id: (childRun as { id: string }).id,
        reason: 'retry',
      },
    });

    // Mark this step as waiting — the engine will poll for child completion
    await this.supabase.from('workflow_steps').upsert(
      {
        run_id: this.runId,
        step_id: stepId,
        status: 'waiting_for_event' as const,
        started_at: new Date().toISOString(),
        wait_event_name: `workflow.completed.${(childRun as { id: string }).id}`,
        wait_timeout: new Date(Date.now() + 3_600_000).toISOString(), // 1h timeout
      },
      { onConflict: 'run_id,step_id' },
    );

    throw new WorkflowPaused('invoke', stepId);
  }

  async parallel<T>(
    groupId: string,
    tasks: Array<{ id: string; fn: () => Promise<T> }>,
    opts?: ParallelOpts,
  ): Promise<T[]> {
    const concurrency = opts?.concurrency ?? tasks.length;

    log.info('Parallel group starting', {
      group_id: groupId,
      run_id: this.runId,
      trace_id: this.traceId,
      task_count: tasks.length,
      concurrency,
    });

    const indexed = tasks.map((task, i) => ({
      index: i,
      compositeId: `${groupId}/${task.id}`,
      fn: task.fn,
    }));

    const pending = indexed.filter(
      (t) => this.completedSteps.get(t.compositeId)?.status !== 'completed',
    );

    log.info('Parallel group partitioned', {
      group_id: groupId,
      cached: indexed.length - pending.length,
      pending: pending.length,
    });

    // Execute pending tasks with concurrency limit
    const active = new Map<number, Promise<number>>();
    let cursor = 0;

    while (cursor < pending.length || active.size > 0) {
      while (cursor < pending.length && active.size < concurrency) {
        const idx = cursor;
        const task = pending[idx];
        const promise = this.run<T>(task.compositeId, task.fn).then(() => idx);
        active.set(idx, promise);
        cursor++;
      }

      if (active.size > 0) {
        const settledIdx = await Promise.race(active.values());
        active.delete(settledIdx);
      }
    }

    // Collect results in original order from cache
    const results: T[] = [];
    for (const task of indexed) {
      const cached = this.completedSteps.get(task.compositeId);
      if (!cached || cached.status !== 'completed') {
        throw new Error(`Parallel task "${task.compositeId}" not found in cache after execution`);
      }
      results.push(cached.output as T);
    }

    log.info('Parallel group completed', {
      group_id: groupId,
      run_id: this.runId,
      task_count: tasks.length,
    });

    return results;
  }
}
