import React from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

interface StepProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export const StepProgressBar = ({ currentStep, totalSteps }: StepProgressBarProps) => {
  const { t } = useTranslation('onboarding');

  const animatedWidth = useAnimatedStyle(() => ({
    width: withSpring(`${((currentStep + 1) / totalSteps) * 100}%`, {
      damping: 20,
      stiffness: 120,
    }),
  }));

  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
      <Text
        style={{ ...typography.labelMd, color: colors.onSurfaceVariant, marginBottom: spacing.sm }}
      >
        {t('step', { current: currentStep + 1, total: totalSteps })}
      </Text>
      <View
        style={{
          height: 4,
          backgroundColor: colors.surfaceContainerHigh,
          borderRadius: radii.full,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              backgroundColor: colors.primary,
              borderRadius: radii.full,
            },
            animatedWidth,
          ]}
        />
      </View>
    </View>
  );
};
