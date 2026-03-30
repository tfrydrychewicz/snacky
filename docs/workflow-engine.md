# Durable Workflow Engine

A lightweight, Inngest-inspired durable workflow engine built entirely on Supabase primitives: **PGMQ** for job queuing, **Edge Functions** for execution, **pg_cron** for polling, **pg_net** for HTTP dispatch, and **PostgreSQL** for all state and checkpointing.

## Architecture

```
┌─────────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ Mobile App / API    │   │ DB Trigger        │   │ pg_cron          │
│ dispatchEvent()     │   │ + pg_net          │   │ (every 1 min)    │
└─────────┬───────────┘   └────────┬──────────┘   └────────┬─────────┘
          │                        │                       │
          ▼                        ▼                       ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    workflow_events table                     │
    │  (immutable event log — INSERT triggers PGMQ enqueue)       │
    └─────────────────────────────┬───────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   PGMQ: workflow_jobs       │
                    │   (durable message queue)    │
                    └─────────────┬──────────────┘
                                  │ pg_cron poll / pg_net POST
                                  ▼
                    ┌───────────────────────────┐
                    │ workflow-runner Edge Fn    │
                    │ (WorkflowEngine.handle)   │
                    └─────────────┬─────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
       workflow_runs        workflow_steps        Supabase
       (run state)          (checkpoints)         Realtime
```

## Quick Start

### 1. Define a Workflow

Create a file in `supabase/functions/workflow-runner/workflows/`:

```typescript
import type { WorkflowDefinition } from '../../_shared/workflow/mod.ts';

export const myWorkflow: WorkflowDefinition<{ user_id: string }> = {
  id: 'my-workflow',
  triggers: ['my-app/something-happened'],
  retries: 3,

  fn: async ({ event, step, runId, traceId }) => {
    // Step 1: Do some work (memoized — safe to replay)
    const data = await step.run('fetch-data', async () => {
      const resp = await fetch('https://api.example.com/data');
      return await resp.json();
    });

    // Step 2: Wait 5 minutes
    await step.sleep('cool-down', '5m');

    // Step 3: Do more work with the data from Step 1
    const result = await step.run('process-data', async () => {
      return processData(data);
    });

    // Step 4: Fan out — trigger another workflow
    await step.sendEvent('notify', {
      name: 'notification/send',
      payload: { user_id: event.payload.user_id, message: 'Done!' },
    });

    return result;
  },
};
```

### 2. Register the Workflow

Add it to the imports in `supabase/functions/workflow-runner/index.ts`:

```typescript
import { myWorkflow } from './workflows/my-workflow.ts';

const ALL_WORKFLOWS = [
  generatePlanWorkflow,
  myWorkflow,  // ← add here
];
```

### 3. Trigger the Workflow

From any Edge Function or server-side code:

```typescript
import { dispatchEvent } from '../_shared/workflow/mod.ts';

// Standard dispatch (goes through PGMQ → pg_cron → runner)
await dispatchEvent(supabase, {
  name: 'my-app/something-happened',
  payload: { user_id: '...' },
});

// Low-latency dispatch (also fires pg_net POST immediately)
import { dispatchEventDirect } from '../_shared/workflow/mod.ts';

await dispatchEventDirect(supabase, {
  name: 'my-app/something-happened',
  payload: { user_id: '...' },
});
```

Or insert directly into the `workflow_events` table (the DB trigger handles the rest):

```sql
INSERT INTO workflow_events (event_name, payload)
VALUES ('my-app/something-happened', '{"user_id": "..."}');
```

## Step API Reference

All step methods are **memoized**: if a step has already completed in a previous invocation (e.g., after a crash and resume), it returns the cached output instantly without re-executing.

### `step.run<T>(stepId, fn)`

Execute a named step. The function runs once; on replay, the cached output is returned.

```typescript
const user = await step.run('fetch-user', async () => {
  return await db.from('users').select('*').eq('id', userId).single();
});
```

**Constraints:**
- `stepId` must be unique within a workflow run
- `fn` must return a JSON-serializable value (stored in JSONB)
- If `fn` throws, the step is marked `failed` and the error propagates

### `step.sleep(stepId, duration)`

Pause the workflow for a specified duration. The Edge Function invocation ends; a pg_cron job resumes the workflow after the duration.

```typescript
await step.sleep('wait-for-processing', '30s');
await step.sleep('daily-check', '1d');
```

**Duration format:** `{number}{unit}` where unit is `s|sec|m|min|h|hr|d|day` (case-insensitive, optional plural `s`).

### `step.waitForEvent<T>(stepId, opts)`

Pause until a matching event arrives or a timeout expires.

```typescript
const result = await step.waitForEvent('wait-for-approval', {
  event: 'approval/completed',
  timeout: '24h',
  match: { request_id: requestId },  // optional payload filter
});

if (result.timed_out) {
  // Handle timeout
} else {
  // result.event contains the matching event
}
```

**How matching works:** When a new event is inserted into `workflow_events`, a DB trigger checks all steps with `status = 'waiting_for_event'` and `wait_event_name` matching the event name. If `wait_match` is set, the event's payload must contain all specified keys with matching values (`@>` containment).

### `step.sendEvent(stepId, event)`

Emit an event into the workflow system. This can trigger other workflows (fan-out pattern).

```typescript
await step.sendEvent('trigger-notification', {
  name: 'notification/send',
  payload: { user_id: '...', template: 'welcome' },
});
```

### `step.invoke<T>(stepId, opts)`

Spawn a child workflow and wait for its result. The parent workflow pauses until the child completes.

```typescript
const childResult = await step.invoke('run-sub-process', {
  workflowId: 'data-enrichment',
  event: { name: 'enrich/requested', payload: { item_id: '...' } },
});
```

## Retry & Error Handling

- **Workflow-level retries**: Set `retries` in the `WorkflowDefinition` (default: 3). On failure, the workflow is re-enqueued with exponential backoff (2^attempt seconds).
- **Step-level failures**: If a `step.run()` throws, the step is marked `failed`, and the error propagates to the workflow level. On retry, completed steps replay from cache; the failed step re-executes.
- **Terminal state**: After exhausting all retries, the run status is set to `failed` with the error message.

## Observability

### SQL Views

Query these views to monitor workflow health:

| View | Description |
|---|---|
| `v_workflow_active_runs` | All non-terminal runs with age, step progress |
| `v_workflow_step_durations` | Per-step execution statistics (avg, p95, max) |
| `v_workflow_error_rates` | 24h error rates per workflow |
| `v_workflow_queue_depth` | PGMQ queue metrics |
| `v_workflow_run_timeline` | Ordered step-by-step timeline for a run |

**Example queries:**

```sql
-- Active runs with their progress
SELECT workflow_id, status, steps_completed, steps_total, age_seconds
FROM v_workflow_active_runs
ORDER BY created_at DESC;

-- Slowest steps in the last 24 hours
SELECT workflow_id, step_id, avg_ms, p95_ms, executions
FROM v_workflow_step_durations
ORDER BY p95_ms DESC
LIMIT 20;

-- Error rates
SELECT workflow_id, completed, failed, error_rate_pct
FROM v_workflow_error_rates
WHERE error_rate_pct > 0;

-- Full timeline for a specific run
SELECT step_id, step_status, duration_ms, error
FROM v_workflow_run_timeline
WHERE run_id = '<uuid>';
```

### Realtime Subscriptions

`workflow_runs` and `workflow_steps` are added to `supabase_realtime`. Subscribe in client code to get live updates:

```typescript
supabase
  .channel('workflow-progress')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'workflow_runs',
    filter: `id=eq.${runId}`,
  }, (payload) => {
    console.log('Run status:', payload.new.status);
  })
  .subscribe();
```

### Structured Logging

Every engine and step operation emits structured JSON logs with `trace_id`, `run_id`, and `step_id` fields. Filter logs by `trace_id` to see the full execution trace of a workflow.

## Idempotency

Both `workflow_events` and `workflow_runs` support an `idempotency_key` column (unique constraint). Use it to prevent duplicate processing:

```typescript
await dispatchEvent(supabase, {
  name: 'payment/received',
  payload: { order_id: '123', amount: 99.99 },
}, {
  idempotencyKey: `payment-${orderId}`,
});
```

## Database Schema

### `workflow_runs`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `workflow_id` | TEXT | References a registered `WorkflowDefinition.id` |
| `status` | ENUM | `pending`, `running`, `completed`, `failed`, `cancelled`, `sleeping`, `waiting_for_event` |
| `trigger_event` | JSONB | The event that triggered this run |
| `context` | JSONB | Arbitrary context data |
| `output` | JSONB | Final return value of the workflow function |
| `error` | TEXT | Error message (if failed) |
| `attempt` | INT | Current attempt number |
| `max_retries` | INT | Maximum retry attempts |
| `idempotency_key` | TEXT | Optional deduplication key (unique) |
| `parent_run_id` | UUID | Parent run ID (for child workflows) |
| `trace_id` | TEXT | Trace ID for log correlation |

### `workflow_steps`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `run_id` | UUID | FK to `workflow_runs` |
| `step_id` | TEXT | Step name (unique per run) |
| `status` | ENUM | `pending`, `running`, `completed`, `failed`, `sleeping`, `waiting_for_event` |
| `output` | JSONB | Step return value |
| `error` | TEXT | Error message (if failed) |
| `sleep_until` | TIMESTAMPTZ | Wake-up time (for sleeping steps) |
| `wait_event_name` | TEXT | Event to wait for |
| `wait_timeout` | TIMESTAMPTZ | Timeout for event wait |
| `wait_match` | JSONB | Payload filter for event matching |
| `duration_ms` | INT | Execution duration |

### `workflow_events`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `event_name` | TEXT | Event name (e.g., `diet-plan/requested`) |
| `payload` | JSONB | Event data |
| `user_id` | UUID | Optional user association |
| `source` | TEXT | Origin (e.g., `workflow:{runId}:{stepId}`) |
| `idempotency_key` | TEXT | Deduplication key (unique) |
