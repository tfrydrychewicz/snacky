-- ============================================================
-- Push Notification System (Phase 2.7)
--
-- 1. user_devices table for FCM token storage
-- 2. Add budget_alert notification type support
-- 3. pg_cron jobs for scheduled notifications
-- ============================================================

-- 1. Device token storage
CREATE TABLE IF NOT EXISTS user_devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token       TEXT NOT NULL,
    platform        VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
    device_name     TEXT,
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_devices_token ON user_devices(fcm_token);
CREATE INDEX idx_user_devices_user ON user_devices(user_id);

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own devices"
    ON user_devices FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role needs to read tokens for dispatch
CREATE POLICY "Service can read all devices"
    ON user_devices FOR SELECT
    USING (true);

-- 2. pg_cron scheduled notification jobs
-- These call the send-notification Edge Function via pg_net

-- Streak maintenance: 20:00 UTC daily (users handle timezone in prefs)
SELECT cron.schedule(
    'streak-maintenance-nudge',
    '0 20 * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification',
        body := '{"type": "streak_check"}'::jsonb,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
    ) WHERE current_setting('app.settings.supabase_url', true) IS NOT NULL;
    $$
);

-- Weekly report: Sunday 09:00 UTC
SELECT cron.schedule(
    'weekly-report-notification',
    '0 9 * * 0',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification',
        body := '{"type": "weekly_report"}'::jsonb,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
    ) WHERE current_setting('app.settings.supabase_url', true) IS NOT NULL;
    $$
);

-- Meal reminders: every hour between 7-21 UTC, checks user meal windows
SELECT cron.schedule(
    'meal-reminder-check',
    '0 7-21 * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification',
        body := '{"type": "meal_reminder_check"}'::jsonb,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
    ) WHERE current_setting('app.settings.supabase_url', true) IS NOT NULL;
    $$
);
