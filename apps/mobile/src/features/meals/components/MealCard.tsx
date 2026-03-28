import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Clock, Flame, ImageIcon } from 'lucide-react-native';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import type { MealRow } from '../types';

interface MealCardProps {
  meal: MealRow;
  index: number;
  imageUrl: string | null;
  onPress: () => void;
}

const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍿',
};

export const MealCard = ({ meal, index, imageUrl, onPress }: MealCardProps) => {
  const { t } = useTranslation('meals');

  const MEAL_TYPE_I18N: Record<
    string,
    'meal_type_breakfast' | 'meal_type_lunch' | 'meal_type_dinner' | 'meal_type_snack'
  > = {
    breakfast: 'meal_type_breakfast',
    lunch: 'meal_type_lunch',
    dinner: 'meal_type_dinner',
    snack: 'meal_type_snack',
  };
  const mealTypeKey = MEAL_TYPE_I18N[meal.meal_type] ?? 'meal_type_snack';
  const time = new Date(meal.logged_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={styles.thumbnail}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <ImageIcon size={24} color={colors.outlineVariant} strokeWidth={1.5} />
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.mealType}>
              {MEAL_TYPE_EMOJI[meal.meal_type] ?? '🍽️'} {t(mealTypeKey)}
            </Text>
            <View style={styles.timeRow}>
              <Clock size={12} color={colors.onSurfaceVariant} strokeWidth={2} />
              <Text style={styles.timeText}>{time}</Text>
            </View>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.calorieBadge}>
              <Flame size={14} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.calorieText}>{Math.round(meal.total_calories)}</Text>
              <Text style={styles.calorieUnit}>kcal</Text>
            </View>
            <View style={styles.macroChips}>
              <MacroChip
                label={t('nutrition_protein')}
                value={meal.total_protein_g}
                color={colors.macro.protein}
              />
              <MacroChip
                label={t('nutrition_carbs')}
                value={meal.total_carbs_g}
                color={colors.macro.carbs}
              />
              <MacroChip
                label={t('nutrition_fat')}
                value={meal.total_fat_g}
                color={colors.macro.fat}
              />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const MacroChip = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={[styles.chip, { borderColor: `${color}40` }]}>
    <View style={[styles.chipDot, { backgroundColor: color }]} />
    <Text style={styles.chipText}>{Math.round(value)}g</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.DEFAULT,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...elevation.ambient,
  },
  thumbnail: {
    width: 80,
    height: 80,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealType: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calorieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  calorieText: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  calorieUnit: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  macroChips: {
    flexDirection: 'row',
    gap: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 10,
  },
});
