import React from 'react';
import { View, Text, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Controller } from 'react-hook-form';
import { Bell, UtensilsCrossed, Lightbulb, BarChart3 } from 'lucide-react-native';
import type { StepFormProps } from './types';
import { StepContainer } from './StepContainer';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

type NotificationPrefsStepProps = StepFormProps;

const ToggleRow = ({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  description: string;
  value: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: radii.sm,
      marginBottom: spacing.sm,
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
      }}
    >
      <Icon size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
    </View>
    <View style={{ flex: 1, marginRight: spacing.sm }}>
      <Text style={{ ...typography.titleMd, color: colors.onSurface }}>{label}</Text>
      <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 }}>
        {description}
      </Text>
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: colors.surfaceContainerHigh, true: colors.primaryContainer }}
      thumbColor={value ? colors.primary : colors.outline}
    />
  </View>
);

export const NotificationPrefsStep = ({ form }: NotificationPrefsStepProps) => {
  const { t } = useTranslation('onboarding');
  const { control, watch } = form;
  const enabled = watch('notificationsEnabled');

  return (
    <StepContainer
      stepKey="notifications"
      title={t('notifications.title')}
      subtitle={t('notifications.subtitle')}
    >
      <View style={{ gap: spacing.sm }}>
        <Controller
          control={control}
          name="notificationsEnabled"
          render={({ field: { onChange, value } }) => (
            <ToggleRow
              icon={Bell}
              label={t('notifications.enable')}
              description=""
              value={value}
              onChange={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="mealReminders"
          render={({ field: { onChange, value } }) => (
            <ToggleRow
              icon={UtensilsCrossed}
              label={t('notifications.mealReminders')}
              description={t('notifications.mealRemindersDesc')}
              value={value}
              onChange={onChange}
              disabled={!enabled}
            />
          )}
        />

        <Controller
          control={control}
          name="nudges"
          render={({ field: { onChange, value } }) => (
            <ToggleRow
              icon={Lightbulb}
              label={t('notifications.nudges')}
              description={t('notifications.nudgesDesc')}
              value={value}
              onChange={onChange}
              disabled={!enabled}
            />
          )}
        />

        <Controller
          control={control}
          name="weeklyReport"
          render={({ field: { onChange, value } }) => (
            <ToggleRow
              icon={BarChart3}
              label={t('notifications.weeklyReport')}
              description={t('notifications.weeklyReportDesc')}
              value={value}
              onChange={onChange}
              disabled={!enabled}
            />
          )}
        />
      </View>
    </StepContainer>
  );
};
