import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ShieldCheck, PencilLine, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { IngredientAnalysis } from '@snacky/shared-types';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';

type Props = {
  ingredient: IngredientAnalysis;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
};

const getMacroColor = (ingredient: IngredientAnalysis): string => {
  const { protein_g, carbohydrates_g, fat_g } = ingredient.macros;
  if (protein_g >= carbohydrates_g && protein_g >= fat_g) return colors.macro.protein;
  if (carbohydrates_g >= protein_g && carbohydrates_g >= fat_g) return colors.macro.carbs;
  return colors.macro.fat;
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.85) return colors.primary;
  if (confidence >= 0.7) return colors.tertiary;
  return colors.error;
};

export const ScanResultCard = ({ ingredient, index, onEdit, onRemove }: Props) => {
  const { t } = useTranslation('scanner');
  const macroColor = getMacroColor(ingredient);
  const confColor = getConfidenceColor(ingredient.confidence);

  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 80).duration(400)} style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.macroIndicator, { backgroundColor: `${macroColor}20` }]}>
          <View style={[styles.macroDot, { backgroundColor: macroColor }]} />
        </View>
        <View style={styles.nameColumn}>
          <Text style={styles.name} numberOfLines={1}>
            {ingredient.name}
          </Text>
          <Text style={styles.portion}>
            {t('portion_g', { value: Math.round(ingredient.quantity_g) })}
          </Text>
        </View>
        <View style={styles.rightColumn}>
          <Text style={styles.calories}>{Math.round(ingredient.macros.calories_kcal)}</Text>
          <Text style={styles.caloriesUnit}>{t('calories_label')}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.confidenceBadge}>
          <ShieldCheck size={12} color={confColor} strokeWidth={2.5} />
          <Text style={[styles.confidenceText, { color: confColor }]}>
            {Math.round(ingredient.confidence * 100)}%
          </Text>
        </View>

        <View style={styles.macroRow}>
          <Text style={[styles.macroValue, { color: colors.macro.protein }]}>
            {t('macro_protein_short')} {Math.round(ingredient.macros.protein_g)}g
          </Text>
          <Text style={[styles.macroValue, { color: colors.macro.carbs }]}>
            {t('macro_carbs_short')} {Math.round(ingredient.macros.carbohydrates_g)}g
          </Text>
          <Text style={[styles.macroValue, { color: colors.macro.fat }]}>
            {t('macro_fat_short')} {Math.round(ingredient.macros.fat_g)}g
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onEdit} hitSlop={8} style={styles.actionBtn}>
            <PencilLine size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
          </Pressable>
          <Pressable onPress={onRemove} hitSlop={8} style={styles.actionBtn}>
            <Trash2 size={16} color={colors.error} strokeWidth={2} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.DEFAULT,
    padding: spacing.md,
    ...elevation.ambient,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  macroIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  macroDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nameColumn: {
    flex: 1,
  },
  name: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  portion: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
  calories: {
    ...typography.titleLg,
    color: colors.onSurface,
  },
  caloriesUnit: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceText: {
    ...typography.labelSm,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroValue: {
    ...typography.labelSm,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    padding: 4,
  },
});
