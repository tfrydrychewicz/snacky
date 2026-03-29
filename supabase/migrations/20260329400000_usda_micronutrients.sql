-- ============================================================
-- Expand usda_foods with 20 micronutrient columns
-- (12 vitamins + 8 minerals, all per 100 g, nullable)
-- ============================================================

-- Vitamins
ALTER TABLE usda_foods
  ADD COLUMN IF NOT EXISTS vitamin_a_ug_per_100g       DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS vitamin_c_mg_per_100g       DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS vitamin_d_ug_per_100g       DECIMAL(6,3),
  ADD COLUMN IF NOT EXISTS vitamin_e_mg_per_100g       DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS vitamin_k_ug_per_100g       DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS thiamin_mg_per_100g         DECIMAL(6,3),
  ADD COLUMN IF NOT EXISTS riboflavin_mg_per_100g      DECIMAL(6,3),
  ADD COLUMN IF NOT EXISTS niacin_mg_per_100g          DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS vitamin_b6_mg_per_100g      DECIMAL(6,3),
  ADD COLUMN IF NOT EXISTS folate_ug_per_100g          DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS vitamin_b12_ug_per_100g     DECIMAL(6,3),
  ADD COLUMN IF NOT EXISTS choline_mg_per_100g         DECIMAL(7,2);

-- Minerals
ALTER TABLE usda_foods
  ADD COLUMN IF NOT EXISTS calcium_mg_per_100g         DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS iron_mg_per_100g            DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS magnesium_mg_per_100g       DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS phosphorus_mg_per_100g      DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS potassium_mg_per_100g       DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS zinc_mg_per_100g            DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS copper_mg_per_100g          DECIMAL(6,3),
  ADD COLUMN IF NOT EXISTS selenium_ug_per_100g        DECIMAL(7,2);
