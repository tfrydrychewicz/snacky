import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { badRequest, internalError, serviceUnavailable } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';
import { MealScanRequestSchema, VisionResponseSchema } from './schemas.ts';
import { validateImage, stripDataUri, detectMimeType } from './validation.ts';
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
    // 1. Parse & validate request body with Zod
    const body = await req.json();
    const parseResult = MealScanRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return badRequest(
        `Invalid request: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
      );
    }

    const { image, meal_type, clarifications } = parseResult.data;

    // 2. Validate image format, size, encoding
    const imgCheck = validateImage(image);
    if (!imgCheck.valid) {
      return badRequest(imgCheck.error!);
    }

    log.info('Image validated', {
      user_id: userId,
      format: imgCheck.format,
      size_bytes: imgCheck.estimatedSizeBytes,
    });

    // 3. Build vision prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(meal_type, clarifications);
    const responseSchema = getResponseSchema();
    const rawBase64 = stripDataUri(image);
    const mimeType = detectMimeType(image);

    // 4. Call vision pipeline (GPT-5.4 → Gemini 3.1 Pro → Claude Sonnet 4.6)
    let visionResult;
    try {
      visionResult = await callVisionPipeline(
        rawBase64,
        mimeType,
        systemPrompt,
        userPrompt,
        responseSchema,
      );
    } catch (_err) {
      log.error('All vision providers failed', { user_id: userId });
      return serviceUnavailable(
        'All vision model providers failed. Please try again or use manual entry.',
      );
    }

    // 5. Parse vision response with Zod strict validation
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

    // 6. Cross-reference with USDA FoodData Central (best-effort)
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

    // 7. Clarification flow: if user already answered, mark resolved
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
