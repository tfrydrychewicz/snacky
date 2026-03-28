import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

export const EmptyState = ({ icon, title, subtitle }: EmptyStateProps) => (
  <View
    style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.surface,
    }}
  >
    {icon && (
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
        <Text style={{ fontSize: 28 }}>{icon}</Text>
      </View>
    )}
    <Text style={{ ...typography.titleLg, color: colors.onSurface, textAlign: 'center' }}>{title}</Text>
    {subtitle && (
      <Text style={{ ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xs }}>
        {subtitle}
      </Text>
    )}
  </View>
);
