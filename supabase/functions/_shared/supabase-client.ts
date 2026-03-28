import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

export const createServiceClient = (): SupabaseClient => {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
};

export const createUserClient = (authHeader: string): SupabaseClient => {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
};
