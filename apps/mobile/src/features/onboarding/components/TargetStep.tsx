import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Controller } from 'react-hook-form';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import type { StepFormProps } from './types';
import { StepContainer } from './StepContainer';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

type TargetStepProps = StepFormProps;

export const TargetStep = ({ form }: TargetStepProps) => {
  const { t } = useTranslation('onboarding');
  const { control, watch } = form;
  const currentWeight = watch('weightKg');
  const goalWeight = watch('goalWeightKg');
  const timeline = watch('goalTimelineWeeks');

  const diff = goalWeight - currentWeight;
  const weeklyRate = timeline > 0 ? Math.abs(diff / timeline) : 0;
  const isSafe = weeklyRate <= 1.0;

  const barStyle = useAnimatedStyle(() => {
    const pct = Math.min(timeline / 52, 1) * 100;
    return {
      width: withSpring(`${pct}%`, { damping: 20, stiffness: 120 }),
    };
  });

  return (
    <StepContainer stepKey="target" title={t('target.title')} subtitle={t('target.subtitle')}>
      <View style={{ gap: spacing.lg }}>
        <View>
          <Text
            style={{ ...typography.labelLg, color: colors.onSurface, marginBottom: spacing.xs }}
          >
            {t('target.goalWeight')}
          </Text>
          <Controller
            control={control}
            name="goalWeightKg"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={{
                  ...typography.bodyLg,
                  color: colors.onSurface,
                  backgroundColor: colors.surfaceContainerLow,
                  borderRadius: radii.sm,
                  borderWidth: 1,
                  borderColor: colors.outlineVariant,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm + 4,
                }}
                value={value ? String(value) : ''}
                onChangeText={(text) => {
                  const num = parseFloat(text);
                  if (!isNaN(num)) onChange(num);
                  else if (text === '') onChange(0);
                }}
                keyboardType="numeric"
              />
            )}
          />
          {diff !== 0 && (
            <Text
              style={{
                ...typography.bodySm,
                color: isSafe ? colors.onSurfaceVariant : colors.error,
                marginTop: spacing.xs,
              }}
            >
              {diff > 0 ? '+' : ''}
              {diff.toFixed(1)} kg ({weeklyRate.toFixed(2)} kg/week)
            </Text>
          )}
        </View>

        <View>
          <Text
            style={{ ...typography.labelLg, color: colors.onSurface, marginBottom: spacing.xs }}
          >
            {t('target.timeline')}
          </Text>
          <Controller
            control={control}
            name="goalTimelineWeeks"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={{
                  ...typography.bodyLg,
                  color: colors.onSurface,
                  backgroundColor: colors.surfaceContainerLow,
                  borderRadius: radii.sm,
                  borderWidth: 1,
                  borderColor: colors.outlineVariant,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm + 4,
                }}
                value={value ? String(value) : ''}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num)) onChange(num);
                  else if (text === '') onChange(0);
                }}
                keyboardType="numeric"
              />
            )}
          />
          {timeline > 0 && (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant }}>
                {t('target.timelineHint', {
                  weeks: timeline,
                  months: (timeline / 4.33).toFixed(1),
                })}
              </Text>
              <View
                style={{
                  height: 4,
                  backgroundColor: colors.surfaceContainerHigh,
                  borderRadius: radii.full,
                  marginTop: spacing.xs,
                  overflow: 'hidden',
                }}
              >
                <Animated.View
                  style={[
                    {
                      height: '100%',
                      backgroundColor: isSafe ? colors.primary : colors.error,
                      borderRadius: radii.full,
                    },
                    barStyle,
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </StepContainer>
  );
};
