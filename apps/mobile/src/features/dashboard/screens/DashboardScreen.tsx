import React, { useCallback } from 'react';
import { ScrollView, View, Text, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn } from 'react-native-reanimated';
import { TrendingDown } from 'lucide-react-native';
import { useAuth } from '~/app/providers/AuthProvider';
import type { RootStackParamList } from '~/app/navigation/types';
import { AppHeader } from '~/shared/components/AppHeader';
import { BentoTile } from '~/shared/components/BentoTile';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';
import { useDailySummary } from '../hooks/useDailySummary';
import { useUserTargets } from '../hooks/useUserTargets';
import { DQIDashboardTile } from '../components/DQIDashboardTile';
import { CalorieBudgetTile } from '../components/CalorieBudgetTile';
import { MacroSummaryTile } from '../components/MacroSummaryTile';
import { RecentMealsTile } from '../components/RecentMealsTile';
import { QuickActionsTile } from '../components/QuickActionsTile';
import { DietPlanTile } from '~/features/diet-plan/components/DietPlanTile';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const DashboardScreen = () => {
  const { t } = useTranslation('dashboard');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const {
    data: summary,
    isRefetching: isSummaryRefetching,
    refetch: refetchSummary,
  } = useDailySummary();
  const {
    data: targets,
    isRefetching: isTargetsRefetching,
    refetch: refetchTargets,
  } = useUserTargets();

  const fullName = String(user?.user_metadata?.full_name ?? '');
  const displayName = fullName.split(' ')[0] || 'User';

  const consumed = summary?.totalCalories ?? 0;
  const targetKcal = targets?.targetKcal ?? 2000;
  const pct = targetKcal > 0 ? Math.round((consumed / targetKcal) * 100) : 0;

  const isRefreshing = isSummaryRefetching || isTargetsRefetching;

  const handleRefresh = useCallback(() => {
    void refetchSummary();
    void refetchTargets();
  }, [refetchSummary, refetchTargets]);

  const openSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const navigateToScanner = useCallback(() => {
    navigation.navigate('Main', { screen: 'Scanner' } as never);
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader onSettingsPress={openSettings} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 100,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Welcome Section */}
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{ ...typography.displaySm, color: colors.onSurface }}>
            {t('greeting', { name: displayName })}
          </Text>
          <Text
            style={{
              ...typography.bodyLg,
              color: colors.onSurfaceVariant,
              marginTop: 4,
              fontWeight: '500',
            }}
          >
            {summary && summary.mealCount > 0
              ? t('subtitle_progress', { pct })
              : t('subtitle_no_meals')}
          </Text>
        </Animated.View>

        {/* Calorie Budget */}
        <CalorieBudgetTile consumed={Math.round(consumed)} target={targetKcal} index={0} />

        {/* Quick Actions */}
        <QuickActionsTile
          onScan={navigateToScanner}
          onManualEntry={() => navigation.navigate('ManualMealEntry')}
          onWeightEntry={() => navigation.navigate('MeasurementInput', { quickWeight: true })}
          index={1}
        />

        {/* Diet Plan */}
        <DietPlanTile
          onCreatePlan={() => navigation.navigate('PlanWizard')}
          onViewPlan={(planId) => navigation.navigate('PlanCalendar', { planId })}
          index={2}
        />

        {/* Daily Macros */}
        <MacroSummaryTile
          protein={summary?.totalProteinG ?? 0}
          proteinTarget={targets?.targetProteinG ?? 120}
          carbs={summary?.totalCarbsG ?? 0}
          carbsTarget={targets?.targetCarbsG ?? 250}
          fat={summary?.totalFatG ?? 0}
          fatTarget={targets?.targetFatG ?? 65}
          index={3}
        />

        {/* Recent Meals */}
        <RecentMealsTile
          meals={summary?.meals ?? []}
          onViewHistory={() => navigation.navigate('MealTimeline')}
          onMealPress={(mealId) => navigation.navigate('MealDetail', { mealId })}
          index={4}
        />

        {/* Weight Trend (placeholder) */}
        <BentoTile index={5}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: spacing.sm,
            }}
          >
            <Text style={{ ...typography.titleLg, flex: 1 }}>{t('tiles.weightTrend')}</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: `${colors.primaryFixed}30`,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radii.full,
              }}
            >
              <TrendingDown size={12} color={colors.primary} strokeWidth={2.5} />
              <Text style={{ ...typography.labelSm, color: colors.primary, marginLeft: 2 }}>—</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 }}>
            <Text style={{ ...typography.headlineLg, color: colors.onSurfaceVariant }}>—</Text>
          </View>
          <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, fontWeight: '500' }}>
            {t('tiles.weightLost', { lbs: '—' })}
          </Text>
        </BentoTile>
        {/* Diet Quality */}
        <DQIDashboardTile index={6} />
      </ScrollView>
    </View>
  );
};
