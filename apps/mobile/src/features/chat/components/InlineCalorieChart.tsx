import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '~/shared/theme/tokens';
import type { DayAggregateBlock } from '@snacky/shared-types';

interface InlineCalorieChartProps {
  data: DayAggregateBlock[];
  targetKcal: number | null;
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

export const InlineCalorieChart = ({ data, targetKcal }: InlineCalorieChartProps) => {
  const { t } = useTranslation('chat');
  const target = targetKcal ?? 0;

  const chartData = useMemo(() => {
    const values = data.map((d) => d.calories);
    const tracked = data.filter((d) => d.calories > 0);
    const avg =
      tracked.length > 0
        ? Math.round(tracked.reduce((s, d) => s + d.calories, 0) / tracked.length)
        : 0;

    const allVals = target > 0 ? [...values, target] : values;
    const min = Math.max(0, Math.min(...allVals) - 200);
    const max = Math.max(...allVals) + 200;
    return { values, min, max, avg };
  }, [data, target]);

  if (chartData.values.length < 2) return null;

  const W = 300;
  const H = 80;
  const PAD = 6;
  const path = smoothPath(chartData.values, W, H, chartData.min, chartData.max, PAD);

  const targetY =
    target > 0 && chartData.max !== chartData.min
      ? H - PAD - ((target - chartData.min) / (chartData.max - chartData.min)) * (H - PAD * 2)
      : null;

  return (
    <View style={{ marginTop: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ ...typography.labelMd, color: colors.onSurface, fontWeight: '600' }}>
          {t('calorie_trend')}
        </Text>
        <Text style={{ ...typography.labelSm, color: colors.onSurfaceVariant }}>
          {t('avg')}: {chartData.avg} {t('kcal')}
        </Text>
      </View>

      <View style={{ height: 80 }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="inlineCGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={colors.primary} />
              <Stop offset="100%" stopColor={colors.primaryContainer} />
            </LinearGradient>
          </Defs>

          {targetY != null && (
            <Line
              x1={PAD}
              y1={targetY}
              x2={W - PAD}
              y2={targetY}
              stroke={colors.error}
              strokeWidth="1"
              strokeDasharray="4,3"
              opacity={0.5}
            />
          )}

          <Path
            d={path}
            fill="none"
            stroke="url(#inlineCGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </Svg>
      </View>
    </View>
  );
};
