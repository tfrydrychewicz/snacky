import React from 'react';
import { View, Text } from 'react-native';
import { Inbox, type LucideIcon } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

interface EmptyStateProps {
  Icon?: LucideIcon;
  title: string;
  subtitle?: string;
}

export const EmptyState = ({ Icon = Inbox, title, subtitle }: EmptyStateProps) => (
  <View
    style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.surface,
    }}
  >
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: radii.DEFAULT,
        backgroundColor: colors.surfaceContainerLow,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
      }}
    >
      <Icon size={28} color={colors.onSurfaceVariant} strokeWidth={1.5} />
    </View>
    <Text style={{ ...typography.titleLg, color: colors.onSurface, textAlign: 'center' }}>
      {title}
    </Text>
    {subtitle && (
      <Text
        style={{
          ...typography.bodyMd,
          color: colors.onSurfaceVariant,
          textAlign: 'center',
          marginTop: spacing.xs,
        }}
      >
        {subtitle}
      </Text>
    )}
  </View>
);
