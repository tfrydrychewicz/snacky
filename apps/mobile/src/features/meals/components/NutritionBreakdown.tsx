import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

interface NutritionBreakdownProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export const NutritionBreakdown = ({
  calories,
  protein,
  carbs,
  fat,
  fiber,
  sugar,
  sodium,
}: NutritionBreakdownProps) => {
  const { t } = useTranslation('meals');

  const macroTotal = protein + carbs + fat;
  const proteinPct = macroTotal > 0 ? (protein / macroTotal) * 100 : 33;
  const carbsPct = macroTotal > 0 ? (carbs / macroTotal) * 100 : 33;
  const fatPct = macroTotal > 0 ? (fat / macroTotal) * 100 : 34;

  return (
    <View style={styles.container}>
      <View style={styles.calorieHeader}>
        <Text style={styles.calorieValue}>{Math.round(calories)}</Text>
        <Text style={styles.calorieUnit}>kcal</Text>
      </View>

      <View style={styles.bar}>
        <View style={[styles.segment, { width: `${proteinPct}%`, backgroundColor: colors.macro.protein }]} />
        <View style={[styles.segment, { width: `${carbsPct}%`, backgroundColor: colors.macro.carbs }]} />
        <View style={[styles.segment, { width: `${fatPct}%`, backgroundColor: colors.macro.fat }]} />
      </View>

      <View style={styles.macroRow}>
        <MacroItem label={t('nutrition_protein')} value={protein} color={colors.macro.protein} />
        <MacroItem label={t('nutrition_carbs')} value={carbs} color={colors.macro.carbs} />
        <MacroItem label={t('nutrition_fat')} value={fat} color={colors.macro.fat} />
      </View>

      {(fiber != null || sugar != null || sodium != null) && (
        <View style={styles.microRow}>
          {fiber != null && <MicroItem label={t('nutrition_fiber')} value={`${Math.round(fiber)}g`} />}
          {sugar != null && <MicroItem label={t('nutrition_sugar')} value={`${Math.round(sugar)}g`} />}
          {sodium != null && <MicroItem label={t('nutrition_sodium')} value={`${Math.round(sodium)}mg`} />}
        </View>
      )}
    </View>
  );
};

const MacroItem = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={styles.macroItem}>
    <View style={[styles.macroDot, { backgroundColor: color }]} />
    <View>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={[styles.macroValue, { color }]}>{Math.round(value)}g</Text>
    </View>
  </View>
);

const MicroItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.microItem}>
    <Text style={styles.microLabel}>{label}</Text>
    <Text style={styles.microValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${colors.surfaceContainerHighest}50`,
    borderRadius: radii.DEFAULT,
    padding: spacing.md,
  },
  calorieHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: spacing.md,
  },
  calorieValue: {
    ...typography.displaySm,
    color: colors.onSurface,
  },
  calorieUnit: {
    ...typography.titleMd,
    color: colors.onSurfaceVariant,
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  segment: {
    height: '100%',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  macroValue: {
    ...typography.titleLg,
  },
  microRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  microItem: {
    alignItems: 'center',
  },
  microLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  microValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    marginTop: 2,
  },
});
