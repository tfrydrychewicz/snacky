import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Controller } from 'react-hook-form';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { eatingTriggerOptions, snackingPatternOptions } from '../schemas/onboarding';
import type { StepFormProps } from './types';
import { StepContainer } from './StepContainer';
import { SelectionChip } from './SelectionChip';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

type PsychoBehavioralStepProps = StepFormProps;

const CFC_STEPS = [1, 2, 3, 4, 5] as const;

export const PsychoBehavioralStep = ({ form }: PsychoBehavioralStepProps) => {
  const { t } = useTranslation('onboarding');
  const { control, watch } = form;
  const selectedPattern = watch('snackingPattern');
  const cfcValue = watch('cfcScore');

  const trackStyle = useAnimatedStyle(() => ({
    width: withSpring(`${((cfcValue - 1) / 4) * 100}%`, { damping: 20, stiffness: 120 }),
  }));

  return (
    <StepContainer stepKey="psycho" title={t('psycho.title')} subtitle={t('psycho.subtitle')}>
      <View style={{ gap: spacing.xl }}>
        <View>
          <Text
            style={{ ...typography.labelLg, color: colors.onSurface, marginBottom: spacing.sm }}
          >
            {t('psycho.triggers')}
          </Text>
          <Controller
            control={control}
            name="eatingTriggers"
            render={({ field: { onChange, value } }) => (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {eatingTriggerOptions.map((trigger) => {
                  const isSelected = value.includes(trigger);
                  return (
                    <SelectionChip
                      key={trigger}
                      label={t(`psycho.${trigger}`)}
                      selected={isSelected}
                      onPress={() => {
                        onChange(
                          isSelected ? value.filter((v) => v !== trigger) : [...value, trigger],
                        );
                      }}
                    />
                  );
                })}
              </View>
            )}
          />
        </View>

        <View>
          <Text
            style={{ ...typography.labelLg, color: colors.onSurface, marginBottom: spacing.sm }}
          >
            {t('psycho.snacking')}
          </Text>
          <Controller
            control={control}
            name="snackingPattern"
            render={({ field: { onChange } }) => (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {snackingPatternOptions.map((pattern) => (
                  <Pressable
                    key={pattern}
                    onPress={() => {
                      onChange(pattern);
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: spacing.md,
                      borderRadius: radii.sm,
                      borderWidth: 1.5,
                      borderColor:
                        selectedPattern === pattern ? colors.primary : colors.outlineVariant,
                      backgroundColor:
                        selectedPattern === pattern
                          ? colors.primaryFixed
                          : colors.surfaceContainerLowest,
                      alignItems: 'center',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        ...typography.labelMd,
                        color:
                          selectedPattern === pattern
                            ? colors.onPrimaryContainer
                            : colors.onSurfaceVariant,
                      }}
                    >
                      {t(`psycho.${pattern}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          />
        </View>

        <View>
          <Text
            style={{ ...typography.labelLg, color: colors.onSurface, marginBottom: spacing.sm }}
          >
            {t('psycho.cfc')}
          </Text>
          <Controller
            control={control}
            name="cfcScore"
            render={({ field: { onChange } }) => (
              <View>
                <View
                  style={{
                    height: 6,
                    backgroundColor: colors.surfaceContainerHigh,
                    borderRadius: radii.full,
                    overflow: 'hidden',
                    marginBottom: spacing.sm,
                  }}
                >
                  <Animated.View
                    style={[
                      {
                        height: '100%',
                        backgroundColor: colors.primary,
                        borderRadius: radii.full,
                      },
                      trackStyle,
                    ]}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {CFC_STEPS.map((step) => (
                    <Pressable
                      key={step}
                      onPress={() => {
                        onChange(step);
                      }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor:
                          cfcValue === step ? colors.primary : colors.surfaceContainer,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          ...typography.labelLg,
                          color: cfcValue === step ? colors.onPrimary : colors.onSurfaceVariant,
                        }}
                      >
                        {step}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: spacing.xs,
                  }}
                >
                  <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant }}>
                    {t('psycho.cfc_low')}
                  </Text>
                  <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant }}>
                    {t('psycho.cfc_high')}
                  </Text>
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </StepContainer>
  );
};
