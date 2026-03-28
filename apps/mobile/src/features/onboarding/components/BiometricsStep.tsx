import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Controller } from 'react-hook-form';
import type { StepFormProps } from './types';
import { StepContainer } from './StepContainer';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

type BiometricsStepProps = StepFormProps;

const FieldLabel = ({ text }: { text: string }) => (
  <Text style={{ ...typography.labelLg, color: colors.onSurface, marginBottom: spacing.xs }}>
    {text}
  </Text>
);

const NumberInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) => (
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
    placeholder={placeholder}
    placeholderTextColor={colors.outline}
  />
);

export const BiometricsStep = ({ form }: BiometricsStepProps) => {
  const { t } = useTranslation('onboarding');
  const { control, watch } = form;
  const selectedSex = watch('biologicalSex');

  return (
    <StepContainer
      stepKey="biometrics"
      title={t('biometrics.title')}
      subtitle={t('biometrics.subtitle')}
    >
      <View style={{ gap: spacing.lg }}>
        <View>
          <FieldLabel text={t('biometrics.dateOfBirth')} />
          <Controller
            control={control}
            name="dateOfBirth"
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
                value={value}
                onChangeText={onChange}
                placeholder={t('biometrics.dateOfBirthPlaceholder')}
                placeholderTextColor={colors.outline}
                keyboardType="numbers-and-punctuation"
              />
            )}
          />
        </View>

        <View>
          <FieldLabel text={t('biometrics.biologicalSex')} />
          <Controller
            control={control}
            name="biologicalSex"
            render={({ field: { onChange } }) => (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {(['male', 'female'] as const).map((sex) => (
                  <Pressable
                    key={sex}
                    onPress={() => {
                      onChange(sex);
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: spacing.md,
                      borderRadius: radii.sm,
                      borderWidth: 1.5,
                      borderColor: selectedSex === sex ? colors.primary : colors.outlineVariant,
                      backgroundColor:
                        selectedSex === sex ? colors.primaryFixed : colors.surfaceContainerLowest,
                      alignItems: 'center',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        ...typography.labelLg,
                        color:
                          selectedSex === sex ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                      }}
                    >
                      {t(`biometrics.${sex}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          />
        </View>

        <View>
          <FieldLabel text={t('biometrics.height')} />
          <Controller
            control={control}
            name="heightCm"
            render={({ field: { onChange, value } }) => (
              <NumberInput value={value} onChange={onChange} />
            )}
          />
        </View>

        <View>
          <FieldLabel text={t('biometrics.weight')} />
          <Controller
            control={control}
            name="weightKg"
            render={({ field: { onChange, value } }) => (
              <NumberInput value={value} onChange={onChange} />
            )}
          />
        </View>
      </View>
    </StepContainer>
  );
};
