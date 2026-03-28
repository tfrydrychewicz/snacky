import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseClientOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  persistSession?: boolean;
  storageAdapter?: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  };
}

let instance: SupabaseClient | null = null;

export const createSupabaseClient = (options: SupabaseClientOptions): SupabaseClient => {
  if (instance) return instance;

  instance = createClient(options.supabaseUrl, options.supabaseAnonKey, {
    auth: {
      persistSession: options.persistSession ?? true,
      ...(options.storageAdapter && { storage: options.storageAdapter }),
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    realtime: {
      autoConnect: false,
    },
  });

  return instance;
};
