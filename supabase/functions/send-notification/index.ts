import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { badRequest, internalError } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('send-notification');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return badRequest('Only POST requests are accepted');
  }

  log.info('Notification dispatch triggered');

  try {
    const body = await req.json();
    const userId = body.user_id as string | undefined;
    const type = body.type as string | undefined;
    const title = body.title as string | undefined;
    const bodyText = body.body as string | undefined;

    if (!userId || !type || !title || !bodyText) {
      return badRequest('Missing required fields: user_id, type, title, body');
    }

    // TODO Phase 2.7: Implement FCM push dispatch
    // 1. Fetch user's FCM token from user_profiles
    // 2. Render notification template (per locale)
    // 3. Dispatch via FCM HTTP v1 API
    // 4. Log to notification_log table

    const supabase = createServiceClient();
    const { error: logError } = await supabase.from('notification_log').insert({
      user_id: userId,
      type,
      title,
      body: bodyText,
      data: body.data ?? {},
    });

    if (logError) {
      log.error('Failed to log notification', { error: logError.message });
    }

    const placeholder = {
      status: 'logged',
      message: 'FCM dispatch will be implemented in Phase 2.7. Notification logged to DB.',
      user_id: userId,
      type,
    };

    log.info('Notification logged', { user_id: userId, type });

    return new Response(JSON.stringify(placeholder), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    log.error('Notification dispatch failed', { error: String(err) });
    return internalError('Failed to send notification');
  }
});
