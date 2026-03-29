import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '~/shared/theme/tokens';
import type { DayAggregate } from '../hooks/useTrendData';

interface MacroTrendChartProps {
  data: DayAggregate[];
  height?: number;
  days?: number;
}

export const MacroTrendChart = ({ data, height = 140, days = 7 }: MacroTrendChartProps) => {
  const { t } = useTranslation('trends');

  const chartData = useMemo(() => {
    const slice = data.slice(-days);
    if (slice.length === 0) return { bars: [], maxTotal: 0, avgP: 0, avgC: 0, avgF: 0 };

    const bars = slice.map((d) => ({
      date: d.date.slice(5),
      p: d.totalProteinG,
      c: d.totalCarbsG,
      f: d.totalFatG,
      total: d.totalProteinG + d.totalCarbsG + d.totalFatG,
    }));

    const maxTotal = Math.max(...bars.map((b) => b.total), 1);
    const tracked = slice.filter((d) => d.mealCount > 0);
    const count = tracked.length || 1;

    return {
      bars,
      maxTotal,
      avgP: Math.round(tracked.reduce((s, d) => s + d.totalProteinG, 0) / count),
      avgC: Math.round(tracked.reduce((s, d) => s + d.totalCarbsG, 0) / count),
      avgF: Math.round(tracked.reduce((s, d) => s + d.totalFatG, 0) / count),
    };
  }, [data, days]);

  if (chartData.bars.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant }}>
          {t('no_macro_data')}
        </Text>
      </View>
    );
  }

  const W = 400;
  const H = 100;
  const PAD = 4;
  const barCount = chartData.bars.length;
  const gap = 6;
  const barW = (W - PAD * 2 - gap * (barCount - 1)) / barCount;

  return (
    <View>
      <Text style={{ ...typography.titleLg, marginBottom: spacing.xs }}>{t('macro_trend')}</Text>
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <MacroLabel
          label={t('protein')}
          color={colors.macro.protein}
          value={`${chartData.avgP}g`}
        />
        <MacroLabel label={t('carbs')} color={colors.macro.carbs} value={`${chartData.avgC}g`} />
        <MacroLabel label={t('fat')} color={colors.macro.fat} value={`${chartData.avgF}g`} />
      </View>

      <View style={{ height }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {chartData.bars.map((bar, i) => {
            const x = PAD + i * (barW + gap);
            const totalH = (bar.total / chartData.maxTotal) * (H - PAD * 2);
            const baseY = H - PAD;

            const pH = bar.total > 0 ? (bar.p / bar.total) * totalH : 0;
            const cH = bar.total > 0 ? (bar.c / bar.total) * totalH : 0;
            const fH = bar.total > 0 ? (bar.f / bar.total) * totalH : 0;

            return (
              <React.Fragment key={i}>
                <Rect
                  x={x}
                  y={baseY - fH}
                  width={barW}
                  height={fH}
                  fill={colors.macro.fat}
                  rx={2}
                  opacity={bar.total === 0 ? 0.15 : 1}
                />
                <Rect
                  x={x}
                  y={baseY - fH - cH}
                  width={barW}
                  height={cH}
                  fill={colors.macro.carbs}
                  rx={0}
                  opacity={bar.total === 0 ? 0.15 : 1}
                />
                <Rect
                  x={x}
                  y={baseY - fH - cH - pH}
                  width={barW}
                  height={pH}
                  fill={colors.macro.protein}
                  rx={2}
                  opacity={bar.total === 0 ? 0.15 : 1}
                />
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </View>
  );
};

const MacroLabel = ({ label, color, value }: { label: string; color: string; value: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    <Text style={{ ...typography.labelSm, color: colors.onSurfaceVariant }}>{label}</Text>
    <Text style={{ ...typography.labelLg, color: colors.onSurface }}>{value}</Text>
  </View>
);
