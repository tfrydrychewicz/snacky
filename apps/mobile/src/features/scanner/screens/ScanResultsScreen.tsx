import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, View, Text, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { ShieldCheck, Check, Plus, ImageIcon } from 'lucide-react-native';
import RNFS from 'react-native-fs';
import type { IngredientAnalysis, MacroBreakdown, MealScanResult } from '@snacky/shared-types';
import { MealScanResultSchema } from '@snacky/shared-types';
import { AppHeader } from '~/shared/components/AppHeader';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import { getSupabase } from '~/shared/api/client';
import { useAuth } from '~/app/providers/AuthProvider';
import type { ScannerStackParamList } from '~/app/navigation/types';
import { ScanResultCard } from '../components/ScanResultCard';
import { IngredientEditor } from '../components/IngredientEditor';
import { ClarificationDialog } from '../components/ClarificationDialog';
import { CommentInput } from '../components/CommentInput';

type ResultsRoute = RouteProp<ScannerStackParamList, 'Results'>;

export const ScanResultsScreen = () => {
  const { t, i18n } = useTranslation('scanner');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ResultsRoute>();
  const { user } = useAuth();

  const { scanResult, photoUri, mealType } = route.params;

  const [ingredients, setIngredients] = useState<IngredientAnalysis[]>(scanResult.ingredients);
  const [comment, setComment] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isNewIngredient, setIsNewIngredient] = useState(false);
  const [clarificationIndex, setClarificationIndex] = useState(0);
  const clarificationAnswers = useRef<Array<{ question: string; answer: string }>>([]);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [currentScanResult, setCurrentScanResult] = useState<MealScanResult>(scanResult);
  const showClarification =
    currentScanResult.clarification_needed &&
    clarificationIndex < currentScanResult.clarification_questions.length;
  const [isLogging, setIsLogging] = useState(false);

  const totals: MacroBreakdown = useMemo(() => {
    return ingredients.reduce<MacroBreakdown>(
      (acc, ing) => ({
        calories_kcal: acc.calories_kcal + ing.macros.calories_kcal,
        protein_g: acc.protein_g + ing.macros.protein_g,
        carbohydrates_g: acc.carbohydrates_g + ing.macros.carbohydrates_g,
        fat_g: acc.fat_g + ing.macros.fat_g,
        fiber_g: (acc.fiber_g ?? 0) + (ing.macros.fiber_g ?? 0),
        sugar_g: (acc.sugar_g ?? 0) + (ing.macros.sugar_g ?? 0),
        sodium_mg: (acc.sodium_mg ?? 0) + (ing.macros.sodium_mg ?? 0),
      }),
      {
        calories_kcal: 0,
        protein_g: 0,
        carbohydrates_g: 0,
        fat_g: 0,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 0,
      },
    );
  }, [ingredients]);

  const handleUpdateIngredient = useCallback((index: number, updated: IngredientAnalysis) => {
    setIngredients((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
    setEditingIndex(null);
  }, []);

  const handleRemoveIngredient = useCallback(
    (index: number) => {
      const name = ingredients[index]?.name ?? '';
      Alert.alert(t('remove_ingredient'), t('remove_ingredient_confirm', { name }), [
        { text: t('edit_cancel'), style: 'cancel' },
        {
          text: t('remove_ingredient'),
          style: 'destructive',
          onPress: () => setIngredients((prev) => prev.filter((_, i) => i !== index)),
        },
      ]);
    },
    [ingredients, t],
  );

  const handleAddIngredient = useCallback(() => {
    const newIngredient: IngredientAnalysis = {
      name: t('ingredient_name'),
      quantity_g: 100,
      confidence: 1.0,
      macros: {
        calories_kcal: 0,
        protein_g: 0,
        carbohydrates_g: 0,
        fat_g: 0,
      },
      usda_fdc_id: null,
    };
    setIngredients((prev) => [...prev, newIngredient]);
    setIsNewIngredient(true);
    setEditingIndex(ingredients.length);
  }, [ingredients.length, t]);

  const triggerReanalysis = useCallback(async () => {
    if (!photoUri) return;
    setIsReanalyzing(true);
    try {
      const base64 = await RNFS.readFile(photoUri, 'base64');
      const supabase = getSupabase();
      const response = await supabase.functions.invoke<unknown>('meal-scan', {
        body: {
          image: base64,
          meal_type: mealType,
          locale: i18n.language,
          clarifications: clarificationAnswers.current,
        },
      });

      if (response.error) {
        console.error('[Reanalysis] Edge function error:', response.error);
        return;
      }

      const parsed = MealScanResultSchema.safeParse(response.data);
      if (!parsed.success) {
        console.error('[Reanalysis] Invalid response:', parsed.error.format());
        return;
      }

      setCurrentScanResult(parsed.data);
      setIngredients(parsed.data.ingredients);
    } catch (err) {
      console.error('[Reanalysis] Failed:', err);
    } finally {
      setIsReanalyzing(false);
    }
  }, [photoUri, mealType, i18n.language]);

  const handleClarificationSubmit = useCallback(
    (question: string, answer: string) => {
      clarificationAnswers.current.push({ question, answer });
      const nextIndex = clarificationIndex + 1;
      setClarificationIndex(nextIndex);

      if (nextIndex >= currentScanResult.clarification_questions.length) {
        void triggerReanalysis();
      }
    },
    [clarificationIndex, currentScanResult.clarification_questions.length, triggerReanalysis],
  );

  const handleClarificationSkip = useCallback(() => {
    const nextIndex = clarificationIndex + 1;
    setClarificationIndex(nextIndex);

    if (nextIndex >= currentScanResult.clarification_questions.length && clarificationAnswers.current.length > 0) {
      void triggerReanalysis();
    }
  }, [clarificationIndex, currentScanResult.clarification_questions.length, triggerReanalysis]);

  const hasModifications = JSON.stringify(ingredients) !== JSON.stringify(scanResult.ingredients);

  const handleConfirmAndLog = useCallback(async () => {
    if (!user) return;
    setIsLogging(true);

    try {
      const supabase = getSupabase();

      // Upload photo if available
      let imageKey: string | null = null;
      if (photoUri) {
        const photoResponse = await fetch(photoUri);
        const blob = await photoResponse.blob();
        const storagePath = `${user.id}/${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('meal-photos')
          .upload(storagePath, blob, { contentType: 'image/jpeg' });

        if (!uploadError) {
          imageKey = storagePath;
        } else {
          console.warn('Photo upload failed:', uploadError.message);
        }
      }

      const modificationDiff = hasModifications
        ? {
            original_ingredients: scanResult.ingredients,
            modified_ingredients: ingredients,
          }
        : null;

      const { data: meal, error: mealError } = (await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          logged_at: new Date().toISOString(),
          timezone_offset: new Date().getTimezoneOffset(),
          image_key: imageKey,
          ai_analysis: {
            model_used: scanResult.model_used,
            processing_time_ms: scanResult.processing_time_ms,
            overall_confidence: scanResult.overall_confidence,
            nova_classification: scanResult.nova_classification,
            original_total: scanResult.total,
          },
          total_calories: totals.calories_kcal,
          total_protein_g: totals.protein_g,
          total_carbs_g: totals.carbohydrates_g,
          total_fat_g: totals.fat_g,
          total_fiber_g: totals.fiber_g ?? 0,
          total_sugar_g: totals.sugar_g ?? 0,
          total_sodium_mg: totals.sodium_mg ?? 0,
          user_modified: hasModifications,
          modification_diff: modificationDiff,
          source: 'scan',
          nova_class: scanResult.nova_classification,
        })
        .select('id')
        .single()) as { data: { id: string } | null; error: { message: string } | null };

      if (mealError || !meal) {
        throw new Error(mealError?.message ?? 'Failed to create meal');
      }

      const ingredientRows = ingredients.map((ing, i) => ({
        meal_id: meal.id,
        name: ing.name,
        usda_fdc_id: ing.usda_fdc_id,
        portion_g: ing.quantity_g,
        calories: ing.macros.calories_kcal,
        protein_g: ing.macros.protein_g,
        carbs_g: ing.macros.carbohydrates_g,
        fat_g: ing.macros.fat_g,
        confidence: ing.confidence,
        user_verified: hasModifications,
        sort_order: i,
      }));

      const { error: ingError } = await supabase.from('meal_ingredients').insert(ingredientRows);

      if (ingError) {
        console.warn('Failed to save ingredients:', ingError.message);
      }

      Alert.alert(t('log_success'));
      navigation.goBack();
    } catch (err) {
      console.error('Meal logging failed:', err);
      Alert.alert(t('log_error'));
    } finally {
      setIsLogging(false);
    }
  }, [user, photoUri, mealType, ingredients, totals, scanResult, hasModifications, navigation, t]);

  const overallConfidence = Math.round(currentScanResult.overall_confidence * 100);
  const totalCalories = Math.round(totals.calories_kcal);

  const macroTotalG = totals.protein_g + totals.carbohydrates_g + totals.fat_g;
  const proteinPct = macroTotalG > 0 ? (totals.protein_g / macroTotalG) * 100 : 33;
  const carbsPct = macroTotalG > 0 ? (totals.carbohydrates_g / macroTotalG) * 100 : 33;
  const fatPct = macroTotalG > 0 ? (totals.fat_g / macroTotalG) * 100 : 34;

  return (
    <View style={styles.root}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Banner */}
        <View style={styles.photoBanner}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoImage} resizeMode="cover" />
          ) : (
            <ImageIcon size={64} color={colors.outline} strokeWidth={1.2} />
          )}
          <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.confidenceBadge}>
            <ShieldCheck size={16} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.confidenceText}>{t('confidence', { pct: overallConfidence })}</Text>
          </Animated.View>
        </View>

        {/* Results Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.card}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>{t('results_title')}</Text>
              <Text style={styles.cardSubtitle}>
                {t('identified_count', { count: ingredients.length })}
              </Text>
            </View>
            <View style={styles.totalBadge}>
              <Text style={styles.totalLabel}>{t('total')}</Text>
              <Text style={styles.totalValue}>{totalCalories}</Text>
              <Text style={styles.totalUnit}>kcal</Text>
            </View>
          </View>

          {/* Ingredient List */}
          <View style={styles.ingredientList}>
            {ingredients.map((ing, i) => (
              <ScanResultCard
                key={`${ing.name}-${i}`}
                ingredient={ing}
                index={i}
                onEdit={() => { setIsNewIngredient(false); setEditingIndex(i); }}
                onRemove={() => handleRemoveIngredient(i)}
              />
            ))}
          </View>

          {/* Add ingredient */}
          <Pressable onPress={handleAddIngredient} style={styles.addBtn}>
            <Plus size={18} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.addBtnText}>{t('add_ingredient')}</Text>
          </Pressable>

          {/* Macro Breakdown */}
          <View style={styles.macroSection}>
            <Text style={styles.macroSectionTitle}>{t('macro_breakdown')}</Text>
            <View style={styles.macroBar}>
              <View
                style={[
                  styles.macroSegment,
                  { width: `${proteinPct}%`, backgroundColor: colors.macro.protein },
                ]}
              />
              <View
                style={[
                  styles.macroSegment,
                  { width: `${carbsPct}%`, backgroundColor: colors.macro.carbs },
                ]}
              />
              <View
                style={[
                  styles.macroSegment,
                  { width: `${fatPct}%`, backgroundColor: colors.macro.fat },
                ]}
              />
            </View>
            <View style={styles.macroLabels}>
              <MacroLabel
                label={t('protein')}
                value={totals.protein_g}
                color={colors.macro.protein}
              />
              <MacroLabel
                label={t('carbs')}
                value={totals.carbohydrates_g}
                color={colors.macro.carbs}
              />
              <MacroLabel label={t('fats')} value={totals.fat_g} color={colors.macro.fat} />
            </View>
          </View>

          {/* Comment */}
          <CommentInput value={comment} onChange={setComment} />

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              onPress={() => void handleConfirmAndLog()}
              disabled={isLogging}
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                isLogging && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.confirmText}>{isLogging ? t('logging') : t('confirm_log')}</Text>
              {!isLogging && <Check size={18} color={colors.onPrimary} strokeWidth={2.5} />}
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Ingredient Editor Modal */}
      {editingIndex !== null && ingredients[editingIndex] && (
        <IngredientEditor
          ingredient={ingredients[editingIndex]}
          visible={true}
          isNew={isNewIngredient}
          onClose={() => setEditingIndex(null)}
          onSave={(updated) => handleUpdateIngredient(editingIndex, updated)}
        />
      )}

      {/* Re-analysis overlay */}
      {isReanalyzing && (
        <View style={styles.reanalysisOverlay}>
          <View style={styles.reanalysisCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.reanalysisText}>{t('reanalyzing')}</Text>
          </View>
        </View>
      )}

      {/* Clarification Dialog */}
      {showClarification &&
        currentScanResult.clarification_questions[clarificationIndex] != null && (
          <ClarificationDialog
            question={currentScanResult.clarification_questions[clarificationIndex]}
            visible={showClarification}
            currentRound={clarificationIndex + 1}
            maxRounds={currentScanResult.clarification_questions.length}
            onSubmit={handleClarificationSubmit}
            onSkip={handleClarificationSkip}
          />
        )}
    </View>
  );
};

const MacroLabel = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View>
    <Text style={styles.macroLabelText}>{label}</Text>
    <Text style={[styles.macroLabelValue, { color }]}>{Math.round(value)}g</Text>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  photoBanner: {
    height: 280,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  confidenceBadge: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    ...elevation.ambient,
  },
  confidenceText: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  card: {
    marginTop: -60,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.DEFAULT,
    padding: spacing.lg,
    ...elevation.float,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  cardTitle: {
    ...typography.headlineLg,
    color: colors.onSurface,
  },
  cardSubtitle: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  totalBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  totalLabel: {
    ...typography.labelSm,
    color: colors.primaryFixed,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  totalValue: {
    ...typography.headlineMd,
    color: colors.onPrimary,
  },
  totalUnit: {
    ...typography.labelSm,
    color: colors.primaryFixed,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  ingredientList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radii.DEFAULT,
    marginBottom: spacing.xl,
  },
  addBtnText: {
    ...typography.titleMd,
    color: colors.primary,
    fontWeight: '600',
  },
  macroSection: {
    backgroundColor: `${colors.surfaceContainerHighest}50`,
    borderRadius: radii.DEFAULT,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  macroSectionTitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  macroBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  macroSegment: {
    height: '100%',
  },
  macroLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroLabelText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  macroLabelValue: {
    ...typography.titleLg,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmText: {
    ...typography.titleMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  reanalysisOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  reanalysisCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.DEFAULT,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    ...elevation.float,
  },
  reanalysisText: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
});
