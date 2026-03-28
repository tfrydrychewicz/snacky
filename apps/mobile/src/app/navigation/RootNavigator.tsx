import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '~/app/providers/AuthProvider';
import { AuthNavigator } from './AuthNavigator';
import { PlaceholderScreen } from '~/shared/components/PlaceholderScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const LoadingScreen = () => (
  <View className="flex-1 items-center justify-center bg-surface-background">
    <ActivityIndicator size="large" color="#4CAF50" />
  </View>
);

export const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={PlaceholderScreen} />
        ) : (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{ animationTypeForReplace: 'pop' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
