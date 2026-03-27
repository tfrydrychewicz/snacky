import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import 'intl-pluralrules';

import enCommon from './en/common.json';
import enAuth from './en/auth.json';
import enOnboarding from './en/onboarding.json';
import enScanner from './en/scanner.json';
import enMeals from './en/meals.json';
import enDietPlan from './en/dietPlan.json';
import enChat from './en/chat.json';
import enProgress from './en/progress.json';
import enDashboard from './en/dashboard.json';
import enNotifications from './en/notifications.json';
import enSettings from './en/settings.json';

import plCommon from './pl/common.json';
import plAuth from './pl/auth.json';
import plOnboarding from './pl/onboarding.json';
import plScanner from './pl/scanner.json';
import plMeals from './pl/meals.json';
import plDietPlan from './pl/dietPlan.json';
import plChat from './pl/chat.json';
import plProgress from './pl/progress.json';
import plDashboard from './pl/dashboard.json';
import plNotifications from './pl/notifications.json';
import plSettings from './pl/settings.json';

export const SUPPORTED_LOCALES = ['pl', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const NAMESPACES = [
  'common',
  'auth',
  'onboarding',
  'scanner',
  'meals',
  'dietPlan',
  'chat',
  'progress',
  'dashboard',
  'notifications',
  'settings',
] as const;

export type TranslationNamespace = (typeof NAMESPACES)[number];

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    onboarding: enOnboarding,
    scanner: enScanner,
    meals: enMeals,
    dietPlan: enDietPlan,
    chat: enChat,
    progress: enProgress,
    dashboard: enDashboard,
    notifications: enNotifications,
    settings: enSettings,
  },
  pl: {
    common: plCommon,
    auth: plAuth,
    onboarding: plOnboarding,
    scanner: plScanner,
    meals: plMeals,
    dietPlan: plDietPlan,
    chat: plChat,
    progress: plProgress,
    dashboard: plDashboard,
    notifications: plNotifications,
    settings: plSettings,
  },
} as const;

const getDeviceLocale = (): SupportedLocale => {
  const locales = RNLocalize.getLocales();
  const deviceLang = locales[0]?.languageCode;

  if (deviceLang && SUPPORTED_LOCALES.includes(deviceLang as SupportedLocale)) {
    return deviceLang as SupportedLocale;
  }
  return 'en';
};

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLocale(),
  fallbackLng: 'en',
  ns: [...NAMESPACES],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  compatibilityJSON: 'v4',
});

export default i18n;
