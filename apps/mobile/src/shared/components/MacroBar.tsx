import React from 'react';
import { View, Text } from 'react-native';
import { colors, typography } from '~/shared/theme/tokens';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
}

export const MacroBar = ({
  label,
  current,
  target,
  color,
  unit = 'g',
}: MacroBarProps) => {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
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
          {current}{unit} / {target}{unit}
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
        <View
          style={{
            height: '100%',
            backgroundColor: color,
            borderRadius: 3,
            width: `${pct}%`,
          }}
        />
      </View>
    </View>
  );
};
