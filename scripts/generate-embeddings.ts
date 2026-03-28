#!/usr/bin/env npx tsx
/**
 * Batch embedding generator for the RAG pipeline.
 *
 * Generates vector embeddings for:
 *   1. USDA foods dataset   (namespace: usda_foods)
 *   2. Nutritional guidelines corpus (namespace: nutrition_guidelines)
 *
 * Prerequisites:
 *   1. Run `supabase start` (local) or set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *   2. Apply the 20260329 migration (embedding pipeline)
 *   3. Seed USDA foods first: `npx tsx scripts/seed-usda.ts`
 *   4. Set OPENAI_API_KEY
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... npx tsx scripts/generate-embeddings.ts
 *   OPENAI_API_KEY=sk-... npx tsx scripts/generate-embeddings.ts --source usda
 *   OPENAI_API_KEY=sk-... npx tsx scripts/generate-embeddings.ts --source guidelines
 *
 * Environment variables:
 *   OPENAI_API_KEY               OpenAI API key (required)
 *   SUPABASE_URL                 Supabase project URL (default: http://127.0.0.1:54321)
 *   SUPABASE_SERVICE_ROLE_KEY    Service role key
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OPENAI_API_KEY = process.env['OPENAI_API_KEY'];
const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
const SUPABASE_KEY =
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_EMBED_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1024;
const EMBED_BATCH_SIZE = 128;
const DB_BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// OpenAI Embeddings
// ---------------------------------------------------------------------------

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
  usage: { total_tokens: number };
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required');

  const resp = await fetch(OPENAI_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBED_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIM,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`OpenAI Embeddings API error (${resp.status}): ${body}`);
  }

  const json = (await resp.json()) as OpenAIEmbeddingResponse;
  return json.data.map((d) => d.embedding);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// USDA Foods Embeddings
// ---------------------------------------------------------------------------

interface UsdaFood {
  fdc_id: number;
  description: string;
  food_category: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  fiber_per_100g: number | null;
}

function serializeUsdaFood(food: UsdaFood): string {
  const parts = [
    food.description,
    food.food_category ? `Category: ${food.food_category}` : null,
    food.calories_per_100g != null ? `${food.calories_per_100g} kcal/100g` : null,
    food.protein_per_100g != null ? `Protein: ${food.protein_per_100g}g` : null,
    food.carbs_per_100g != null ? `Carbs: ${food.carbs_per_100g}g` : null,
    food.fat_per_100g != null ? `Fat: ${food.fat_per_100g}g` : null,
    food.fiber_per_100g != null ? `Fiber: ${food.fiber_per_100g}g` : null,
  ];
  return parts.filter(Boolean).join('. ');
}

async function generateUsdaEmbeddings(supabase: SupabaseClient): Promise<number> {
  console.log('\n--- Generating USDA food embeddings ---');

  const { count: totalCount } = await supabase
    .from('usda_foods')
    .select('*', { count: 'exact', head: true });

  console.log(`  Total USDA foods in DB: ${totalCount ?? 'unknown'}`);

  let offset = 0;
  let processed = 0;
  let totalTokens = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: foods, error } = await supabase
      .from('usda_foods')
      .select(
        'fdc_id, description, food_category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g',
      )
      .range(offset, offset + DB_BATCH_SIZE - 1)
      .order('fdc_id', { ascending: true });

    if (error) throw new Error(`DB fetch error: ${error.message}`);
    if (!foods || foods.length === 0) break;

    const texts = (foods as UsdaFood[]).map(serializeUsdaFood);

    for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
      const batchTexts = texts.slice(i, i + EMBED_BATCH_SIZE);
      const batchFoods = (foods as UsdaFood[]).slice(i, i + EMBED_BATCH_SIZE);

      const embeddings = await embedBatch(batchTexts);

      const rows = batchFoods.map((food, j) => ({
        source_type: 'usda_food',
        source_id: null as string | null,
        user_id: null as string | null,
        namespace: 'usda_foods',
        content_text: batchTexts[j],
        embedding: `[${embeddings[j].join(',')}]`,
        metadata: {
          fdc_id: food.fdc_id,
          food_category: food.food_category,
          calories_per_100g: food.calories_per_100g,
        },
      }));

      const { error: upsertError } = await supabase.from('embeddings').insert(rows);

      if (upsertError) {
        console.error(`  Upsert error: ${upsertError.message}`);
        throw upsertError;
      }

      totalTokens += batchTexts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0);
    }

    processed += foods.length;
    process.stdout.write(`  Processed: ${processed}/${totalCount ?? '?'}\r`);

    offset += DB_BATCH_SIZE;
    await sleep(200);
  }

  console.log(`\n  USDA embeddings complete: ${processed} foods, ~${totalTokens} tokens`);
  return processed;
}

// ---------------------------------------------------------------------------
// Nutritional Guidelines Embeddings
// ---------------------------------------------------------------------------

interface GuidelineChunk {
  title: string;
  content: string;
  source: string;
}

const NUTRITIONAL_GUIDELINES: GuidelineChunk[] = [
  {
    title: 'Daily Caloric Intake Recommendations',
    content:
      'The Dietary Guidelines for Americans 2025-2030 recommend daily caloric intake based on age, sex, and activity level. Sedentary adult women need approximately 1,600-2,000 calories, while sedentary men need 2,000-2,400. Moderately active adults should add 200-400 calories. Active adults may need 2,000-2,400 (women) or 2,400-3,000 (men) calories daily.',
    source: 'Dietary Guidelines 2025-2030',
  },
  {
    title: 'Macronutrient Distribution Ranges',
    content:
      'Acceptable Macronutrient Distribution Ranges (AMDR): Carbohydrates should comprise 45-65% of total calories. Fat should be 20-35% of calories. Protein should be 10-35% of calories. For weight loss, higher protein intake (25-30% of calories) may improve satiety and preserve lean mass.',
    source: 'DRI/RDA Standards',
  },
  {
    title: 'Protein Requirements',
    content:
      'The RDA for protein is 0.8g per kg body weight for sedentary adults. Athletes and active individuals need 1.2-2.0g/kg. For muscle building, 1.6-2.2g/kg is recommended. Older adults (65+) benefit from higher intake of 1.0-1.2g/kg to prevent sarcopenia. Distribute protein across meals (20-40g per meal) for optimal muscle protein synthesis.',
    source: 'DRI/RDA Standards',
  },
  {
    title: 'Fiber Intake Guidelines',
    content:
      'Adequate Intake for fiber: 25g/day for women, 38g/day for men (ages 19-50). Over 50: 21g for women, 30g for men. Most Americans only consume 15g/day. High-fiber foods include legumes, whole grains, fruits, vegetables, nuts, and seeds. Fiber supports digestive health, blood sugar control, and satiety.',
    source: 'Dietary Guidelines 2025-2030',
  },
  {
    title: 'Sodium and Potassium Guidelines',
    content:
      'Limit sodium to less than 2,300mg per day (about 1 teaspoon of salt). The AI for potassium is 2,600mg for women and 3,400mg for men. Higher potassium intake helps counteract the effects of sodium on blood pressure. Most sodium in the diet comes from processed and restaurant foods, not from salt added during cooking.',
    source: 'Dietary Guidelines 2025-2030',
  },
  {
    title: 'Sugar Intake Limits',
    content:
      'Limit added sugars to less than 10% of daily calories (about 50g on a 2,000 calorie diet). The WHO suggests further limiting to 5% (25g) for additional health benefits. Natural sugars in fruits, vegetables, and dairy are not a concern. Major sources of added sugars include sweetened beverages, desserts, and candy.',
    source: 'Dietary Guidelines 2025-2030, WHO',
  },
  {
    title: 'NOVA Food Classification System',
    content:
      'NOVA classifies foods by processing level. Group 1: Unprocessed or minimally processed foods (fruits, vegetables, grains, meat, eggs). Group 2: Processed culinary ingredients (oils, butter, sugar, salt). Group 3: Processed foods (canned vegetables, cheese, bread). Group 4: Ultra-processed foods (soft drinks, packaged snacks, instant noodles). Higher consumption of Group 4 foods is associated with obesity, cardiovascular disease, and overall mortality.',
    source: 'NOVA Classification, Monteiro et al.',
  },
  {
    title: 'Weight Loss Caloric Deficit',
    content:
      'Safe weight loss rate is 0.5-1.0 kg per week, requiring a daily caloric deficit of 500-1,000 calories. Very low calorie diets (below 1,200 kcal for women or 1,500 for men) should be medically supervised. Rapid weight loss increases risk of muscle loss, nutritional deficiencies, and gallstones. A moderate deficit (15-25% below TDEE) is sustainable long-term.',
    source: 'Clinical Nutrition Guidelines',
  },
  {
    title: 'Hydration Recommendations',
    content:
      'Adequate water intake: approximately 2.7L (91oz) for women and 3.7L (125oz) for men from all beverages and food. About 20% of water intake comes from food. Physical activity, heat, and illness increase needs. Signs of dehydration include dark urine, fatigue, headache, and decreased performance.',
    source: 'Dietary Guidelines 2025-2030',
  },
  {
    title: 'Meal Timing and Frequency',
    content:
      'Research supports distributing daily intake across 3-5 meals/snacks. Regular meal timing supports metabolic health and blood sugar regulation. Breakfast consumption is associated with better weight management. Late-night eating may impair sleep quality and contribute to weight gain. Intermittent fasting (16:8 or 5:2) shows metabolic benefits in some populations.',
    source: 'Nutritional Science Research',
  },
  {
    title: 'Micronutrient Priorities',
    content:
      'Key micronutrients of concern: Vitamin D (600-800 IU/day, many are deficient), Calcium (1,000-1,200mg/day), Iron (8-18mg/day, higher for menstruating women), Vitamin B12 (2.4mcg/day, at risk for vegans), Folate (400mcg/day, higher during pregnancy). Whole food sources are preferred over supplements for most people.',
    source: 'DRI/RDA Standards',
  },
  {
    title: 'Healthy Eating Patterns',
    content:
      'The Dietary Guidelines recommend healthy eating patterns including: Mediterranean diet (emphasis on olive oil, fish, vegetables, whole grains), DASH diet (designed to lower blood pressure), and plant-based diets. All patterns emphasize vegetables, fruits, whole grains, lean proteins, and healthy fats while limiting saturated fat, sodium, and added sugars.',
    source: 'Dietary Guidelines 2025-2030',
  },
];

async function generateGuidelineEmbeddings(supabase: SupabaseClient): Promise<number> {
  console.log('\n--- Generating nutritional guidelines embeddings ---');

  const texts = NUTRITIONAL_GUIDELINES.map(
    (g) => `${g.title}\n\n${g.content}\n\nSource: ${g.source}`,
  );

  const embeddings = await embedBatch(texts);

  const rows = NUTRITIONAL_GUIDELINES.map((g, i) => ({
    source_type: 'guideline',
    source_id: null as string | null,
    user_id: null as string | null,
    namespace: 'nutrition_guidelines',
    content_text: texts[i],
    embedding: `[${embeddings[i].join(',')}]`,
    metadata: {
      title: g.title,
      source: g.source,
    },
  }));

  const { error } = await supabase.from('embeddings').insert(rows);

  if (error) {
    console.error(`  Insert error: ${error.message}`);
    throw error;
  }

  console.log(`  Guidelines embeddings complete: ${NUTRITIONAL_GUIDELINES.length} chunks`);
  return NUTRITIONAL_GUIDELINES.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  const sourceArg =
    process.argv.find((a) => a.startsWith('--source='))?.split('=')[1] ??
    (process.argv.includes('--source') ? process.argv[process.argv.indexOf('--source') + 1] : null);

  console.log('Snacky RAG — Batch Embedding Generator');
  console.log(`  Model: ${OPENAI_EMBED_MODEL} (${EMBEDDING_DIM} dims)`);
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`  Source filter: ${sourceArg ?? 'all'}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  let totalEmbeddings = 0;

  if (!sourceArg || sourceArg === 'usda') {
    totalEmbeddings += await generateUsdaEmbeddings(supabase);
  }

  if (!sourceArg || sourceArg === 'guidelines') {
    totalEmbeddings += await generateGuidelineEmbeddings(supabase);
  }

  console.log(`\nDone! ${totalEmbeddings} embeddings generated.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
