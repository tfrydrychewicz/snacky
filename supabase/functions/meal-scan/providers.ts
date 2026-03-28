import { createLogger } from '../_shared/logger.ts';

const log = createLogger('meal-scan:providers');

export interface VisionProviderResult {
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

const PROVIDER_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Individual provider implementations
// ---------------------------------------------------------------------------

async function callOpenAI(
  imageBase64: string,
  mimeType: string,
  systemPrompt: string,
  userPrompt: string,
  responseSchema: Record<string, unknown>,
): Promise<VisionProviderResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const model = 'gpt-5.4';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'meal_analysis',
            strict: true,
            schema: responseSchema,
          },
        },
        max_tokens: 4096,
        temperature: 0.1,
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`OpenAI API error (${resp.status}): ${errorText}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned empty content');

    return { content, model: data.model ?? model, usage: data.usage };
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(
  imageBase64: string,
  mimeType: string,
  systemPrompt: string,
  userPrompt: string,
  responseSchema: Record<string, unknown>,
): Promise<VisionProviderResult> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured');

  const model = 'gemini-3.1-pro';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [
          {
            parts: [
              { text: userPrompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generation_config: {
          temperature: 0.1,
          max_output_tokens: 4096,
          response_mime_type: 'application/json',
          response_schema: responseSchema,
        },
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Gemini API error (${resp.status}): ${errorText}`);
    }

    const data = await resp.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Gemini returned empty content');

    return { content, model };
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic(
  imageBase64: string,
  mimeType: string,
  systemPrompt: string,
  userPrompt: string,
  _responseSchema: Record<string, unknown>,
): Promise<VisionProviderResult> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const model = 'claude-sonnet-4-6-20260301';
  const mediaType = mimeType === 'image/png' ? ('image/png' as const) : ('image/jpeg' as const);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2024-01-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.1,
        system:
          systemPrompt + '\n\nYou MUST respond with ONLY valid JSON. No markdown, no code fences.',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              { type: 'text', text: userPrompt },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Anthropic API error (${resp.status}): ${errorText}`);
    }

    const data = await resp.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
    if (!textBlock?.text) throw new Error('Anthropic returned empty content');

    let content: string = textBlock.text.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    return {
      content,
      model,
      usage: {
        prompt_tokens: data.usage?.input_tokens ?? 0,
        completion_tokens: data.usage?.output_tokens ?? 0,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Orchestrator — triple-provider fallback
// ---------------------------------------------------------------------------

type ProviderFn = (
  imageBase64: string,
  mimeType: string,
  systemPrompt: string,
  userPrompt: string,
  responseSchema: Record<string, unknown>,
) => Promise<VisionProviderResult>;

interface ProviderConfig {
  name: string;
  fn: ProviderFn;
}

const PROVIDERS: ProviderConfig[] = [
  { name: 'gpt-5.4', fn: callOpenAI },
  { name: 'gemini-3.1-pro', fn: callGemini },
  { name: 'claude-sonnet-4.6', fn: callAnthropic },
];

export async function callVisionPipeline(
  imageBase64: string,
  mimeType: string,
  systemPrompt: string,
  userPrompt: string,
  responseSchema: Record<string, unknown>,
): Promise<VisionProviderResult> {
  const errors: Array<{ provider: string; error: string }> = [];

  for (const provider of PROVIDERS) {
    try {
      log.info(`Attempting vision analysis`, { provider: provider.name });
      const result = await provider.fn(
        imageBase64,
        mimeType,
        systemPrompt,
        userPrompt,
        responseSchema,
      );
      log.info(`Vision analysis succeeded`, { provider: provider.name });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`Provider failed, trying next`, {
        provider: provider.name,
        error: msg,
      });
      errors.push({ provider: provider.name, error: msg });
    }
  }

  log.error('All vision providers failed', { errors });
  throw new Error(
    `All vision providers failed: ${errors.map((e) => `${e.provider}: ${e.error}`).join('; ')}`,
  );
}
