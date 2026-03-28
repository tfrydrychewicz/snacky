import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { badRequest, internalError } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('embed');

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_EMBED_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1024;

type EntityType = 'meal' | 'comment' | 'measurement';

interface EmbeddingMeta {
  namespace: string;
  source_type: string;
  user_id: string | null;
  content_text: string;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Entity serializers — convert DB rows into searchable text
// ---------------------------------------------------------------------------

async function serializeMeal(
  supabase: ReturnType<typeof createServiceClient>,
  mealId: string,
): Promise<EmbeddingMeta | null> {
  const mealResult = await supabase
    .from('meals')
    .select('*, meal_ingredients(*)')
    .eq('id', mealId)
    .single();

  if (mealResult.error || !mealResult.data) {
    log.warn('Meal not found', { mealId });
    return null;
  }

  const m = mealResult.data as Record<string, unknown>;
  const ingredients = (m.meal_ingredients ?? []) as Array<Record<string, unknown>>;

  const ingredientLines = ingredients
    .map(
      (i) =>
        `- ${i.name}: ${i.portion_g}g (${i.calories} kcal, P${i.protein_g}g C${i.carbs_g}g F${i.fat_g}g)`,
    )
    .join('\n');

  const text = [
    `Meal type: ${m.meal_type}`,
    `Logged at: ${m.logged_at}`,
    `Total: ${m.total_calories} kcal, protein ${m.total_protein_g}g, carbs ${m.total_carbs_g}g, fat ${m.total_fat_g}g`,
    m.total_fiber_g ? `Fiber: ${m.total_fiber_g}g` : null,
    m.nova_class ? `NOVA classification: ${m.nova_class}` : null,
    `Source: ${m.source}`,
    ingredients.length > 0 ? `Ingredients:\n${ingredientLines}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    namespace: 'user_meals',
    source_type: 'meal',
    user_id: m.user_id as string,
    content_text: text,
    metadata: {
      meal_type: m.meal_type,
      logged_at: m.logged_at,
      total_calories: m.total_calories,
      ingredient_count: ingredients.length,
    },
  };
}

async function serializeComment(
  supabase: ReturnType<typeof createServiceClient>,
  commentId: string,
): Promise<EmbeddingMeta | null> {
  const result = await supabase
    .from('meal_comments')
    .select('*, meals!inner(meal_type, logged_at)')
    .eq('id', commentId)
    .single();

  if (result.error || !result.data) {
    log.warn('Comment not found', { commentId });
    return null;
  }

  const c = result.data as Record<string, unknown>;
  const meal = c.meals as Record<string, unknown>;

  const text = [
    `User comment on ${meal.meal_type} meal (${meal.logged_at}):`,
    `"${c.content}"`,
  ].join('\n');

  return {
    namespace: 'user_comments',
    source_type: 'comment',
    user_id: c.user_id as string,
    content_text: text,
    metadata: {
      meal_id: c.meal_id,
      meal_type: meal.meal_type,
      logged_at: meal.logged_at,
    },
  };
}

async function serializeMeasurement(
  supabase: ReturnType<typeof createServiceClient>,
  measurementId: string,
): Promise<EmbeddingMeta | null> {
  const result = await supabase.from('measurements').select('*').eq('id', measurementId).single();

  if (result.error || !result.data) {
    log.warn('Measurement not found', { measurementId });
    return null;
  }

  const m = result.data as Record<string, unknown>;

  const parts = [
    `Body measurement recorded at ${m.measured_at}:`,
    m.weight_kg ? `Weight: ${m.weight_kg} kg` : null,
    m.waist_cm ? `Waist: ${m.waist_cm} cm` : null,
    m.chest_cm ? `Chest: ${m.chest_cm} cm` : null,
    m.hips_cm ? `Hips: ${m.hips_cm} cm` : null,
    m.body_fat_pct ? `Body fat: ${m.body_fat_pct}%` : null,
    `Source: ${m.source}`,
  ];

  return {
    namespace: 'user_measurements',
    source_type: 'measurement',
    user_id: m.user_id as string,
    content_text: parts.filter(Boolean).join('\n'),
    metadata: {
      measured_at: m.measured_at,
      weight_kg: m.weight_kg,
      source: m.source,
    },
  };
}

// ---------------------------------------------------------------------------
// OpenAI embedding generation
// ---------------------------------------------------------------------------

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch(OPENAI_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBED_MODEL,
      input: text,
      dimensions: EMBEDDING_DIM,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI Embeddings API error (${response.status}): ${errBody}`);
  }

  const json = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
    usage: { total_tokens: number };
  };

  log.info('OpenAI embedding generated', {
    tokens: json.usage.total_tokens,
    dimensions: json.data[0]?.embedding.length,
  });

  return json.data[0].embedding;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

const SERIALIZERS: Record<
  EntityType,
  (supabase: ReturnType<typeof createServiceClient>, id: string) => Promise<EmbeddingMeta | null>
> = {
  meal: serializeMeal,
  comment: serializeComment,
  measurement: serializeMeasurement,
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return badRequest('Only POST requests are accepted');
  }

  log.info('Embedding generation triggered');

  try {
    const body = await req.json();
    const entityType = body.type as string | undefined;
    const entityId = body.id as string | undefined;

    if (!entityType || !entityId) {
      return badRequest('Missing required fields: type, id');
    }

    const serializer = SERIALIZERS[entityType as EntityType];
    if (!serializer) {
      return badRequest(`Unknown entity type: ${entityType}`);
    }

    const supabase = createServiceClient();
    const meta = await serializer(supabase, entityId);

    if (!meta) {
      log.warn('Entity not found, skipping embedding', { entityType, entityId });
      return new Response(JSON.stringify({ status: 'skipped', reason: 'entity_not_found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const embedding = await generateEmbedding(meta.content_text);

    const vectorString = `[${embedding.join(',')}]`;

    const { error: upsertError } = await supabase.rpc('upsert_embedding', {
      p_source_type: meta.source_type,
      p_source_id: entityId,
      p_user_id: meta.user_id,
      p_namespace: meta.namespace,
      p_content_text: meta.content_text,
      p_embedding: vectorString,
      p_metadata: meta.metadata,
    });

    if (upsertError) {
      log.error('Failed to upsert embedding', { error: upsertError.message });
      return internalError(`Failed to store embedding: ${upsertError.message}`);
    }

    log.info('Embedding stored successfully', {
      entity_type: entityType,
      entity_id: entityId,
      namespace: meta.namespace,
      text_length: meta.content_text.length,
    });

    return new Response(
      JSON.stringify({
        status: 'ok',
        entity_type: entityType,
        entity_id: entityId,
        namespace: meta.namespace,
        dimensions: embedding.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    log.error('Embedding generation failed', { error: String(err) });
    return internalError('Failed to generate embedding');
  }
});
