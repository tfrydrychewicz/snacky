import { createLogger } from '../_shared/logger.ts';
import type { TriggeredInteraction } from './engine.ts';
import type { NutrientInsightsResult } from './schemas.ts';

const log = createLogger('nutrient-interactions:ai');

const AI_TIMEOUT_MS = 25_000;

interface UserContext {
  locale: string;
  dietaryRestrictions: string[];
  allergies: string[];
}

function buildPrompt(
  warnings: TriggeredInteraction[],
  synergies: TriggeredInteraction[],
  ingredientNames: string[],
  ctx: UserContext,
): string {
  const lang = ctx.locale === 'pl' ? 'Polish' : 'English';
  const restrictions = ctx.dietaryRestrictions.length > 0
    ? `User follows: ${ctx.dietaryRestrictions.join(', ')}.`
    : 'No dietary restrictions.';
  const allergyNote = ctx.allergies.length > 0
    ? `User is allergic to: ${ctx.allergies.join(', ')}. NEVER suggest foods containing these allergens.`
    : '';

  const warningBlock = warnings.map((w, i) => {
    const r = w.rule;
    return `WARNING ${i + 1} [${r.severity}]: "${r.id}"
  Nutrients: ${r.nutrientA} (${w.valueA}) + ${r.nutrientB} (${w.valueB})
  Mechanism: ${r.mechanism}
  Default suggestion: ${r.suggestionHint}`;
  }).join('\n\n');

  const synergyBlock = synergies.map((s, i) => {
    const r = s.rule;
    return `SYNERGY ${i + 1}: "${r.id}"
  Nutrients: ${r.nutrientA} (${s.valueA}) + ${r.nutrientB} (${s.valueB})
  Mechanism: ${r.mechanism}
  Default note: ${r.suggestionHint}`;
  }).join('\n\n');

  return `You are a nutrition advisor for the Snacky app. Analyze the nutrient interactions below for a meal containing: ${ingredientNames.join(', ')}.

${restrictions}
${allergyNote}

Respond in ${lang}. Use simple, friendly language a non-scientist can understand. Be concise — each field should be 1-2 sentences max.

CRITICAL: Always mention the SPECIFIC ingredients from the meal that are the source of each nutrient. Do NOT just say "calcium" or "iron" — say which food in the meal provides it (e.g. "the calcium from ricotta and parmesan", "the iron from spinach"). This helps the user understand which foods in their meal are interacting.

${warningBlock ? `=== WARNINGS ===\n${warningBlock}` : ''}

${synergyBlock ? `=== SYNERGIES ===\n${synergyBlock}` : ''}

For each WARNING, produce:
- title: short attention-grabbing label that names the specific ingredients (e.g. "Ricotta calcium blocks spinach iron" not just "Calcium blocks iron")
- description: plain-language explanation referencing the specific meal ingredients that are the source of each nutrient
- suggestion: a specific, actionable fix using real food examples that respect the user's dietary restrictions and allergies

For each SYNERGY, produce:
- title: encouraging short label naming the ingredients (e.g. "Spinach iron + parsley vitamin C = great combo!")
- description: why this combination is beneficial, referencing the specific meal ingredients

Return ONLY valid JSON matching this structure:
{
  "warnings": [{ "id": "<rule_id>", "severity": "<strong|moderate|mild>", "title": "...", "description": "...", "suggestion": "...", "nutrients": ["nutrientA", "nutrientB"] }],
  "synergies": [{ "id": "<rule_id>", "title": "...", "description": "...", "nutrients": ["nutrientA", "nutrientB"] }]
}`;
}

interface AIInsights {
  warnings: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
    suggestion: string;
    nutrients: string[];
  }>;
  synergies: Array<{
    id: string;
    title: string;
    description: string;
    nutrients: string[];
  }>;
}

async function callOpenAI(prompt: string): Promise<AIInsights> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'You are a precise nutrition science advisor. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 2048,
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`OpenAI ${resp.status}: ${txt}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty AI response');

    return JSON.parse(content) as AIInsights;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generate localized, personalized insight text using AI.
 * Falls back to rule-level defaults if AI fails.
 */
export async function generateInsights(
  warnings: TriggeredInteraction[],
  synergies: TriggeredInteraction[],
  ingredientNames: string[],
  ctx: UserContext,
): Promise<NutrientInsightsResult> {
  if (warnings.length === 0 && synergies.length === 0) {
    return { has_insights: false, insight_count: 0, warnings: [], synergies: [] };
  }

  try {
    const prompt = buildPrompt(warnings, synergies, ingredientNames, ctx);
    const ai = await callOpenAI(prompt);

    return {
      has_insights: true,
      insight_count: (ai.warnings?.length ?? 0) + (ai.synergies?.length ?? 0),
      warnings: (ai.warnings ?? []).map((w) => ({
        id: w.id,
        severity: (['strong', 'moderate', 'mild'].includes(w.severity) ? w.severity : 'moderate') as 'strong' | 'moderate' | 'mild',
        title: w.title,
        description: w.description,
        suggestion: w.suggestion,
        nutrients: w.nutrients ?? [],
      })),
      synergies: (ai.synergies ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        nutrients: s.nutrients ?? [],
      })),
    };
  } catch (err) {
    log.warn('AI generation failed, using fallback', { error: String(err) });
    return buildFallback(warnings, synergies);
  }
}

function buildFallback(
  warnings: TriggeredInteraction[],
  synergies: TriggeredInteraction[],
): NutrientInsightsResult {
  return {
    has_insights: true,
    insight_count: warnings.length + synergies.length,
    warnings: warnings.map((w) => ({
      id: w.rule.id,
      severity: w.rule.severity,
      title: w.rule.id.replace(/_/g, ' '),
      description: w.rule.mechanism,
      suggestion: w.rule.suggestionHint,
      nutrients: [w.rule.nutrientA, w.rule.nutrientB],
    })),
    synergies: synergies.map((s) => ({
      id: s.rule.id,
      title: s.rule.id.replace(/_/g, ' '),
      description: s.rule.mechanism,
      nutrients: [s.rule.nutrientA, s.rule.nutrientB],
    })),
  };
}
