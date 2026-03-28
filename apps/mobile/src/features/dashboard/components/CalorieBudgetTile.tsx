import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CalorieBudgetTileProps {
  consumed: number;
  target: number;
  index?: number;
}

const RING_SIZE = 120;
const STROKE_WIDTH = 12;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const CalorieBudgetTile = ({ consumed, target, index = 0 }: CalorieBudgetTileProps) => {
  const { t } = useTranslation('dashboard');
  const progress = useSharedValue(0);

  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const remaining = Math.max(target - consumed, 0);

  useEffect(() => {
    progress.value = withSpring(pct, {
      damping: 18,
      stiffness: 60,
      mass: 1,
    });
  }, [pct, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const overBudget = consumed > target;
  const ringColor = overBudget ? colors.error : colors.primary;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(350).springify()}
      style={{
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: radii.DEFAULT,
        padding: spacing.lg,
        paddingVertical: spacing.xl,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.titleLg, color: colors.onSurfaceVariant, marginBottom: spacing.lg }}>
            {t('tiles.calorieBudget')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ ...typography.displayLg, color: overBudget ? colors.error : colors.primary }}>
              {consumed.toLocaleString()}
            </Text>
            <Text style={{ ...typography.titleMd, color: colors.onSurfaceVariant, marginLeft: 4 }}>
              / {target.toLocaleString()} {t('tiles.kcalUnit')}
            </Text>
          </View>
          <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, opacity: 0.7, marginTop: spacing.sm }}>
            {overBudget
              ? t('tiles.over_budget', { kcal: consumed - target })
              : t('tiles.remaining', { kcal: remaining })}
          </Text>
        </View>

        <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={colors.surfaceContainerHigh}
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={ringColor}
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={animatedProps}
              strokeLinecap="round"
            />
          </Svg>
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.onSurface }}>
              {Math.round(pct * 100)}%
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};
