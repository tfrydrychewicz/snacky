import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { badRequest, internalError } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('meal-scan');

// Realistic mock data matching MealScanResultSchema — replaced by real vision AI in Phase 1.3
const MOCK_SCAN_RESULT = {
  ingredients: [
    {
      name: 'Grilled Chicken Breast',
      quantity_g: 180,
      confidence: 0.94,
      macros: {
        calories_kcal: 297,
        protein_g: 53.4,
        carbohydrates_g: 0,
        fat_g: 6.5,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 126,
      },
      usda_fdc_id: 171077,
    },
    {
      name: 'Brown Rice (cooked)',
      quantity_g: 150,
      confidence: 0.88,
      macros: {
        calories_kcal: 166,
        protein_g: 3.9,
        carbohydrates_g: 34.5,
        fat_g: 1.4,
        fiber_g: 2.7,
        sugar_g: 0.5,
        sodium_mg: 5,
      },
      usda_fdc_id: 169704,
    },
    {
      name: 'Steamed Broccoli',
      quantity_g: 100,
      confidence: 0.91,
      macros: {
        calories_kcal: 35,
        protein_g: 2.4,
        carbohydrates_g: 7.2,
        fat_g: 0.4,
        fiber_g: 3.3,
        sugar_g: 1.4,
        sodium_mg: 41,
      },
      usda_fdc_id: 170379,
    },
  ],
  total: {
    calories_kcal: 498,
    protein_g: 59.7,
    carbohydrates_g: 41.7,
    fat_g: 8.3,
    fiber_g: 6.0,
    sugar_g: 1.9,
    sodium_mg: 172,
  },
  overall_confidence: 0.91,
  nova_classification: 1 as const,
  clarification_needed: false,
  clarification_questions: [],
  model_used: 'mock-v1.0 (Phase 1.3 will use GPT-5.4 Vision)',
  processing_time_ms: 1850,
};

// Low-confidence mock to exercise clarification flow when meal_type is 'snack'
const MOCK_SCAN_RESULT_WITH_CLARIFICATION = {
  ...MOCK_SCAN_RESULT,
  ingredients: [
    {
      name: 'Pasta with Creamy Sauce',
      quantity_g: 250,
      confidence: 0.62,
      macros: {
        calories_kcal: 420,
        protein_g: 14,
        carbohydrates_g: 52,
        fat_g: 18,
        fiber_g: 2.5,
        sugar_g: 3,
        sodium_mg: 580,
      },
      usda_fdc_id: null,
    },
    {
      name: 'Mixed Salad',
      quantity_g: 80,
      confidence: 0.85,
      macros: {
        calories_kcal: 18,
        protein_g: 1.2,
        carbohydrates_g: 3.5,
        fat_g: 0.2,
        fiber_g: 1.8,
        sugar_g: 1.1,
        sodium_mg: 12,
      },
      usda_fdc_id: null,
    },
  ],
  total: {
    calories_kcal: 438,
    protein_g: 15.2,
    carbohydrates_g: 55.5,
    fat_g: 18.2,
    fiber_g: 4.3,
    sugar_g: 4.1,
    sodium_mg: 592,
  },
  overall_confidence: 0.73,
  nova_classification: 3 as const,
  clarification_needed: true,
  clarification_questions: [
    {
      question:
        'I see a creamy sauce on the pasta — is it made with cream, yogurt, or coconut milk?',
      options: ['Heavy cream', 'Greek yogurt', 'Coconut milk', 'Cheese-based'],
      field: 'sauce_type',
    },
  ],
  processing_time_ms: 2340,
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return badRequest('Only POST requests are accepted');
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError) return authError;

  log.info('Meal scan requested', { user_id: user!.id });

  try {
    const body = await req.json();
    const imageBase64 = body.image as string | undefined;
    const mealType = (body.meal_type as string) ?? 'unknown';
    const clarifications = body.clarifications as
      | Array<{ question: string; answer: string }>
      | undefined;

    if (!imageBase64) {
      return badRequest('Missing required field: image (base64-encoded JPEG/PNG)');
    }

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Return clarification mock for 'snack' type (unless clarifications already provided)
    const useClarificationMock =
      mealType === 'snack' && (!clarifications || clarifications.length === 0);

    const result = useClarificationMock
      ? MOCK_SCAN_RESULT_WITH_CLARIFICATION
      : {
          ...MOCK_SCAN_RESULT,
          // If clarifications were provided, mark as resolved
          ...(clarifications &&
            clarifications.length > 0 && {
              clarification_needed: false,
              clarification_questions: [],
            }),
        };

    log.info('Meal scan completed (mock)', {
      user_id: user!.id,
      meal_type: mealType,
      ingredient_count: result.ingredients.length,
      confidence: result.overall_confidence,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    log.error('Meal scan failed', { error: String(err) });
    return internalError('Failed to process meal scan');
  }
});
