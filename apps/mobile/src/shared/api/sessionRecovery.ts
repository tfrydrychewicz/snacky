import { Alert } from 'react-native';
import { getSupabase } from './client';

/**
 * Attempts to refresh the auth session.
 * Returns true if a valid session was recovered, false otherwise.
 */
export async function tryRefreshSession(): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.refreshSession();

  if (error || !data.session) {
    console.warn('[SessionRecovery] Refresh failed:', error?.message ?? 'no session');
    return false;
  }

  console.log('[SessionRecovery] Session refreshed successfully');
  return true;
}

const REFRESH_MARGIN_S = 120;

/**
 * Ensures the current session has a valid, non-expired access token.
 * Proactively refreshes if the token expires within REFRESH_MARGIN_S seconds.
 * Also validates the token server-side via getUser().
 * Returns the valid access_token or null if unauthenticated.
 */
export async function ensureValidSession(): Promise<string | null> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    console.warn('[SessionRecovery] No session found');
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? 0;
  const ttl = expiresAt - nowSec;

  console.log('[SessionRecovery] Session check:', {
    hasToken: !!session.access_token,
    tokenPrefix: session.access_token?.slice(0, 20),
    expiresAt,
    ttlSeconds: ttl,
    userId: session.user?.id,
  });

  if (ttl < REFRESH_MARGIN_S) {
    console.log('[SessionRecovery] Token expiring soon, refreshing…');
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      console.warn('[SessionRecovery] Proactive refresh failed:', error?.message);
      return null;
    }
    return data.session.access_token;
  }

  const { error: verifyError } = await supabase.auth.getUser(session.access_token);
  if (verifyError) {
    console.warn('[SessionRecovery] Token verification failed:', verifyError.message);
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !data.session) {
      console.warn('[SessionRecovery] Refresh after verify failure also failed');
      return null;
    }
    return data.session.access_token;
  }

  return session.access_token;
}

/**
 * Returns true if the error looks like an expired/invalid JWT from the
 * Supabase gateway, relay, or Edge Function runtime.
 *
 * The SDK's FunctionsRelayError has a generic message, so we also check
 * the error name/constructor and try to read the response context.
 */
export function isJwtError(error: unknown): boolean {
  if (!error) return false;

  const err = error as Record<string, unknown>;
  const name = (err.name as string) ?? '';
  const msg = typeof error === 'string' ? error : ((error as Error)?.message ?? '');

  if (name === 'FunctionsRelayError') return true;

  return (
    msg.includes('Invalid JWT') ||
    msg.includes('JWT expired') ||
    msg.includes('invalid claim') ||
    msg.includes('token is expired')
  );
}
