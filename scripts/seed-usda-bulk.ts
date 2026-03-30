#!/usr/bin/env npx tsx
/**
 * Seed `usda_foods` from USDA FDC bulk download files (no API key required).
 *
 * Downloads the SR Legacy JSON dataset directly from USDA servers,
 * extracts nutrient data, and batch-upserts into Supabase.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/seed-usda-bulk.ts
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
const SUPABASE_KEY =
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const BATCH_SIZE = 500;
const DOWNLOAD_DIR = join(process.cwd(), '.usda-cache');

const SR_LEGACY_URL =
  'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2021-10-28.zip';
const FOUNDATION_URL =
  'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2024-10-31.zip';

const NUTRIENT_IDS: Record<string, number> = {
  calories_per_100g: 1008,
  protein_per_100g: 1003,
  fat_per_100g: 1004,
  carbs_per_100g: 1005,
  fiber_per_100g: 1079,
  sugar_per_100g: 2000,
  sodium_per_100g: 1093,
  saturated_fat_per_100g: 1258,
  vitamin_a_ug_per_100g: 1106,
  vitamin_c_mg_per_100g: 1162,
  vitamin_d_ug_per_100g: 1114,
  vitamin_e_mg_per_100g: 1109,
  vitamin_k_ug_per_100g: 1185,
  thiamin_mg_per_100g: 1165,
  riboflavin_mg_per_100g: 1166,
  niacin_mg_per_100g: 1167,
  vitamin_b6_mg_per_100g: 1175,
  folate_ug_per_100g: 1190,
  vitamin_b12_ug_per_100g: 1178,
  choline_mg_per_100g: 1180,
  calcium_mg_per_100g: 1087,
  iron_mg_per_100g: 1089,
  magnesium_mg_per_100g: 1090,
  phosphorus_mg_per_100g: 1091,
  potassium_mg_per_100g: 1092,
  zinc_mg_per_100g: 1095,
  copper_mg_per_100g: 1098,
  selenium_ug_per_100g: 1103,
};

interface FdcNutrient {
  nutrient: { id: number };
  amount?: number;
}

interface FdcFood {
  fdcId: number;
  description: string;
  foodCategory?: { description?: string };
  foodNutrients?: FdcNutrient[];
  foodPortions?: Array<{ gramWeight?: number; portionDescription?: string }>;
}

interface UsdaRow {
  fdc_id: number;
  description: string;
  food_category: string | null;
  brand_name: string | null;
  data_source: string;
  serving_size_g: number | null;
  serving_description: string | null;
  [key: string]: string | number | null;
}

function extractNutrient(nutrients: FdcNutrient[] | undefined, id: number): number | null {
  if (!nutrients) return null;
  const hit = nutrients.find((n) => n.nutrient?.id === id);
  return hit?.amount ?? null;
}

function toRow(food: FdcFood, dataSource: string): UsdaRow {
  const n = food.foodNutrients;
  const portion = food.foodPortions?.[0];

  const row: UsdaRow = {
    fdc_id: food.fdcId,
    description: food.description.slice(0, 500),
    food_category: food.foodCategory?.description ?? null,
    brand_name: null,
    data_source: dataSource,
    serving_size_g: portion?.gramWeight ?? null,
    serving_description: portion?.portionDescription ?? null,
  };

  for (const [col, nutrientId] of Object.entries(NUTRIENT_IDS)) {
    row[col] = extractNutrient(n, nutrientId);
  }

  return row;
}

function downloadAndExtract(url: string, label: string): FdcFood[] {
  if (!existsSync(DOWNLOAD_DIR)) mkdirSync(DOWNLOAD_DIR, { recursive: true });

  const zipPath = join(DOWNLOAD_DIR, `${label}.zip`);
  const jsonDir = join(DOWNLOAD_DIR, label);

  if (!existsSync(zipPath)) {
    console.log(`  Downloading ${label}...`);
    execSync(`curl -L -o "${zipPath}" "${url}"`, { stdio: 'inherit' });
  } else {
    console.log(`  Using cached ${zipPath}`);
  }

  if (!existsSync(jsonDir)) {
    mkdirSync(jsonDir, { recursive: true });
    console.log(`  Extracting...`);
    execSync(`unzip -o "${zipPath}" -d "${jsonDir}"`, { stdio: 'inherit' });
  }

  // Find the JSON file inside the extracted directory
  const findResult = execSync(`find "${jsonDir}" -name "*.json" -type f`).toString().trim();
  const jsonFiles = findResult.split('\n').filter(Boolean);

  if (jsonFiles.length === 0) {
    throw new Error(`No JSON files found in ${jsonDir}`);
  }

  console.log(`  Found ${jsonFiles.length} JSON file(s)`);

  let allFoods: FdcFood[] = [];
  for (const jsonFile of jsonFiles) {
    console.log(`  Reading ${jsonFile.split('/').pop()}...`);
    const raw = readFileSync(jsonFile, 'utf-8');
    const data = JSON.parse(raw);

    if (data.SRLegacyFoods) {
      allFoods = allFoods.concat(data.SRLegacyFoods);
    } else if (data.FoundationFoods) {
      allFoods = allFoods.concat(data.FoundationFoods);
    } else if (Array.isArray(data)) {
      allFoods = allFoods.concat(data);
    }
  }

  return allFoods;
}

async function main() {
  console.log('🌽  USDA FoodData Central bulk seeder');
  console.log(`    Supabase: ${SUPABASE_URL}`);
  console.log();

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  let totalInserted = 0;

  const datasets: Array<{ url: string; label: string; source: string }> = [
    { url: SR_LEGACY_URL, label: 'sr_legacy', source: 'sr_legacy' },
    { url: FOUNDATION_URL, label: 'foundation', source: 'foundation' },
  ];

  for (const ds of datasets) {
    console.log(`--- Processing ${ds.label} ---`);

    let foods: FdcFood[];
    try {
      foods = downloadAndExtract(ds.url, ds.label);
    } catch (err) {
      console.error(`  Failed to download/extract ${ds.label}: ${err}`);
      continue;
    }

    console.log(`  ${foods.length} foods loaded`);

    const rows = foods.map((f) => toRow(f, ds.source));

    // Filter out foods without calorie data
    const withCalories = rows.filter(
      (r) => r['calories_per_100g'] != null && (r['calories_per_100g'] as number) > 0,
    );
    console.log(
      `  ${withCalories.length} foods with calorie data (${rows.length - withCalories.length} skipped)`,
    );

    // Upsert in batches
    for (let i = 0; i < withCalories.length; i += BATCH_SIZE) {
      const batch = withCalories.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('usda_foods').upsert(batch, { onConflict: 'fdc_id' });

      if (error) {
        console.error(`  Upsert error at batch ${i}: ${error.message}`);
        // Try smaller batches
        for (const row of batch) {
          const { error: singleErr } = await supabase
            .from('usda_foods')
            .upsert(row, { onConflict: 'fdc_id' });
          if (singleErr) {
            console.error(`  Single row error (${row.fdc_id}): ${singleErr.message}`);
          }
        }
      } else {
        console.log(`  -> upserted ${i + batch.length}/${withCalories.length}`);
      }
    }

    totalInserted += withCalories.length;
    console.log(`  Done: ${withCalories.length} foods for ${ds.label}\n`);
  }

  console.log(`✅ Complete! ${totalInserted} USDA foods seeded with full nutrient data.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
