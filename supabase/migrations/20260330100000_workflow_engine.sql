-- ============================================================
-- Durable Workflow Engine
--
-- Inngest-like step-based workflows on Supabase primitives.
-- Uses PGMQ for job dispatch, pg_cron for polling, pg_net for
-- Edge Function invocation, and PostgreSQL for all state.
-- ============================================================

-- 1. Enable PGMQ extension
CREATE EXTENSION IF NOT EXISTS pgmq;

-- 2. Create the job queue
SELECT pgmq.create('workflow_jobs');

-- ============================================================
-- 3. Configuration table (environment-aware, no superuser needed)
-- ============================================================

CREATE TABLE workflow_config (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE workflow_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on workflow_config"
    ON workflow_config FOR ALL
    USING (true) WITH CHECK (true);

INSERT INTO workflow_config (key, value, description) VALUES
    ('supabase_url',        'http://kong:8000',
     'Internal Supabase API URL. Local dev: http://kong:8000. '
     'Production: https://<project-ref>.supabase.co'),
    ('service_role_key',    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
     'Service role key for internal pg_net calls. '
     'Must be updated per environment.'),
    ('runner_timeout_ms',   '300000',
     'HTTP timeout for pg_net calls to workflow-runner (ms)')
ON CONFLICT (key) DO NOTHING;

-- Helper to read config (used by SQL functions below)
CREATE OR REPLACE FUNCTION workflow_get_config(p_key TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
    SELECT value FROM workflow_config WHERE key = p_key;
$$;

-- ============================================================
-- 4. Core tables
-- ============================================================

CREATE TYPE workflow_run_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
    'sleeping',
    'waiting_for_event'
);

CREATE TYPE workflow_step_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'sleeping',
    'waiting_for_event'
);

-- 4a. workflow_runs — one row per workflow execution
CREATE TABLE workflow_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     TEXT NOT NULL,
    status          workflow_run_status NOT NULL DEFAULT 'pending',
    trigger_event   JSONB NOT NULL DEFAULT '{}',
    context         JSONB NOT NULL DEFAULT '{}',
    output          JSONB,
    error           TEXT,
    attempt         INT NOT NULL DEFAULT 0,
    max_retries     INT NOT NULL DEFAULT 3,
    idempotency_key TEXT UNIQUE,
    parent_run_id   UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
    trace_id        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_parent ON workflow_runs(parent_run_id) WHERE parent_run_id IS NOT NULL;
CREATE INDEX idx_workflow_runs_created ON workflow_runs(created_at DESC);

-- 4b. workflow_steps — checkpoint for every step execution
CREATE TABLE workflow_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    step_id         TEXT NOT NULL,
    status          workflow_step_status NOT NULL DEFAULT 'pending',
    output          JSONB,
    error           TEXT,
    attempt         INT NOT NULL DEFAULT 0,
    max_retries     INT NOT NULL DEFAULT 3,
    sleep_until     TIMESTAMPTZ,
    wait_event_name TEXT,
    wait_timeout    TIMESTAMPTZ,
    wait_match      JSONB,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_workflow_steps_run_step ON workflow_steps(run_id, step_id);
CREATE INDEX idx_workflow_steps_sleeping ON workflow_steps(sleep_until)
    WHERE status = 'sleeping' AND sleep_until IS NOT NULL;
CREATE INDEX idx_workflow_steps_waiting ON workflow_steps(wait_event_name)
    WHERE status = 'waiting_for_event';

-- 4c. workflow_events — immutable audit log of all events
CREATE TABLE workflow_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name      TEXT NOT NULL,
    payload         JSONB NOT NULL DEFAULT '{}',
    user_id         UUID,
    source          TEXT,
    idempotency_key TEXT UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_events_name ON workflow_events(event_name);
CREATE INDEX idx_workflow_events_created ON workflow_events(created_at DESC);

-- ============================================================
-- 5. Auto-update updated_at on workflow_runs
-- ============================================================

CREATE OR REPLACE FUNCTION workflow_runs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_workflow_runs_updated
    BEFORE UPDATE ON workflow_runs
    FOR EACH ROW
    EXECUTE FUNCTION workflow_runs_updated_at();

-- ============================================================
-- 6. RLS — service role only (no client access)
-- ============================================================

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on workflow_runs"
    ON workflow_runs FOR ALL
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on workflow_steps"
    ON workflow_steps FOR ALL
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on workflow_events"
    ON workflow_events FOR ALL
    USING (true) WITH CHECK (true);

-- ============================================================
-- 7. Enable Realtime for observability
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE workflow_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_steps;

-- ============================================================
-- 8. Dispatch trigger: workflow_events INSERT → queue a job
-- ============================================================

CREATE OR REPLACE FUNCTION workflow_dispatch_on_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pgmq, extensions AS $$
BEGIN
    PERFORM pgmq.send(
        'workflow_jobs',
        jsonb_build_object(
            'type',     'event',
            'event_id', NEW.id::text,
            'event_name', NEW.event_name,
            'payload',  NEW.payload
        )
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_workflow_event_dispatch
    AFTER INSERT ON workflow_events
    FOR EACH ROW
    EXECUTE FUNCTION workflow_dispatch_on_event();

-- ============================================================
-- 9. Resume trigger: sleeping steps whose sleep_until has passed
--    Called by pg_cron every minute.
-- ============================================================

CREATE OR REPLACE FUNCTION workflow_resume_sleepers()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pgmq AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT ws.id AS ws_id, ws.run_id, ws.step_id AS step_name
        FROM workflow_steps ws
        WHERE ws.status = 'sleeping'
          AND ws.sleep_until <= NOW()
    LOOP
        UPDATE workflow_steps
        SET status = 'completed', completed_at = NOW(),
            duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at))::int * 1000
        WHERE id = rec.ws_id;

        UPDATE workflow_runs
        SET status = 'pending', updated_at = NOW()
        WHERE id = rec.run_id AND status = 'sleeping';

        PERFORM pgmq.send(
            'workflow_jobs',
            jsonb_build_object(
                'type',   'resume',
                'run_id', rec.run_id::text,
                'reason', 'sleep_complete',
                'step',   rec.step_name
            )
        );
    END LOOP;
END;
$$;

-- ============================================================
-- 10. Event-match trigger: when a new event arrives, check if
--     any step is waiting for it and resume those workflows.
-- ============================================================

CREATE OR REPLACE FUNCTION workflow_match_waiting_events()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pgmq AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT ws.id AS ws_id, ws.run_id, ws.step_id AS step_name, ws.wait_match
        FROM workflow_steps ws
        WHERE ws.status = 'waiting_for_event'
          AND ws.wait_event_name = NEW.event_name
          AND (ws.wait_timeout IS NULL OR ws.wait_timeout > NOW())
    LOOP
        -- If wait_match is set, verify the payload matches
        IF rec.wait_match IS NOT NULL AND rec.wait_match != '{}'::jsonb THEN
            -- Simple top-level key matching
            IF NOT (NEW.payload @> rec.wait_match) THEN
                CONTINUE;
            END IF;
        END IF;

        UPDATE workflow_steps
        SET status = 'completed',
            output = jsonb_build_object('event', row_to_json(NEW)::jsonb),
            completed_at = NOW(),
            duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at))::int * 1000
        WHERE id = rec.ws_id;

        UPDATE workflow_runs
        SET status = 'pending', updated_at = NOW()
        WHERE id = rec.run_id AND status = 'waiting_for_event';

        PERFORM pgmq.send(
            'workflow_jobs',
            jsonb_build_object(
                'type',   'resume',
                'run_id', rec.run_id::text,
                'reason', 'event_received',
                'step',   rec.step_name,
                'event_id', NEW.id::text
            )
        );
    END LOOP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_workflow_event_match
    AFTER INSERT ON workflow_events
    FOR EACH ROW
    EXECUTE FUNCTION workflow_match_waiting_events();

-- ============================================================
-- 11. Timeout expired waits: steps whose wait_timeout has passed
-- ============================================================

CREATE OR REPLACE FUNCTION workflow_timeout_waits()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pgmq AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT ws.id AS ws_id, ws.run_id, ws.step_id AS step_name
        FROM workflow_steps ws
        WHERE ws.status = 'waiting_for_event'
          AND ws.wait_timeout IS NOT NULL
          AND ws.wait_timeout <= NOW()
    LOOP
        UPDATE workflow_steps
        SET status = 'completed',
            output = '{"event": null, "timed_out": true}'::jsonb,
            completed_at = NOW(),
            duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at))::int * 1000
        WHERE id = rec.ws_id;

        UPDATE workflow_runs
        SET status = 'pending', updated_at = NOW()
        WHERE id = rec.run_id AND status = 'waiting_for_event';

        PERFORM pgmq.send(
            'workflow_jobs',
            jsonb_build_object(
                'type',   'resume',
                'run_id', rec.run_id::text,
                'reason', 'wait_timeout',
                'step',   rec.step_name
            )
        );
    END LOOP;
END;
$$;

-- ============================================================
-- 12. pg_cron jobs
-- ============================================================

-- Poll PGMQ and invoke the workflow-runner Edge Function every 10s
-- pg_cron minimum is 1 minute; we call a function that processes
-- all visible messages in the queue in a single pass.
SELECT cron.schedule(
    'workflow-queue-poll',
    '* * * * *',
    $$SELECT workflow_process_queue();$$
);

-- Resume sleeping steps every minute
SELECT cron.schedule(
    'workflow-resume-sleepers',
    '* * * * *',
    $$SELECT workflow_resume_sleepers();$$
);

-- Timeout expired waits every minute
SELECT cron.schedule(
    'workflow-timeout-waits',
    '* * * * *',
    $$SELECT workflow_timeout_waits();$$
);

-- ============================================================
-- 13. Queue processor: reads all visible messages and dispatches
--     each to the workflow-runner Edge Function via pg_net.
-- ============================================================

CREATE OR REPLACE FUNCTION workflow_process_queue()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pgmq, net, extensions AS $$
DECLARE
    rec          RECORD;
    base_url     TEXT := workflow_get_config('supabase_url');
    svc_key      TEXT := workflow_get_config('service_role_key');
    timeout_ms   INT  := coalesce(workflow_get_config('runner_timeout_ms')::int, 300000);
BEGIN
    IF base_url IS NULL OR svc_key IS NULL THEN
        RAISE WARNING '[workflow] supabase_url or service_role_key not set in workflow_config';
        RETURN;
    END IF;

    -- Read up to 10 messages with 300s visibility timeout
    FOR rec IN
        SELECT msg_id, message
        FROM pgmq.read('workflow_jobs', 300, 10)
    LOOP
        PERFORM net.http_post(
            url     := base_url || '/functions/v1/workflow-runner',
            body    := rec.message,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || svc_key
            ),
            timeout_milliseconds := timeout_ms
        );

        -- Archive the message after dispatch
        PERFORM pgmq.archive('workflow_jobs', rec.msg_id);
    END LOOP;
END;
$$;

-- ============================================================
-- 14. Direct dispatch RPC — bypasses pg_cron polling delay
-- ============================================================

CREATE OR REPLACE FUNCTION workflow_invoke_runner_now(
    p_event_id TEXT,
    p_event_name TEXT,
    p_payload JSONB
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, net, extensions AS $$
DECLARE
    base_url   TEXT := workflow_get_config('supabase_url');
    svc_key    TEXT := workflow_get_config('service_role_key');
    timeout_ms INT  := coalesce(workflow_get_config('runner_timeout_ms')::int, 300000);
BEGIN
    IF base_url IS NULL OR svc_key IS NULL THEN
        RAISE WARNING '[workflow] supabase_url or service_role_key not set in workflow_config';
        RETURN;
    END IF;

    PERFORM net.http_post(
        url     := base_url || '/functions/v1/workflow-runner',
        body    := jsonb_build_object(
            'type',       'event',
            'event_id',   p_event_id,
            'event_name', p_event_name,
            'payload',    p_payload
        ),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || svc_key
        ),
        timeout_milliseconds := timeout_ms
    );
END;
$$;

-- ============================================================
-- 15. RPC wrappers for PGMQ (avoids pgmq_public dependency)
-- ============================================================

CREATE OR REPLACE FUNCTION workflow_enqueue(
    p_message JSONB,
    p_delay_seconds INT DEFAULT 0
)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pgmq AS $$
BEGIN
    IF p_delay_seconds > 0 THEN
        RETURN pgmq.send('workflow_jobs', p_message, p_delay_seconds);
    ELSE
        RETURN pgmq.send('workflow_jobs', p_message);
    END IF;
END;
$$;

-- ============================================================
-- 16. Monitoring views
-- ============================================================

CREATE OR REPLACE VIEW v_workflow_active_runs AS
SELECT
    wr.id,
    wr.workflow_id,
    wr.status,
    wr.attempt,
    wr.trace_id,
    wr.created_at,
    wr.started_at,
    wr.updated_at,
    EXTRACT(EPOCH FROM (NOW() - wr.created_at))::int AS age_seconds,
    (SELECT COUNT(*) FROM workflow_steps ws WHERE ws.run_id = wr.id AND ws.status = 'completed') AS steps_completed,
    (SELECT COUNT(*) FROM workflow_steps ws WHERE ws.run_id = wr.id) AS steps_total
FROM workflow_runs wr
WHERE wr.status NOT IN ('completed', 'failed', 'cancelled');

CREATE OR REPLACE VIEW v_workflow_step_durations AS
SELECT
    wr.workflow_id,
    ws.step_id,
    COUNT(*) AS executions,
    ROUND(AVG(ws.duration_ms)) AS avg_ms,
    MAX(ws.duration_ms) AS max_ms,
    MIN(ws.duration_ms) AS min_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ws.duration_ms)) AS p95_ms
FROM workflow_steps ws
JOIN workflow_runs wr ON wr.id = ws.run_id
WHERE ws.status = 'completed' AND ws.duration_ms IS NOT NULL
GROUP BY wr.workflow_id, ws.step_id;

CREATE OR REPLACE VIEW v_workflow_error_rates AS
SELECT
    wr.workflow_id,
    COUNT(*) FILTER (WHERE wr.status = 'completed') AS completed,
    COUNT(*) FILTER (WHERE wr.status = 'failed') AS failed,
    COUNT(*) AS total,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE wr.status = 'failed') / NULLIF(COUNT(*), 0),
        2
    ) AS error_rate_pct
FROM workflow_runs wr
WHERE wr.created_at > NOW() - INTERVAL '24 hours'
GROUP BY wr.workflow_id;

CREATE OR REPLACE VIEW v_workflow_queue_depth AS
SELECT
    queue_name,
    queue_length,
    newest_msg_age_sec,
    oldest_msg_age_sec,
    total_messages
FROM pgmq.metrics('workflow_jobs');

-- Detailed timeline for a single run (useful for debugging)
CREATE OR REPLACE VIEW v_workflow_run_timeline AS
SELECT
    ws.run_id,
    wr.workflow_id,
    wr.trace_id,
    ws.step_id,
    ws.status AS step_status,
    ws.attempt,
    ws.duration_ms,
    ws.error,
    ws.started_at,
    ws.completed_at,
    ws.sleep_until,
    ws.wait_event_name
FROM workflow_steps ws
JOIN workflow_runs wr ON wr.id = ws.run_id
ORDER BY ws.created_at;
