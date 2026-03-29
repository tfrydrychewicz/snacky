import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { UtensilsCrossed } from 'lucide-react-native';
import { AppHeader } from '~/shared/components/AppHeader';
import { BentoTile } from '~/shared/components/BentoTile';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';
import { WeightChart } from '../components/WeightChart';
import { MacroTrendChart } from '../components/MacroTrendChart';
import { CalorieChart } from '../components/CalorieChart';
import { WeeklyReportCard } from '../components/WeeklyReportCard';
import { DQIScoreCard } from '../components/DQIScoreCard';
import { useDailyAggregates, useWeightTrend, computeWeeklyReport } from '../hooks/useTrendData';
import { useWeeklyDQI } from '../hooks/useWeeklyDQI';
import { useUserTargets } from '~/features/dashboard/hooks/useUserTargets';
import type { RootStackParamList } from '~/app/navigation/types';

type Tab = 'overview' | 'weight' | 'macros' | 'calories';

const TABS: Tab[] = ['overview', 'weight', 'macros', 'calories'];

export const TrendsScreen = () => {
  const { t } = useTranslation('trends');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: aggregates, isLoading: agLoading } = useDailyAggregates(30);
  const { data: weightData, isLoading: wLoading } = useWeightTrend(30);
  const { data: targets } = useUserTargets();
  const { data: dqiResult } = useWeeklyDQI();

  const weeklyReport = useMemo(() => {
    if (!aggregates || !targets) return null;
    return computeWeeklyReport(
      aggregates,
      targets.targetKcal,
      targets.targetProteinG,
      targets.targetCarbsG,
      targets.targetFatG,
    );
  }, [aggregates, targets]);

  const isLoading = agLoading || wLoading;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader />

      {/* Tab bar */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
          gap: spacing.xs,
        }}
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: radii.full,
              backgroundColor: activeTab === tab ? colors.primary : colors.surfaceContainerLow,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                ...typography.labelMd,
                color: activeTab === tab ? colors.onPrimary : colors.onSurfaceVariant,
                fontWeight: activeTab === tab ? '700' : '500',
              }}
            >
              {t(`tab_${tab}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + 100,
            paddingTop: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'overview' && (
            <>
              {/* DQI Score */}
              <BentoTile index={0} style={{ marginBottom: spacing.lg }}>
                <DQIScoreCard
                  score={dqiResult?.score}
                  change={dqiResult?.change}
                  hasEnoughData={dqiResult?.hasEnoughData}
                />
              </BentoTile>

              {/* Weight Trend */}
              <BentoTile index={1} variant="lowest" style={{ marginBottom: spacing.lg }}>
                <WeightChart
                  data={weightData ?? []}
                  goalKg={targets?.targetKcal ? undefined : undefined}
                />
              </BentoTile>

              {/* Calorie summary */}
              {aggregates && targets && (
                <BentoTile index={2} style={{ marginBottom: spacing.lg }}>
                  <CalorieChart data={aggregates} targetKcal={targets.targetKcal} days={7} />
                </BentoTile>
              )}

              {/* Weekly Report */}
              {weeklyReport && targets && (
                <BentoTile index={3} style={{ marginBottom: spacing.lg }}>
                  <WeeklyReportCard
                    report={weeklyReport}
                    targetKcal={targets.targetKcal}
                    dqiScore={dqiResult?.hasEnoughData ? dqiResult.score.total : undefined}
                  />
                </BentoTile>
              )}

              {/* Meal Photo Gallery preview */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginBottom: spacing.md,
                }}
              >
                <Text style={{ ...typography.headlineMd }}>{t('meal_gallery')}</Text>
                <Pressable hitSlop={8} onPress={() => navigation.navigate('MealPhotoGallery')}>
                  <Text
                    style={{
                      ...typography.labelMd,
                      color: colors.primary,
                      fontWeight: '700',
                    }}
                  >
                    {t('view_all')}
                  </Text>
                </Pressable>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: spacing.sm,
                  marginBottom: spacing.lg,
                }}
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Animated.View
                    key={i}
                    entering={FadeInDown.delay(100 + i * 60).duration(350)}
                    style={{
                      width: '31%',
                      aspectRatio: 1,
                      borderRadius: radii.DEFAULT,
                      backgroundColor: colors.surfaceContainerLow,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <UtensilsCrossed size={28} color={colors.onSurfaceVariant} strokeWidth={1.5} />
                  </Animated.View>
                ))}
              </View>
            </>
          )}

          {activeTab === 'weight' && (
            <BentoTile index={0} variant="lowest" style={{ marginBottom: spacing.lg }}>
              <WeightChart data={weightData ?? []} height={200} />
            </BentoTile>
          )}

          {activeTab === 'macros' && aggregates && (
            <>
              <BentoTile index={0} style={{ marginBottom: spacing.lg }}>
                <MacroTrendChart data={aggregates} days={7} height={180} />
              </BentoTile>
              <BentoTile index={1} style={{ marginBottom: spacing.lg }}>
                <MacroTrendChart data={aggregates} days={30} height={180} />
              </BentoTile>
            </>
          )}

          {activeTab === 'calories' && aggregates && targets && (
            <>
              <BentoTile index={0} style={{ marginBottom: spacing.lg }}>
                <CalorieChart
                  data={aggregates}
                  targetKcal={targets.targetKcal}
                  days={7}
                  height={180}
                />
              </BentoTile>
              <BentoTile index={1} style={{ marginBottom: spacing.lg }}>
                <CalorieChart
                  data={aggregates}
                  targetKcal={targets.targetKcal}
                  days={30}
                  height={180}
                />
              </BentoTile>
              {weeklyReport && (
                <BentoTile index={2} style={{ marginBottom: spacing.lg }}>
                  <WeeklyReportCard
                    report={weeklyReport}
                    targetKcal={targets.targetKcal}
                    dqiScore={dqiResult?.hasEnoughData ? dqiResult.score.total : undefined}
                  />
                </BentoTile>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};
