import type { MealScanResult, MealType } from '@snacky/shared-types';
import type { PlanConfig } from '~/features/diet-plan/types';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
  Settings: undefined;
  MealTimeline: undefined;
  MealDetail: { mealId: string };
  MealEdit: { mealId: string };
  ManualMealEntry: undefined;
  MealPhotoGallery: undefined;
  MealPhotoDetail: { mealId: string; imageKey: string; imageKeys?: string[] };
  MeasurementInput: { quickWeight?: boolean } | undefined;
  MeasurementList: undefined;
  PlanWizard: undefined;
  PlanCalendar: { planId?: string; config?: PlanConfig };
  RecipeDetail: { planId: string; mealId: string };
  ShoppingList: { planId: string };
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
};

export type OnboardingStackParamList = {
  Steps: undefined;
  Complete: {
    tdee: number;
    targetKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
};

export type ScannerStackParamList = {
  Capture: undefined;
  Results: {
    scanResult: MealScanResult;
    photoUris: string[];
    mealType: MealType;
  };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
