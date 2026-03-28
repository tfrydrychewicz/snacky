-- ============================================================
-- RAG Embedding Pipeline (Phase 2.1)
--
-- 1. Reduce embedding dimension from 2048 → 1024 to enable
--    HNSW indexing (pgvector supports up to 2000 dims for ANN).
--    Using OpenAI text-embedding-3-small with dimensions=1024.
-- 2. Add HNSW index for cosine similarity search.
-- 3. Create upsert_embedding RPC for idempotent writes.
-- 4. Add pg_net triggers for comments and measurements.
-- ============================================================

-- 1. Alter embeddings column to vector(1024)
--    Drop existing rows (none in production yet) to allow ALTER.
TRUNCATE TABLE embeddings;
ALTER TABLE embeddings
    ALTER COLUMN embedding TYPE vector(1024);

-- 2. HNSW index for fast cosine similarity search
CREATE INDEX idx_embeddings_hnsw
    ON embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- 3. Update match_embeddings for vector(1024)
CREATE OR REPLACE FUNCTION match_embeddings(
    query_embedding vector(1024),
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

-- 4. Upsert embedding RPC — idempotent write by (source_type, source_id)
CREATE OR REPLACE FUNCTION upsert_embedding(
    p_source_type VARCHAR(30),
    p_source_id UUID,
    p_user_id UUID,
    p_namespace VARCHAR(50),
    p_content_text TEXT,
    p_embedding TEXT,
    p_metadata JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    INSERT INTO embeddings (
        source_type, source_id, user_id, namespace,
        content_text, embedding, metadata
    )
    VALUES (
        p_source_type, p_source_id::UUID, p_user_id,
        p_namespace, p_content_text,
        p_embedding::vector(1024), p_metadata
    )
    ON CONFLICT (source_type, source_id)
    DO UPDATE SET
        content_text = EXCLUDED.content_text,
        embedding    = EXCLUDED.embedding,
        metadata     = EXCLUDED.metadata,
        created_at   = NOW();
END;
$$;

-- Unique constraint needed for ON CONFLICT
CREATE UNIQUE INDEX idx_embeddings_source_unique
    ON embeddings(source_type, source_id)
    WHERE source_id IS NOT NULL;

-- 5. Trigger: meal_comments INSERT → embed Edge Function
CREATE OR REPLACE FUNCTION notify_embed_on_comment_insert()
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
            body    := jsonb_build_object('type', 'comment', 'id', NEW.id::text),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || svc_key
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comment_embed
    AFTER INSERT ON meal_comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_embed_on_comment_insert();

-- 6. Trigger: measurements INSERT → embed Edge Function
CREATE OR REPLACE FUNCTION notify_embed_on_measurement_insert()
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
            body    := jsonb_build_object('type', 'measurement', 'id', NEW.id::text),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || svc_key
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_measurement_embed
    AFTER INSERT ON measurements
    FOR EACH ROW
    EXECUTE FUNCTION notify_embed_on_measurement_insert();
