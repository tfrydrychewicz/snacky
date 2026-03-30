import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { createLogger } from '../_shared/logger.ts';
import { WorkflowEngine } from '../_shared/workflow/mod.ts';
import type { QueueMessage } from '../_shared/workflow/mod.ts';

// ─── Import workflow definitions ────────────────────────────
// Register every workflow here. Each is a WorkflowDefinition.
import { generatePlanWorkflow } from './workflows/generate-plan.ts';

const log = createLogger('workflow-runner');

const ALL_WORKFLOWS = [
  generatePlanWorkflow,
];

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Authenticate — only service_role key is accepted
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader || !serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let msg: QueueMessage;
  try {
    msg = await req.json() as QueueMessage;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createServiceClient();
  const engine = new WorkflowEngine(supabase, ALL_WORKFLOWS);

  try {
    await engine.handle(msg);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error('Engine handler failed', { error: errMsg, message: msg });
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
