import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '~/shared/theme/tokens';
import type { MeasurementRow } from '~/features/progress/types';

interface WeightChartProps {
  data: MeasurementRow[];
  goalKg?: number;
  height?: number;
}

function buildPath(
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  minY: number,
  maxY: number,
  padding: number,
): string {
  if (points.length < 2) return '';

  const scaleX = (i: number) => (i / (points.length - 1)) * (width - padding * 2) + padding;
  const scaleY = (v: number) =>
    maxY === minY
      ? height / 2
      : height - padding - ((v - minY) / (maxY - minY)) * (height - padding * 2);

  const first = points[0];
  if (!first) return '';
  let d = `M${scaleX(0)},${scaleY(first.y)}`;
  for (let i = 1; i < points.length; i++) {
    const prevPt = points[i - 1];
    const currPt = points[i];
    if (!prevPt || !currPt) continue;
    const prev = { x: scaleX(i - 1), y: scaleY(prevPt.y) };
    const curr = { x: scaleX(i), y: scaleY(currPt.y) };
    const cpx = (prev.x + curr.x) / 2;
    d += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

export const WeightChart = ({ data, goalKg, height = 140 }: WeightChartProps) => {
  const { t } = useTranslation('trends');

  const chartData = useMemo(() => {
    if (data.length === 0) return { points: [], min: 0, max: 0, latest: 0, change: 0 };

    const points = data.map((m) => ({
      x: new Date(m.measured_at).getTime(),
      y: m.weight_kg ?? 0,
    }));

    const values = points.map((p) => p.y);
    const allValues = goalKg ? [...values, goalKg] : values;
    const min = Math.min(...allValues) - 1;
    const max = Math.max(...allValues) + 1;
    const latest = values[values.length - 1] ?? 0;
    const firstVal = values[0] ?? 0;
    const change = latest - firstVal;

    return { points, min, max, latest, change };
  }, [data, goalKg]);

  if (chartData.points.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant }}>
          {t('no_weight_data')}
        </Text>
      </View>
    );
  }

  const W = 400;
  const H = 100;
  const PAD = 8;
  const path = buildPath(chartData.points, W, H, chartData.min, chartData.max, PAD);

  const goalY =
    goalKg != null && chartData.max !== chartData.min
      ? H - PAD - ((goalKg - chartData.min) / (chartData.max - chartData.min)) * (H - PAD * 2)
      : null;

  const lastPt = chartData.points[chartData.points.length - 1];
  const lastPtY = lastPt?.y ?? 0;
  const lastX = W - PAD;
  const lastY =
    chartData.max === chartData.min
      ? H / 2
      : H - PAD - ((lastPtY - chartData.min) / (chartData.max - chartData.min)) * (H - PAD * 2);

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
          <Text style={{ ...typography.titleLg }}>{t('weight_trend')}</Text>
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
            {t('weight_value', { value: chartData.latest.toFixed(1) })}
          </Text>
          <Text
            style={{
              ...typography.labelSm,
              color: chartData.change <= 0 ? colors.primary : colors.error,
              fontWeight: '700',
            }}
          >
            {t('weight_change', {
              sign: chartData.change >= 0 ? '+' : '',
              value: chartData.change.toFixed(1),
            })}
          </Text>
        </View>
      </View>

      <View style={{ height }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="wGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={colors.secondary} />
              <Stop offset="100%" stopColor={colors.primary} />
            </LinearGradient>
          </Defs>

          {goalY != null && (
            <Line
              x1={PAD}
              y1={goalY}
              x2={W - PAD}
              y2={goalY}
              stroke={colors.outline}
              strokeWidth="1"
              strokeDasharray="6,4"
              opacity={0.5}
            />
          )}

          <Path d={path} fill="none" stroke="url(#wGrad)" strokeWidth="3" strokeLinecap="round" />

          <Circle cx={lastX} cy={lastY} r="5" fill={colors.primary} />
        </Svg>
      </View>

      {goalKg != null && (
        <Text
          style={{
            ...typography.labelSm,
            color: colors.secondary,
            fontWeight: '700',
            textAlign: 'right',
            marginTop: 4,
          }}
        >
          {t('goal')}: {t('weight_value', { value: goalKg })}
        </Text>
      )}
    </View>
  );
};
