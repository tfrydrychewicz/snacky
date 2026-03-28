import React from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { colors, spacing, typography } from '~/shared/theme/tokens';

interface StepContainerProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  stepKey: string;
}

export const StepContainer = ({ title, subtitle, children, stepKey }: StepContainerProps) => (
  <Animated.View
    key={stepKey}
    entering={FadeInRight.duration(300).springify()}
    exiting={FadeOutLeft.duration(200)}
    style={{ flex: 1 }}
  >
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ marginBottom: spacing.xl }}>
        <Text
          style={{ ...typography.headlineLg, color: colors.onSurface, marginBottom: spacing.xs }}
        >
          {title}
        </Text>
        <Text style={{ ...typography.bodyLg, color: colors.onSurfaceVariant }}>{subtitle}</Text>
      </View>
      {children}
    </ScrollView>
  </Animated.View>
);
