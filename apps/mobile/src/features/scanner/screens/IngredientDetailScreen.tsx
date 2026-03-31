import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { ChevronLeft, AlertTriangle, Database } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ScannerStackParamList } from '~/app/navigation/types';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import { getSupabase } from '~/shared/api/client';

type DetailRoute = RouteProp<ScannerStackParamList, 'IngredientDetail'>;

interface UsdaFood {
  fdc_id: number;
  description: string;
  food_category: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  fiber_per_100g: number | null;
  sugar_per_100g: number | null;
  sodium_per_100g: number | null;
  saturated_fat_per_100g: number | null;
  serving_size_g: number | null;
  serving_description: string | null;
  vitamin_a_ug_per_100g: number | null;
  vitamin_c_mg_per_100g: number | null;
  vitamin_d_ug_per_100g: number | null;
  vitamin_e_mg_per_100g: number | null;
  vitamin_k_ug_per_100g: number | null;
  thiamin_mg_per_100g: number | null;
  riboflavin_mg_per_100g: number | null;
  niacin_mg_per_100g: number | null;
  vitamin_b6_mg_per_100g: number | null;
  folate_ug_per_100g: number | null;
  vitamin_b12_ug_per_100g: number | null;
  choline_mg_per_100g: number | null;
  calcium_mg_per_100g: number | null;
  iron_mg_per_100g: number | null;
  magnesium_mg_per_100g: number | null;
  phosphorus_mg_per_100g: number | null;
  potassium_mg_per_100g: number | null;
  zinc_mg_per_100g: number | null;
  copper_mg_per_100g: number | null;
  selenium_ug_per_100g: number | null;
}

const DAILY_VALUES: Record<string, number> = {
  calories_kcal: 2000,
  protein_g: 50,
  carbohydrates_g: 275,
  fat_g: 78,
  fiber_g: 28,
  sugar_g: 50,
  sodium_mg: 2300,
  saturated_fat_g: 20,
  vitamin_a_ug: 900,
  vitamin_c_mg: 90,
  vitamin_d_ug: 20,
  vitamin_e_mg: 15,
  vitamin_k_ug: 120,
  thiamin_mg: 1.2,
  riboflavin_mg: 1.3,
  niacin_mg: 16,
  vitamin_b6_mg: 1.7,
  folate_ug: 400,
  vitamin_b12_ug: 2.4,
  choline_mg: 550,
  calcium_mg: 1300,
  iron_mg: 18,
  magnesium_mg: 420,
  phosphorus_mg: 1250,
  potassium_mg: 4700,
  zinc_mg: 11,
  copper_mg: 0.9,
  selenium_ug: 55,
};

export const IngredientDetailScreen = () => {
  const { t } = useTranslation('scanner');
  const navigation = useNavigation();
  const route = useRoute<DetailRoute>();
  const insets = useSafeAreaInsets();
  const { ingredient } = route.params;

  const [usdaFood, setUsdaFood] = useState<UsdaFood | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPerPortion, setShowPerPortion] = useState(true);

  const ratio = ingredient.quantity_g / 100;
  const scale = showPerPortion ? ratio : 1;

  useEffect(() => {
    if (ingredient.usda_fdc_id == null) return;
    setLoading(true);

    const fetchUsda = async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('usda_foods')
        .select('*')
        .eq('fdc_id', ingredient.usda_fdc_id!)
        .limit(1)
        .single();

      if (data) setUsdaFood(data as UsdaFood);
      setLoading(false);
    };

    void fetchUsda();
  }, [ingredient.usda_fdc_id]);

  const fmt = (val: number | null | undefined, decimals = 1): string => {
    if (val == null) return '—';
    const scaled = val * scale;
    return scaled < 0.01 ? '0' : scaled.toFixed(decimals).replace(/\.0$/, '');
  };

  const dvPct = (val: number | null | undefined, dvKey: string): number | null => {
    if (val == null) return null;
    const dv = DAILY_VALUES[dvKey];
    if (!dv) return null;
    return Math.round(((val * scale) / dv) * 100);
  };

  const macroColor = (() => {
    const { protein_g, carbohydrates_g, fat_g } = ingredient.macros;
    if (protein_g >= carbohydrates_g && protein_g >= fat_g) return colors.macro.protein;
    if (carbohydrates_g >= protein_g && carbohydrates_g >= fat_g) return colors.macro.carbs;
    return colors.macro.fat;
  })();

  const macroRows: { label: string; val: number | null; unit: string; dvKey: string; color?: string }[] = usdaFood
    ? [
        { label: t('nutrient_calories'), val: usdaFood.calories_per_100g, unit: 'kcal', dvKey: 'calories_kcal' },
        { label: t('nutrient_protein'), val: usdaFood.protein_per_100g, unit: 'g', dvKey: 'protein_g', color: colors.macro.protein },
        { label: t('nutrient_carbs'), val: usdaFood.carbs_per_100g, unit: 'g', dvKey: 'carbohydrates_g', color: colors.macro.carbs },
        { label: t('nutrient_fat'), val: usdaFood.fat_per_100g, unit: 'g', dvKey: 'fat_g', color: colors.macro.fat },
        { label: t('nutrient_saturated_fat'), val: usdaFood.saturated_fat_per_100g, unit: 'g', dvKey: 'saturated_fat_g' },
        { label: t('nutrient_fiber'), val: usdaFood.fiber_per_100g, unit: 'g', dvKey: 'fiber_g' },
        { label: t('nutrient_sugar'), val: usdaFood.sugar_per_100g, unit: 'g', dvKey: 'sugar_g' },
        { label: t('nutrient_sodium'), val: usdaFood.sodium_per_100g, unit: 'mg', dvKey: 'sodium_mg' },
      ]
    : [
        { label: t('nutrient_calories'), val: ingredient.macros.calories_kcal / ratio, unit: 'kcal', dvKey: 'calories_kcal' },
        { label: t('nutrient_protein'), val: ingredient.macros.protein_g / ratio, unit: 'g', dvKey: 'protein_g', color: colors.macro.protein },
        { label: t('nutrient_carbs'), val: ingredient.macros.carbohydrates_g / ratio, unit: 'g', dvKey: 'carbohydrates_g', color: colors.macro.carbs },
        { label: t('nutrient_fat'), val: ingredient.macros.fat_g / ratio, unit: 'g', dvKey: 'fat_g', color: colors.macro.fat },
        { label: t('nutrient_fiber'), val: ingredient.macros.fiber_g != null ? ingredient.macros.fiber_g / ratio : null, unit: 'g', dvKey: 'fiber_g' },
        { label: t('nutrient_sugar'), val: ingredient.macros.sugar_g != null ? ingredient.macros.sugar_g / ratio : null, unit: 'g', dvKey: 'sugar_g' },
        { label: t('nutrient_sodium'), val: ingredient.macros.sodium_mg != null ? ingredient.macros.sodium_mg / ratio : null, unit: 'mg', dvKey: 'sodium_mg' },
      ];

  const vitaminRows = usdaFood
    ? [
        { label: t('nutrient_vitamin_a'), val: usdaFood.vitamin_a_ug_per_100g, unit: 'µg', dvKey: 'vitamin_a_ug' },
        { label: t('nutrient_vitamin_c'), val: usdaFood.vitamin_c_mg_per_100g, unit: 'mg', dvKey: 'vitamin_c_mg' },
        { label: t('nutrient_vitamin_d'), val: usdaFood.vitamin_d_ug_per_100g, unit: 'µg', dvKey: 'vitamin_d_ug' },
        { label: t('nutrient_vitamin_e'), val: usdaFood.vitamin_e_mg_per_100g, unit: 'mg', dvKey: 'vitamin_e_mg' },
        { label: t('nutrient_vitamin_k'), val: usdaFood.vitamin_k_ug_per_100g, unit: 'µg', dvKey: 'vitamin_k_ug' },
        { label: t('nutrient_thiamin'), val: usdaFood.thiamin_mg_per_100g, unit: 'mg', dvKey: 'thiamin_mg' },
        { label: t('nutrient_riboflavin'), val: usdaFood.riboflavin_mg_per_100g, unit: 'mg', dvKey: 'riboflavin_mg' },
        { label: t('nutrient_niacin'), val: usdaFood.niacin_mg_per_100g, unit: 'mg', dvKey: 'niacin_mg' },
        { label: t('nutrient_vitamin_b6'), val: usdaFood.vitamin_b6_mg_per_100g, unit: 'mg', dvKey: 'vitamin_b6_mg' },
        { label: t('nutrient_folate'), val: usdaFood.folate_ug_per_100g, unit: 'µg', dvKey: 'folate_ug' },
        { label: t('nutrient_vitamin_b12'), val: usdaFood.vitamin_b12_ug_per_100g, unit: 'µg', dvKey: 'vitamin_b12_ug' },
        { label: t('nutrient_choline'), val: usdaFood.choline_mg_per_100g, unit: 'mg', dvKey: 'choline_mg' },
      ].filter((r) => r.val != null && r.val > 0)
    : [];

  const mineralRows = usdaFood
    ? [
        { label: t('nutrient_calcium'), val: usdaFood.calcium_mg_per_100g, unit: 'mg', dvKey: 'calcium_mg' },
        { label: t('nutrient_iron'), val: usdaFood.iron_mg_per_100g, unit: 'mg', dvKey: 'iron_mg' },
        { label: t('nutrient_magnesium'), val: usdaFood.magnesium_mg_per_100g, unit: 'mg', dvKey: 'magnesium_mg' },
        { label: t('nutrient_phosphorus'), val: usdaFood.phosphorus_mg_per_100g, unit: 'mg', dvKey: 'phosphorus_mg' },
        { label: t('nutrient_potassium'), val: usdaFood.potassium_mg_per_100g, unit: 'mg', dvKey: 'potassium_mg' },
        { label: t('nutrient_zinc'), val: usdaFood.zinc_mg_per_100g, unit: 'mg', dvKey: 'zinc_mg' },
        { label: t('nutrient_copper'), val: usdaFood.copper_mg_per_100g, unit: 'mg', dvKey: 'copper_mg' },
        { label: t('nutrient_selenium'), val: usdaFood.selenium_ug_per_100g, unit: 'µg', dvKey: 'selenium_ug' },
      ].filter((r) => r.val != null && r.val > 0)
    : [];

  const renderNutrientRow = (
    row: { label: string; val: number | null; unit: string; dvKey: string; color?: string },
    idx: number,
    isLast: boolean,
  ) => {
    const pct = dvPct(row.val, row.dvKey);
    return (
      <View key={idx} style={[styles.nutrientRow, !isLast && styles.nutrientRowBorder]}>
        <Text style={[styles.nutrientLabel, row.color ? { color: row.color } : undefined]}>
          {row.label}
        </Text>
        <View style={styles.nutrientValueCol}>
          <Text style={styles.nutrientValue}>
            {fmt(row.val)} {row.unit}
          </Text>
          {pct != null && (
            <View style={styles.dvContainer}>
              <View style={styles.dvBarTrack}>
                <View
                  style={[
                    styles.dvBarFill,
                    {
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: pct > 100 ? colors.tertiary : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.dvText}>{pct}%</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderMicroGrid = (
    rows: { label: string; val: number | null; unit: string; dvKey: string }[],
  ) => {
    const pairs: typeof rows[] = [];
    for (let i = 0; i < rows.length; i += 2) {
      pairs.push(rows.slice(i, i + 2));
    }
    return pairs.map((pair, pIdx) => (
      <View key={pIdx} style={styles.microRow}>
        {pair.map((item, iIdx) => {
          const pct = dvPct(item.val, item.dvKey);
          return (
            <View key={iIdx} style={styles.microCell}>
              <Text style={styles.microLabel}>{item.label}</Text>
              <Text style={styles.microValue}>
                {fmt(item.val)} {item.unit}
              </Text>
              {pct != null && (
                <View style={styles.microDvRow}>
                  <View style={styles.microDvTrack}>
                    <View
                      style={[
                        styles.microDvFill,
                        {
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: pct > 100 ? colors.tertiary : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.microDvText}>{pct}%</Text>
                </View>
              )}
            </View>
          );
        })}
        {pair.length === 1 && <View style={styles.microCell} />}
      </View>
    ));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {ingredient.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={[styles.macroIndicator, { backgroundColor: `${macroColor}20` }]}>
            <View style={[styles.macroDot, { backgroundColor: macroColor }]} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryName} numberOfLines={2}>{ingredient.name}</Text>
            <Text style={styles.summaryPortion}>
              {t('portion_g', { value: Math.round(ingredient.quantity_g) })}
            </Text>
          </View>
          <View style={styles.summaryCalories}>
            <Text style={styles.caloriesValue}>
              {Math.round(ingredient.macros.calories_kcal)}
            </Text>
            <Text style={styles.caloriesUnit}>{t('calories_label')}</Text>
          </View>
        </View>

        {/* No USDA badge */}
        {ingredient.usda_fdc_id == null && !loading && (
          <View style={styles.noBadge}>
            <AlertTriangle size={14} color={colors.tertiary} strokeWidth={2} />
            <Text style={styles.noBadgeText}>{t('ai_estimated')}</Text>
          </View>
        )}

        {loading && (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
        )}

        {/* Toggle */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setShowPerPortion(false)}
            style={[styles.toggleBtn, !showPerPortion && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, !showPerPortion && styles.toggleTextActive]}>
              {t('per_100g')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowPerPortion(true)}
            style={[styles.toggleBtn, showPerPortion && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, showPerPortion && styles.toggleTextActive]}>
              {t('per_portion', { value: Math.round(ingredient.quantity_g) })}
            </Text>
          </Pressable>
        </View>

        {/* Macros */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('macros_section')}</Text>
          {macroRows.map((row, idx) =>
            renderNutrientRow(row, idx, idx === macroRows.length - 1),
          )}
        </View>

        {/* Vitamins */}
        {vitaminRows.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('vitamins')}</Text>
            {renderMicroGrid(vitaminRows)}
          </View>
        )}

        {/* Minerals */}
        {mineralRows.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('minerals')}</Text>
            {renderMicroGrid(mineralRows)}
          </View>
        )}

        {/* USDA metadata */}
        {usdaFood && (
          <View style={styles.metaCard}>
            <View style={styles.metaHeader}>
              <Database size={14} color={colors.outline} strokeWidth={2} />
              <Text style={styles.metaSource}>{t('usda_source')}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t('fdc_id_label')}</Text>
              <Text style={styles.metaValue}>{usdaFood.fdc_id}</Text>
            </View>
            {usdaFood.food_category && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t('category_label')}</Text>
                <Text style={styles.metaValue}>{usdaFood.food_category}</Text>
              </View>
            )}
            {usdaFood.serving_size_g && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t('serving_size_label')}</Text>
                <Text style={styles.metaValue}>
                  {usdaFood.serving_size_g}g
                  {usdaFood.serving_description ? ` (${usdaFood.serving_description})` : ''}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.DEFAULT,
    padding: spacing.md,
    ...elevation.ambient,
  },
  macroIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  macroDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryName: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  summaryPortion: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  summaryCalories: {
    alignItems: 'flex-end',
  },
  caloriesValue: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  caloriesUnit: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  noBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.tertiary}15`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  noBadgeText: {
    ...typography.labelLg,
    color: colors.tertiary,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.sm,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.sm - 2,
  },
  toggleActive: {
    backgroundColor: colors.surfaceContainerLowest,
    ...elevation.ambient,
  },
  toggleText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  toggleTextActive: {
    color: colors.primary,
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.DEFAULT,
    padding: spacing.md,
    ...elevation.ambient,
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  nutrientRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  nutrientLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  nutrientValueCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  nutrientValue: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.onSurface,
  },
  dvContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dvBarTrack: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  dvBarFill: {
    height: 4,
    borderRadius: 2,
  },
  dvText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    width: 32,
    textAlign: 'right',
  },
  microRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  microCell: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  microLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  microValue: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.onSurface,
  },
  microDvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  microDvTrack: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  microDvFill: {
    height: 3,
    borderRadius: 1.5,
  },
  microDvText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    minWidth: 28,
    textAlign: 'right',
  },
  metaCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.DEFAULT,
    padding: spacing.md,
    gap: spacing.sm,
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  metaSource: {
    ...typography.labelLg,
    color: colors.outline,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  metaValue: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
});
