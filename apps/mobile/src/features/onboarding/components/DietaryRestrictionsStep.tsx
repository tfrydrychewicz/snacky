import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Controller } from 'react-hook-form';
import { dietaryRestrictionOptions, allergyOptions } from '../schemas/onboarding';
import type { StepFormProps } from './types';
import { StepContainer } from './StepContainer';
import { SelectionChip } from './SelectionChip';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

type DietaryRestrictionsStepProps = StepFormProps;

export const DietaryRestrictionsStep = ({ form }: DietaryRestrictionsStepProps) => {
  const { t } = useTranslation('onboarding');
  const { control } = form;

  return (
    <StepContainer stepKey="dietary" title={t('dietary.title')} subtitle={t('dietary.subtitle')}>
      <View style={{ gap: spacing.xl }}>
        <View>
          <Text
            style={{ ...typography.labelLg, color: colors.onSurface, marginBottom: spacing.sm }}
          >
            {t('dietary.restrictions')}
          </Text>
          <Controller
            control={control}
            name="dietaryRestrictions"
            render={({ field: { onChange, value } }) => (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {dietaryRestrictionOptions.map((option) => {
                  const isSelected = value.includes(option);
                  return (
                    <SelectionChip
                      key={option}
                      label={t(`dietary.${option}`)}
                      selected={isSelected}
                      onPress={() => {
                        onChange(
                          isSelected ? value.filter((v) => v !== option) : [...value, option],
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
            {t('dietary.allergies')}
          </Text>
          <Controller
            control={control}
            name="allergies"
            render={({ field: { onChange, value } }) => (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {allergyOptions.map((option) => {
                  const isSelected = value.includes(option);
                  return (
                    <SelectionChip
                      key={option}
                      label={t(`dietary.${option}`)}
                      selected={isSelected}
                      onPress={() => {
                        onChange(
                          isSelected ? value.filter((v) => v !== option) : [...value, option],
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
            style={{ ...typography.labelLg, color: colors.onSurface, marginBottom: spacing.xs }}
          >
            {t('dietary.customAllergy')}
          </Text>
          <Controller
            control={control}
            name="customAllergy"
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
                placeholder={t('dietary.customAllergy')}
                placeholderTextColor={colors.outline}
              />
            )}
          />
        </View>
      </View>
    </StepContainer>
  );
};
