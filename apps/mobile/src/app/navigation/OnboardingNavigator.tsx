import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '~/features/onboarding/screens/OnboardingScreen';
import { OnboardingCompleteScreen } from '~/features/onboarding/screens/OnboardingCompleteScreen';
import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
    <Stack.Screen name="Steps" component={OnboardingScreen} />
    <Stack.Screen name="Complete" component={OnboardingCompleteScreen} />
  </Stack.Navigator>
);
