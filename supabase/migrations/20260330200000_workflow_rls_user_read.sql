-- ============================================================
-- User-facing RLS policies for workflow progress polling
--
-- Authenticated users can SELECT their own workflow runs/steps
-- based on the user_id stored in trigger_event.payload.
-- ============================================================

CREATE POLICY "Users can read own workflow runs"
    ON workflow_runs FOR SELECT
    USING (
        (trigger_event->'payload'->>'user_id')::uuid = auth.uid()
    );

CREATE POLICY "Users can read own workflow steps"
    ON workflow_steps FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workflow_runs wr
            WHERE wr.id = workflow_steps.run_id
            AND (wr.trigger_event->'payload'->>'user_id')::uuid = auth.uid()
        )
    );
