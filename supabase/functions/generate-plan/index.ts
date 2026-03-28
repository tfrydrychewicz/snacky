import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { badRequest, internalError } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('generate-plan');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return badRequest('Only POST requests are accepted');
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError) return authError;

  log.info('Plan generation requested', { user_id: user!.id });

  try {
    const body = await req.json();
    const durationDays = body.duration_days as number | undefined;
    const mealsPerDay = body.meals_per_day as number | undefined;

    if (!durationDays || !mealsPerDay) {
      return badRequest('Missing required fields: duration_days, meals_per_day');
    }

    // TODO Phase 3.1-3.2: Implement MILP solver + LLM recipe generation
    // 1. Fetch user profile (macros, restrictions, allergies, preferences)
    // 2. Fetch candidate foods from USDA + recipes DB
    // 3. Run MILP solver (PuLP) with constraints
    // 4. Generate recipes via GPT-5.4 with RAG context
    // 5. Validate (allergen check, re-calculate nutrition)
    // 6. Store plan in diet_plans + diet_plan_meals tables

    const placeholder = {
      status: 'not_implemented',
      message: 'Plan generation will be implemented in Phase 3.1-3.2',
      duration_days: durationDays,
      meals_per_day: mealsPerDay,
    };

    log.info('Plan generation placeholder response', { user_id: user!.id });

    return new Response(JSON.stringify(placeholder), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    log.error('Plan generation failed', { error: String(err) });
    return internalError('Failed to generate diet plan');
  }
});
