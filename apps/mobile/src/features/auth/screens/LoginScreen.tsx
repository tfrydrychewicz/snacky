import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
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
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        <Animated.View
          entering={FadeIn.duration(600)}
          style={{ alignItems: 'center', marginBottom: 48 }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              backgroundColor: '#4CAF50',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              shadowColor: '#4CAF50',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <Text style={{ fontSize: 44 }}>🥗</Text>
          </View>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: '#212121',
              textAlign: 'center',
            }}
          >
            {t('auth.login.title')}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: '#757575',
              textAlign: 'center',
              marginTop: 8,
              lineHeight: 24,
              paddingHorizontal: 16,
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
              backgroundColor: '#FFFFFF',
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E0E0E0',
              opacity: pressed ? 0.8 : 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            })}
          >
            {isSigningIn ? (
              <ActivityIndicator size="small" color="#4CAF50" />
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
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#212121',
                  }}
                >
                  {t('auth.login.continueWithGoogle')}
                </Text>
              </>
            )}
          </Pressable>

          {error && (
            <Animated.View entering={FadeIn.duration(300)} style={{ marginTop: 16 }}>
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 14,
                  color: '#F44336',
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
          paddingHorizontal: 32,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: '#9E9E9E',
            lineHeight: 18,
          }}
        >
          {t('auth.login.termsNotice')}
        </Text>
      </Animated.View>
    </View>
  );
};
