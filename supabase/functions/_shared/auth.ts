import { createUserClient } from './supabase-client.ts';
import { unauthorized } from './errors.ts';

/**
 * Extract and verify the user from the Authorization header.
 * Returns the authenticated user or an error Response.
 */
export const getAuthenticatedUser = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, error: unauthorized() };
  }

  const supabase = createUserClient(authHeader);
  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: unauthorized('Invalid or expired token') };
  }

  return { user, error: null, supabase };
};
