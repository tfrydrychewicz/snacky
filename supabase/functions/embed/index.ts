import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { badRequest, internalError } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('embed');

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

    // TODO Phase 2.1: Implement embedding pipeline
    // 1. Fetch entity by type + id from DB (service client)
    // 2. Serialize entity to text representation
    // 3. Generate embedding via voyage-4-large (Voyage AI)
    // 4. Upsert to embeddings table with metadata tags

    const placeholder = {
      status: 'not_implemented',
      message: 'Embedding pipeline will be implemented in Phase 2.1',
      entity_type: entityType,
      entity_id: entityId,
    };

    log.info('Embed placeholder response', { entity_type: entityType, entity_id: entityId });

    return new Response(JSON.stringify(placeholder), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    log.error('Embedding generation failed', { error: String(err) });
    return internalError('Failed to generate embedding');
  }
});
