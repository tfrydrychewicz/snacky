import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check, Package, ArrowLeft, Barcode as BarcodeIcon } from 'lucide-react-native';
import { useAuth } from '~/app/providers/AuthProvider';
import { getSupabase } from '~/shared/api/client';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';
import type { ScannerStackParamList, BarcodeProduct } from '~/app/navigation/types';

type ResultsRoute = RouteProp<ScannerStackParamList, 'BarcodeResult'>;

function scaleMacros(per100g: BarcodeProduct['per_100g'], portionG: number) {
  const factor = portionG / 100;
  return {
    calories_kcal: Math.round(per100g.calories_kcal * factor),
    protein_g: Math.round(per100g.protein_g * factor * 10) / 10,
    carbohydrates_g: Math.round(per100g.carbohydrates_g * factor * 10) / 10,
    fat_g: Math.round(per100g.fat_g * factor * 10) / 10,
    fiber_g: per100g.fiber_g != null ? Math.round(per100g.fiber_g * factor * 10) / 10 : 0,
    sugar_g: per100g.sugar_g != null ? Math.round(per100g.sugar_g * factor * 10) / 10 : 0,
    sodium_mg: per100g.sodium_mg != null ? Math.round(per100g.sodium_mg * factor) : 0,
  };
}

export const BarcodeResultScreen = () => {
  const { t } = useTranslation('scanner');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ResultsRoute>();
  const { user } = useAuth();

  const { product, barcode, mealType } = route.params;

  const defaultPortion = product.serving_g ?? 100;
  const [portionG, setPortionG] = useState(String(defaultPortion));
  const [isLogging, setIsLogging] = useState(false);

  const portion = parseFloat(portionG) || defaultPortion;
  const macros = useMemo(() => scaleMacros(product.per_100g, portion), [product.per_100g, portion]);

  const handleLog = useCallback(async () => {
    if (!user) return;
    setIsLogging(true);

    try {
      const supabase = getSupabase();

      const { data: meal, error: mealError } = (await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          logged_at: new Date().toISOString(),
          timezone_offset: new Date().getTimezoneOffset(),
          image_key: null,
          image_keys: [],
          ai_analysis: {
            model_used: 'openfoodfacts',
            processing_time_ms: 0,
            overall_confidence: 1.0,
            nova_classification: product.nova_group ?? 3,
            barcode,
            product_name: product.name,
            brand: product.brand,
          },
          total_calories: macros.calories_kcal,
          total_protein_g: macros.protein_g,
          total_carbs_g: macros.carbohydrates_g,
          total_fat_g: macros.fat_g,
          total_fiber_g: macros.fiber_g,
          total_sugar_g: macros.sugar_g,
          total_sodium_mg: macros.sodium_mg,
          user_modified: false,
          modification_diff: null,
          source: 'barcode',
          nova_class: product.nova_group ?? 3,
        })
        .select('id')
        .single()) as { data: { id: string } | null; error: { message: string } | null };

      if (mealError || !meal) {
        throw new Error(mealError?.message ?? 'Failed to create meal');
      }

      const ingredientRow = {
        meal_id: meal.id,
        name: product.name,
        quantity_g: portion,
        calories_kcal: macros.calories_kcal,
        protein_g: macros.protein_g,
        carbs_g: macros.carbohydrates_g,
        fat_g: macros.fat_g,
        fiber_g: macros.fiber_g,
        sugar_g: macros.sugar_g,
        sodium_mg: macros.sodium_mg,
        confidence: 1.0,
        sort_order: 0,
      };

      await supabase.from('meal_ingredients').insert(ingredientRow);

      Alert.alert(t('log_success'), undefined, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('Barcode meal log failed:', err);
      Alert.alert(t('log_error'));
    } finally {
      setIsLogging(false);
    }
  }, [user, mealType, product, barcode, macros, portion, navigation, t]);

  const nutriscoreColor = (grade: string | null) => {
    if (!grade) return colors.outline;
    const map: Record<string, string> = { a: '#038141', b: '#85BB2F', c: '#FECB02', d: '#EE8100', e: '#E63E11' };
    return map[grade.toLowerCase()] ?? colors.outline;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <ArrowLeft size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('barcode_result_title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, gap: spacing.md, padding: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
          <View style={styles.productHeader}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.productImage} resizeMode="contain" />
            ) : (
              <View style={[styles.productImage, styles.noImage]}>
                <Package size={32} color={colors.outlineVariant} />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
              {product.brand && (
                <Text style={styles.productBrand}>{product.brand}</Text>
              )}
              <View style={styles.barcodeRow}>
                <BarcodeIcon size={14} color={colors.outline} />
                <Text style={styles.barcodeText}>{barcode}</Text>
              </View>
              {product.nutriscore && (
                <View style={[styles.nutriscoreBadge, { backgroundColor: nutriscoreColor(product.nutriscore) }]}>
                  <Text style={styles.nutriscoreText}>
                    {t('barcode_nutriscore')} {product.nutriscore.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Portion input */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.card}>
          <Text style={styles.sectionTitle}>{t('barcode_portion')}</Text>
          <View style={styles.portionRow}>
            <TextInput
              style={styles.portionInput}
              value={portionG}
              onChangeText={setPortionG}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <Text style={styles.portionUnit}>g</Text>
          </View>
          {product.serving_size && (
            <Text style={styles.servingHint}>
              {t('barcode_serving')}: {product.serving_size}
            </Text>
          )}
        </Animated.View>

        {/* Nutrition summary */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.card}>
          <Text style={styles.sectionTitle}>
            {t('barcode_per_serving', { g: Math.round(portion) })}
          </Text>
          <View style={styles.macroGrid}>
            <MacroItem label={t('calories_label')} value={`${macros.calories_kcal}`} highlight />
            <MacroItem label={t('protein')} value={`${macros.protein_g}g`} />
            <MacroItem label={t('carbs')} value={`${macros.carbohydrates_g}g`} />
            <MacroItem label={t('fats')} value={`${macros.fat_g}g`} />
          </View>
          <View style={styles.microRow}>
            {macros.fiber_g > 0 && <MicroItem label={t('fiber')} value={`${macros.fiber_g}g`} />}
            {macros.sugar_g > 0 && <MicroItem label={t('sugar')} value={`${macros.sugar_g}g`} />}
            {macros.sodium_mg > 0 && <MicroItem label={t('sodium')} value={`${macros.sodium_mg}mg`} />}
          </View>
        </Animated.View>

        {/* Per 100g reference */}
        <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.card}>
          <Text style={styles.sectionTitle}>{t('barcode_per_100g')}</Text>
          <View style={styles.macroGrid}>
            <MacroItem label={t('calories_label')} value={`${product.per_100g.calories_kcal}`} />
            <MacroItem label={t('protein')} value={`${product.per_100g.protein_g}g`} />
            <MacroItem label={t('carbs')} value={`${product.per_100g.carbohydrates_g}g`} />
            <MacroItem label={t('fats')} value={`${product.per_100g.fat_g}g`} />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Log button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          onPress={() => void handleLog()}
          disabled={isLogging}
          style={({ pressed }) => [
            styles.logButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            isLogging && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.logButtonText}>
            {isLogging ? t('logging') : t('barcode_log_meal')}
          </Text>
          {!isLogging && <Check size={18} color={colors.onPrimary} strokeWidth={2.5} />}
        </Pressable>
      </View>
    </View>
  );
};

const MacroItem = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View style={styles.macroItem}>
    <Text style={[styles.macroValue, highlight && { fontSize: 22, color: colors.primary }]}>{value}</Text>
    <Text style={styles.macroLabel}>{label}</Text>
  </View>
);

const MicroItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.microItem}>
    <Text style={styles.microLabel}>{label}</Text>
    <Text style={styles.microValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerHigh,
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  productBrand: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  barcodeText: {
    ...typography.labelSm,
    color: colors.outline,
    fontFamily: 'monospace',
  },
  nutriscoreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    marginTop: 4,
  },
  nutriscoreText: {
    ...typography.labelSm,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  portionInput: {
    ...typography.headlineMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 100,
    textAlign: 'center',
  },
  portionUnit: {
    ...typography.titleMd,
    color: colors.onSurfaceVariant,
  },
  servingHint: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  macroLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  microRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  microItem: {
    flexDirection: 'row',
    gap: 4,
  },
  microLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  microValue: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.full,
  },
  logButtonText: {
    ...typography.titleMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
