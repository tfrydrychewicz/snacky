import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';
import type { DQIScore } from '../lib/dqi-scoring';

interface DQIScoreCardProps {
  score?: DQIScore;
  change?: number | null;
  hasEnoughData?: boolean;
}

const RING_SIZE = 100;
const STROKE_WIDTH = 8;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ScoreRing = ({ score, max }: { score: number; max: number }) => {
  const pct = max > 0 ? score / max : 0;
  const offset = CIRCUMFERENCE * (1 - pct);

  return (
    <View
      style={{
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        <SvgCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={colors.surfaceContainerHigh}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <SvgCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={colors.primary}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ ...typography.headlineLg, color: colors.onSurface }}>{score}</Text>
      </View>
    </View>
  );
};

const ComponentBar = ({
  label,
  score,
  maxScore,
  color,
}: {
  label: string;
  score: number;
  maxScore: number;
  color: string;
}) => {
  const pct = maxScore > 0 ? Math.min(100, (score / maxScore) * 100) : 0;

  return (
    <View style={{ gap: 3 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ ...typography.labelMd, color: colors.onSurfaceVariant }}>{label}</Text>
        <Text style={{ ...typography.labelMd, color }}>
          {score}/{maxScore}
        </Text>
      </View>
      <View
        style={{
          height: 5,
          backgroundColor: `${color}20`,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: color,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
};

export const DQIScoreCard = ({ score, change, hasEnoughData = false }: DQIScoreCardProps) => {
  const { t } = useTranslation('trends');

  if (!hasEnoughData || !score) {
    return (
      <View>
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
        <View
          style={{
            backgroundColor: colors.surfaceContainerLow,
            borderRadius: radii.DEFAULT,
            padding: spacing.lg,
            alignItems: 'center',
          }}
        >
          <Text
            style={{ ...typography.bodySm, color: colors.onSurfaceVariant, textAlign: 'center' }}
          >
            {t('dqi_coming_soon')}
          </Text>
        </View>
      </View>
    );
  }

  const TrendIcon = change != null && change >= 0 ? TrendingUp : TrendingDown;
  const trendColor = change != null && change >= 0 ? colors.primary : colors.error;

  return (
    <View>
      <Text
        style={{
          ...typography.labelSm,
          color: colors.onSurfaceVariant,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          marginBottom: spacing.md,
        }}
      >
        {t('dqi_label')}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <ScoreRing score={score.total} max={100} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={{ ...typography.titleLg }}>{t('dqi_rating', { score: score.total })}</Text>
          {change != null && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: `${trendColor}15`,
                alignSelf: 'flex-start',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radii.full,
              }}
            >
              <TrendIcon size={12} color={trendColor} strokeWidth={2.5} />
              <Text style={{ ...typography.labelSm, color: trendColor, fontWeight: '700' }}>
                {t('dqi_change', { val: change >= 0 ? `+${change}` : `${change}` })}
              </Text>
            </View>
          )}
          <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant }}>
            {t('dqi_insight')}
          </Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <ComponentBar
          label={t('dqi_variety')}
          score={score.variety.score}
          maxScore={score.variety.maxScore}
          color={colors.primary}
        />
        <ComponentBar
          label={t('dqi_adequacy')}
          score={score.adequacy.score}
          maxScore={score.adequacy.maxScore}
          color={colors.secondary}
        />
        <ComponentBar
          label={t('dqi_moderation')}
          score={score.moderation.score}
          maxScore={score.moderation.maxScore}
          color={colors.tertiary}
        />
        <ComponentBar
          label={t('dqi_balance')}
          score={score.balance.score}
          maxScore={score.balance.maxScore}
          color={colors.macro.protein}
        />
      </View>
    </View>
  );
};
