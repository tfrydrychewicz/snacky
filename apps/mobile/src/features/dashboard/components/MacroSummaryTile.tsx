import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

interface MacroSummaryTileProps {
  protein: number;
  proteinTarget: number;
  carbs: number;
  carbsTarget: number;
  fat: number;
  fatTarget: number;
  index?: number;
}

export const MacroSummaryTile = ({
  protein,
  proteinTarget,
  carbs,
  carbsTarget,
  fat,
  fatTarget,
  index = 2,
}: MacroSummaryTileProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50)
        .duration(350)
        .springify()}
      style={{
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: radii.DEFAULT,
        padding: spacing.lg,
        gap: spacing.lg,
      }}
    >
      <Text style={{ ...typography.titleLg }}>{t('tiles.dailyMacros')}</Text>
      <AnimatedMacroBar
        label={t('tiles.protein')}
        current={protein}
        target={proteinTarget}
        color={colors.macro.protein}
        delay={0}
      />
      <AnimatedMacroBar
        label={t('tiles.carbs')}
        current={carbs}
        target={carbsTarget}
        color={colors.macro.carbs}
        delay={100}
      />
      <AnimatedMacroBar
        label={t('tiles.fat')}
        current={fat}
        target={fatTarget}
        color={colors.macro.fat}
        delay={200}
      />
    </Animated.View>
  );
};

interface AnimatedMacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  delay: number;
}

const AnimatedMacroBar = ({
  label,
  current,
  target,
  color,
  delay: _delay,
}: AnimatedMacroBarProps) => {
  const pct = target > 0 ? Math.min(current / target, 1) : 0;
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(pct, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [pct, width]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={{ gap: 6 }}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}
      >
        <Text
          style={{
            ...typography.labelSm,
            color: colors.onSurfaceVariant,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
          }}
        >
          {label}
        </Text>
        <Text style={{ ...typography.labelMd, fontWeight: '700', color }}>
          {Math.round(current)}g / {target}g
        </Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: colors.surfaceContainerHigh,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[{ height: '100%', backgroundColor: color, borderRadius: 3 }, barStyle]}
        />
      </View>
      <Text
        style={{ ...typography.labelSm, color: colors.onSurfaceVariant, alignSelf: 'flex-end' }}
      >
        {Math.round(pct * 100)}%
      </Text>
    </View>
  );
};
