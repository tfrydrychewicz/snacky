import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { BentoTile } from '~/shared/components/BentoTile';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';
import { useWeeklyDQI } from '~/features/trends/hooks/useWeeklyDQI';

interface DQIDashboardTileProps {
  index: number;
}

const RING_SIZE = 56;
const STROKE = 6;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const DQIDashboardTile = ({ index }: DQIDashboardTileProps) => {
  const { t } = useTranslation('dashboard');
  const { data: dqiResult } = useWeeklyDQI();

  const score = dqiResult?.hasEnoughData ? dqiResult.score.total : null;
  const pct = score != null ? score / 100 : 0;
  const offset = CIRCUMFERENCE * (1 - pct);

  return (
    <BentoTile index={index}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
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
              strokeWidth={STROKE}
              fill="none"
            />
            {score != null && (
              <SvgCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={colors.primary}
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            )}
          </Svg>
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Text style={{ ...typography.titleMd, color: colors.onSurface }}>{score ?? '—'}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.titleLg }}>{t('tiles.dqi_title')}</Text>
          <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 }}>
            {score != null ? t('tiles.dqi_subtitle') : t('tiles.dqi_no_data')}
          </Text>
          {score != null && (
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.xs,
                marginTop: spacing.xs,
              }}
            >
              {[
                {
                  label: t('tiles.dqi_variety'),
                  score: dqiResult?.score.variety.score ?? 0,
                  max: 20,
                },
                {
                  label: t('tiles.dqi_adequacy'),
                  score: dqiResult?.score.adequacy.score ?? 0,
                  max: 40,
                },
                {
                  label: t('tiles.dqi_moderation'),
                  score: dqiResult?.score.moderation.score ?? 0,
                  max: 30,
                },
              ].map((item) => (
                <View
                  key={item.label}
                  style={{
                    backgroundColor: colors.surfaceContainerLow,
                    borderRadius: radii.sm,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ ...typography.labelSm, color: colors.onSurfaceVariant }}>
                    {item.label} {item.score}/{item.max}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </BentoTile>
  );
};
