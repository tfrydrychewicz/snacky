-- ============================================================
-- Multi-Photo Support for Meals
-- Adds image_keys column to store multiple photo storage paths
-- ============================================================

ALTER TABLE meals ADD COLUMN image_keys TEXT[] DEFAULT '{}';

-- Backfill existing single-photo meals into the new array column
UPDATE meals SET image_keys = ARRAY[image_key] WHERE image_key IS NOT NULL;
