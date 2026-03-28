-- ============================================================
-- USDA Foods Table + Meal INSERT Trigger for Embedding
-- ============================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 2. USDA Foods Table
-- ============================================================

CREATE TABLE usda_foods (
    fdc_id                  INTEGER PRIMARY KEY,
    description             VARCHAR(500) NOT NULL,
    food_category           VARCHAR(200),
    brand_name              VARCHAR(200),
    data_source             VARCHAR(50) NOT NULL DEFAULT 'sr_legacy',
    calories_per_100g       DECIMAL(7,2),
    protein_per_100g        DECIMAL(6,2),
    carbs_per_100g          DECIMAL(6,2),
    fat_per_100g            DECIMAL(6,2),
    fiber_per_100g          DECIMAL(6,2),
    sugar_per_100g          DECIMAL(6,2),
    sodium_per_100g         DECIMAL(7,2),
    saturated_fat_per_100g  DECIMAL(6,2),
    serving_size_g          DECIMAL(6,1),
    serving_description     VARCHAR(200),
    search_vector           tsvector GENERATED ALWAYS AS (
        to_tsvector('english',
            coalesce(description, '') || ' ' ||
            coalesce(food_category, '') || ' ' ||
            coalesce(brand_name, ''))
    ) STORED,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usda_foods_search ON usda_foods USING GIN (search_vector);
CREATE INDEX idx_usda_foods_category ON usda_foods(food_category);
CREATE INDEX idx_usda_foods_trgm ON usda_foods USING GIN (description gin_trgm_ops);

-- ============================================================
-- 3. RLS — global read, service-role–only write
-- ============================================================

ALTER TABLE usda_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read USDA foods"
    ON usda_foods FOR SELECT
    USING (true);

-- ============================================================
-- 4. Trigger: meals INSERT → call embed Edge Function (async)
--    Uses pg_net for fire-and-forget HTTP POST.
--    Requires app.settings.supabase_url and
--    app.settings.service_role_key to be set via:
--      ALTER DATABASE postgres
--        SET app.settings.supabase_url = 'https://...';
--      ALTER DATABASE postgres
--        SET app.settings.service_role_key = 'sbp_...';
--    Silently skips when settings are absent (local dev).
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

CREATE TRIGGER trg_meal_embed
    AFTER INSERT ON meals
    FOR EACH ROW
    EXECUTE FUNCTION notify_embed_on_meal_insert();
