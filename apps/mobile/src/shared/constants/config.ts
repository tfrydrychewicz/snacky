import Config from 'react-native-config';

export const APP_CONFIG = {
  supabaseUrl: Config.SUPABASE_URL ?? '',
  supabaseAnonKey: Config.SUPABASE_ANON_KEY ?? '',
  defaultLocale: 'en' as const,
  supportedLocales: ['pl', 'en'] as const,
  maxImageSizeMb: 10,
  queryStaleTimeMs: 5 * 60 * 1000,
} as const;
