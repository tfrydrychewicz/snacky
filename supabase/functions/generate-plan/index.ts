import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { badRequest, internalError, serviceUnavailable } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';
import { PlanRequestSchema } from './schemas.ts';
import { fetchUserProfile, fetchCandidateFoods } from './candidates.ts';
import { solve } from './solver.ts';
import { storePlan } from './store.ts';

const log = createLogger('generate-plan');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return badRequest('Only POST requests are accepted');
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError) return authError;

  const userId = user!.id;
  log.info('Plan generation requested', { user_id: userId });

  const startTime = performance.now();

  try {
    const body = await req.json();
    const parseResult = PlanRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return badRequest(
        `Invalid request: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
      );
    }

    const request = parseResult.data;
    const serviceSupabase = createServiceClient();

    // 1. Fetch user profile
    log.info('Fetching user profile', { user_id: userId });
    const profile = await fetchUserProfile(serviceSupabase, userId);

    // 2. Fetch candidate foods
    log.info('Fetching candidate foods', { user_id: userId });
    const candidates = await fetchCandidateFoods(serviceSupabase, profile, request);

    if (candidates.length < 10) {
      return serviceUnavailable(
        'Not enough food data available. Please ensure the USDA foods database has been populated.',
      );
    }

    log.info('Candidates ready', {
      user_id: userId,
      candidate_count: candidates.length,
      duration_days: request.duration_days,
      meals_per_day: request.meals_per_day,
    });

    // 3. Run solver
    log.info('Running solver', { user_id: userId });
    const solverResult = solve(candidates, profile, request);

    log.info('Solver complete', {
      user_id: userId,
      method: solverResult.method,
      solver_time_ms: solverResult.solver_time_ms,
      objective_value: solverResult.objective_value,
      meal_count: solverResult.meals.length,
      unique_ingredients: solverResult.unique_ingredients,
    });

    // 4. Store plan in database
    log.info('Storing plan', { user_id: userId });
    const planResponse = await storePlan(
      serviceSupabase,
      userId,
      request,
      profile,
      solverResult,
    );

    const totalTimeMs = Math.round(performance.now() - startTime);

    log.info('Plan generation complete', {
      user_id: userId,
      plan_id: planResponse.plan_id,
      total_time_ms: totalTimeMs,
      duration_days: request.duration_days,
      meal_count: solverResult.meals.length,
    });

    return new Response(JSON.stringify(planResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const totalTimeMs = Math.round(performance.now() - startTime);
    log.error('Plan generation failed', {
      user_id: userId,
      error: String(err),
      total_time_ms: totalTimeMs,
    });

    if (err instanceof Error && err.message.includes('User profile not found')) {
      return badRequest('Complete your profile before generating a diet plan');
    }

    return internalError('Failed to generate diet plan. Please try again.');
  }
});
