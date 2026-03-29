import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { badRequest, internalError, serviceUnavailable } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';
import { MealScanRequestSchema, VisionResponseSchema, normalizeImages } from './schemas.ts';
import { validateImages } from './validation.ts';
import { buildSystemPrompt, buildUserPrompt, getResponseSchema } from './prompt.ts';
import { callVisionPipeline } from './providers.ts';
import { crossReferenceUSDA } from './usda.ts';

const log = createLogger('meal-scan');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return badRequest('Only POST requests are accepted');
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError) return authError;

  const userId = user!.id;
  log.info('Meal scan requested', { user_id: userId });

  const startTime = performance.now();

  try {
    const body = await req.json();
    const parseResult = MealScanRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return badRequest(
        `Invalid request: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
      );
    }

    const { meal_type, locale, clarifications } = parseResult.data;
    const images = normalizeImages(parseResult.data);

    const imgCheck = validateImages(images);
    if (!imgCheck.valid) {
      return badRequest(imgCheck.error!);
    }

    log.info('Images validated', {
      user_id: userId,
      image_count: images.length,
      formats: imgCheck.results.map((r) => r.format),
      total_size_bytes: imgCheck.results.reduce((s, r) => s + r.estimatedSizeBytes, 0),
    });

    const systemPrompt = buildSystemPrompt(locale);
    const userPrompt = buildUserPrompt(meal_type, images.length, clarifications);
    const responseSchema = getResponseSchema();

    let visionResult;
    try {
      visionResult = await callVisionPipeline(images, systemPrompt, userPrompt, responseSchema);
    } catch (_err) {
      log.error('All vision providers failed', { user_id: userId });
      return serviceUnavailable(
        'All vision model providers failed. Please try again or use manual entry.',
      );
    }

    let parsed;
    try {
      const rawJson = JSON.parse(visionResult.content);
      parsed = VisionResponseSchema.parse(rawJson);
    } catch (err) {
      log.error('Vision response failed Zod validation', {
        user_id: userId,
        model: visionResult.model,
        error: String(err),
        raw_snippet: visionResult.content.slice(0, 500),
      });
      return internalError('Vision model returned an invalid response. Please try again.');
    }

    let finalIngredients = parsed.ingredients;
    let finalTotal = parsed.total;
    let usdaAdjusted = false;

    try {
      const usda = await crossReferenceUSDA(parsed.ingredients);
      finalIngredients = usda.ingredients;
      finalTotal = usda.adjustedTotal;
      usdaAdjusted = usda.adjustedCount > 0;

      if (usdaAdjusted) {
        log.info('USDA cross-reference adjusted values', {
          user_id: userId,
          adjusted_count: usda.adjustedCount,
        });
      }
    } catch (err) {
      log.warn('USDA cross-reference failed, using AI values', {
        user_id: userId,
        error: String(err),
      });
    }

    let clarificationNeeded = parsed.clarification_needed;
    let clarificationQuestions = parsed.clarification_questions;
    if (clarifications && clarifications.length > 0) {
      clarificationNeeded = false;
      clarificationQuestions = [];
    }

    const processingTimeMs = Math.round(performance.now() - startTime);

    const result = {
      ingredients: finalIngredients,
      total: finalTotal,
      overall_confidence: parsed.overall_confidence,
      nova_classification: parsed.nova_classification,
      clarification_needed: clarificationNeeded,
      clarification_questions: clarificationQuestions,
      model_used: visionResult.model,
      processing_time_ms: processingTimeMs,
    };

    log.info('Meal scan completed', {
      user_id: userId,
      model: visionResult.model,
      image_count: images.length,
      ingredient_count: result.ingredients.length,
      confidence: result.overall_confidence,
      processing_time_ms: processingTimeMs,
      usda_adjusted: usdaAdjusted,
      clarification_needed: clarificationNeeded,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const processingTimeMs = Math.round(performance.now() - startTime);
    log.error('Meal scan failed', {
      user_id: userId,
      error: String(err),
      processing_time_ms: processingTimeMs,
    });
    return internalError('Failed to process meal scan');
  }
});
