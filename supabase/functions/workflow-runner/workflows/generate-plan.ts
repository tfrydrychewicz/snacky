// ─────────────────────────────────────────────────────────────
// Diet Plan Generation — Durable Workflow
//
// Wraps the existing two-pass pipeline into individually
// retryable, checkpointed steps:
//   1. fetch-profile
//   2. generate-chunk-{start}-{end}  (parallel batches, each
//      chunk includes Pass 1 + USDA enrichment + Pass 2
//      portion optimization before inserting into DB)
//   3. finalize-plan
//   4. send-notification
//   5. generate-images  (parallel, non-blocking for UI)
//
// The plan row is created by the generate-plan Edge Function
// before dispatching this workflow, so plan_id comes in via
// the event payload.
// ─────────────────────────────────────────────────────────────

import type { WorkflowDefinition } from '../../_shared/workflow/mod.ts';
import { createServiceClient } from '../../_shared/supabase-client.ts';
import { createLogger } from '../../_shared/logger.ts';
import {
  PlanRequestSchema,
  Pass1ResponseSchema,
  Pass2ResponseSchema,
  type UserProfile,
  type PlanRequest,
  type ValidatedMeal,
  type USDAFood,
} from '../../generate-plan/schemas.ts';
import { buildRecipePrompt, buildPortionPrompt, buildDaySummary, buildParallelHint, getMealTargets } from '../../generate-plan/prompt-builder.ts';
import type { RecipePromptOpts } from '../../generate-plan/prompt-builder.ts';
import {
  enrichWithUSDA,
  recomputeNutrition,
  computeDrift,
  buildValidation,
  scalePortionsPerMeal,
} from '../../generate-plan/nutrition-validator.ts';
import { generateShoppingList } from '../../generate-plan/shopping-list.ts';
import { insertChunkMeals, finalizePlanMetadata, updateMealImageUrl } from '../../generate-plan/store.ts';
import { generateAndUploadMealImage } from '../../generate-plan/image-generator.ts';

const log = createLogger('wf-generate-plan');

const RECIPE_MODEL = 'gpt-5.4';
const PORTION_MODEL = 'gpt-5.4-mini';
const CHUNK_SIZE = 2;
const PARALLEL_CHUNKS = 2;
const FETCH_TIMEOUT_MS = 90_000;
const DRIFT_THRESHOLD = 10;
const IMAGE_CONCURRENCY = 3;

interface GeneratePlanPayload {
  user_id: string;
  config: PlanRequest;
  plan_id: string;
}

type USDACache = Record<string, USDAFood>;
type IngredientEnMap = Record<string, string>;

interface ChunkStepOutput {
  meals: ValidatedMeal[];
  usda_cache: USDACache;
  ingredient_en_map: IngredientEnMap;
  matched: number;
  total: number;
}

async function callRecipeModel(
  profile: UserProfile,
  request: PlanRequest,
  chunkStart: number,
  chunkEnd: number,
  apiKey: string,
  opts?: RecipePromptOpts,
): Promise<ReturnType<typeof Pass1ResponseSchema.parse>> {
  const prompt = buildRecipePrompt(profile, request, chunkStart, chunkEnd, opts);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: RECIPE_MODEL,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0.8,
        max_completion_tokens: 16384,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => `HTTP ${resp.status}`);
    throw new Error(`OpenAI API error (${resp.status}): ${errText}`);
  }

  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Pass 1: empty response');

  const parsed = JSON.parse(content);
  const extracted = extractPlanObject(parsed);
  const validated = Pass1ResponseSchema.safeParse(extracted);
  if (!validated.success) throw new Error('Pass 1 returned invalid plan structure');
  return validated.data;
}

async function callPortionModel(
  meals: ValidatedMeal[],
  usdaCacheObj: USDACache,
  ingredientEnMapObj: IngredientEnMap,
  profile: UserProfile,
  apiKey: string,
  mealTargets?: Record<string, number>,
): Promise<Map<string, Map<string, number>> | null> {
  const usdaCache = new Map(Object.entries(usdaCacheObj));
  const ingredientEnMap = new Map(Object.entries(ingredientEnMapObj));
  const prompt = buildPortionPrompt(meals, usdaCache, profile, ingredientEnMap, mealTargets);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: PORTION_MODEL,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0.2,
        max_completion_tokens: 8192,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => `HTTP ${resp.status}`);
    log.warn('Portion model API error', { status: resp.status, error: errText });
    return null;
  }

  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    log.warn('Portion model returned empty content');
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    log.warn('Portion model returned invalid JSON', { error: String(e) });
    return null;
  }

  const extracted = extractPlanObject(parsed);
  const validated = Pass2ResponseSchema.safeParse(extracted);
  if (!validated.success) {
    log.warn('Portion model response failed schema validation', {
      errors: validated.error.issues.map((issue: { message: string }) => issue.message).join(', '),
    });
    return null;
  }

  const map = new Map<string, Map<string, number>>();
  for (const day of validated.data.days) {
    for (const meal of day.meals) {
      const key = `${day.day_number}:${meal.slot}`;
      const ingMap = new Map<string, number>();
      for (const ing of meal.ingredients) {
        ingMap.set(ing.name_en.toLowerCase(), ing.amount_g);
      }
      map.set(key, ingMap);
    }
  }
  return map;
}

function extractPlanObject(parsed: unknown): unknown {
  if (typeof parsed !== 'object' || parsed === null) return parsed;
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.days)) return obj;
  for (const val of Object.values(obj)) {
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      const inner = val as Record<string, unknown>;
      if (Array.isArray(inner.days)) return inner;
    }
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0];
      if (typeof first === 'object' && first !== null && 'meals' in (first as Record<string, unknown>)) {
        return { days: val };
      }
    }
  }
  return obj;
}

// ── Notification helper ─────────────────────────────────────

const NOTIFICATION_TEMPLATES: Record<string, { title: string; body: string }> = {
  en: { title: 'Your diet plan is ready!', body: 'Your personalized meal plan has been generated. Open the app to see it.' },
  pl: { title: 'Twój plan diety jest gotowy!', body: 'Twój spersonalizowany plan posiłków został wygenerowany. Otwórz aplikację, aby go zobaczyć.' },
};

// ── The Workflow Definition ─────────────────────────────────

export const generatePlanWorkflow: WorkflowDefinition<GeneratePlanPayload> = {
  id: 'generate-diet-plan',
  triggers: ['diet-plan/requested'],
  retries: 2,

  fn: async ({ event, step }) => {
    const { user_id, config, plan_id: planId } = event.payload;
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const parseResult = PlanRequestSchema.safeParse(config);
    if (!parseResult.success) throw new Error('Invalid plan config');
    const request = parseResult.data;

    const supabase = createServiceClient();

    // ── Step 1: Fetch user profile ──────────────────────
    const profile = await step.run<UserProfile>('fetch-profile', async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(
          'user_id, target_kcal, target_protein_g, target_carbs_g, target_fat_g, ' +
          'allergies, dietary_restrictions, cooking_skill, cuisine_preferences, ' +
          'date_of_birth, biological_sex, locale, location',
        )
        .eq('user_id', user_id)
        .single();

      if (error || !data) throw new Error('User profile not found');

      const row = data as unknown as Record<string, unknown>;
      return {
        user_id: row.user_id as string,
        target_kcal: (row.target_kcal as number | null) ?? 2000,
        target_protein_g: (row.target_protein_g as number | null) ?? 100,
        target_carbs_g: (row.target_carbs_g as number | null) ?? 250,
        target_fat_g: (row.target_fat_g as number | null) ?? 65,
        allergies: (row.allergies as string[] | null) ?? [],
        dietary_restrictions: (row.dietary_restrictions as string[] | null) ?? [],
        cooking_skill: (row.cooking_skill as string | null) ?? 'intermediate',
        cuisine_preferences: (row.cuisine_preferences as string[] | null) ?? [],
        date_of_birth: (row.date_of_birth as string | null) ?? null,
        biological_sex: (row.biological_sex as string | null) ?? null,
        locale: (row.locale as string | null) ?? 'en',
        location: (row.location as string | null) ?? null,
      };
    });

    // ── Compute per-meal calorie targets ──────────────────
    const budgetPct = request.meal_budget_pct ?? 85;
    const mealTargets = getMealTargets(request.meals_per_day, profile.target_kcal, budgetPct);

    log.info('Per-meal calorie targets', { budgetPct, mealTargets });

    // ── Step 2..N: Generate + enrich chunks in parallel batches ──
    const totalDays = request.duration_days;
    const chunks: Array<{ start: number; end: number }> = [];
    for (let d = 1; d <= totalDays; d += CHUNK_SIZE) {
      chunks.push({ start: d, end: Math.min(d + CHUNK_SIZE - 1, totalDays) });
    }

    // Group chunks into batches for parallel execution
    const batches: Array<Array<{ start: number; end: number }>> = [];
    for (let i = 0; i < chunks.length; i += PARALLEL_CHUNKS) {
      batches.push(chunks.slice(i, i + PARALLEL_CHUNKS));
    }

    const chunkOutputs: ChunkStepOutput[] = [];
    const previousRecipeNames: string[][] = [];
    let mealSortOffset = 0;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]!;
      const previousSummary = previousRecipeNames.length > 0
        ? buildDaySummary(previousRecipeNames)
        : undefined;

      // Compute sort offsets before parallel execution (each chunk
      // in the batch needs its own offset based on prior batches)
      const batchSortOffsets: number[] = [];
      for (let j = 0; j < batch.length; j++) {
        const chunkEntry = batch[j]!;
        const daysInChunk = chunkEntry.end - chunkEntry.start + 1;
        batchSortOffsets.push(mealSortOffset + j * daysInChunk * request.meals_per_day);
      }

      // Build per-chunk variation hints so parallel siblings diverge
      const batchHints: string[] = batch.map((chunk, j) => {
        const siblingRanges = batch
          .filter((_, k) => k !== j)
          .map((s) => `${s.start}–${s.end}`);
        return buildParallelHint(j, batch.length, siblingRanges);
      });

      const batchResults = await step.parallel<ChunkStepOutput>(
        `gen-batch-${batchIdx}`,
        batch.map((chunk, j) => ({
          id: `chunk-${chunk.start}-${chunk.end}`,
          fn: async () => {
            const sortOffset = batchSortOffsets[j] ?? mealSortOffset;
            const chunkDays = chunk.end - chunk.start + 1;

            // Pass 1: generate recipes
            const pass1 = await callRecipeModel(
              profile, request, chunk.start, chunk.end, apiKey,
              {
                previousDaySummary: previousSummary,
                parallelHint: batchHints[j],
              },
            );

            // Enrich with USDA nutritional data
            const { meals: enrichedMeals, usdaCache, ingredientEnMap } =
              await enrichWithUSDA(pass1, supabase);

            // Pass 2: portion optimization per chunk
            let finalChunkMeals = enrichedMeals;
            const drift = computeDrift(enrichedMeals, profile, chunkDays, budgetPct);

            log.info('Chunk drift check', {
              chunk: `${chunk.start}-${chunk.end}`,
              drift: Math.round(drift * 10) / 10,
              threshold: DRIFT_THRESHOLD,
            });

            if (drift > DRIFT_THRESHOLD) {
              // Try LLM-based optimization first (with per-meal targets)
              const usdaCacheObj: USDACache = Object.fromEntries(usdaCache);
              const enMapObj: IngredientEnMap = Object.fromEntries(ingredientEnMap);
              const adjustedAmounts = await callPortionModel(
                enrichedMeals, usdaCacheObj, enMapObj, profile, apiKey, mealTargets,
              );
              if (adjustedAmounts) {
                finalChunkMeals = recomputeNutrition(
                  enrichedMeals, adjustedAmounts, usdaCache, ingredientEnMap,
                );
              }

              const driftAfterLLM = computeDrift(finalChunkMeals, profile, chunkDays, budgetPct);
              log.info('After LLM optimization', {
                chunk: `${chunk.start}-${chunk.end}`,
                drift_before: Math.round(drift * 10) / 10,
                drift_after_llm: Math.round(driftAfterLLM * 10) / 10,
                llm_returned: adjustedAmounts != null,
              });

              // Fallback: per-meal proportional scaling
              if (driftAfterLLM > DRIFT_THRESHOLD) {
                finalChunkMeals = scalePortionsPerMeal(
                  finalChunkMeals, usdaCache, ingredientEnMap, mealTargets,
                );
                const driftAfterScale = computeDrift(finalChunkMeals, profile, chunkDays, budgetPct);
                log.info('Per-meal proportional scaling applied as fallback', {
                  chunk: `${chunk.start}-${chunk.end}`,
                  drift_after_scale: Math.round(driftAfterScale * 10) / 10,
                });
              }
            }

            // Insert optimized meals so the UI shows final data
            await insertChunkMeals(supabase, planId, finalChunkMeals, sortOffset);

            const matched = finalChunkMeals.reduce(
              (s, m) => s + m.ingredients.filter((i) => i.usda_validated).length, 0,
            );
            const total = finalChunkMeals.reduce((s, m) => s + m.ingredients.length, 0);

            return {
              meals: finalChunkMeals,
              usda_cache: Object.fromEntries(usdaCache),
              ingredient_en_map: Object.fromEntries(ingredientEnMap),
              matched,
              total,
            };
          },
        })),
        { concurrency: PARALLEL_CHUNKS },
      );

      for (const result of batchResults) {
        chunkOutputs.push(result);
        mealSortOffset += result.meals.length;

        // Collect recipe names for next batch's variety prompt
        const dayGroups = new Map<number, string[]>();
        for (const meal of result.meals) {
          const list = dayGroups.get(meal.day_number) ?? [];
          list.push(meal.recipe_name);
          dayGroups.set(meal.day_number, list);
        }
        for (const names of dayGroups.values()) {
          if (!previousRecipeNames.some((prev) =>
            prev.length === names.length && prev.every((n, i) => n === names[i]),
          )) {
            previousRecipeNames.push(names);
          }
        }
      }
    }

    // ── Aggregate stats from all chunks ─────────────────
    const allMeals = chunkOutputs.flatMap((c) => c.meals);
    let totalMatched = 0;
    let totalIngredients = 0;

    for (const c of chunkOutputs) {
      totalMatched += c.matched;
      totalIngredients += c.total;
    }

    const matchRate = totalIngredients > 0
      ? Math.round((totalMatched / totalIngredients) * 1000) / 10
      : 0;

    // ── Finalize the plan (meals are already optimized and in DB) ──
    await step.run('finalize-plan', async () => {
      const finalDrift = computeDrift(allMeals, profile, request.duration_days, budgetPct);
      const validation = buildValidation(finalDrift, matchRate);
      const shoppingList = generateShoppingList(allMeals);

      await finalizePlanMetadata(
        supabase, user_id, planId, shoppingList, validation,
        { model: RECIPE_MODEL, generation_time_ms: 0, chunks_generated: chunks.length },
      );

      return { planId, validation };
    });

    // ── Step N+3: Send push notification ────────────────
    await step.run('send-notification', async () => {
      const locale = profile.locale ?? 'en';
      const tmpl = NOTIFICATION_TEMPLATES[locale] ?? NOTIFICATION_TEMPLATES['en']!;

      try {
        const baseUrl = Deno.env.get('SUPABASE_URL');
        const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!baseUrl || !svcKey) {
          log.warn('Cannot send notification: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
          return { sent: false };
        }

        const resp = await fetch(`${baseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${svcKey}`,
          },
          body: JSON.stringify({
            user_id,
            type: 'plan_ready',
            title: tmpl.title,
            body: tmpl.body,
            data: { plan_id: planId },
          }),
        });

        const result = await resp.json().catch(() => ({}));
        log.info('Notification sent', { user_id, plan_id: planId, result });
        return { sent: true };
      } catch (err) {
        log.warn('Notification send failed (non-fatal)', {
          user_id, error: err instanceof Error ? err.message : String(err),
        });
        return { sent: false };
      }
    });

    // ── Step N+4: Generate meal images (non-blocking for UI) ──
    const { data: mealRows } = await supabase
      .from('diet_plan_meals')
      .select('id, recipe_name, recipe_instructions, ingredients, meal_slot')
      .eq('diet_plan_id', planId)
      .is('image_url', null);

    if (mealRows && mealRows.length > 0) {
      interface MealRow {
        id: string;
        recipe_name: string;
        recipe_instructions: string | null;
        ingredients: Array<{ name: string }>;
        meal_slot: string;
      }

      const typedRows = mealRows as unknown as MealRow[];

      await step.parallel<{ mealId: string; ok: boolean }>(
        'generate-images',
        typedRows.map((row) => ({
          id: `img-${row.id}`,
          fn: async () => {
            const ingredientNames = row.ingredients.map((i) => i.name);
            const storagePath = await generateAndUploadMealImage(
              {
                mealId: row.id,
                recipeName: row.recipe_name,
                ingredients: ingredientNames,
                instructions: row.recipe_instructions ?? '',
                mealSlot: row.meal_slot,
              },
              user_id,
              apiKey,
              supabase,
            );

            if (storagePath) {
              await updateMealImageUrl(supabase, row.id, storagePath);
            }

            return { mealId: row.id, ok: storagePath != null };
          },
        })),
        { concurrency: IMAGE_CONCURRENCY },
      );

      const imageCount = typedRows.length;
      log.info('Meal image generation complete', { plan_id: planId, total: imageCount });
    }

    return { plan_id: planId, meal_count: allMeals.length };
  },
};
