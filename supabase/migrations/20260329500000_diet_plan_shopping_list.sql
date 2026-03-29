-- Add shopping_list and validation columns to diet_plans
ALTER TABLE diet_plans
  ADD COLUMN IF NOT EXISTS shopping_list JSONB,
  ADD COLUMN IF NOT EXISTS validation   JSONB;

COMMENT ON COLUMN diet_plans.shopping_list IS 'Aggregated shopping list [{name, total_g, display_qty, category, usda_fdc_ids}]';
COMMENT ON COLUMN diet_plans.validation   IS 'Post-generation validation {allergen_flags, nutrition_drift_pct, passed}';
