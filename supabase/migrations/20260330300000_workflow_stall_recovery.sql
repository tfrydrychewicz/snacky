-- ============================================================
-- Workflow Stall Recovery
--
-- Detects workflow runs that were killed mid-execution (Edge
-- Function WORKER_LIMIT, timeout, OOM) and automatically
-- re-queues them for resumption. Works in concert with the
-- heartbeat in step.run() that keeps updated_at fresh.
-- ============================================================

-- 1. Configurable stall timeout
INSERT INTO workflow_config (key, value, description) VALUES
    ('stall_timeout_s', '300',
     'Seconds of inactivity before a running workflow is considered stalled (default 5 min)')
ON CONFLICT (key) DO NOTHING;

-- 2. Recovery function
CREATE OR REPLACE FUNCTION workflow_recover_stalled()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pgmq AS $$
DECLARE
    timeout_s  INT := coalesce(workflow_get_config('stall_timeout_s')::int, 300);
    rec        RECORD;
    recovered  INT := 0;
BEGIN
    FOR rec IN
        SELECT wr.id, wr.workflow_id, wr.trace_id, wr.attempt, wr.max_retries,
               EXTRACT(EPOCH FROM (NOW() - wr.updated_at))::int AS stalled_for_s
        FROM workflow_runs wr
        WHERE wr.status = 'running'
          AND wr.updated_at < NOW() - (timeout_s || ' seconds')::interval
    LOOP
        -- Only recover if we haven't exhausted retries
        IF rec.attempt >= rec.max_retries THEN
            UPDATE workflow_runs
            SET status = 'failed',
                error = 'Stalled and exhausted all retry attempts',
                completed_at = NOW()
            WHERE id = rec.id;

            RAISE NOTICE '[workflow-recovery] Run % (%) failed permanently after % stall recoveries',
                rec.id, rec.workflow_id, rec.attempt;
            CONTINUE;
        END IF;

        -- Reset to pending so the engine picks it up
        UPDATE workflow_runs
        SET status = 'pending'
        WHERE id = rec.id;

        -- Queue a resume message
        PERFORM pgmq.send(
            'workflow_jobs',
            jsonb_build_object(
                'type',   'resume',
                'run_id', rec.id::text,
                'reason', 'stall_recovery'
            )
        );

        recovered := recovered + 1;
        RAISE NOTICE '[workflow-recovery] Recovered stalled run % (%) after %s inactivity (attempt %/%)',
            rec.id, rec.workflow_id, rec.stalled_for_s, rec.attempt, rec.max_retries;
    END LOOP;

    IF recovered > 0 THEN
        RAISE NOTICE '[workflow-recovery] Total recovered: %', recovered;
    END IF;
END;
$$;

-- 3. Schedule every 2 minutes
SELECT cron.schedule(
    'workflow-recover-stalled',
    '*/2 * * * *',
    $$SELECT workflow_recover_stalled();$$
);
