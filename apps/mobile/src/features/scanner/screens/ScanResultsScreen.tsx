import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { AppHeader } from '~/shared/components/AppHeader';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';

const INGREDIENTS = [
  { icon: '🍗', name: 'Grilled Chicken Breast', weight: '180g', tag: 'Lean Protein', tagColor: colors.macro.protein, cal: 297 },
  { icon: '🍚', name: 'Brown Rice', weight: '150g', tag: 'Complex Carb', tagColor: colors.macro.carbs, cal: 166.5 },
  { icon: '🥦', name: 'Steamed Broccoli', weight: '100g', tag: 'Micros', tagColor: colors.primary, cal: 35 },
];

const MACRO_SPLIT = { protein: 52, carbs: 42, fat: 8.5 };
const TOTAL_KCAL = 498.5;

export const ScanResultsScreen = () => {
  const { t } = useTranslation('scanner');
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Meal Photo Banner */}
        <View style={{ height: 280, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 80 }}>🥘</Text>
          {/* Confidence badge */}
          <Animated.View
            entering={FadeIn.delay(200).duration(400)}
            style={{
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
            }}
          >
            <Text style={{ fontSize: 14 }}>✅</Text>
            <Text style={{ ...typography.labelMd, color: colors.onSurface }}>
              {t('confidence', { pct: 91 })}
            </Text>
          </Animated.View>
        </View>

        {/* Glassmorphism Results Card */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={{
            marginTop: -60,
            marginHorizontal: spacing.md,
            backgroundColor: colors.surfaceContainerLowest,
            borderRadius: radii.DEFAULT,
            padding: spacing.lg,
            ...elevation.float,
          }}
        >
          {/* Title + Total */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl }}>
            <View>
              <Text style={{ ...typography.headlineLg, color: colors.onSurface }}>
                {t('results_title')}
              </Text>
              <Text style={{ ...typography.labelMd, color: colors.onSurfaceVariant, marginTop: 2 }}>
                {t('identified_count', { count: 3 })}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: radii.DEFAULT,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                alignItems: 'center',
              }}
            >
              <Text style={{ ...typography.labelSm, color: colors.primaryFixed, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                {t('total')}
              </Text>
              <Text style={{ ...typography.headlineMd, color: colors.onPrimary }}>
                {TOTAL_KCAL}
              </Text>
              <Text style={{ ...typography.labelSm, color: colors.primaryFixed, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                kcal
              </Text>
            </View>
          </View>

          {/* Ingredient List */}
          <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
            {INGREDIENTS.map((item, i) => (
              <Animated.View
                key={item.name}
                entering={FadeInDown.delay(200 + i * 80).duration(400)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surfaceContainerLow,
                  borderRadius: radii.DEFAULT,
                  padding: spacing.md,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: `${item.tagColor}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: spacing.md,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.titleMd, color: colors.onSurface }}>{item.name}</Text>
                  <Text style={{ ...typography.labelSm, color: colors.onSurfaceVariant }}>
                    {item.weight} • <Text style={{ color: item.tagColor, fontWeight: '600' }}>{item.tag}</Text>
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ ...typography.titleLg, color: colors.onSurface }}>{item.cal}</Text>
                  <Text style={{ ...typography.labelSm, color: colors.onSurfaceVariant }}>kcal</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Macro Breakdown */}
          <View
            style={{
              backgroundColor: `${colors.surfaceContainerHighest}50`,
              borderRadius: radii.DEFAULT,
              padding: spacing.md,
              marginBottom: spacing.xl,
            }}
          >
            <Text style={{ ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: spacing.sm }}>
              {t('macro_breakdown')}
            </Text>
            {/* Stacked bar */}
            <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: spacing.md }}>
              <View style={{ width: '45%', backgroundColor: colors.macro.protein }} />
              <View style={{ width: '40%', backgroundColor: colors.macro.carbs }} />
              <View style={{ width: '15%', backgroundColor: colors.macro.fat }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[
                { label: t('protein'), value: `${MACRO_SPLIT.protein}g`, color: colors.macro.protein },
                { label: t('carbs'), value: `${MACRO_SPLIT.carbs}g`, color: colors.macro.carbs },
                { label: t('fats'), value: `${MACRO_SPLIT.fat}g`, color: colors.macro.fat },
              ].map((m) => (
                <View key={m.label}>
                  <Text style={{ ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'uppercase' }}>{m.label}</Text>
                  <Text style={{ ...typography.titleLg, color: m.color }}>{m.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ gap: spacing.sm }}>
            <Pressable
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingVertical: 16,
                borderRadius: radii.full,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ ...typography.titleMd, color: colors.onPrimary, fontWeight: '700' }}>
                {t('confirm_log')}
              </Text>
              <Text style={{ fontSize: 18, color: colors.onPrimary }}>✓</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => ({
                backgroundColor: colors.surfaceContainerHighest,
                paddingVertical: 16,
                borderRadius: radii.full,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ ...typography.titleMd, color: colors.onSurface, fontWeight: '700' }}>
                {t('edit')}
              </Text>
              <Text style={{ fontSize: 18 }}>✏️</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};
