import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '~/features/auth/screens/WelcomeScreen';
import { LoginScreen } from '~/features/auth/screens/LoginScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);
