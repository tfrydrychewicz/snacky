import React, { type ReactNode } from 'react';
import Animated, { FadeIn, FadeOut, type AnimatedProps } from 'react-native-reanimated';
import type { ViewProps } from 'react-native';

type EnteringAnimation = AnimatedProps<ViewProps>['entering'];
type ExitingAnimation = AnimatedProps<ViewProps>['exiting'];

interface AnimatedTransitionProps {
  children: ReactNode;
  entering?: EnteringAnimation;
  exiting?: ExitingAnimation;
  className?: string;
}

export const AnimatedTransition = ({
  children,
  entering = FadeIn.duration(200),
  exiting = FadeOut.duration(200),
  className,
}: AnimatedTransitionProps) => (
  <Animated.View entering={entering} exiting={exiting} className={className}>
    {children}
  </Animated.View>
);
