import type enCommon from './en/common.json';
import type enAuth from './en/auth.json';
import type enOnboarding from './en/onboarding.json';
import type enScanner from './en/scanner.json';
import type enMeals from './en/meals.json';
import type enDietPlan from './en/dietPlan.json';
import type enChat from './en/chat.json';
import type enProgress from './en/progress.json';
import type enDashboard from './en/dashboard.json';
import type enNotifications from './en/notifications.json';
import type enSettings from './en/settings.json';

interface TranslationResources {
  common: typeof enCommon;
  auth: typeof enAuth;
  onboarding: typeof enOnboarding;
  scanner: typeof enScanner;
  meals: typeof enMeals;
  dietPlan: typeof enDietPlan;
  chat: typeof enChat;
  progress: typeof enProgress;
  dashboard: typeof enDashboard;
  notifications: typeof enNotifications;
  settings: typeof enSettings;
}

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: TranslationResources;
  }
}
