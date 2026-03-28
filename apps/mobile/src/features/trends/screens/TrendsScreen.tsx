import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { TrendingUp, Brain, Droplets, UtensilsCrossed } from 'lucide-react-native';
import { AppHeader } from '~/shared/components/AppHeader';
import { BentoTile } from '~/shared/components/BentoTile';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

export const TrendsScreen = () => {
  const { t } = useTranslation('trends');
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* DQI Score Hero */}
        <BentoTile index={0} style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              ...typography.labelSm,
              color: colors.onSurfaceVariant,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              marginBottom: spacing.sm,
            }}
          >
            {t('dqi_label')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.md }}>
            <Text style={{ ...typography.displayLg, color: colors.onSurface }}>78</Text>
            <Text
              style={{ ...typography.titleMd, color: colors.onSurfaceVariant, fontWeight: '500' }}
            >
              /100
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: `${colors.primaryContainer}30`,
              alignSelf: 'flex-start',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: radii.full,
              marginBottom: spacing.lg,
            }}
          >
            <TrendingUp size={14} color={colors.primary} strokeWidth={2.5} />
            <Text style={{ ...typography.labelMd, color: colors.primary, fontWeight: '700' }}>
              {t('dqi_change', { val: '+3' })}
            </Text>
          </View>
          <Text
            style={{
              ...typography.bodySm,
              color: colors.onSurfaceVariant,
              lineHeight: 20,
              maxWidth: 280,
            }}
          >
            {t('dqi_insight')}
          </Text>
          {/* Progress dots */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: spacing.lg }}>
            {[1, 1, 0.3, 0.3].map((op, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 5,
                  backgroundColor: colors.primary,
                  borderRadius: 3,
                  opacity: op,
                }}
              />
            ))}
          </View>
        </BentoTile>

        {/* Weight Trend Chart */}
        <BentoTile index={1} variant="lowest" style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: spacing.lg,
            }}
          >
            <View>
              <Text style={{ ...typography.titleLg, marginBottom: 2 }}>{t('weight_trend')}</Text>
              <Text
                style={{
                  ...typography.labelSm,
                  color: colors.onSurfaceVariant,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                }}
              >
                {t('last_30_days')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ ...typography.headlineMd }}>
                84.2{' '}
                <Text
                  style={{
                    ...typography.labelMd,
                    color: colors.onSurfaceVariant,
                    fontWeight: '500',
                  }}
                >
                  kg
                </Text>
              </Text>
              <Text style={{ ...typography.labelSm, color: colors.secondary, fontWeight: '700' }}>
                {t('goal')}: 82.3 kg
              </Text>
            </View>
          </View>
          {/* SVG chart */}
          <View style={{ height: 120, marginBottom: spacing.sm }}>
            <Svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={colors.secondary} stopOpacity="1" />
                  <Stop offset="100%" stopColor={colors.primary} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Path
                d="M0,80 Q50,75 100,60 T200,50 T300,35 T400,20"
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="3"
              />
            </Svg>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {(['week_1', 'week_2', 'week_3', 'week_4'] as const).map((key) => (
              <Text
                key={key}
                style={{
                  ...typography.labelSm,
                  color: colors.onSurfaceVariant,
                  textTransform: 'uppercase',
                  letterSpacing: 1.5,
                }}
              >
                {t(key)}
              </Text>
            ))}
          </View>
        </BentoTile>

        {/* Meal History Gallery */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: spacing.md,
          }}
        >
          <Text style={{ ...typography.headlineMd }}>{t('meal_gallery')}</Text>
          <Pressable hitSlop={8}>
            <Text style={{ ...typography.labelMd, color: colors.primary, fontWeight: '700' }}>
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
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  borderBottomLeftRadius: radii.DEFAULT,
                  borderBottomRightRadius: radii.DEFAULT,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                }}
              >
                <Text style={{ ...typography.labelSm, color: '#FFF', textTransform: 'uppercase' }}>
                  {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dinner', 'Lunch'][i]}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Insight Tiles */}
        <BentoTile
          index={5}
          style={{ marginBottom: spacing.lg, backgroundColor: colors.tertiaryFixed }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: spacing.md,
            }}
          >
            <Brain size={22} color={colors.onTertiaryContainer} strokeWidth={2} />
            <Text
              style={{
                ...typography.labelSm,
                color: colors.onTertiaryContainer,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
              }}
            >
              {t('mindful_eating')}
            </Text>
          </View>
          <Text style={{ ...typography.titleLg, color: '#261A00' }}>
            {t('consistency', { pct: 85 })}
          </Text>
          <Text style={{ ...typography.bodySm, color: '#5B4300', marginTop: 4 }}>
            {t('consistency_detail')}
          </Text>
        </BentoTile>

        <BentoTile
          index={6}
          style={{ marginBottom: spacing.lg, backgroundColor: colors.secondaryFixed }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                borderWidth: 3,
                borderColor: 'rgba(255,255,255,0.3)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ ...typography.headlineMd, fontWeight: '800', color: '#00105C' }}>
                8/10
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.titleLg, color: '#00105C' }}>
                {t('hydration_title')}
              </Text>
              <Text style={{ ...typography.bodySm, color: '#293CA0', marginTop: 4 }}>
                {t('hydration_detail')}
              </Text>
            </View>
          </View>
        </BentoTile>
      </ScrollView>
    </View>
  );
};
