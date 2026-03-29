import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';
import type { WeeklyReport } from '../hooks/useTrendData';

interface WeeklyReportCardProps {
  report: WeeklyReport;
  targetKcal: number;
}

const AdherenceBar = ({ label, pct, color }: { label: string; pct: number; color: string }) => (
  <View style={{ gap: 4 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ ...typography.labelMd, color: colors.onSurfaceVariant }}>{label}</Text>
      <Text style={{ ...typography.labelLg, color }}>{pct}%</Text>
    </View>
    <View
      style={{
        height: 6,
        backgroundColor: `${color}20`,
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${Math.min(100, pct)}%`,
          backgroundColor: color,
          borderRadius: 3,
        }}
      />
    </View>
  </View>
);

export const WeeklyReportCard = ({ report, targetKcal }: WeeklyReportCardProps) => {
  const { t } = useTranslation('trends');

  const isOnTrack = report.adherencePct >= 70;
  const StatusIcon = isOnTrack ? CheckCircle : AlertTriangle;
  const statusColor = isOnTrack ? colors.primary : colors.tertiary;

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <TrendingUp size={20} color={colors.onSurface} strokeWidth={2} />
        <Text style={{ ...typography.titleLg }}>{t('weekly_report')}</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: `${statusColor}10`,
          borderRadius: radii.DEFAULT,
          padding: spacing.md,
          gap: spacing.md,
          alignItems: 'center',
        }}
      >
        <StatusIcon size={24} color={statusColor} strokeWidth={2} />
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.titleMd, color: statusColor }}>
            {isOnTrack ? t('on_track') : t('needs_attention')}
          </Text>
          <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant }}>
            {t('adherence_detail', {
              pct: report.adherencePct,
              days: report.daysTracked,
              total: report.totalDays,
            })}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
        }}
      >
        <StatBox
          label={t('avg_calories')}
          value={`${report.avgCalories}`}
          unit={t('kcal_unit')}
          highlight={Math.abs(report.avgCalories - targetKcal) <= targetKcal * 0.15}
        />
        <StatBox
          label={t('days_tracked')}
          value={`${report.daysTracked}/${report.totalDays}`}
          unit={t('days_unit')}
          highlight={report.daysTracked >= 5}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdherenceBar
          label={t('protein')}
          pct={report.proteinAdherencePct}
          color={colors.macro.protein}
        />
        <AdherenceBar
          label={t('carbs')}
          pct={report.carbsAdherencePct}
          color={colors.macro.carbs}
        />
        <AdherenceBar label={t('fat')} pct={report.fatAdherencePct} color={colors.macro.fat} />
      </View>
    </View>
  );
};

const StatBox = ({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  highlight: boolean;
}) => (
  <View
    style={{
      flex: 1,
      backgroundColor: highlight ? `${colors.primary}10` : colors.surfaceContainerLow,
      borderRadius: radii.DEFAULT,
      padding: spacing.md,
      alignItems: 'center',
    }}
  >
    <Text style={{ ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 4 }}>
      {label}
    </Text>
    <Text
      style={{ ...typography.headlineMd, color: highlight ? colors.primary : colors.onSurface }}
    >
      {value}
    </Text>
    <Text style={{ ...typography.labelSm, color: colors.outline }}>{unit}</Text>
  </View>
);
