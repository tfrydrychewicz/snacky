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
 * Returns the valid access_token or null if unauthenticated.
 */
export async function ensureValidSession(): Promise<string | null> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? 0;

  if (expiresAt - nowSec < REFRESH_MARGIN_S) {
    console.log('[SessionRecovery] Token expiring soon, refreshing…');
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      console.warn('[SessionRecovery] Proactive refresh failed:', error?.message);
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
