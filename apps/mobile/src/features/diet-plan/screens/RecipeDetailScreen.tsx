import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Clock, Flame, ImageIcon } from 'lucide-react-native';
import type { RootStackParamList } from '~/app/navigation/types';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import { usePlanById } from '../hooks/useActivePlan';
import { usePlanMealImage } from '../hooks/usePlanMealImage';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Route = RouteProp<RootStackParamList, 'RecipeDetail'>;

/**
 * Handles both newline-separated and inline-numbered instructions.
 * e.g. "1. Boil water\n2. Add pasta" or "1. Boil water. 2. Add pasta."
 */
function parseInstructions(raw: string): string[] {
  if (!raw) return [];

  const lines = raw.split(/\n/).filter(Boolean);
  if (lines.length > 1) return lines;

  // Fallback: split on inline numbered patterns like " 2. ", " 3. "
  const parts = raw.split(/\s+(?=\d+\.\s)/).filter(Boolean);
  if (parts.length > 1) return parts;

  return [raw.trim()];
}

export const RecipeDetailScreen = () => {
  const { t } = useTranslation('dietPlan');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { planId, mealId } = route.params;

  const { data: plan, isLoading } = usePlanById(planId);

  const meal = useMemo(() => {
    return plan?.meals.find((m) => m.id === mealId) ?? null;
  }, [plan, mealId]);

  const { data: imageSignedUrl } = usePlanMealImage(meal?.id ?? null, meal?.image_url ?? null);
  const imageHeight = Math.round(SCREEN_WIDTH * 0.65);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!meal) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ ...typography.bodyLg, color: colors.onSurfaceVariant }}>
          {t('recipe.notFound')}
        </Text>
      </View>
    );
  }

  const slotLabel = t(`slots.${meal.meal_slot}`, { defaultValue: meal.meal_slot });
  const instructions = parseInstructions(meal.recipe_instructions ?? '');

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: spacing.lg,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={{ ...typography.titleLg, color: colors.onSurface, flex: 1 }} numberOfLines={1}>
          {t('recipe.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <View
          style={{
            width: SCREEN_WIDTH,
            height: imageHeight,
            backgroundColor: colors.surfaceContainerHigh,
          }}
        >
          {imageSignedUrl ? (
            <Image
              source={{ uri: imageSignedUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}
            >
              <ActivityIndicator size="small" color={colors.outline} />
              <ImageIcon size={28} color={colors.outlineVariant} />
              <Text style={{ ...typography.labelMd, color: colors.outlineVariant }}>
                {t('recipe.generatingPhoto')}
              </Text>
            </View>
          )}
        </View>

        {/* Title block */}
        <Animated.View
          entering={FadeInDown.delay(0).duration(300).springify()}
          style={{ paddingHorizontal: spacing.lg }}
        >
          <Text style={{ ...typography.labelLg, color: colors.primary, marginBottom: 4 }}>
            {slotLabel}
          </Text>
          <Text style={{ ...typography.headlineLg, color: colors.onSurface }}>
            {meal.recipe_name}
          </Text>

          {/* Quick stats */}
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.lg,
              marginTop: spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Flame size={18} color={colors.tertiary} />
              <Text style={{ ...typography.titleMd, color: colors.onSurface }}>
                {Math.round(meal.calories)} kcal
              </Text>
            </View>
            {meal.prep_time_min != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Clock size={18} color={colors.outline} />
                <Text style={{ ...typography.titleMd, color: colors.onSurface }}>
                  {t('recipe.minutes', { n: meal.prep_time_min })}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Nutrition card */}
        <Animated.View
          entering={FadeInDown.delay(60).duration(300).springify()}
          style={{ paddingHorizontal: spacing.lg }}
        >
          <View
            style={{
              backgroundColor: colors.surfaceContainerLowest,
              borderRadius: radii.DEFAULT,
              padding: spacing.lg,
              ...elevation.ambient,
            }}
          >
            <Text
              style={{ ...typography.titleMd, color: colors.onSurface, marginBottom: spacing.md }}
            >
              {t('recipe.nutrition')}
            </Text>
            <NutrientRow
              label={t('recipe.protein')}
              value={`${Math.round(meal.protein_g)}g`}
              color={colors.macro.protein}
              pct={(meal.protein_g * 4) / Math.max(meal.calories, 1)}
            />
            <NutrientRow
              label={t('recipe.carbs')}
              value={`${Math.round(meal.carbs_g)}g`}
              color={colors.macro.carbs}
              pct={(meal.carbs_g * 4) / Math.max(meal.calories, 1)}
            />
            <NutrientRow
              label={t('recipe.fat')}
              value={`${Math.round(meal.fat_g)}g`}
              color={colors.macro.fat}
              pct={(meal.fat_g * 9) / Math.max(meal.calories, 1)}
            />
          </View>
        </Animated.View>

        {/* Ingredients */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(300).springify()}
          style={{ paddingHorizontal: spacing.lg }}
        >
          <Text
            style={{ ...typography.titleLg, color: colors.onSurface, marginBottom: spacing.sm }}
          >
            {t('recipe.ingredients')}
          </Text>
          {meal.ingredients.map((ing, i) => (
            <View
              key={`${ing.usda_fdc_id}-${i}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 8,
                borderBottomWidth: i < meal.ingredients.length - 1 ? 1 : 0,
                borderBottomColor: colors.outlineVariant,
              }}
            >
              <Text
                style={{ ...typography.bodyMd, color: colors.onSurface, flex: 1 }}
                numberOfLines={2}
              >
                {ing.name}
              </Text>
              <Text
                style={{
                  ...typography.labelLg,
                  color: colors.onSurfaceVariant,
                  marginLeft: spacing.sm,
                }}
              >
                {Math.round(ing.amount_g)}g
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Instructions */}
        {instructions.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(180).duration(300).springify()}
            style={{ paddingHorizontal: spacing.lg }}
          >
            <Text
              style={{ ...typography.titleLg, color: colors.onSurface, marginBottom: spacing.sm }}
            >
              {t('recipe.instructions')}
            </Text>
            {instructions.map((step, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  marginBottom: spacing.sm,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: `${colors.primary}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                  }}
                >
                  <Text style={{ ...typography.labelMd, color: colors.primary }}>{i + 1}</Text>
                </View>
                <Text
                  style={{
                    ...typography.bodyMd,
                    color: colors.onSurface,
                    flex: 1,
                    lineHeight: 22,
                  }}
                >
                  {step.replace(/^\d+[\.\)]\s*/, '')}
                </Text>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

const NutrientRow = ({
  label,
  value,
  color,
  pct,
}: {
  label: string;
  value: string;
  color: string;
  pct: number;
}) => (
  <View style={{ marginBottom: 10 }}>
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
      }}
    >
      <Text style={{ ...typography.labelLg, color: colors.onSurfaceVariant }}>{label}</Text>
      <Text style={{ ...typography.labelLg, color }}>{value}</Text>
    </View>
    <View
      style={{
        height: 6,
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${Math.min(pct * 100, 100)}%`,
          backgroundColor: color,
          borderRadius: 3,
        }}
      />
    </View>
  </View>
);
