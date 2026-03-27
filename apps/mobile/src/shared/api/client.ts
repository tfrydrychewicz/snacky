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

export const supabase = createSupabaseClient({
  supabaseUrl: Config.SUPABASE_URL ?? '',
  supabaseAnonKey: Config.SUPABASE_ANON_KEY ?? '',
  persistSession: true,
  storageAdapter: mmkvAdapter,
});
