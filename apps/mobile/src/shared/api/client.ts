import { createSupabaseClient } from '@snacky/api-client';
import Config from 'react-native-config';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'supabase-storage' });

const mmkvAdapter = {
  getItem: (key: string) => Promise.resolve(storage.getString(key) ?? null),
  setItem: (key: string, value: string) => {
    storage.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    storage.delete(key);
    return Promise.resolve();
  },
};

let _supabase: ReturnType<typeof createSupabaseClient> | null = null;

export const getSupabase = () => {
  if (!_supabase) {
    _supabase = createSupabaseClient({
      supabaseUrl: Config.SUPABASE_URL ?? '',
      supabaseAnonKey: Config.SUPABASE_ANON_KEY ?? '',
      persistSession: true,
      storageAdapter: mmkvAdapter,
    });
  }
  return _supabase;
};
