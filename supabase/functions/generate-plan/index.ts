import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { badRequest, internalError, serviceUnavailable } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';
import { PlanRequestSchema, type UserProfile } from './schemas.ts';
import { createPlanRow } from './store.ts';
import { dispatchEventDirect } from '../_shared/workflow/mod.ts';

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const parseResult = PlanRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return badRequest(
      `Invalid request: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
    );
  }

  const request = parseResult.data;
  const serviceSupabase = createServiceClient();

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return serviceUnavailable('AI service not configured');
  }

  // Load profile for plan row creation and early validation
  let profile: UserProfile;
  try {
    profile = await fetchUserProfile(serviceSupabase, userId);
  } catch (err) {
    if (err instanceof Error && err.message.includes('User profile not found')) {
      return badRequest('Complete your profile before generating a diet plan');
    }
    return internalError('Failed to load profile');
  }

  // Create plan row so the client can start polling immediately
  let planId: string;
  try {
    planId = await createPlanRow(serviceSupabase, userId, request, profile);
  } catch (err) {
    log.error('Failed to create plan row', { user_id: userId, error: String(err) });
    return internalError('Failed to initialize plan');
  }

  log.info('Plan row created, dispatching workflow', { user_id: userId, plan_id: planId });

  // Dispatch to the durable workflow engine — returns immediately
  let eventRow;
  try {
    eventRow = await dispatchEventDirect(serviceSupabase, {
      name: 'diet-plan/requested',
      payload: { user_id: userId, config: request, plan_id: planId },
      user_id: userId,
    }, {
      source: 'generate-plan',
      idempotencyKey: `plan-${planId}`,
    });
  } catch (err) {
    log.error('Failed to dispatch workflow event', { user_id: userId, plan_id: planId, error: String(err) });
    await serviceSupabase
      .from('diet_plans')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', planId);
    return internalError('Failed to start plan generation');
  }

  return new Response(
    JSON.stringify({
      plan_id: planId,
      event_id: eventRow.id,
      status: 'generating',
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});

async function fetchUserProfile(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(
      'user_id, target_kcal, target_protein_g, target_carbs_g, target_fat_g, ' +
      'allergies, dietary_restrictions, cooking_skill, cuisine_preferences, ' +
      'date_of_birth, biological_sex, locale, location',
    )
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('User profile not found or incomplete');
  }

  return {
    user_id: data.user_id,
    target_kcal: data.target_kcal ?? 2000,
    target_protein_g: data.target_protein_g ?? 100,
    target_carbs_g: data.target_carbs_g ?? 250,
    target_fat_g: data.target_fat_g ?? 65,
    allergies: data.allergies ?? [],
    dietary_restrictions: data.dietary_restrictions ?? [],
    cooking_skill: data.cooking_skill ?? 'intermediate',
    cuisine_preferences: data.cuisine_preferences ?? [],
    date_of_birth: data.date_of_birth ?? null,
    biological_sex: data.biological_sex ?? null,
    locale: data.locale ?? 'en',
    location: data.location ?? null,
  };
}
