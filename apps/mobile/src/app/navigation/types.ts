import type { IngredientAnalysis, MealScanResult, MealType } from '@snacky/shared-types';
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

export interface BarcodeProduct {
  name: string;
  brand: string | null;
  quantity: string | null;
  serving_size: string | null;
  serving_g: number | null;
  image_url: string | null;
  nova_group: 1 | 2 | 3 | 4 | null;
  nutriscore: string | null;
  per_100g: {
    calories_kcal: number;
    protein_g: number;
    carbohydrates_g: number;
    fat_g: number;
    fiber_g: number | null;
    sugar_g: number | null;
    sodium_mg: number | null;
    saturated_fat_g: number | null;
  };
}

export type ScannerStackParamList = {
  Capture: undefined;
  Results: {
    scanResult: MealScanResult;
    photoUris: string[];
    mealType: MealType;
  };
  BarcodeResult: {
    product: BarcodeProduct;
    barcode: string;
    mealType: MealType;
  };
  IngredientDetail: {
    ingredient: IngredientAnalysis;
  };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
