import React, { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface BentoTileProps {
  children: ReactNode;
  span?: 1 | 2;
  style?: ViewStyle;
  index?: number;
}

export const BentoTile = ({ children, span = 1, style, index = 0 }: BentoTileProps) => (
  <Animated.View
    entering={FadeInDown.delay(index * 60).duration(300)}
    style={[
      {
        flex: span === 2 ? 2 : 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        minHeight: span === 2 ? 140 : 110,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        shadowOpacity: 0.08,
        elevation: 2,
      },
      style,
    ]}
  >
    {children}
  </Animated.View>
);

interface BentoRowProps {
  children: ReactNode;
}

export const BentoRow = ({ children }: BentoRowProps) => (
  <View style={{ flexDirection: 'row', gap: 12 }}>{children}</View>
);

interface BentoGridProps {
  children: ReactNode;
}

export const BentoGrid = ({ children }: BentoGridProps) => (
  <View style={{ gap: 12, paddingHorizontal: 16 }}>{children}</View>
);
