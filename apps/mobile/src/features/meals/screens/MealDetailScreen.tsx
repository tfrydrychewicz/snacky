import React, { useCallback } from 'react';
import { View, Text, Image, ScrollView, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  ShieldCheck,
  ImageIcon,
  Scan,
  PenLine,
} from 'lucide-react-native';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import type { RootStackParamList } from '~/app/navigation/types';
import { useMealDetail } from '../hooks/useMealDetail';
import { useMealPhoto } from '../hooks/useMealPhoto';
import { useDeleteMeal } from '../hooks/useMealMutations';
import { NutritionBreakdown } from '../components/NutritionBreakdown';
import { MealCommentList } from '../components/MealCommentList';

type DetailRoute = RouteProp<RootStackParamList, 'MealDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍿',
};

export const MealDetailScreen = () => {
  const { t } = useTranslation('meals');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const { mealId } = route.params;

  const { data: meal, isLoading } = useMealDetail(mealId);
  const { data: imageUrl } = useMealPhoto(meal?.image_key ?? null);
  const deleteMeal = useDeleteMeal();

  const handleDelete = useCallback(() => {
    Alert.alert(t('delete_title'), t('delete_confirm'), [
      { text: t('edit_cancel'), style: 'cancel' },
      {
        text: t('delete_title'),
        style: 'destructive',
        onPress: () => {
          deleteMeal.mutate(mealId, {
            onSuccess: () => {
              Alert.alert(t('delete_success'));
              navigation.goBack();
            },
            onError: () => Alert.alert(t('delete_error')),
          });
        },
      },
    ]);
  }, [mealId, deleteMeal, navigation, t]);

  if (isLoading || !meal) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const MEAL_TYPE_I18N: Record<string, 'meal_type_breakfast' | 'meal_type_lunch' | 'meal_type_dinner' | 'meal_type_snack'> = {
    breakfast: 'meal_type_breakfast',
    lunch: 'meal_type_lunch',
    dinner: 'meal_type_dinner',
    snack: 'meal_type_snack',
  };
  const mealTypeKey = MEAL_TYPE_I18N[meal.meal_type] ?? 'meal_type_snack';
  const loggedTime = new Date(meal.logged_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const aiAnalysis = meal.ai_analysis as Record<string, unknown> | null;
  const overallConfidence =
    typeof aiAnalysis?.overall_confidence === 'number'
      ? Math.round((aiAnalysis.overall_confidence as number) * 100)
      : null;
  const isManual = meal.source === 'manual';

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Banner */}
        <View style={styles.photoBanner}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.photoImage} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <ImageIcon size={64} color={colors.outlineVariant} strokeWidth={1.2} />
            </View>
          )}
          <View style={[styles.backButtonArea, { top: insets.top + 8 }]}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
            >
              <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2} />
            </Pressable>
          </View>
          {overallConfidence != null && (
            <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.confidenceBadge}>
              <ShieldCheck size={16} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.confidenceText}>{overallConfidence}%</Text>
            </Animated.View>
          )}
        </View>

        {/* Main Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.card}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.mealType}>
                {MEAL_TYPE_EMOJI[meal.meal_type] ?? '🍽️'} {t(mealTypeKey)}
              </Text>
              <Text style={styles.loggedAt}>{t('detail_logged_at', { time: loggedTime })}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => navigation.navigate('MealEdit', { mealId })}
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
              >
                <Edit3 size={18} color={colors.primary} strokeWidth={2} />
              </Pressable>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
              >
                <Trash2 size={18} color={colors.error} strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          {/* Source badge */}
          <View style={styles.sourceBadge}>
            {isManual ? (
              <PenLine size={12} color={colors.onSurfaceVariant} strokeWidth={2} />
            ) : (
              <Scan size={12} color={colors.onSurfaceVariant} strokeWidth={2} />
            )}
            <Text style={styles.sourceText}>
              {isManual ? t('detail_source_manual') : t('detail_source_scan')}
            </Text>
            {meal.nova_class != null && (
              <Text style={styles.novaText}>{t('detail_nova', { class: meal.nova_class })}</Text>
            )}
          </View>

          {/* Nutrition */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('detail_nutrition')}</Text>
            <NutritionBreakdown
              calories={meal.total_calories}
              protein={meal.total_protein_g}
              carbs={meal.total_carbs_g}
              fat={meal.total_fat_g}
              fiber={meal.total_fiber_g}
              sugar={meal.total_sugar_g}
              sodium={meal.total_sodium_mg}
            />
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('detail_ingredients')} ({meal.meal_ingredients.length})
            </Text>
            <View style={styles.ingredientList}>
              {meal.meal_ingredients.map((ing, i) => {
                const confidenceLevel =
                  ing.confidence >= 0.8
                    ? 'high'
                    : ing.confidence >= 0.5
                      ? 'medium'
                      : 'low';
                const confidenceColor =
                  confidenceLevel === 'high'
                    ? colors.primary
                    : confidenceLevel === 'medium'
                      ? colors.tertiary
                      : colors.error;

                return (
                  <Animated.View
                    key={ing.id}
                    entering={FadeInDown.delay(200 + i * 50).duration(400)}
                    style={styles.ingredientRow}
                  >
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.ingredientName}>{ing.name}</Text>
                      <Text style={styles.ingredientPortion}>
                        {t('ingredient_portion', { value: Math.round(ing.portion_g) })}
                      </Text>
                    </View>
                    <View style={styles.ingredientMacros}>
                      <Text style={styles.ingredientCal}>
                        {Math.round(ing.calories)} kcal
                      </Text>
                      <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </View>

          {/* AI vs Final diff */}
          {meal.user_modified && meal.modification_diff && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('detail_ai_vs_final')}</Text>
              <View style={styles.diffContainer}>
                <DiffColumn
                  label={t('detail_original')}
                  data={meal.modification_diff as Record<string, unknown>}
                  field="original_ingredients"
                />
                <DiffColumn
                  label={t('detail_modified')}
                  data={meal.modification_diff as Record<string, unknown>}
                  field="modified_ingredients"
                />
              </View>
            </View>
          )}

          {/* Comments */}
          <MealCommentList mealId={mealId} />
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const DiffColumn = ({
  label,
  data,
  field,
}: {
  label: string;
  data: Record<string, unknown>;
  field: string;
}) => {
  const items = data[field] as Array<{ name: string; quantity_g: number }> | undefined;
  if (!items) return null;

  return (
    <View style={styles.diffColumn}>
      <Text style={styles.diffLabel}>{label}</Text>
      {items.map((item, i) => (
        <Text key={i} style={styles.diffItem}>
          {item.name} — {Math.round(item.quantity_g)}g
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBanner: {
    height: 280,
    backgroundColor: colors.surfaceContainerHigh,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonArea: {
    position: 'absolute',
    left: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.ambient,
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
    marginBottom: spacing.sm,
  },
  mealType: {
    ...typography.headlineLg,
    color: colors.onSurface,
  },
  loggedAt: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.lg,
  },
  sourceText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  novaText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginLeft: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  ingredientList: {
    gap: spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  ingredientPortion: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  ingredientMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ingredientCal: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  diffContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  diffColumn: {
    flex: 1,
  },
  diffLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  diffItem: {
    ...typography.bodySm,
    color: colors.onSurface,
    marginBottom: 2,
  },
});
