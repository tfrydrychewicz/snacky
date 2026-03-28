#!/usr/bin/env npx tsx
/**
 * Seed the `usda_foods` table with USDA FoodData Central data.
 *
 * Fetches SR Legacy (~7 800 foods) and Foundation (~2 400 foods) datasets
 * via the USDA FDC API and batch-upserts them into the local Supabase DB.
 *
 * Prerequisites:
 *   1. Run `supabase start` (local) or configure SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *   2. Apply the 20260328 migration (usda_foods table)
 *   3. Obtain a free USDA API key: https://fdc.nal.usda.gov/api-key-signup.html
 *      (DEMO_KEY works but is rate-limited to 30 req/hr)
 *
 * Usage:
 *   USDA_API_KEY=your_key npx tsx scripts/seed-usda.ts
 *
 * Environment variables:
 *   USDA_API_KEY             USDA FDC API key (default: DEMO_KEY)
 *   SUPABASE_URL             Supabase project URL (default: http://127.0.0.1:54321)
 *   SUPABASE_SERVICE_ROLE_KEY  Service role key
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const USDA_API_KEY = process.env['USDA_API_KEY'] ?? 'DEMO_KEY';
const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
const SUPABASE_KEY =
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const FDC_BASE = 'https://api.nal.usda.gov/fdc/v1';
const PAGE_SIZE = 200;
const BATCH_SIZE = 500;

const DATA_SOURCES: Array<{ type: string; label: string }> = [
  { type: 'SR Legacy', label: 'sr_legacy' },
  { type: 'Foundation', label: 'foundation' },
];

// USDA nutrient IDs
const NUTRIENT = {
  ENERGY: 1008,
  PROTEIN: 1003,
  FAT: 1004,
  CARBS: 1005,
  FIBER: 1079,
  SUGAR: 2000,
  SODIUM: 1093,
  SAT_FAT: 1258,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FdcNutrient {
  nutrientId?: number;
  nutrient?: { id: number };
  amount?: number;
  value?: number;
}

interface FdcFood {
  fdcId: number;
  description: string;
  foodCategory?: string;
  brandName?: string;
  foodNutrients?: FdcNutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
}

interface UsdaRow {
  fdc_id: number;
  description: string;
  food_category: string | null;
  brand_name: string | null;
  data_source: string;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  fiber_per_100g: number | null;
  sugar_per_100g: number | null;
  sodium_per_100g: number | null;
  saturated_fat_per_100g: number | null;
  serving_size_g: number | null;
  serving_description: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractNutrient(nutrients: FdcNutrient[] | undefined, id: number): number | null {
  if (!nutrients) return null;
  const hit = nutrients.find((n) => (n.nutrientId ?? n.nutrient?.id) === id);
  return hit ? (hit.amount ?? hit.value ?? null) : null;
}

function toRow(food: FdcFood, dataSource: string): UsdaRow {
  const n = food.foodNutrients;
  return {
    fdc_id: food.fdcId,
    description: food.description.slice(0, 500),
    food_category:
      typeof food.foodCategory === 'string'
        ? food.foodCategory
        : ((food.foodCategory as { description?: string } | undefined)?.description ?? null),
    brand_name: food.brandName ?? null,
    data_source: dataSource,
    calories_per_100g: extractNutrient(n, NUTRIENT.ENERGY),
    protein_per_100g: extractNutrient(n, NUTRIENT.PROTEIN),
    carbs_per_100g: extractNutrient(n, NUTRIENT.CARBS),
    fat_per_100g: extractNutrient(n, NUTRIENT.FAT),
    fiber_per_100g: extractNutrient(n, NUTRIENT.FIBER),
    sugar_per_100g: extractNutrient(n, NUTRIENT.SUGAR),
    sodium_per_100g: extractNutrient(n, NUTRIENT.SODIUM),
    saturated_fat_per_100g: extractNutrient(n, NUTRIENT.SAT_FAT),
    serving_size_g: food.servingSize && food.servingSizeUnit === 'g' ? food.servingSize : null,
    serving_description: food.householdServingFullText ?? null,
  };
}

async function fetchPage(dataType: string, pageNumber: number): Promise<FdcFood[]> {
  const url = `${FDC_BASE}/foods/list?api_key=${USDA_API_KEY}&dataType=${encodeURIComponent(dataType)}&pageSize=${PAGE_SIZE}&pageNumber=${pageNumber}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`USDA API error ${resp.status}: ${text}`);
  }
  return (await resp.json()) as FdcFood[];
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌽  USDA FoodData Central seeder');
  console.log(`    API key: ${USDA_API_KEY === 'DEMO_KEY' ? 'DEMO_KEY (rate-limited)' : '***'}`);
  console.log(`    Supabase: ${SUPABASE_URL}`);
  console.log();

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  let totalInserted = 0;

  for (const ds of DATA_SOURCES) {
    console.log(`--- Fetching ${ds.type} foods ---`);

    let page = 1;
    let batch: UsdaRow[] = [];
    let totalForSource = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      process.stdout.write(`  page ${page}... `);

      let foods: FdcFood[];
      try {
        foods = await fetchPage(ds.type, page);
      } catch (err) {
        console.error(`\n  Error fetching page ${page}: ${err}`);
        if (USDA_API_KEY === 'DEMO_KEY') {
          console.log('  DEMO_KEY has strict rate limits. Waiting 120 s before retry...');
          await sleep(120_000);
          continue;
        }
        throw err;
      }

      console.log(`${foods.length} foods`);

      if (foods.length === 0) break;

      for (const food of foods) {
        batch.push(toRow(food, ds.label));
      }
      totalForSource += foods.length;

      if (batch.length >= BATCH_SIZE) {
        const { error } = await supabase.from('usda_foods').upsert(batch, { onConflict: 'fdc_id' });
        if (error) {
          console.error(`  Upsert error: ${error.message}`);
          throw error;
        }
        console.log(`  -> upserted ${batch.length} rows`);
        batch = [];
      }

      if (foods.length < PAGE_SIZE) break;
      page++;

      if (USDA_API_KEY === 'DEMO_KEY') {
        await sleep(2_500);
      }
    }

    if (batch.length > 0) {
      const { error } = await supabase.from('usda_foods').upsert(batch, { onConflict: 'fdc_id' });
      if (error) {
        console.error(`  Upsert error: ${error.message}`);
        throw error;
      }
      console.log(`  -> upserted ${batch.length} rows (final batch)`);
    }

    console.log(`  Total ${ds.type}: ${totalForSource} foods\n`);
    totalInserted += totalForSource;
  }

  console.log(`Done! ${totalInserted} USDA foods seeded.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
