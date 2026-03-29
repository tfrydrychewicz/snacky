import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { ThemeProvider } from './providers/ThemeProvider';
import { AuthProvider } from './providers/AuthProvider';
import { NotificationProvider } from './providers/NotificationProvider';
import { QueryProvider } from './providers/QueryProvider';
import { RootNavigator } from './navigation/RootNavigator';

export const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <GluestackUIProvider config={config} colorMode={isDarkMode ? 'dark' : 'light'}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <QueryProvider>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <RootNavigator />
              </QueryProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
};
