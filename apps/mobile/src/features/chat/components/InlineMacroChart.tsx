import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '~/shared/theme/tokens';
import type { DayAggregateBlock } from '@snacky/shared-types';

interface InlineMacroChartProps {
  data: DayAggregateBlock[];
}

export const InlineMacroChart = ({ data }: InlineMacroChartProps) => {
  const { t } = useTranslation('chat');

  const chartData = useMemo(() => {
    if (data.length === 0) return { bars: [], maxTotal: 0, avgP: 0, avgC: 0, avgF: 0 };

    const bars = data.map((d) => ({
      p: d.protein_g,
      c: d.carbs_g,
      f: d.fat_g,
      total: d.protein_g + d.carbs_g + d.fat_g,
    }));

    const maxTotal = Math.max(...bars.map((b) => b.total), 1);
    const tracked = data.filter((d) => d.calories > 0);
    const count = tracked.length || 1;

    return {
      bars,
      maxTotal,
      avgP: Math.round(tracked.reduce((s, d) => s + d.protein_g, 0) / count),
      avgC: Math.round(tracked.reduce((s, d) => s + d.carbs_g, 0) / count),
      avgF: Math.round(tracked.reduce((s, d) => s + d.fat_g, 0) / count),
    };
  }, [data]);

  if (chartData.bars.length < 2) return null;

  const W = 300;
  const H = 80;
  const PAD = 4;
  const barCount = chartData.bars.length;
  const gap = 4;
  const barW = (W - PAD * 2 - gap * (barCount - 1)) / barCount;

  return (
    <View style={{ marginTop: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ ...typography.labelMd, color: colors.onSurface, fontWeight: '600' }}>
          {t('macro_trend')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <MacroLegend label="P" value={`${chartData.avgP}g`} color={colors.macro.protein} />
          <MacroLegend label="C" value={`${chartData.avgC}g`} color={colors.macro.carbs} />
          <MacroLegend label="F" value={`${chartData.avgF}g`} color={colors.macro.fat} />
        </View>
      </View>

      <View style={{ height: 80 }}>
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
                <Rect x={x} y={baseY - fH} width={barW} height={fH} fill={colors.macro.fat} rx={2} />
                <Rect x={x} y={baseY - fH - cH} width={barW} height={cH} fill={colors.macro.carbs} />
                <Rect x={x} y={baseY - fH - cH - pH} width={barW} height={pH} fill={colors.macro.protein} rx={2} />
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </View>
  );
};

const MacroLegend = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    <Text style={{ ...typography.labelSm, color: colors.onSurfaceVariant }}>
      {label} {value}
    </Text>
  </View>
);
