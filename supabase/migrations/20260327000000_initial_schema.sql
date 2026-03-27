-- ============================================================
-- Snacky — Initial Schema Migration
-- Extensions, tables, indexes, RLS policies, triggers, functions
-- ============================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;

-- ============================================================
-- 2. Tables
-- ============================================================

-- Users (linked to Supabase Auth via id = auth.uid())
CREATE TABLE users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    google_id       VARCHAR(255) UNIQUE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    display_name    VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

CREATE TABLE user_profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth       DATE,
    biological_sex      VARCHAR(20),
    height_cm           DECIMAL(5,1),
    activity_level      VARCHAR(20),
    goal_type           VARCHAR(30),
    goal_weight_kg      DECIMAL(5,1),
    goal_timeline_weeks INTEGER,
    dietary_restrictions TEXT[],
    allergies           TEXT[],
    cooking_skill       VARCHAR(20),
    cooking_time_pref   VARCHAR(20),
    cuisine_preferences TEXT[],
    locale              VARCHAR(5) NOT NULL DEFAULT 'en',

    tdee_kcal           INTEGER,
    target_kcal         INTEGER,
    target_protein_g    INTEGER,
    target_carbs_g      INTEGER,
    target_fat_g        INTEGER,

    psych_profile       JSONB,
    ai_persona_config   JSONB,
    notification_prefs  JSONB,

    onboarding_completed_at TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Diet plans (created before meals so meals can reference it)
CREATE TABLE diet_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    meals_per_day   INTEGER NOT NULL DEFAULT 3,
    config          JSONB NOT NULL,
    target_kcal     INTEGER NOT NULL,
    target_macros   JSONB NOT NULL,
    solver_metadata JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_user ON diet_plans(user_id, status, start_date DESC);

-- Meals
CREATE TABLE meals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_type       VARCHAR(20) NOT NULL,
    logged_at       TIMESTAMPTZ NOT NULL,
    timezone_offset INTEGER,

    image_key       VARCHAR(500),

    ai_analysis     JSONB NOT NULL,

    total_calories  DECIMAL(7,1),
    total_protein_g DECIMAL(6,1),
    total_carbs_g   DECIMAL(6,1),
    total_fat_g     DECIMAL(6,1),
    total_fiber_g   DECIMAL(6,1),
    total_sugar_g   DECIMAL(6,1),
    total_sodium_mg DECIMAL(7,1),
    micronutrients  JSONB,

    user_modified   BOOLEAN DEFAULT FALSE,
    modification_diff JSONB,

    source          VARCHAR(20) DEFAULT 'scan',
    diet_plan_id    UUID REFERENCES diet_plans(id),
    nova_class      INTEGER,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meals_user_logged ON meals(user_id, logged_at DESC);
CREATE INDEX idx_meals_user_type ON meals(user_id, meal_type, logged_at DESC);

CREATE TABLE meal_ingredients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id         UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    usda_fdc_id     INTEGER,
    portion_g       DECIMAL(6,1),
    calories        DECIMAL(6,1),
    protein_g       DECIMAL(5,1),
    carbs_g         DECIMAL(5,1),
    fat_g           DECIMAL(5,1),
    confidence      DECIMAL(3,2),
    user_verified   BOOLEAN DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_ingredients_meal ON meal_ingredients(meal_id);

CREATE TABLE meal_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id         UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_meal ON meal_comments(meal_id);
CREATE INDEX idx_comments_user ON meal_comments(user_id, created_at DESC);

-- Measurements
CREATE TABLE measurements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    measured_at     TIMESTAMPTZ NOT NULL,
    weight_kg       DECIMAL(5,1),
    waist_cm        DECIMAL(5,1),
    chest_cm        DECIMAL(5,1),
    hips_cm         DECIMAL(5,1),
    body_fat_pct    DECIMAL(4,1),
    source          VARCHAR(20) DEFAULT 'manual',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_measurements_user ON measurements(user_id, measured_at DESC);

-- Diet plan meals (child of diet_plans)
CREATE TABLE diet_plan_meals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diet_plan_id    UUID NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
    day_number      INTEGER NOT NULL,
    meal_slot       VARCHAR(20) NOT NULL,
    recipe_name     VARCHAR(500) NOT NULL,
    recipe_instructions TEXT,
    prep_time_min   INTEGER,
    ingredients     JSONB NOT NULL,
    calories        DECIMAL(7,1) NOT NULL,
    protein_g       DECIMAL(6,1) NOT NULL,
    carbs_g         DECIMAL(6,1) NOT NULL,
    fat_g           DECIMAL(6,1) NOT NULL,
    micronutrients  JSONB,
    image_url       TEXT,
    logged_meal_id  UUID REFERENCES meals(id),
    skipped         BOOLEAN DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_plan_meals ON diet_plan_meals(diet_plan_id, day_number, sort_order);

-- Chat
CREATE TABLE chat_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, last_message_at DESC);

CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,
    content         TEXT NOT NULL,
    retrieved_context_ids TEXT[],
    model_used      VARCHAR(50),
    tokens_used     INTEGER,
    attachments     JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages ON chat_messages(session_id, created_at);

-- Health sync log
CREATE TABLE health_sync_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source          VARCHAR(30) NOT NULL,
    data_type       VARCHAR(50) NOT NULL,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    records_count   INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'success',
    error_details   TEXT
);

CREATE INDEX idx_health_sync_user ON health_sync_log(user_id, synced_at DESC);

-- Notification log
CREATE TABLE notification_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    data            JSONB,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at    TIMESTAMPTZ,
    opened_at       TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user ON notification_log(user_id, sent_at DESC);

-- Vector embeddings (pgvector)
CREATE TABLE embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    namespace       VARCHAR(50) NOT NULL,
    source_type     VARCHAR(30) NOT NULL,
    source_id       UUID,
    content_text    TEXT NOT NULL,
    embedding       vector(2048) NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_embeddings_user_ns ON embeddings(user_id, namespace);
CREATE INDEX idx_embeddings_source ON embeddings(source_type, source_id);
-- pgvector HNSW/IVFFlat indexes cap at 2000 dimensions; voyage-4-large produces 2048.
-- Exact (sequential) scan is used until pgvector supports > 2000 dims for ANN indexes
-- or the embedding model is changed to one with <= 2000 dimensions.
-- At production scale, consider truncating vectors to 2000 dims before inserting and
-- adding: CREATE INDEX USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);

-- ============================================================
-- 3. updated_at trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_meals_updated_at
    BEFORE UPDATE ON meals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_diet_plans_updated_at
    BEFORE UPDATE ON diet_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. Row Level Security
-- ============================================================

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own record"
    ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own record"
    ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own record"
    ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- User profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own profile"
    ON user_profiles FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Meals
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own meals"
    ON meals FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Meal ingredients (access via meal ownership)
ALTER TABLE meal_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD ingredients of own meals"
    ON meal_ingredients FOR ALL
    USING (EXISTS (SELECT 1 FROM meals WHERE meals.id = meal_ingredients.meal_id AND meals.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM meals WHERE meals.id = meal_ingredients.meal_id AND meals.user_id = auth.uid()));

-- Meal comments
ALTER TABLE meal_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own comments"
    ON meal_comments FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Measurements
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own measurements"
    ON measurements FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Diet plans
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own diet plans"
    ON diet_plans FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Diet plan meals (access via plan ownership)
ALTER TABLE diet_plan_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD meals of own plans"
    ON diet_plan_meals FOR ALL
    USING (EXISTS (SELECT 1 FROM diet_plans WHERE diet_plans.id = diet_plan_meals.diet_plan_id AND diet_plans.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM diet_plans WHERE diet_plans.id = diet_plan_meals.diet_plan_id AND diet_plans.user_id = auth.uid()));

-- Chat sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own chat sessions"
    ON chat_sessions FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chat messages (access via session ownership)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD messages in own sessions"
    ON chat_messages FOR ALL
    USING (EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid()));

-- Health sync log
ALTER TABLE health_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own health sync log"
    ON health_sync_log FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own health sync log"
    ON health_sync_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Notification log
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications"
    ON notification_log FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"
    ON notification_log FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Embeddings: users can read own + global; only service role can write
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own and global embeddings"
    ON embeddings FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- 5. Storage RLS (meal-photos bucket)
-- ============================================================

CREATE POLICY "Users can upload own photos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'meal-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view own photos"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'meal-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete own photos"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'meal-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================
-- 6. Vector similarity search function
-- ============================================================

CREATE OR REPLACE FUNCTION match_embeddings(
    query_embedding vector(2048),
    p_user_id UUID,
    p_namespace VARCHAR(50) DEFAULT NULL,
    p_match_count INTEGER DEFAULT 5,
    p_match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    namespace VARCHAR(50),
    source_type VARCHAR(30),
    source_id UUID,
    content_text TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.namespace,
        e.source_type,
        e.source_id,
        e.content_text,
        e.metadata,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    WHERE
        (e.user_id = p_user_id OR e.user_id IS NULL)
        AND (p_namespace IS NULL OR e.namespace = p_namespace)
        AND 1 - (e.embedding <=> query_embedding) > p_match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT p_match_count;
END;
$$;
