import React from 'react';
import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, radii, spacing, elevation } from '~/shared/theme/tokens';

interface BentoTileProps {
  children: ReactNode;
  style?: ViewStyle;
  index?: number;
  variant?: 'low' | 'lowest' | 'high';
}

const bgMap = {
  low: colors.surfaceContainerLow,
  lowest: colors.surfaceContainerLowest,
  high: colors.surfaceContainerHigh,
};

export const BentoTile = ({ children, style, index = 0, variant = 'low' }: BentoTileProps) => (
  <Animated.View
    entering={FadeInDown.delay(index * 50)
      .duration(350)
      .springify()}
    style={[
      {
        backgroundColor: bgMap[variant],
        borderRadius: radii.DEFAULT,
        padding: spacing.lg,
        ...(variant === 'lowest' ? elevation.ambient : elevation.none),
      },
      style,
    ]}
  >
    {children}
  </Animated.View>
);
