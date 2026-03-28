import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '~/app/navigation/types';
import { colors, typography } from '~/shared/theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const ANIM_MS = 800;
const STAGGER = 250;

export const WelcomeScreen = ({ navigation }: Props) => {
  const { t } = useTranslation('auth');

  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(24);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(24);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);

    logoScale.value = withTiming(1, { duration: ANIM_MS, easing: ease });
    logoOpacity.value = withTiming(1, { duration: ANIM_MS, easing: ease });

    titleOpacity.value = withDelay(STAGGER, withTiming(1, { duration: ANIM_MS, easing: ease }));
    titleY.value = withDelay(STAGGER, withTiming(0, { duration: ANIM_MS, easing: ease }));

    subtitleOpacity.value = withDelay(STAGGER * 2, withTiming(1, { duration: ANIM_MS, easing: ease }));
    subtitleY.value = withDelay(STAGGER * 2, withTiming(0, { duration: ANIM_MS, easing: ease }));

    const timer = setTimeout(() => navigation.replace('Login'), 2800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          logoStyle,
          {
            width: 100,
            height: 100,
            borderRadius: 28,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          },
        ]}
      >
        <Text style={{ fontSize: 52 }}>🥗</Text>
      </Animated.View>

      <Animated.View style={titleStyle}>
        <Text
          style={{
            ...typography.displaySm,
            fontStyle: 'italic',
            color: colors.onPrimary,
            textAlign: 'center',
          }}
        >
          {t('auth.welcome.title')}
        </Text>
      </Animated.View>

      <Animated.View style={subtitleStyle}>
        <Text
          style={{
            ...typography.bodyLg,
            color: 'rgba(255,255,255,0.85)',
            textAlign: 'center',
            marginTop: 8,
            paddingHorizontal: 32,
          }}
        >
          {t('auth.welcome.subtitle')}
        </Text>
      </Animated.View>
    </View>
  );
};
