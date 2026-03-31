import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { createUserClient } from '../_shared/supabase-client.ts';
import { RequestSchema } from './schemas.ts';
import { evaluate } from './engine.ts';
import { generateInsights } from './ai-prompt.ts';

const log = createLogger('nutrient-interactions');

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const startMs = Date.now();

  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      log.warn('Invalid request', { errors: parsed.error.format() });
      return new Response(
        JSON.stringify({ error: 'Invalid request', detail: parsed.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { ingredients, locale } = parsed.data;

    let dietaryRestrictions: string[] = [];
    let allergies: string[] = [];

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const userClient = createUserClient(authHeader);
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          const { data: profile } = await userClient
            .from('user_profiles')
            .select('dietary_restrictions, allergies')
            .eq('user_id', user.id)
            .maybeSingle();
          if (profile) {
            dietaryRestrictions = (profile.dietary_restrictions as string[]) ?? [];
            allergies = (profile.allergies as string[]) ?? [];
          }
        }
      } catch (err) {
        log.warn('Failed to fetch user profile', { error: String(err) });
      }
    }

    log.info('Evaluating interactions', {
      ingredientCount: ingredients.length,
      locale,
    });

    const evaluation = await evaluate(ingredients);

    const result = await generateInsights(
      evaluation.warnings,
      evaluation.synergies,
      ingredients.map((i) => i.name),
      { locale, dietaryRestrictions, allergies },
    );

    log.info('Analysis complete', {
      warningCount: result.warnings.length,
      synergyCount: result.synergies.length,
      durationMs: Date.now() - startMs,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('Nutrient interaction analysis failed', { error: msg });
    return new Response(
      JSON.stringify({ error: 'Analysis failed', detail: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
