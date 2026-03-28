import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '~/app/providers/AuthProvider';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';

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
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
        }}
      >
        <Animated.View
          entering={FadeIn.duration(600)}
          style={{ alignItems: 'center', marginBottom: spacing['2xl'] }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
              ...elevation.ambient,
            }}
          >
            <Text style={{ fontSize: 44 }}>🥗</Text>
          </View>
          <Text
            style={{
              ...typography.headlineLg,
              fontWeight: '800',
              fontStyle: 'italic',
              color: colors.primary,
              textAlign: 'center',
              marginBottom: spacing.sm,
            }}
          >
            Snacky
          </Text>
          <Text
            style={{
              ...typography.bodyLg,
              color: colors.onSurfaceVariant,
              textAlign: 'center',
              lineHeight: 24,
              paddingHorizontal: spacing.md,
            }}
          >
            {t('auth.login.subtitle')}
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(600)}
          style={{ width: '100%' }}
        >
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={isSigningIn}
            style={({ pressed }) => ({
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceContainerLowest,
              paddingVertical: 16,
              paddingHorizontal: spacing.lg,
              borderRadius: radii.full,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
              ...elevation.ambient,
            })}
          >
            {isSigningIn ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: '#4285F4',
                    marginRight: 12,
                  }}
                >
                  G
                </Text>
                <Text
                  style={{
                    ...typography.titleMd,
                    fontWeight: '700',
                    color: colors.onSurface,
                  }}
                >
                  {t('auth.login.continueWithGoogle')}
                </Text>
              </>
            )}
          </Pressable>

          {error && (
            <Animated.View entering={FadeIn.duration(300)} style={{ marginTop: spacing.md }}>
              <Text
                style={{
                  textAlign: 'center',
                  ...typography.bodyMd,
                  color: colors.error,
                }}
              >
                {error}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeIn.delay(600).duration(600)}
        style={{
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.lg,
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            ...typography.bodySm,
            color: colors.outline,
            lineHeight: 18,
          }}
        >
          {t('auth.login.termsNotice')}
        </Text>
      </Animated.View>
    </View>
  );
};
