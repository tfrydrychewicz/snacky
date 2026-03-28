import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Controller } from 'react-hook-form';
import { Target, Dumbbell, Scale, Salad } from 'lucide-react-native';
import { goalTypeOptions } from '../schemas/onboarding';
import type { StepFormProps } from './types';
import { StepContainer } from './StepContainer';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';

type GoalStepProps = StepFormProps;

const GOAL_ICONS = {
  lose_weight: Target,
  gain_muscle: Dumbbell,
  maintain: Scale,
  improve_nutrition: Salad,
} as const;

export const GoalStep = ({ form }: GoalStepProps) => {
  const { t } = useTranslation('onboarding');
  const { control, watch } = form;
  const selectedGoal = watch('goalType');

  return (
    <StepContainer stepKey="goal" title={t('goal.title')} subtitle={t('goal.subtitle')}>
      <Controller
        control={control}
        name="goalType"
        render={({ field: { onChange } }) => (
          <View style={{ gap: spacing.sm }}>
            {goalTypeOptions.map((goal) => {
              const isSelected = selectedGoal === goal;
              const Icon = GOAL_ICONS[goal];
              return (
                <Pressable
                  key={goal}
                  onPress={() => {
                    onChange(goal);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.lg,
                    borderRadius: radii.DEFAULT,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.primary : colors.outlineVariant,
                    backgroundColor: isSelected
                      ? colors.primaryFixed
                      : colors.surfaceContainerLowest,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    ...(isSelected ? elevation.ambient : elevation.none),
                  })}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isSelected ? colors.primary : colors.surfaceContainer,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: spacing.md,
                    }}
                  >
                    <Icon
                      size={22}
                      color={isSelected ? colors.onPrimary : colors.onSurfaceVariant}
                      strokeWidth={2}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        ...typography.titleMd,
                        color: isSelected ? colors.onPrimaryContainer : colors.onSurface,
                      }}
                    >
                      {t(`goal.${goal}`)}
                    </Text>
                    <Text
                      style={{
                        ...typography.bodySm,
                        color: isSelected ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                        marginTop: 2,
                      }}
                    >
                      {t(`goal.${goal}_desc`)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      />
    </StepContainer>
  );
};
