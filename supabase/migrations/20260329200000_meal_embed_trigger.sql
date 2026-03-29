-- ============================================================
-- Add missing embed trigger for meals table.
-- Comments and measurements already have triggers
-- (20260329000000_rag_embedding_pipeline.sql), but meals
-- were missing — so the chat assistant had no meal data.
-- ============================================================

CREATE OR REPLACE FUNCTION notify_embed_on_meal_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions
AS $$
DECLARE
    base_url TEXT := current_setting('app.settings.supabase_url', true);
    svc_key  TEXT := current_setting('app.settings.service_role_key', true);
BEGIN
    IF base_url IS NOT NULL AND svc_key IS NOT NULL THEN
        PERFORM net.http_post(
            url     := base_url || '/functions/v1/embed',
            body    := jsonb_build_object('type', 'meal', 'id', NEW.id::text),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || svc_key
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meal_embed ON meals;

CREATE TRIGGER trg_meal_embed
    AFTER INSERT ON meals
    FOR EACH ROW
    EXECUTE FUNCTION notify_embed_on_meal_insert();
