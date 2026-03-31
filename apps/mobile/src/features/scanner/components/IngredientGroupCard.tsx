import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { IngredientAnalysis, MacroBreakdown } from '@snacky/shared-types';
import { ScanResultCard } from './ScanResultCard';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';

interface GroupItem {
  ing: IngredientAnalysis;
  idx: number;
}

type Props = {
  groupName: string;
  items: GroupItem[];
  animationIndex: number;
  onEdit: (idx: number) => void;
  onRemove: (idx: number) => void;
};

const getMacroColor = (macros: MacroBreakdown): string => {
  const { protein_g, carbohydrates_g, fat_g } = macros;
  if (protein_g >= carbohydrates_g && protein_g >= fat_g) return colors.macro.protein;
  if (carbohydrates_g >= protein_g && carbohydrates_g >= fat_g) return colors.macro.carbs;
  return colors.macro.fat;
};

export const IngredientGroupCard = ({
  groupName,
  items,
  animationIndex,
  onEdit,
  onRemove,
}: Props) => {
  const { t } = useTranslation('scanner');
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => {
    let totalG = 0;
    let avgConf = 0;
    const macros: MacroBreakdown = {
      calories_kcal: 0,
      protein_g: 0,
      carbohydrates_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
    };

    for (const { ing } of items) {
      totalG += ing.quantity_g;
      avgConf += ing.confidence;
      macros.calories_kcal += ing.macros.calories_kcal;
      macros.protein_g += ing.macros.protein_g;
      macros.carbohydrates_g += ing.macros.carbohydrates_g;
      macros.fat_g += ing.macros.fat_g;
      macros.fiber_g = (macros.fiber_g ?? 0) + (ing.macros.fiber_g ?? 0);
      macros.sugar_g = (macros.sugar_g ?? 0) + (ing.macros.sugar_g ?? 0);
      macros.sodium_mg = (macros.sodium_mg ?? 0) + (ing.macros.sodium_mg ?? 0);
    }

    avgConf = items.length > 0 ? avgConf / items.length : 0;

    return { totalG, avgConf, macros };
  }, [items]);

  const macroColor = getMacroColor(summary.macros);
  const confColor =
    summary.avgConf >= 0.85
      ? colors.primary
      : summary.avgConf >= 0.7
        ? colors.tertiary
        : colors.error;

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  if (expanded) {
    return (
      <View>
        <Pressable
          onPress={() => setExpanded(false)}
          style={styles.expandedHeader}
        >
          <ChevronDown size={16} color={colors.onSurfaceVariant} strokeWidth={2.5} />
          <Text style={styles.expandedHeaderText}>{groupName}</Text>
          <Text style={styles.expandedHeaderCount}>
            {items.length} &middot; {Math.round(summary.macros.calories_kcal)} kcal
          </Text>
        </Pressable>
        <View style={styles.expandedItems}>
          {items.map(({ ing, idx }) => (
            <ScanResultCard
              key={`${ing.name}-${idx}`}
              ingredient={ing}
              index={idx}
              grouped
              onEdit={() => onEdit(idx)}
              onRemove={() => onRemove(idx)}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(200 + animationIndex * 80).duration(400)}
    >
      <Pressable
        onPress={() => setExpanded(true)}
        style={({ pressed }) => [
          styles.collapsedCard,
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={styles.topRow}>
          <View style={[styles.macroIndicator, { backgroundColor: `${macroColor}20` }]}>
            <ChevronIcon size={16} color={macroColor} strokeWidth={2.5} />
          </View>
          <View style={styles.nameColumn}>
            <Text style={styles.name} numberOfLines={1}>
              {groupName}
            </Text>
            <Text style={styles.portion}>
              {items.length} {t('ingredient_group_items')} &middot;{' '}
              {t('portion_g', { value: Math.round(summary.totalG) })}
            </Text>
          </View>
          <View style={styles.rightColumn}>
            <Text style={styles.calories}>
              {Math.round(summary.macros.calories_kcal)}
            </Text>
            <Text style={styles.caloriesUnit}>{t('calories_label')}</Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.confidenceBadge}>
            <ShieldCheck size={12} color={confColor} strokeWidth={2.5} />
            <Text style={[styles.confidenceText, { color: confColor }]}>
              {Math.round(summary.avgConf * 100)}%
            </Text>
          </View>

          <View style={styles.macroRow}>
            <Text style={[styles.macroValue, { color: colors.macro.protein }]}>
              {t('macro_protein_short')} {Math.round(summary.macros.protein_g)}g
            </Text>
            <Text style={[styles.macroValue, { color: colors.macro.carbs }]}>
              {t('macro_carbs_short')} {Math.round(summary.macros.carbohydrates_g)}g
            </Text>
            <Text style={[styles.macroValue, { color: colors.macro.fat }]}>
              {t('macro_fat_short')} {Math.round(summary.macros.fat_g)}g
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  collapsedCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.DEFAULT,
    padding: spacing.md,
    ...elevation.ambient,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  expandedHeaderText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  expandedHeaderCount: {
    ...typography.labelSm,
    color: colors.outline,
  },
  expandedItems: {
    gap: spacing.sm,
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
});
