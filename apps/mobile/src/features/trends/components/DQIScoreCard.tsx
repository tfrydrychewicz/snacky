import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

interface DQIScoreCardProps {
  score?: number;
  change?: number;
}

export const DQIScoreCard = ({ score, change }: DQIScoreCardProps) => {
  const { t } = useTranslation('trends');

  const displayScore = score ?? null;

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

      {displayScore != null ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.md }}>
            <Text style={{ ...typography.displayLg, color: colors.onSurface }}>{displayScore}</Text>
            <Text
              style={{ ...typography.titleMd, color: colors.onSurfaceVariant, fontWeight: '500' }}
            >
              /100
            </Text>
          </View>
          {change != null && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: `${colors.primaryContainer}30`,
                alignSelf: 'flex-start',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: radii.full,
              }}
            >
              <TrendingUp size={14} color={colors.primary} strokeWidth={2.5} />
              <Text style={{ ...typography.labelMd, color: colors.primary, fontWeight: '700' }}>
                {t('dqi_change', { val: change >= 0 ? `+${change}` : `${change}` })}
              </Text>
            </View>
          )}
        </>
      ) : (
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
      )}
    </View>
  );
};
