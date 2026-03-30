import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '~/app/providers/AuthProvider';
import { useTheme } from '~/app/providers/ThemeProvider';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { SettingsScreen } from '~/features/settings/screens/SettingsScreen';
import { MealTimelineScreen } from '~/features/meals/screens/MealTimelineScreen';
import { MealDetailScreen } from '~/features/meals/screens/MealDetailScreen';
import { MealEditScreen } from '~/features/meals/screens/MealEditScreen';
import { ManualMealEntryScreen } from '~/features/meals/screens/ManualMealEntryScreen';
import { MealPhotoGalleryScreen } from '~/features/meals/screens/MealPhotoGalleryScreen';
import { MealPhotoDetailScreen } from '~/features/meals/screens/MealPhotoDetailScreen';
import { MeasurementInputScreen } from '~/features/progress/screens/MeasurementInputScreen';
import { MeasurementListScreen } from '~/features/progress/screens/MeasurementListScreen';
import { PlanConfigWizardScreen } from '~/features/diet-plan/screens/PlanConfigWizardScreen';
import { PlanCalendarScreen } from '~/features/diet-plan/screens/PlanCalendarScreen';
import { RecipeDetailScreen } from '~/features/diet-plan/screens/RecipeDetailScreen';
import { ShoppingListScreen } from '~/features/diet-plan/screens/ShoppingListScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const LoadingScreen = () => (
  <View
    style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9F9F9' }}
  >
    <ActivityIndicator size="large" color="#006E1C" />
  </View>
);

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, hasCompletedOnboarding } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{ animationTypeForReplace: 'pop' }}
          />
        ) : !hasCompletedOnboarding ? (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingNavigator}
            options={{ animation: 'fade' }}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="MealTimeline"
              component={MealTimelineScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="MealDetail"
              component={MealDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="MealEdit"
              component={MealEditScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ManualMealEntry"
              component={ManualMealEntryScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="MealPhotoGallery"
              component={MealPhotoGalleryScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="MealPhotoDetail"
              component={MealPhotoDetailScreen}
              options={{
                animation: 'fade',
                presentation: 'transparentModal',
              }}
            />
            <Stack.Screen
              name="MeasurementInput"
              component={MeasurementInputScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="MeasurementList"
              component={MeasurementListScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="PlanWizard"
              component={PlanConfigWizardScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="PlanCalendar"
              component={PlanCalendarScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="RecipeDetail"
              component={RecipeDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ShoppingList"
              component={ShoppingListScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
