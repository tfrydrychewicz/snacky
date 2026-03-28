import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { useTranslation } from 'react-i18next';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '~/app/providers/AuthProvider';

export const LoginScreen = () => {
  const { t } = useTranslation('auth');
  const { signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('auth.login.error.generic');
      setError(message);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View
      className="flex-1 bg-surface-background"
      style={{ paddingBottom: insets.bottom + 16 }}
    >
      <View className="flex-1 items-center justify-center px-lg">
        <Animated.View entering={FadeIn.duration(600)} className="mb-2xl items-center">
          <View className="mb-lg h-20 w-20 items-center justify-center rounded-2xl bg-primary">
            <Text className="text-4xl">🥗</Text>
          </View>
          <Text className="text-heading-1 text-text-primary">
            {t('auth.login.title')}
          </Text>
          <Text className="mt-sm text-center text-body-lg text-text-secondary">
            {t('auth.login.subtitle')}
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(600)}
          className="w-full"
        >
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full flex-row items-center justify-center rounded-button bg-white px-lg py-md shadow-sm active:opacity-80"
            style={{
              borderWidth: 1,
              borderColor: '#E0E0E0',
            }}
          >
            {isSigningIn ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <>
                <Text className="mr-sm text-xl">G</Text>
                <Text className="text-body-lg font-semibold text-text-primary">
                  {t('auth.login.continueWithGoogle')}
                </Text>
              </>
            )}
          </Pressable>

          {error && (
            <Animated.View entering={FadeIn.duration(300)} className="mt-md">
              <Text className="text-center text-body-sm text-semantic-fat">
                {error}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeIn.delay(600).duration(600)}
        className="items-center px-lg"
      >
        <Text className="text-center text-body-sm text-text-secondary">
          {t('auth.login.termsNotice')}
        </Text>
      </Animated.View>
    </View>
  );
};
