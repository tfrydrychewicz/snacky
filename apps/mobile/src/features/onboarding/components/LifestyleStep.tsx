import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Controller } from 'react-hook-form';
import {
  activityLevelOptions,
  cookingSkillOptions,
  cookingTimePrefOptions,
  cuisineOptions,
} from '../schemas/onboarding';
import type { StepFormProps } from './types';
import { StepContainer } from './StepContainer';
import { SelectionChip } from './SelectionChip';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

type LifestyleStepProps = StepFormProps;

const OptionRow = ({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      padding: spacing.md,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      borderColor: selected ? colors.primary : colors.outlineVariant,
      backgroundColor: selected ? colors.primaryFixed : colors.surfaceContainerLowest,
      marginBottom: spacing.xs,
      opacity: pressed ? 0.7 : 1,
    })}
  >
    <Text
      style={{
        ...typography.labelLg,
        color: selected ? colors.onPrimaryContainer : colors.onSurface,
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        ...typography.bodySm,
        color: selected ? colors.onPrimaryContainer : colors.onSurfaceVariant,
        marginTop: 2,
      }}
    >
      {description}
    </Text>
  </Pressable>
);

export const LifestyleStep = ({ form }: LifestyleStepProps) => {
  const { t } = useTranslation('onboarding');
  const { control, watch } = form;
  const selectedActivity = watch('activityLevel');
  const selectedSkill = watch('cookingSkill');
  const selectedTime = watch('cookingTimePref');

  return (
    <StepContainer
      stepKey="lifestyle"
      title={t('lifestyle.title')}
      subtitle={t('lifestyle.subtitle')}
    >
      <View style={{ gap: spacing.xl }}>
        <View>
          <Text
            style={{ ...typography.labelLg, color: colors.onSurface, marginBottom: spacing.sm }}
          >
            {t('lifestyle.activityLevel')}
          </Text>
          <Controller
            control={control}
            name="activityLevel"
            render={({ field: { onChange } }) => (
              <View>
                {activityLevelOptions.map((level) => (
                  <OptionRow
                    key={level}
                    label={t(`lifestyle.${level}`)}
                    description={t(`lifestyle.${level}_desc`)}
                    selected={selectedActivity === level}
                    onPress={() => {
                      onChange(level);
                    }}
                  />
                ))}
              </View>
            )}
          />
        </View>

        <View>
          <Text
            style={{ ...typography.labelLg, color: colors.onSurface, marginBottom: spacing.sm }}
          >
            {t('lifestyle.cookingSkill')}
          </Text>
          <Controller
            control={control}
            name="cookingSkill"
            render={({ field: { onChange } }) => (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {cookingSkillOptions.map((skill) => (
                  <Pressable
                    key={skill}
                    onPress={() => {
                      onChange(skill);
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: spacing.md,
                      borderRadius: radii.sm,
                      borderWidth: 1.5,
                      borderColor: selectedSkill === skill ? colors.primary : colors.outlineVariant,
                      backgroundColor:
                        selectedSkill === skill
                          ? colors.primaryFixed
                          : colors.surfaceContainerLowest,
                      alignItems: 'center',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        ...typography.labelLg,
                        color:
                          selectedSkill === skill
                            ? colors.onPrimaryContainer
                            : colors.onSurfaceVariant,
                      }}
                    >
                      {t(`lifestyle.${skill}`)}
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
            {t('lifestyle.cookingTime')}
          </Text>
          <Controller
            control={control}
            name="cookingTimePref"
            render={({ field: { onChange } }) => (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {cookingTimePrefOptions.map((pref) => (
                  <Pressable
                    key={pref}
                    onPress={() => {
                      onChange(pref);
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: spacing.md,
                      borderRadius: radii.sm,
                      borderWidth: 1.5,
                      borderColor: selectedTime === pref ? colors.primary : colors.outlineVariant,
                      backgroundColor:
                        selectedTime === pref ? colors.primaryFixed : colors.surfaceContainerLowest,
                      alignItems: 'center',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        ...typography.labelMd,
                        color:
                          selectedTime === pref
                            ? colors.onPrimaryContainer
                            : colors.onSurfaceVariant,
                      }}
                    >
                      {t(`lifestyle.${pref}`)}
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
            {t('lifestyle.cuisines')}
          </Text>
          <Controller
            control={control}
            name="cuisinePreferences"
            render={({ field: { onChange, value } }) => (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {cuisineOptions.map((cuisine) => {
                  const isSelected = value.includes(cuisine);
                  return (
                    <SelectionChip
                      key={cuisine}
                      label={t(`lifestyle.${cuisine}`)}
                      selected={isSelected}
                      onPress={() => {
                        onChange(
                          isSelected ? value.filter((v) => v !== cuisine) : [...value, cuisine],
                        );
                      }}
                    />
                  );
                })}
              </View>
            )}
          />
        </View>
      </View>
    </StepContainer>
  );
};
