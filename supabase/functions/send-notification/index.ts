import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { badRequest, internalError } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('send-notification');

interface NotificationPayload {
  user_id?: string;
  type: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

interface NotificationPrefs {
  enabled: boolean;
  meal_reminders: boolean;
  nudges: boolean;
  weekly_report: boolean;
  streak_alerts: boolean;
  budget_alerts: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  meal_reminders: true,
  nudges: true,
  weekly_report: true,
  streak_alerts: true,
  budget_alerts: true,
};

interface UserRow {
  id: string;
  locale: string | null;
  notification_prefs: NotificationPrefs | null;
  timezone: string | null;
}

interface DeviceRow {
  fcm_token: string;
  platform: string;
}

const TEMPLATES: Record<string, Record<string, { title: string; body: string }>> = {
  meal_reminder: {
    en: {
      title: 'Time to eat! 🍽️',
      body: "It's around your usual meal time. Ready to scan your meal?",
    },
    pl: {
      title: 'Pora na posiłek! 🍽️',
      body: 'Zbliża się Twoja pora posiłku. Zeskanuj swój posiłek?',
    },
  },
  streak_check: {
    en: {
      title: "Don't break your streak! 🔥",
      body: "You haven't logged any meals today. Keep your streak alive!",
    },
    pl: {
      title: 'Nie przerywaj serii! 🔥',
      body: 'Nie zalogowałeś dziś żadnego posiłku. Utrzymaj swoją serię!',
    },
  },
  budget_alert: {
    en: {
      title: 'Macro budget alert ⚠️',
      body: "You've used most of your daily budget. Consider a lighter dinner.",
    },
    pl: {
      title: 'Alert budżetu makro ⚠️',
      body: 'Wykorzystałeś większość dziennego budżetu. Rozważ lżejszą kolację.',
    },
  },
  weekly_report: {
    en: {
      title: 'Your weekly report is ready 📊',
      body: 'Check out your nutrition summary and DQI-I score for this week!',
    },
    pl: {
      title: 'Twój raport tygodniowy jest gotowy 📊',
      body: 'Sprawdź podsumowanie żywienia i wynik DQI-I za ten tydzień!',
    },
  },
};

function isTypeAllowed(type: string, prefs: NotificationPrefs): boolean {
  if (!prefs.enabled) return false;

  switch (type) {
    case 'meal_reminder':
    case 'meal_reminder_check':
      return prefs.meal_reminders;
    case 'streak_check':
      return prefs.streak_alerts;
    case 'budget_alert':
      return prefs.nudges;
    case 'weekly_report':
      return prefs.weekly_report;
    case 'system':
      return true;
    default:
      return prefs.nudges;
  }
}

function isInQuietHours(prefs: NotificationPrefs): boolean {
  if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) return false;

  const now = new Date();
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const startParts = prefs.quiet_hours_start.split(':').map(Number);
  const endParts = prefs.quiet_hours_end.split(':').map(Number);
  const startMinutes = (startParts[0] ?? 0) * 60 + (startParts[1] ?? 0);
  const endMinutes = (endParts[0] ?? 0) * 60 + (endParts[1] ?? 0);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

async function getFcmAccessToken(): Promise<string> {
  const saBase64 = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!saBase64) throw new Error('FCM_SERVICE_ACCOUNT_JSON not configured');

  const sa = JSON.parse(atob(saBase64));
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );

  const encoder = new TextEncoder();
  const signingInput = encoder.encode(`${header}.${payload}`);

  const pemContent = sa.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(pemContent), (c: string) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, signingInput);
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${header}.${payload}.${sig}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get FCM access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token as string;
}

async function sendFcmMessage(
  projectId: string,
  accessToken: string,
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<boolean> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const message: Record<string, unknown> = {
    message: {
      token: fcmToken,
      notification: { title, body },
      data: data ?? {},
      android: {
        priority: 'high',
        notification: { channel_id: 'snacky_notifications' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    log.error('FCM send failed', { status: response.status, error: errorBody, fcmToken });
    return false;
  }

  return true;
}

async function handleBatchNotification(
  supabase: ReturnType<typeof createServiceClient>,
  type: string,
): Promise<Response> {
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('id, locale, notification_prefs, timezone');

  if (usersError || !users) {
    log.error('Failed to fetch users for batch', { error: usersError?.message });
    return internalError('Failed to fetch users');
  }

  let sentCount = 0;
  let skippedCount = 0;

  let accessToken: string | null = null;
  let projectId: string | null = null;

  try {
    accessToken = await getFcmAccessToken();
    const saBase64 = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
    if (saBase64) {
      const sa = JSON.parse(atob(saBase64));
      projectId = sa.project_id as string;
    }
  } catch (err) {
    log.error('Failed to get FCM credentials', { error: String(err) });
    return internalError('FCM credentials not configured');
  }

  if (!projectId || !accessToken) {
    return internalError('FCM not configured');
  }

  for (const user of users as UserRow[]) {
    const prefs: NotificationPrefs = { ...DEFAULT_PREFS, ...(user.notification_prefs ?? {}) };

    if (!isTypeAllowed(type, prefs) || isInQuietHours(prefs)) {
      skippedCount++;
      continue;
    }

    if (type === 'streak_check') {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('meals')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('logged_at', `${today}T00:00:00Z`);

      if ((count ?? 0) > 0) {
        skippedCount++;
        continue;
      }
    }

    const { data: devices } = await supabase
      .from('user_devices')
      .select('fcm_token, platform')
      .eq('user_id', user.id);

    if (!devices || devices.length === 0) {
      skippedCount++;
      continue;
    }

    const locale = user.locale ?? 'en';
    const templateKey = type === 'meal_reminder_check' ? 'meal_reminder' : type;
    const template = TEMPLATES[templateKey]?.[locale] ?? TEMPLATES[templateKey]?.en;

    if (!template) {
      skippedCount++;
      continue;
    }

    for (const device of devices as DeviceRow[]) {
      const sent = await sendFcmMessage(
        projectId,
        accessToken,
        device.fcm_token,
        template.title,
        template.body,
        { type },
      );

      if (sent) sentCount++;
    }

    await supabase.from('notification_log').insert({
      user_id: user.id,
      type,
      title: template.title,
      body: template.body,
      data: {},
    });
  }

  const result = { status: 'dispatched', type, sent: sentCount, skipped: skippedCount };
  log.info('Batch notification complete', result);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleDirectNotification(
  supabase: ReturnType<typeof createServiceClient>,
  payload: NotificationPayload,
): Promise<Response> {
  const { user_id: userId, type, data } = payload;

  if (!userId || !type) {
    return badRequest('Missing required fields: user_id, type');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, locale, notification_prefs, timezone')
    .eq('id', userId)
    .single();

  if (!profile) {
    return badRequest('User not found');
  }

  const user = profile as UserRow;
  const prefs: NotificationPrefs = { ...DEFAULT_PREFS, ...(user.notification_prefs ?? {}) };

  if (!isTypeAllowed(type, prefs) || isInQuietHours(prefs)) {
    return new Response(
      JSON.stringify({ status: 'skipped', reason: 'preference_or_quiet_hours' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const locale = user.locale ?? 'en';
  const title = payload.title ?? TEMPLATES[type]?.[locale]?.title ?? TEMPLATES[type]?.en?.title ?? type;
  const body = payload.body ?? TEMPLATES[type]?.[locale]?.body ?? TEMPLATES[type]?.en?.body ?? '';

  const { data: devices } = await supabase
    .from('user_devices')
    .select('fcm_token, platform')
    .eq('user_id', userId);

  let sentCount = 0;

  if (devices && devices.length > 0) {
    try {
      const accessToken = await getFcmAccessToken();
      const saBase64 = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
      const sa = JSON.parse(atob(saBase64!));
      const projectId = sa.project_id as string;

      for (const device of devices as DeviceRow[]) {
        const sent = await sendFcmMessage(projectId, accessToken, device.fcm_token, title, body, {
          type,
          ...(data as Record<string, string> | undefined),
        });
        if (sent) sentCount++;
      }
    } catch (err) {
      log.error('FCM dispatch failed', { error: String(err) });
    }
  }

  const { error: logError } = await supabase.from('notification_log').insert({
    user_id: userId,
    type,
    title,
    body,
    data: data ?? {},
  });

  if (logError) {
    log.error('Failed to log notification', { error: logError.message });
  }

  const result = {
    status: sentCount > 0 ? 'sent' : 'logged',
    user_id: userId,
    type,
    devices_notified: sentCount,
  };

  log.info('Direct notification dispatched', result);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return badRequest('Only POST requests are accepted');
  }

  log.info('Notification dispatch triggered');

  try {
    const body = (await req.json()) as NotificationPayload;
    const supabase = createServiceClient();

    const batchTypes = ['streak_check', 'weekly_report', 'meal_reminder_check'];
    if (batchTypes.includes(body.type) && !body.user_id) {
      return await handleBatchNotification(supabase, body.type);
    }

    return await handleDirectNotification(supabase, body);
  } catch (err) {
    log.error('Notification dispatch failed', { error: String(err) });
    return internalError('Failed to send notification');
  }
});
