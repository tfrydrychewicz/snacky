import React from 'react';
import { Pressable, Text } from 'react-native';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

interface SelectionChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const SelectionChip = ({ label, selected, onPress }: SelectionChipProps) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: selected ? colors.primary : colors.outlineVariant,
      backgroundColor: selected ? colors.primaryFixed : colors.surfaceContainerLowest,
      marginRight: spacing.sm,
      marginBottom: spacing.sm,
      opacity: pressed ? 0.7 : 1,
    })}
  >
    <Text
      style={{
        ...typography.labelLg,
        color: selected ? colors.onPrimaryContainer : colors.onSurfaceVariant,
      }}
    >
      {label}
    </Text>
  </Pressable>
);
