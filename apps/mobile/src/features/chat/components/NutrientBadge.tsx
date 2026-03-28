import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

interface NutrientBadgeProps {
  label: string;
  value: string;
  color?: string;
}

export const NutrientBadge = ({ label, value, color = colors.secondary }: NutrientBadgeProps) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${color}10`,
      borderRadius: radii.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      gap: spacing.xs,
    }}
  >
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
      }}
    />
    <Text style={{ ...typography.labelMd, color }}>{label}</Text>
    <Text style={{ ...typography.labelLg, color }}>{value}</Text>
  </View>
);
