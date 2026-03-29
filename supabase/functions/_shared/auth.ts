import { createUserClient } from './supabase-client.ts';
import { unauthorized } from './errors.ts';

/**
 * Extract and verify the user.
 *
 * Supports two modes:
 * 1. Standard: user JWT in the Authorization header (HS256 tokens)
 * 2. Relay bypass: anon key in Authorization (passes HS256 relay check),
 *    real user JWT in the x-user-token header (ES256 tokens that the
 *    relay cannot verify yet).
 */
export const getAuthenticatedUser = async (req: Request) => {
  const userTokenHeader = req.headers.get('x-user-token');
  const authHeader = req.headers.get('Authorization');

  const token = userTokenHeader ?? authHeader?.replace('Bearer ', '');

  if (!token) {
    return { user: null, error: unauthorized() };
  }

  const supabase = createUserClient(`Bearer ${token}`);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: unauthorized('Invalid or expired token') };
  }

  return { user, error: null, supabase };
};
