import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '~/shared/theme/tokens';
import type { DayAggregate } from '../hooks/useTrendData';

interface CalorieChartProps {
  data: DayAggregate[];
  targetKcal: number;
  height?: number;
  days?: number;
}

function smoothPath(
  values: number[],
  width: number,
  height: number,
  min: number,
  max: number,
  pad: number,
): string {
  if (values.length < 2) return '';

  const scaleX = (i: number) => (i / (values.length - 1)) * (width - pad * 2) + pad;
  const scaleY = (v: number) =>
    max === min ? height / 2 : height - pad - ((v - min) / (max - min)) * (height - pad * 2);

  const first = values[0];
  if (first == null) return '';
  let d = `M${scaleX(0)},${scaleY(first)}`;
  for (let i = 1; i < values.length; i++) {
    const prevVal = values[i - 1];
    const currVal = values[i];
    if (prevVal == null || currVal == null) continue;
    const prev = { x: scaleX(i - 1), y: scaleY(prevVal) };
    const curr = { x: scaleX(i), y: scaleY(currVal) };
    const cpx = (prev.x + curr.x) / 2;
    d += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

export const CalorieChart = ({ data, targetKcal, height = 140, days = 7 }: CalorieChartProps) => {
  const { t } = useTranslation('trends');

  const chartData = useMemo(() => {
    const slice = data.slice(-days);
    const values = slice.map((d) => d.totalCalories);
    const tracked = slice.filter((d) => d.mealCount > 0);
    const avg =
      tracked.length > 0
        ? Math.round(tracked.reduce((s, d) => s + d.totalCalories, 0) / tracked.length)
        : 0;

    const allVals = [...values, targetKcal];
    const min = Math.max(0, Math.min(...allVals) - 200);
    const max = Math.max(...allVals) + 200;

    return { values, min, max, avg };
  }, [data, days, targetKcal]);

  if (chartData.values.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant }}>
          {t('no_calorie_data')}
        </Text>
      </View>
    );
  }

  const W = 400;
  const H = 100;
  const PAD = 8;
  const path = smoothPath(chartData.values, W, H, chartData.min, chartData.max, PAD);

  const targetY =
    chartData.max === chartData.min
      ? H / 2
      : H - PAD - ((targetKcal - chartData.min) / (chartData.max - chartData.min)) * (H - PAD * 2);

  const diff = chartData.avg - targetKcal;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: spacing.md,
        }}
      >
        <View>
          <Text style={{ ...typography.titleLg }}>{t('calorie_trend')}</Text>
          <Text
            style={{
              ...typography.labelSm,
              color: colors.onSurfaceVariant,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
            }}
          >
            {t('last_7_days')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ ...typography.headlineMd }}>
            {chartData.avg}{' '}
            <Text style={{ ...typography.labelMd, color: colors.onSurfaceVariant }}>
              {t('kcal_avg')}
            </Text>
          </Text>
          <Text
            style={{
              ...typography.labelSm,
              color: diff <= 0 ? colors.primary : colors.error,
              fontWeight: '700',
            }}
          >
            {diff >= 0 ? '+' : ''}
            {diff} {t('vs_target')}
          </Text>
        </View>
      </View>

      <View style={{ height }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="cGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={colors.primary} />
              <Stop offset="100%" stopColor={colors.primaryContainer} />
            </LinearGradient>
          </Defs>

          <Line
            x1={PAD}
            y1={targetY}
            x2={W - PAD}
            y2={targetY}
            stroke={colors.error}
            strokeWidth="1"
            strokeDasharray="6,4"
            opacity={0.5}
          />

          <Path d={path} fill="none" stroke="url(#cGrad)" strokeWidth="3" strokeLinecap="round" />
        </Svg>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ ...typography.labelSm, color: colors.onSurfaceVariant }}>
          {t('target')}: {targetKcal} {t('kcal_unit')}
        </Text>
      </View>
    </View>
  );
};
