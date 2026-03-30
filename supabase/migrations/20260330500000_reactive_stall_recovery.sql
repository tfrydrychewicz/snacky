-- ============================================================
-- Reactive Stall Recovery
--
-- Replace the dedicated stall-recovery cron with self-scheduled
-- PGMQ delayed watchdog messages. Each workflow execution queues
-- its own "check on me" message, making recovery reactive.
-- ============================================================

-- 1. RPC to send a delayed watchdog message (called from Edge Function)
CREATE OR REPLACE FUNCTION workflow_send_watchdog(
    p_run_id TEXT,
    p_delay_s INT DEFAULT 60
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pgmq AS $$
BEGIN
    PERFORM pgmq.send(
        'workflow_jobs',
        jsonb_build_object('type', 'watchdog', 'run_id', p_run_id),
        p_delay_s
    );
END;
$$;

-- 2. RPC to send a resume message (called from Edge Function watchdog handler)
CREATE OR REPLACE FUNCTION workflow_send_resume(
    p_run_id TEXT,
    p_reason TEXT DEFAULT 'stall_recovery'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pgmq AS $$
BEGIN
    PERFORM pgmq.send(
        'workflow_jobs',
        jsonb_build_object(
            'type',   'resume',
            'run_id', p_run_id,
            'reason', p_reason
        )
    );
END;
$$;

-- 3. Remove the dedicated stall-recovery cron (watchdog messages handle this now)
SELECT cron.unschedule('workflow-recover-stalled');
