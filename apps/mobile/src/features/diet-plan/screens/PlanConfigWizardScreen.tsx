import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, X, Plus, Sparkles } from 'lucide-react-native';
import type { RootStackParamList } from '~/app/navigation/types';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import { useUserTargets } from '~/features/dashboard/hooks/useUserTargets';
import type { PlanConfig } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DURATION_OPTIONS = [7, 14, 30] as const;
const MEALS_OPTIONS = [3, 4, 5] as const;
const COOKING_OPTIONS = ['quick', 'moderate', 'elaborate'] as const;

export const PlanConfigWizardScreen = () => {
  const { t } = useTranslation('dietPlan');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const [duration, setDuration] = useState<number>(7);
  const [mealsPerDay, setMealsPerDay] = useState<number>(3);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [excludedInput, setExcludedInput] = useState('');
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [cuisineInput, setCuisineInput] = useState('');
  const [cookingTime, setCookingTime] = useState<'quick' | 'moderate' | 'elaborate'>('moderate');
  const [mealBudgetPct, setMealBudgetPct] = useState(85);

  const { data: targets } = useUserTargets();
  const totalKcal = targets?.targetKcal ?? 2000;
  const budgetKcal = Math.round((totalKcal * mealBudgetPct) / 100);

  const addExcluded = useCallback(() => {
    const trimmed = excludedInput.trim();
    if (trimmed && !excluded.includes(trimmed)) {
      setExcluded((prev) => [...prev, trimmed]);
    }
    setExcludedInput('');
  }, [excludedInput, excluded]);

  const removeExcluded = useCallback((item: string) => {
    setExcluded((prev) => prev.filter((i) => i !== item));
  }, []);

  const addCuisine = useCallback(() => {
    const trimmed = cuisineInput.trim();
    if (trimmed && !cuisines.includes(trimmed)) {
      setCuisines((prev) => [...prev, trimmed]);
    }
    setCuisineInput('');
  }, [cuisineInput, cuisines]);

  const removeCuisine = useCallback((item: string) => {
    setCuisines((prev) => prev.filter((i) => i !== item));
  }, []);

  const handleGenerate = useCallback(() => {
    const config: PlanConfig = {
      duration_days: duration,
      meals_per_day: mealsPerDay,
      excluded_ingredients: excluded,
      cuisine_preferences: cuisines,
      cooking_time_pref: cookingTime,
      meal_budget_pct: mealBudgetPct,
    };

    navigation.replace('PlanCalendar', { config });
  }, [duration, mealsPerDay, excluded, cuisines, cookingTime, mealBudgetPct, navigation]);

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
        <Text style={{ ...typography.titleLg, color: colors.onSurface, flex: 1 }}>
          {t('wizard.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 100,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Duration */}
        <Animated.View entering={FadeInDown.delay(0).duration(300).springify()}>
          <Text style={sectionLabel}>{t('wizard.duration')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {DURATION_OPTIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDuration(d)}
                style={[chipBase, duration === d && chipActive]}
              >
                <Text style={[chipText, duration === d && chipTextActive]}>
                  {t(`wizard.durationOptions.${d}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Meals per day */}
        <Animated.View entering={FadeInDown.delay(50).duration(300).springify()}>
          <Text style={sectionLabel}>{t('wizard.mealsPerDay')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {MEALS_OPTIONS.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMealsPerDay(m)}
                style={[chipBase, mealsPerDay === m && chipActive]}
              >
                <Text style={[chipText, mealsPerDay === m && chipTextActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Excluded ingredients */}
        <Animated.View entering={FadeInDown.delay(100).duration(300).springify()}>
          <Text style={sectionLabel}>{t('wizard.excluded')}</Text>
          <View style={inputRow}>
            <TextInput
              value={excludedInput}
              onChangeText={setExcludedInput}
              onSubmitEditing={addExcluded}
              placeholder={t('wizard.excludedPlaceholder')}
              placeholderTextColor={colors.outline}
              style={textInput}
              returnKeyType="done"
            />
            <Pressable onPress={addExcluded} style={addBtn}>
              <Plus size={18} color={colors.onPrimary} />
            </Pressable>
          </View>
          {excluded.length > 0 && (
            <View style={tagRow}>
              {excluded.map((item) => (
                <View key={item} style={tag}>
                  <Text style={tagText}>{item}</Text>
                  <Pressable onPress={() => removeExcluded(item)} hitSlop={6}>
                    <X size={14} color={colors.onSurfaceVariant} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Cuisine preferences */}
        <Animated.View entering={FadeInDown.delay(150).duration(300).springify()}>
          <Text style={sectionLabel}>{t('wizard.cuisines')}</Text>
          <View style={inputRow}>
            <TextInput
              value={cuisineInput}
              onChangeText={setCuisineInput}
              onSubmitEditing={addCuisine}
              placeholder={t('wizard.cuisinePlaceholder')}
              placeholderTextColor={colors.outline}
              style={textInput}
              returnKeyType="done"
            />
            <Pressable onPress={addCuisine} style={addBtn}>
              <Plus size={18} color={colors.onPrimary} />
            </Pressable>
          </View>
          {cuisines.length > 0 && (
            <View style={tagRow}>
              {cuisines.map((item) => (
                <View key={item} style={tag}>
                  <Text style={tagText}>{item}</Text>
                  <Pressable onPress={() => removeCuisine(item)} hitSlop={6}>
                    <X size={14} color={colors.onSurfaceVariant} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Cooking time */}
        <Animated.View entering={FadeInDown.delay(200).duration(300).springify()}>
          <Text style={sectionLabel}>{t('wizard.cookingTime')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {COOKING_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setCookingTime(opt)}
                style={[chipBase, cookingTime === opt && chipActive, { flex: 1 }]}
              >
                <Text style={[chipText, cookingTime === opt && chipTextActive]}>
                  {t(`wizard.cookingOptions.${opt}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Meal calorie budget */}
        <Animated.View entering={FadeInDown.delay(250).duration(300).springify()}>
          <Text style={sectionLabel}>{t('wizard.mealBudget')}</Text>
          <Text
            style={{
              ...typography.bodySm,
              color: colors.onSurfaceVariant,
              marginBottom: spacing.sm,
            }}
          >
            {t('wizard.mealBudgetHint')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text
              style={{ ...typography.labelMd, color: colors.onSurfaceVariant }}
            >{`${mealBudgetPct}%`}</Text>
            <Slider
              style={{ flex: 1, height: 40 }}
              minimumValue={70}
              maximumValue={100}
              step={5}
              value={mealBudgetPct}
              onValueChange={(v) => setMealBudgetPct(Math.round(v))}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.surfaceContainerHigh}
              thumbTintColor={colors.primary}
            />
          </View>
          <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4 }}>
            {t('wizard.mealBudgetValue', {
              budget: budgetKcal,
              total: totalKcal,
              pct: mealBudgetPct,
            })}
          </Text>
        </Animated.View>

        {/* Generate button */}
        <Animated.View entering={FadeInDown.delay(300).duration(300).springify()}>
          <Pressable
            onPress={handleGenerate}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              borderRadius: radii.DEFAULT,
              padding: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              ...elevation.ambient,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Sparkles size={20} color={colors.onPrimary} />
            <Text style={{ ...typography.titleMd, color: colors.onPrimary, fontWeight: '700' }}>
              {t('wizard.generate')}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const sectionLabel = {
  ...typography.titleMd,
  color: colors.onSurface,
  marginBottom: spacing.sm,
} as const;

const chipBase = {
  paddingVertical: 10,
  paddingHorizontal: spacing.lg,
  borderRadius: radii.lg,
  backgroundColor: colors.surfaceContainerLow,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const chipActive = {
  backgroundColor: colors.primary,
};

const chipText = {
  ...typography.labelLg,
  color: colors.onSurfaceVariant,
};

const chipTextActive = {
  color: colors.onPrimary,
};

const inputRow = {
  flexDirection: 'row' as const,
  gap: spacing.sm,
  alignItems: 'center' as const,
};

const textInput = {
  flex: 1,
  ...typography.bodyMd,
  color: colors.onSurface,
  backgroundColor: colors.surfaceContainerLow,
  borderRadius: radii.sm,
  paddingHorizontal: spacing.md,
  paddingVertical: 10,
};

const addBtn = {
  width: 38,
  height: 38,
  borderRadius: radii.sm,
  backgroundColor: colors.primary,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const tagRow = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: spacing.xs,
  marginTop: spacing.sm,
};

const tag = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 4,
  backgroundColor: colors.surfaceContainerHigh,
  borderRadius: radii.full,
  paddingHorizontal: 12,
  paddingVertical: 6,
};

const tagText = {
  ...typography.labelMd,
  color: colors.onSurfaceVariant,
};
