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

/**
 * Returns true if the error looks like an expired/invalid JWT from the
 * Supabase gateway or Edge Function runtime.
 */
export function isJwtError(error: unknown): boolean {
  const msg = typeof error === 'string' ? error : (error as Error)?.message ?? '';
  return (
    msg.includes('Invalid JWT') ||
    msg.includes('JWT expired') ||
    msg.includes('invalid claim') ||
    msg.includes('token is expired')
  );
}
