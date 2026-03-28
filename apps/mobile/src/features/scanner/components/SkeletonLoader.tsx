import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors, spacing, radii } from '~/shared/theme/tokens';

const PULSE_DURATION = 1500;

const SkeletonBar = ({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number;
  style?: object;
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: PULSE_DURATION, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          backgroundColor: colors.surfaceContainerHigh,
          borderRadius: radii.sm,
        },
        style,
        animStyle,
      ]}
    />
  );
};

export const SkeletonLoader = () => (
  <View style={styles.container}>
    {/* Photo placeholder */}
    <SkeletonBar
      width="100%"
      height={200}
      style={{ borderRadius: radii.DEFAULT, marginBottom: spacing.lg }}
    />

    {/* Title area */}
    <SkeletonBar width="60%" height={24} style={{ marginBottom: spacing.sm }} />
    <SkeletonBar width="40%" height={16} style={{ marginBottom: spacing.xl }} />

    {/* Ingredient cards */}
    {[0, 1, 2].map((i) => (
      <View key={i} style={styles.cardSkeleton}>
        <SkeletonBar width={40} height={40} style={{ borderRadius: 20 }} />
        <View style={styles.cardContent}>
          <SkeletonBar width="70%" height={16} style={{ marginBottom: spacing.xs }} />
          <SkeletonBar width="40%" height={12} />
        </View>
        <SkeletonBar width={50} height={20} />
      </View>
    ))}

    {/* Macro bar */}
    <SkeletonBar
      width="100%"
      height={80}
      style={{ marginTop: spacing.lg, borderRadius: radii.DEFAULT }}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  cardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.DEFAULT,
    marginBottom: spacing.sm,
  },
  cardContent: {
    flex: 1,
  },
});
