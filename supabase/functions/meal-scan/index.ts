import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { badRequest, internalError, serviceUnavailable } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('meal-scan');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return badRequest('Only POST requests are accepted');
  }

  const { user, error: authError, supabase } = await getAuthenticatedUser(req);
  if (authError) return authError;

  log.info('Meal scan requested', { user_id: user!.id });

  try {
    const body = await req.json();
    const imageBase64 = body.image as string | undefined;
    const mealType = body.meal_type as string | undefined;

    if (!imageBase64) {
      return badRequest('Missing required field: image (base64-encoded JPEG/PNG)');
    }

    // TODO Phase 1.3: Implement vision pipeline
    // 1. Validate image (format, size, corruption)
    // 2. Build structured vision prompt
    // 3. Call GPT-5.4 Vision (primary) with fallback to Gemini / Claude
    // 4. Parse response with Zod validation
    // 5. Cross-reference with USDA FoodData Central
    // 6. Return structured MealScanResult

    const placeholder = {
      status: 'not_implemented',
      message: 'Meal scan pipeline will be implemented in Phase 1.3',
      meal_type: mealType ?? 'unknown',
      ingredients: [],
      total_calories: 0,
      confidence: 0,
    };

    log.info('Meal scan placeholder response', { user_id: user!.id });

    return new Response(JSON.stringify(placeholder), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    log.error('Meal scan failed', { error: String(err) });
    return internalError('Failed to process meal scan');
  }
});
