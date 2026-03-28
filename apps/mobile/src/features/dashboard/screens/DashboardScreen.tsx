import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAuth } from '~/app/providers/AuthProvider';
import { AppHeader } from '~/shared/components/AppHeader';
import { CircularProgress } from '~/shared/components/CircularProgress';
import { MacroBar } from '~/shared/components/MacroBar';
import { BentoTile } from '~/shared/components/BentoTile';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';

export const DashboardScreen = () => {
  const { t } = useTranslation('dashboard');
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'User';

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <Animated.View entering={FadeIn.duration(400)} style={{ marginBottom: spacing.xl }}>
          <Text style={{ ...typography.displaySm, color: colors.onSurface }}>
            {t('greeting', { name: displayName })}
          </Text>
          <Text style={{ ...typography.bodyLg, color: colors.onSurfaceVariant, marginTop: 4, fontWeight: '500' }}>
            {t('subtitle_progress', { pct: 65 })}
          </Text>
        </Animated.View>

        {/* Hero Calorie Budget Tile */}
        <BentoTile index={0} style={{ marginBottom: spacing.lg, paddingVertical: spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.titleLg, color: colors.onSurfaceVariant, marginBottom: spacing.lg }}>
                {t('tiles.calorieBudget')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ ...typography.displayLg, color: colors.primary }}>1,450</Text>
                <Text style={{ ...typography.titleMd, color: colors.onSurfaceVariant, marginLeft: 4 }}>
                  / 2,100 {t('tiles.kcalUnit')}
                </Text>
              </View>
              <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, opacity: 0.7, marginTop: spacing.sm }}>
                {t('tiles.remaining', { kcal: 650 })}
              </Text>
            </View>
            <CircularProgress percentage={65} size={140} />
          </View>
        </BentoTile>

        {/* Snacky AI Preview */}
        <BentoTile index={1} style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: `${colors.primary}15`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18 }}>⚡</Text>
            </View>
            <Text style={{ ...typography.titleLg }}>Snacky AI</Text>
          </View>
          <View
            style={{
              backgroundColor: colors.surfaceContainerLowest,
              borderRadius: radii.DEFAULT,
              padding: spacing.md,
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ ...typography.bodySm, color: colors.onSurface, lineHeight: 20 }}>
              {t('ai_preview')}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceContainerHighest,
              borderRadius: radii.full,
              paddingHorizontal: spacing.md,
              paddingVertical: 10,
            }}
          >
            <Text style={{ flex: 1, ...typography.bodySm, color: colors.onSurfaceVariant }}>
              {t('ai_ask')}
            </Text>
            <Text style={{ fontSize: 18, color: colors.primary }}>➤</Text>
          </View>
        </BentoTile>

        {/* Daily Macros */}
        <BentoTile index={2} style={{ marginBottom: spacing.lg, gap: spacing.lg }}>
          <Text style={{ ...typography.titleLg }}>{t('tiles.dailyMacros')}</Text>
          <MacroBar label={t('tiles.protein')} current={84} target={120} color={colors.macro.protein} />
          <MacroBar label={t('tiles.carbs')} current={142} target={210} color={colors.macro.carbs} />
          <MacroBar label={t('tiles.fat')} current={38} target={70} color={colors.macro.fat} />
        </BentoTile>

        {/* Recent Meals */}
        <BentoTile index={3} style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ ...typography.titleLg }}>{t('tiles.recentMeals')}</Text>
            <Pressable hitSlop={8}>
              <Text
                style={{
                  ...typography.labelMd,
                  color: colors.primary,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {t('tiles.viewHistory')}
              </Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[
              { emoji: '🥗', name: 'Kale & Chickpea', cal: 420, type: 'BREAKFAST' },
              { emoji: '🍝', name: 'Pesto Linguine', cal: 580, type: 'LUNCH' },
            ].map((meal, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.surfaceContainerLowest,
                  borderRadius: radii.DEFAULT,
                  padding: spacing.sm,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <View
                  style={{
                    aspectRatio: 1,
                    borderRadius: radii.DEFAULT,
                    backgroundColor: colors.surfaceContainerHigh,
                    marginBottom: spacing.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 40 }}>{meal.emoji}</Text>
                </View>
                <Text style={{ ...typography.labelLg, marginBottom: 2 }}>{meal.name}</Text>
                <Text style={{ ...typography.labelSm, color: colors.onSurfaceVariant }}>
                  {meal.cal} kcal • {meal.type}
                </Text>
              </Pressable>
            ))}
          </View>
        </BentoTile>

        {/* Weight Trend */}
        <BentoTile index={4} style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg }}>
            <View>
              <Text style={{ ...typography.titleLg, marginBottom: 2 }}>{t('tiles.weightTrend')}</Text>
              <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, fontWeight: '500' }}>
                {t('tiles.weightLost', { lbs: '2.4' })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ ...typography.headlineLg }}>138.6</Text>
                <Text style={{ ...typography.labelMd, color: colors.onSurfaceVariant, marginLeft: 4 }}>lbs</Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: `${colors.primaryFixed}30`,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: radii.full,
                  marginTop: 4,
                }}
              >
                <Text style={{ ...typography.labelSm, color: colors.primary }}>↓ 0.8%</Text>
              </View>
            </View>
          </View>
          {/* Sparkline bars */}
          <View style={{ height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
            {[60, 58, 62, 55, 52, 48, 50, 45, 42, 44, 38, 35].map((h, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  backgroundColor: i === 11 ? colors.primary : `${colors.primary}18`,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
            {['Oct 01', 'Oct 15', 'Today'].map((label) => (
              <Text key={label} style={{ ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                {label}
              </Text>
            ))}
          </View>
        </BentoTile>
      </ScrollView>
    </View>
  );
};
