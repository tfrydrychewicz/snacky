import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '~/app/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const ANIMATION_DURATION = 800;
const STAGGER_DELAY = 200;

export const WelcomeScreen = ({ navigation }: Props) => {
  const { t } = useTranslation('auth');

  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);

  const navigateToLogin = () => {
    navigation.replace('Login');
  };

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);

    logoScale.value = withTiming(1, { duration: ANIMATION_DURATION, easing });
    logoOpacity.value = withTiming(1, { duration: ANIMATION_DURATION, easing });

    titleOpacity.value = withDelay(
      STAGGER_DELAY,
      withTiming(1, { duration: ANIMATION_DURATION, easing }),
    );
    titleTranslateY.value = withDelay(
      STAGGER_DELAY,
      withTiming(0, { duration: ANIMATION_DURATION, easing }),
    );

    subtitleOpacity.value = withDelay(
      STAGGER_DELAY * 2,
      withTiming(1, { duration: ANIMATION_DURATION, easing }),
    );
    subtitleTranslateY.value = withDelay(
      STAGGER_DELAY * 2,
      withSequence(
        withTiming(0, { duration: ANIMATION_DURATION, easing }),
        withDelay(1000, withTiming(0, { duration: 1 })),
      ),
    );

    const timer = setTimeout(() => {
      runOnJS(navigateToLogin)();
    }, ANIMATION_DURATION + STAGGER_DELAY * 2 + 1500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  return (
    <View className="flex-1 items-center justify-center bg-primary">
      <Animated.View style={logoStyle} className="mb-lg">
        <View className="h-24 w-24 items-center justify-center rounded-3xl bg-white/20">
          <Text className="text-5xl">🥗</Text>
        </View>
      </Animated.View>

      <Animated.View style={titleStyle}>
        <Text className="text-heading-1 text-white">{t('auth.welcome.title')}</Text>
      </Animated.View>

      <Animated.View style={subtitleStyle}>
        <Text className="mt-sm text-body-lg text-white/80">{t('auth.welcome.subtitle')}</Text>
      </Animated.View>
    </View>
  );
};
