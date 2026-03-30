import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, ShoppingCart, Trash2 } from 'lucide-react-native';
import type { RootStackParamList } from '~/app/navigation/types';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';
import { usePlanById, useGeneratingPlan } from '../hooks/useActivePlan';
import { useDeletePlan } from '../hooks/useDeletePlan';
import { useWorkflowGeneration } from '../hooks/useWorkflowGeneration';
import { useWorkflowProgress } from '../hooks/useWorkflowProgress';
import { MealSlotCard } from '../components/MealSlotCard';
import type { PlanMeal } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'PlanCalendar'>;

const POLL_INTERVAL_MS = 3000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStepLabel(stepId: string | null, t: (...args: any[]) => string): string {
  if (!stepId) return t('calendar.generatingDay');
  if (stepId === 'fetch-profile') return t('calendar.stepFetchProfile');
  const chunkMatch = stepId.match(/chunk-(\d+)-(\d+)/);
  if (chunkMatch) {
    return t('calendar.stepGenerateChunk', { start: chunkMatch[1], end: chunkMatch[2] });
  }
  if (stepId === 'optimize-portions') return t('calendar.stepOptimize');
  if (stepId === 'finalize-plan') return t('calendar.stepFinalize');
  if (stepId === 'send-notification') return t('calendar.stepFinalize');
  return t('calendar.generatingDay');
}

export const PlanCalendarScreen = () => {
  const { t } = useTranslation('dietPlan');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { planId: routePlanId, config } = route.params;

  // Workflow-based generation (initialises from MMKV if a generation was in progress)
  const workflow = useWorkflowGeneration();
  const generationStarted = useRef(false);

  useEffect(() => {
    if (config && !generationStarted.current) {
      generationStarted.current = true;
      void workflow.generate(config);
    }
  }, [config]);

  // Fallback: if neither route param nor MMKV had a planId, check DB for a 'generating' plan
  const { data: generatingPlan } = useGeneratingPlan();
  const fallbackPlanId =
    !config && !routePlanId && !workflow.planId ? (generatingPlan?.planId ?? null) : null;

  const resolvedPlanId = routePlanId ?? workflow.planId ?? fallbackPlanId;

  // Poll workflow progress for step-level visibility
  const { data: progress } = useWorkflowProgress(resolvedPlanId);

  // Poll plan data (meals) while generating
  const isWorkflowActive = progress ? !progress.isTerminal : workflow.isGenerating;
  const { data: savedPlan, isLoading: isSavedPlanLoading } = usePlanById(resolvedPlanId ?? '', {
    refetchInterval: isWorkflowActive ? POLL_INTERVAL_MS : false,
  });

  // Generation is active until plan status leaves 'generating'
  const isGenerating = isWorkflowActive || savedPlan?.status === 'generating';

  // Notify the generation hook when workflow completes
  useEffect(() => {
    if (progress?.isTerminal && workflow.isGenerating) {
      if (progress.runStatus === 'completed') {
        workflow.setCompleted();
      } else if (progress.runStatus === 'failed') {
        workflow.setError(progress.runError ?? t('calendar.generationError'));
      }
    }
  }, [progress?.isTerminal, progress?.runStatus]);

  const plan = savedPlan ?? null;
  const totalDays = config?.duration_days ?? plan?.config?.duration_days ?? 7;

  const generatedDays = useMemo(() => {
    const days = new Set<number>();
    if (plan?.meals) {
      for (const meal of plan.meals) {
        days.add(meal.day_number);
      }
    }
    return days;
  }, [plan?.meals]);

  const [selectedDay, setSelectedDay] = useState(1);
  const dayScrollRef = useRef<ScrollView>(null);
  const deletePlan = useDeletePlan();

  const mealsForDay = useMemo(() => {
    const meals = plan?.meals ?? [];
    return meals
      .filter((m) => m.day_number === selectedDay)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [plan, selectedDay]);

  const lastAutoSelectedDay = useRef(0);
  useEffect(() => {
    if (isGenerating && generatedDays.size > 0 && lastAutoSelectedDay.current === 0) {
      const minDay = Math.min(...generatedDays);
      setSelectedDay(minDay);
      lastAutoSelectedDay.current = minDay;
    }
  }, [isGenerating, generatedDays]);

  const handleDayPress = useCallback((day: number) => {
    setSelectedDay(day);
  }, []);

  const handleMealPress = useCallback(
    (meal: PlanMeal) => {
      if (!resolvedPlanId) return;
      navigation.navigate('RecipeDetail', { planId: resolvedPlanId, mealId: meal.id });
    },
    [navigation, resolvedPlanId],
  );

  const handleShopping = useCallback(() => {
    if (!resolvedPlanId) return;
    navigation.navigate('ShoppingList', { planId: resolvedPlanId });
  }, [navigation, resolvedPlanId]);

  const handleDelete = useCallback(() => {
    if (!resolvedPlanId) return;
    Alert.alert(t('calendar.deleteConfirmTitle'), t('calendar.deleteConfirmMessage'), [
      { text: t('calendar.deleteConfirmCancel'), style: 'cancel' },
      {
        text: t('calendar.deleteConfirmDelete'),
        style: 'destructive',
        onPress: () => {
          deletePlan.mutate(resolvedPlanId, {
            onSuccess: () => navigation.goBack(),
          });
        },
      },
    ]);
  }, [t, deletePlan, resolvedPlanId, navigation]);

  const isLoading = !config && !fallbackPlanId && !workflow.planId && isSavedPlanLoading;

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

  if (!config && !fallbackPlanId && !workflow.planId && !plan) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ ...typography.bodyLg, color: colors.onSurfaceVariant }}>Plan not found</Text>
      </View>
    );
  }

  const isDayGenerated = (day: number) => (isGenerating ? generatedDays.has(day) : true);

  const canInteract = !!resolvedPlanId && !isGenerating;

  const progressLabel = isGenerating
    ? progress?.currentStep
      ? getStepLabel(progress.currentStep, t)
      : t('calendar.generatingPlan', { done: generatedDays.size, total: totalDays })
    : '';

  const showError = (workflow.error || progress?.runStatus === 'failed') && !isGenerating;

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
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <ChevronLeft size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={{ ...typography.titleLg, color: colors.onSurface }}>
            {t('calendar.title')}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {canInteract && (
            <>
              <Pressable
                onPress={handleDelete}
                hitSlop={12}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: `${colors.error}12`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={18} color={colors.error} />
              </Pressable>

              <Pressable
                onPress={handleShopping}
                hitSlop={12}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: `${colors.primary}15`,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radii.full,
                }}
              >
                <ShoppingCart size={16} color={colors.primary} />
                <Text style={{ ...typography.labelMd, color: colors.primary }}>
                  {t('calendar.shopping')}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Day selector */}
      <ScrollView
        ref={dayScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          gap: spacing.xs,
          paddingBottom: spacing.md,
        }}
      >
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const isSelected = day === selectedDay;
          const generated = isDayGenerated(day);
          const startDate = plan?.start_date;
          const dayDate = startDate
            ? new Date(new Date(startDate).getTime() + (day - 1) * 86_400_000)
            : null;
          const isToday = dayDate
            ? dayDate.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
            : false;

          return (
            <Pressable
              key={day}
              onPress={() => generated && handleDayPress(day)}
              disabled={!generated}
              style={{
                width: 56,
                height: 64,
                borderRadius: radii.sm,
                backgroundColor: isSelected
                  ? colors.primary
                  : generated
                    ? colors.surfaceContainerLow
                    : colors.surfaceContainerHigh,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                opacity: generated ? 1 : 0.7,
              }}
            >
              {!generated ? (
                <ActivityIndicator size="small" color={colors.outline} />
              ) : (
                <>
                  <Text
                    style={{
                      ...typography.labelSm,
                      color: isSelected ? colors.onPrimary : colors.outline,
                    }}
                  >
                    {isToday
                      ? t('calendar.today')
                      : dayDate
                        ? dayDate.toLocaleDateString(undefined, { weekday: 'short' })
                        : ''}
                  </Text>
                  <Text
                    style={{
                      ...typography.titleMd,
                      color: isSelected ? colors.onPrimary : colors.onSurface,
                      fontWeight: '700',
                    }}
                  >
                    {day}
                  </Text>
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Meals for selected day */}
      <FlatList
        data={mealsForDay}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 60)
              .duration(300)
              .springify()}
            style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}
          >
            <MealSlotCard meal={item} onPress={() => handleMealPress(item)} />
          </Animated.View>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
            <Text style={{ ...typography.headlineMd, color: colors.onSurface }}>
              {t('calendar.day', { n: selectedDay })}
            </Text>
            {isGenerating && !isDayGenerated(selectedDay) && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  marginTop: spacing.sm,
                }}
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ ...typography.bodyMd, color: colors.onSurfaceVariant }}>
                  {t('calendar.generatingDay')}
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          isDayGenerated(selectedDay) ? (
            <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
              <Text style={{ ...typography.bodyLg, color: colors.onSurfaceVariant }}>
                {t('calendar.noMeals')}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Generation status bar with step-level progress */}
      {isGenerating && (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 16,
            left: spacing.lg,
            right: spacing.lg,
            backgroundColor: colors.primaryContainer,
            borderRadius: radii.DEFAULT,
            padding: spacing.md,
            gap: spacing.xs,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
            <Text style={{ ...typography.labelLg, color: colors.onPrimaryContainer, flex: 1 }}>
              {progressLabel}
            </Text>
          </View>
          {progress && progress.completedSteps.length > 0 && (
            <View
              style={{
                height: 3,
                backgroundColor: `${colors.onPrimaryContainer}30`,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${Math.round((progress.completedSteps.length / Math.max(progress.steps.length + 1, 5)) * 100)}%`,
                  backgroundColor: colors.onPrimaryContainer,
                  borderRadius: 2,
                }}
              />
            </View>
          )}
        </View>
      )}

      {/* Error state */}
      {showError && (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 16,
            left: spacing.lg,
            right: spacing.lg,
            backgroundColor: `${colors.error}15`,
            borderRadius: radii.DEFAULT,
            padding: spacing.md,
          }}
        >
          <Text style={{ ...typography.bodyMd, color: colors.error }}>
            {t('calendar.generationError')}
          </Text>
        </View>
      )}
    </View>
  );
};
