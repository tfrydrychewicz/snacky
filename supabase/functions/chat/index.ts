import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { badRequest, internalError } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('chat');

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIM = 1024;

const MODEL_COMPLEX = 'gpt-4.1';
const MODEL_SIMPLE = 'gpt-4.1-nano';

const MAX_HISTORY = 10;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Intent =
  | 'nutrition_qa'
  | 'meal_suggestion'
  | 'plan_creation'
  | 'data_lookup'
  | 'health_insight';

interface IntentConfig {
  namespaces: string[];
  maxChunks: number;
  model: string;
}

const INTENT_CONFIG: Record<Intent, IntentConfig> = {
  nutrition_qa: {
    namespaces: ['nutrition_guidelines', 'usda_foods'],
    maxChunks: 5,
    model: MODEL_SIMPLE,
  },
  meal_suggestion: {
    namespaces: ['user_meals', 'user_comments', 'nutrition_guidelines'],
    maxChunks: 8,
    model: MODEL_COMPLEX,
  },
  plan_creation: {
    namespaces: ['user_meals', 'user_measurements', 'nutrition_guidelines'],
    maxChunks: 10,
    model: MODEL_COMPLEX,
  },
  data_lookup: {
    namespaces: ['user_meals', 'user_measurements', 'user_comments'],
    maxChunks: 6,
    model: MODEL_SIMPLE,
  },
  health_insight: {
    namespaces: ['user_meals', 'user_measurements', 'nutrition_guidelines'],
    maxChunks: 8,
    model: MODEL_COMPLEX,
  },
};

// ---------------------------------------------------------------------------
// Intent classification via lightweight LLM call
// ---------------------------------------------------------------------------

async function classifyIntent(message: string, apiKey: string): Promise<Intent> {
  const resp = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL_SIMPLE,
      messages: [
        {
          role: 'system',
          content: `Classify the user's nutrition-related message into exactly one intent.
Respond with ONLY the intent label, nothing else.

Intents:
- nutrition_qa: General nutrition questions (e.g. "How much protein do I need?")
- meal_suggestion: Recipe or meal recommendations (e.g. "What should I eat for lunch?")
- plan_creation: Diet plan generation (e.g. "Create a meal plan for this week")
- data_lookup: Questions about user's own logged data (e.g. "How many calories did I eat yesterday?")
- health_insight: Trend analysis or health pattern questions (e.g. "Am I eating enough protein this month?")`,
        },
        { role: 'user', content: message },
      ],
      max_tokens: 20,
      temperature: 0,
    }),
  });

  if (!resp.ok) {
    log.warn('Intent classification failed, defaulting to nutrition_qa');
    return 'nutrition_qa';
  }

  const json = (await resp.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const raw = json.choices[0]?.message?.content?.trim().toLowerCase() ?? '';
  const valid: Intent[] = [
    'nutrition_qa',
    'meal_suggestion',
    'plan_creation',
    'data_lookup',
    'health_insight',
  ];
  const matched = valid.find((i) => raw.includes(i));
  return matched ?? 'nutrition_qa';
}

// ---------------------------------------------------------------------------
// Query embedding generation
// ---------------------------------------------------------------------------

async function embedQuery(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch(OPENAI_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: text,
      dimensions: EMBED_DIM,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Embedding API error: ${resp.status}`);
  }

  const json = (await resp.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return json.data[0].embedding;
}

// ---------------------------------------------------------------------------
// RAG context retrieval
// ---------------------------------------------------------------------------

interface RetrievedChunk {
  id: string;
  namespace: string;
  source_type: string;
  content_text: string;
  similarity: number;
}

async function retrieveContext(
  supabase: ReturnType<typeof createServiceClient>,
  queryEmbedding: number[],
  userId: string,
  config: IntentConfig,
): Promise<RetrievedChunk[]> {
  const allChunks: RetrievedChunk[] = [];

  for (const ns of config.namespaces) {
    const { data, error } = await supabase.rpc('match_embeddings', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      p_user_id: userId,
      p_namespace: ns,
      p_match_count: config.maxChunks,
      p_match_threshold: 0.3,
    });

    if (error) {
      log.warn('match_embeddings error', { namespace: ns, error: error.message });
      continue;
    }

    if (data) {
      const rows = data as Array<{
        id: string;
        namespace: string;
        source_type: string;
        content_text: string;
        similarity: number;
      }>;
      allChunks.push(...rows);
    }
  }

  allChunks.sort((a, b) => b.similarity - a.similarity);
  return allChunks.slice(0, config.maxChunks);
}

// ---------------------------------------------------------------------------
// User profile serialization
// ---------------------------------------------------------------------------

interface UserProfileResult {
  serialized: string;
  locale: string;
}

async function getUserProfile(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<UserProfileResult> {
  const { data } = await supabase.from('user_profiles').select('*').eq('user_id', userId).single();

  if (!data) return { serialized: 'No profile data available.', locale: 'en' };

  const p = data as Record<string, unknown>;
  const parts = [
    p.biological_sex ? `Sex: ${p.biological_sex}` : null,
    p.height_cm ? `Height: ${p.height_cm} cm` : null,
    p.activity_level ? `Activity level: ${p.activity_level}` : null,
    p.goal_type ? `Goal: ${p.goal_type}` : null,
    p.goal_weight_kg ? `Target weight: ${p.goal_weight_kg} kg` : null,
    p.target_kcal ? `Daily calorie target: ${p.target_kcal} kcal` : null,
    p.target_protein_g ? `Protein target: ${p.target_protein_g}g` : null,
    p.target_carbs_g ? `Carbs target: ${p.target_carbs_g}g` : null,
    p.target_fat_g ? `Fat target: ${p.target_fat_g}g` : null,
    p.dietary_restrictions
      ? `Dietary restrictions: ${(p.dietary_restrictions as string[]).join(', ')}`
      : null,
    p.allergies ? `Allergies: ${(p.allergies as string[]).join(', ')}` : null,
    p.cooking_skill ? `Cooking skill: ${p.cooking_skill}` : null,
    p.cooking_time_pref ? `Cooking time preference: ${p.cooking_time_pref}` : null,
    p.cuisine_preferences
      ? `Cuisine preferences: ${(p.cuisine_preferences as string[]).join(', ')}`
      : null,
  ];

  return {
    serialized: parts.filter(Boolean).join('\n'),
    locale: (p.locale as string) ?? 'en',
  };
}

// ---------------------------------------------------------------------------
// Chat history
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function getChatHistory(
  supabase: ReturnType<typeof createServiceClient>,
  sessionId: string,
): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(MAX_HISTORY * 2);

  if (!data) return [];

  return (data as Array<{ role: string; content: string }>).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

async function getOrCreateSession(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  sessionId?: string,
): Promise<string> {
  if (sessionId) {
    const { data } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (data) return sessionId;
  }

  const { data: newSession, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (error || !newSession) {
    throw new Error('Failed to create chat session');
  }

  return (newSession as { id: string }).id;
}

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

function assembleSystemPrompt(profile: string, context: RetrievedChunk[], locale: string): string {
  const contextBlock =
    context.length > 0
      ? context
          .map(
            (c, i) =>
              `[${i + 1}] (${c.namespace}/${c.source_type}, relevance: ${(c.similarity * 100).toFixed(0)}%)\n${c.content_text}`,
          )
          .join('\n\n')
      : 'No relevant context found.';

  return `You are Snacky, a warm, knowledgeable, and empathetic AI nutrition assistant.

RULES:
- Always ground responses in the user's actual data when available (provided below)
- Never diagnose medical conditions or prescribe medication
- Cite specific meals/dates when referencing user history
- If asked about topics outside nutrition/health, politely redirect
- Express uncertainty when data is insufficient
- Respond in the user's preferred language: ${locale}
- Keep responses concise but thorough
- Use metric units (g, kg, kcal) by default

USER PROFILE:
${profile}

RETRIEVED CONTEXT:
${contextBlock}`;
}

// ---------------------------------------------------------------------------
// SSE streaming
// ---------------------------------------------------------------------------

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return badRequest('Only POST requests are accepted');
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) return authError!;

  try {
    const body = await req.json();
    const message = body.message as string | undefined;
    const sessionId = body.session_id as string | undefined;
    const useStreaming = (body.stream as boolean | undefined) !== false;

    if (!message || message.trim().length === 0) {
      return badRequest('Missing required field: message');
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return internalError('OPENAI_API_KEY not configured');

    const serviceSupabase = createServiceClient();

    log.info('Chat request', { user_id: user.id, message_length: message.length });

    // 1. Session
    const resolvedSessionId = await getOrCreateSession(serviceSupabase, user.id, sessionId);

    // 2. Intent classification
    const intent = await classifyIntent(message, apiKey);
    const config = INTENT_CONFIG[intent];
    log.info('Intent classified', { intent, model: config.model });

    // 3. Embed query and retrieve context
    const queryEmbedding = await embedQuery(message, apiKey);
    const context = await retrieveContext(serviceSupabase, queryEmbedding, user.id, config);
    log.info('Context retrieved', { chunks: context.length });

    // 4. User profile + chat history
    const [profileResult, history] = await Promise.all([
      getUserProfile(serviceSupabase, user.id),
      getChatHistory(serviceSupabase, resolvedSessionId),
    ]);

    // 5. Assemble messages
    const systemPrompt = assembleSystemPrompt(
      profileResult.serialized,
      context,
      profileResult.locale,
    );
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.map((m) => ({ role: m.role as const, content: m.content })),
      { role: 'user' as const, content: message },
    ];

    // 6. Store user message
    await serviceSupabase.from('chat_messages').insert({
      session_id: resolvedSessionId,
      role: 'user',
      content: message,
    });

    // Helper: call OpenAI and store result
    async function callOpenAIAndStore(streaming: boolean) {
      const chatResp = await fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: streaming,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      return chatResp;
    }

    async function storeAssistantMessage(content: string, tokensUsed: number) {
      const contextIds = context.map((c) => c.id);
      await serviceSupabase.from('chat_messages').insert({
        session_id: resolvedSessionId,
        role: 'assistant',
        content,
        model_used: config.model,
        tokens_used: tokensUsed || null,
        retrieved_context_ids: contextIds.length > 0 ? contextIds : null,
      });
      await serviceSupabase
        .from('chat_sessions')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', resolvedSessionId);
      return contextIds;
    }

    // ---- Non-streaming JSON mode (for React Native) ----
    if (!useStreaming) {
      const chatResp = await callOpenAIAndStore(false);

      if (!chatResp.ok) {
        const errText = await chatResp.text();
        log.error('OpenAI chat error', { status: chatResp.status, body: errText });
        return internalError('AI model error');
      }

      const result = (await chatResp.json()) as {
        choices: Array<{ message: { content: string } }>;
        usage?: { total_tokens?: number };
      };

      const content = result.choices[0]?.message?.content ?? '';
      const tokensUsed = result.usage?.total_tokens ?? 0;

      const contextIds = await storeAssistantMessage(content, tokensUsed);

      log.info('Chat response complete (non-streaming)', {
        user_id: user.id,
        session_id: resolvedSessionId,
        intent,
        model: config.model,
        response_length: content.length,
        tokens: tokensUsed,
      });

      return new Response(
        JSON.stringify({
          session_id: resolvedSessionId,
          intent,
          model: config.model,
          content,
          tokens_used: tokensUsed,
          context_ids: contextIds,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // ---- SSE streaming mode ----
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        controller.enqueue(
          encoder.encode(
            sseEvent('message_start', {
              session_id: resolvedSessionId,
              intent,
              model: config.model,
              context_chunks: context.length,
            }),
          ),
        );

        try {
          const chatResp = await callOpenAIAndStore(true);

          if (!chatResp.ok || !chatResp.body) {
            const errText = await chatResp.text();
            log.error('OpenAI chat error', { status: chatResp.status, body: errText });
            controller.enqueue(encoder.encode(sseEvent('error', { message: 'AI model error' })));
            controller.close();
            return;
          }

          let fullResponse = '';
          let totalTokens = 0;
          const reader = chatResp.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              const payload = trimmed.slice(6);
              if (payload === '[DONE]') continue;

              try {
                const parsed = JSON.parse(payload) as {
                  choices: Array<{
                    delta: { content?: string };
                    finish_reason?: string;
                  }>;
                  usage?: { total_tokens?: number };
                };

                const delta = parsed.choices[0]?.delta?.content;
                if (delta) {
                  fullResponse += delta;
                  controller.enqueue(encoder.encode(sseEvent('content_delta', { text: delta })));
                }

                if (parsed.usage?.total_tokens) {
                  totalTokens = parsed.usage.total_tokens;
                }
              } catch {
                // skip malformed chunks
              }
            }
          }

          const contextIds = await storeAssistantMessage(fullResponse, totalTokens);

          controller.enqueue(
            encoder.encode(
              sseEvent('message_end', {
                session_id: resolvedSessionId,
                model: config.model,
                tokens_used: totalTokens,
                context_ids: contextIds,
              }),
            ),
          );

          log.info('Chat response complete', {
            user_id: user.id,
            session_id: resolvedSessionId,
            intent,
            model: config.model,
            response_length: fullResponse.length,
            tokens: totalTokens,
          });
        } catch (err) {
          log.error('Streaming error', { error: String(err) });
          controller.enqueue(encoder.encode(sseEvent('error', { message: 'Streaming failed' })));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    log.error('Chat failed', { error: String(err) });
    return internalError('Failed to process chat message');
  }
});
