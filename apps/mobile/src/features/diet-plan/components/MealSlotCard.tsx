import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock, ChevronRight, Flame } from 'lucide-react-native';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import type { PlanMeal } from '../types';

interface MealSlotCardProps {
  meal: PlanMeal;
  onPress: () => void;
}

export const MealSlotCard = ({ meal, onPress }: MealSlotCardProps) => {
  const { t } = useTranslation('dietPlan');

  const slotLabel = t(`slots.${meal.meal_slot}`, { defaultValue: meal.meal_slot });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radii.DEFAULT,
        padding: spacing.md,
        ...elevation.ambient,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {/* Slot label */}
      <Text style={{ ...typography.labelMd, color: colors.primary, marginBottom: 4 }}>
        {slotLabel}
      </Text>

      {/* Recipe name */}
      <Text
        style={{ ...typography.titleMd, color: colors.onSurface, marginBottom: spacing.sm }}
        numberOfLines={2}
      >
        {meal.recipe_name || t('mealCard.noRecipe')}
      </Text>

      {/* Meta row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {/* Calories */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Flame size={14} color={colors.tertiary} />
            <Text style={{ ...typography.labelMd, color: colors.onSurfaceVariant }}>
              {t('mealCard.kcal', { n: Math.round(meal.calories) })}
            </Text>
          </View>

          {/* Prep time */}
          {meal.prep_time_min != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={14} color={colors.outline} />
              <Text style={{ ...typography.labelMd, color: colors.onSurfaceVariant }}>
                {t('mealCard.prepTime', { min: meal.prep_time_min })}
              </Text>
            </View>
          )}
        </View>

        {/* Macro pills */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MacroPill label="P" value={meal.protein_g} color={colors.macro.protein} />
          <MacroPill label="C" value={meal.carbs_g} color={colors.macro.carbs} />
          <MacroPill label="F" value={meal.fat_g} color={colors.macro.fat} />
          <ChevronRight size={16} color={colors.outline} />
        </View>
      </View>
    </Pressable>
  );
};

const MacroPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View
    style={{
      backgroundColor: `${color}18`,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.full,
    }}
  >
    <Text style={{ ...typography.labelSm, color }}>
      {label}
      {Math.round(value)}
    </Text>
  </View>
);
