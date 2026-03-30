-- ============================================================
-- Faster Stall Recovery
--
-- With periodic heartbeats (every 15s) in step.run(), we can
-- safely reduce the stall timeout from 300s to 45s and poll
-- every minute instead of every 2 minutes.
--
-- New worst-case recovery: ~1m45s (was ~7 min)
-- ============================================================

-- 1. Tighten the stall timeout
UPDATE workflow_config
SET value = '45',
    description = 'Seconds of inactivity before a running workflow is considered stalled (3x the 15s heartbeat interval)'
WHERE key = 'stall_timeout_s';

-- 2. Reschedule watchdog to every minute (pg_cron minimum)
SELECT cron.unschedule('workflow-recover-stalled');
SELECT cron.schedule(
    'workflow-recover-stalled',
    '* * * * *',
    $$SELECT workflow_recover_stalled();$$
);
