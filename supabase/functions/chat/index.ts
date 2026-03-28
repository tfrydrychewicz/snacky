import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { badRequest, internalError } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('chat');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return badRequest('Only POST requests are accepted');
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError) return authError;

  log.info('Chat message received', { user_id: user!.id });

  try {
    const body = await req.json();
    const message = body.message as string | undefined;
    const sessionId = body.session_id as string | undefined;

    if (!message) {
      return badRequest('Missing required field: message');
    }

    // TODO Phase 2.2: Implement RAG chat pipeline
    // 1. Create/retrieve chat session
    // 2. Classify intent (nutrition_qa, meal_suggestion, plan_creation, etc.)
    // 3. Retrieve context via match_embeddings (RAG)
    // 4. Assemble prompt (system + context + history + user message)
    // 5. Call GPT-5.4 (complex) or GPT-5.4 mini (simple)
    // 6. Stream response via SSE
    // 7. Store message in chat_messages table

    const placeholder = {
      status: 'not_implemented',
      message: 'Chat pipeline will be implemented in Phase 2.2',
      session_id: sessionId ?? 'new',
      reply: 'This is a placeholder response. AI chat will be available soon!',
    };

    log.info('Chat placeholder response', { user_id: user!.id });

    return new Response(JSON.stringify(placeholder), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    log.error('Chat failed', { error: String(err) });
    return internalError('Failed to process chat message');
  }
});
