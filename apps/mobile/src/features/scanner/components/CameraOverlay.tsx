import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Zap, ZapOff, ImageIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radii, typography } from '~/shared/theme/tokens';
import type { MealType } from '@snacky/shared-types';

const MEAL_TYPES = [
  { key: 'breakfast' as MealType, labelKey: 'meal_type_breakfast' as const },
  { key: 'lunch' as MealType, labelKey: 'meal_type_lunch' as const },
  { key: 'dinner' as MealType, labelKey: 'meal_type_dinner' as const },
  { key: 'snack' as MealType, labelKey: 'meal_type_snack' as const },
] as const;

type Props = {
  flashEnabled: boolean;
  onToggleFlash: () => void;
  onCapture: () => void;
  onGallery: () => void;
  isCapturing: boolean;
  selectedMealType: MealType;
  onMealTypeChange: (type: MealType) => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const CameraOverlay = ({
  flashEnabled,
  onToggleFlash,
  onCapture,
  onGallery,
  isCapturing,
  selectedMealType,
  onMealTypeChange,
}: Props) => {
  const { t } = useTranslation('scanner');
  const insets = useSafeAreaInsets();
  const captureScale = useSharedValue(1);

  const captureAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  const handlePressIn = () => {
    captureScale.value = withSpring(0.88, { damping: 12 });
  };

  const handlePressOut = () => {
    captureScale.value = withSpring(1, { damping: 12 });
  };

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + spacing.sm }]}>
      {/* Top bar: flash + meal type */}
      <View style={styles.topBar}>
        <Pressable onPress={onToggleFlash} style={styles.iconButton} hitSlop={12}>
          {flashEnabled ? (
            <Zap
              size={22}
              color={colors.tertiaryFixedDim}
              strokeWidth={2.5}
              fill={colors.tertiaryFixedDim}
            />
          ) : (
            <ZapOff size={22} color="#FFFFFF" strokeWidth={2} />
          )}
        </Pressable>

        <Text style={styles.title}>{t('camera_title')}</Text>

        <View style={{ width: 44 }} />
      </View>

      {/* Meal type selector */}
      <View style={styles.mealTypeRow}>
        {MEAL_TYPES.map((mt) => {
          const selected = mt.key === selectedMealType;
          return (
            <Pressable
              key={mt.key}
              onPress={() => onMealTypeChange(mt.key)}
              style={[styles.mealTypeChip, selected && styles.mealTypeChipSelected]}
            >
              <Text style={[styles.mealTypeLabel, selected && styles.mealTypeLabelSelected]}>
                {t(mt.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Bottom controls: gallery, capture, placeholder */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable onPress={onGallery} style={styles.sideButton} hitSlop={12}>
          <ImageIcon size={28} color="#FFFFFF" strokeWidth={1.8} />
          <Text style={styles.sideLabel}>{t('gallery')}</Text>
        </Pressable>

        <AnimatedPressable
          onPress={onCapture}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isCapturing}
          style={[styles.captureButton, captureAnimStyle]}
        >
          <View style={styles.captureInner} />
        </AnimatedPressable>

        <View style={styles.sideButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.titleMd,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  mealTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  mealTypeChipSelected: {
    backgroundColor: colors.primary,
  },
  mealTypeLabel: {
    ...typography.labelMd,
    color: 'rgba(255,255,255,0.8)',
  },
  mealTypeLabelSelected: {
    color: colors.onPrimary,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
  },
  sideButton: {
    width: 60,
    alignItems: 'center',
    gap: 4,
  },
  sideLabel: {
    ...typography.labelSm,
    color: '#FFFFFF',
  },
});
