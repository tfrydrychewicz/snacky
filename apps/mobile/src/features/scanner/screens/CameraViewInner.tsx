import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type PhotoFile,
} from 'react-native-vision-camera';
import type { TFunction } from 'i18next';
import type { MealType } from '@snacky/shared-types';
import { CameraIcon, ImageIcon, ScanLine } from 'lucide-react-native';
import { CameraOverlay } from '../components/CameraOverlay';
import { PhotoStrip } from '../components/PhotoStrip';
import { useImageCompression } from '../hooks/useImageCompression';
import { colors, typography, spacing, radii } from '~/shared/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type CapturedPhoto = { uri: string; base64?: string };

type Props = {
  mealType: MealType;
  onMealTypeChange: (type: MealType) => void;
  onAnalyze: (base64s: string[], mealType: MealType) => void;
  onPhotosChanged: (photos: CapturedPhoto[]) => void;
  onGallery: () => void;
  showLoader: boolean;
  error: string | null;
  capturedPhotos: CapturedPhoto[];
  onRemovePhoto: (index: number) => void;
  canAddMore: boolean;
  maxPhotos: number;
  t: TFunction<'scanner'>;
};

export const CameraViewInner = ({
  mealType,
  onMealTypeChange,
  onAnalyze,
  onPhotosChanged,
  onGallery,
  showLoader,
  error,
  capturedPhotos,
  onRemovePhoto,
  canAddMore,
  maxPhotos,
  t,
}: Props) => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const { compress } = useImageCompression();

  useEffect(() => {
    if (!hasPermission) {
      void requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || !canAddMore) return;
    setIsCapturing(true);
    try {
      const photo: PhotoFile = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: true,
      });

      const uri = Platform.OS === 'android' ? `file://${photo.path}` : photo.path;
      const compressed = await compress(uri);
      if (!compressed) return;

      const newPhoto: CapturedPhoto = { uri: compressed.uri, base64: compressed.base64 };
      onPhotosChanged([...capturedPhotos, newPhoto]);
    } catch (err) {
      console.error('Capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [cameraRef, canAddMore, compress, capturedPhotos, onPhotosChanged]);

  const handleAnalyzePhotos = useCallback(() => {
    const base64s = capturedPhotos.map((p) => p.base64).filter((b): b is string => b != null);
    if (base64s.length > 0) {
      onAnalyze(base64s, mealType);
    }
  }, [capturedPhotos, onAnalyze, mealType]);

  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (showLoader) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.55, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [showLoader, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const hasPhotos = capturedPhotos.length > 0;
  const photoUris = capturedPhotos.map((p) => p.uri);

  if (!hasPermission || !device) {
    return (
      <View style={styles.center}>
        <CameraIcon size={64} color={colors.outline} strokeWidth={1.2} />
        <Text style={styles.fallbackTitle}>{t('camera_title')}</Text>
        <Text style={styles.text}>
          {!hasPermission ? t('camera_permission_message') : t('camera_no_device')}
        </Text>

        <AnimatedPressable
          onPress={onGallery}
          disabled={showLoader}
          style={[styles.galleryFallbackButton, pulseStyle]}
        >
          {showLoader ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <ImageIcon size={22} color={colors.onPrimary} strokeWidth={2} />
          )}
          <Text style={styles.galleryFallbackText}>
            {showLoader ? t('analyzing') : t('gallery_pick')}
          </Text>
        </AnimatedPressable>

        {error && <Text style={styles.errorFallback}>{t('scan_error')}</Text>}
      </View>
    );
  }

  const isBusy = isCapturing || showLoader;

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        device={device}
        isActive={!isBusy}
        photo={true}
        style={StyleSheet.absoluteFill}
      />

      <CameraOverlay
        flashEnabled={false}
        onToggleFlash={() => {}}
        onCapture={() => void handleCapture()}
        onGallery={onGallery}
        isCapturing={isBusy}
        selectedMealType={mealType}
        onMealTypeChange={onMealTypeChange}
      />

      {hasPhotos && !showLoader && (
        <View style={styles.photoStripContainer}>
          <PhotoStrip
            photoUris={photoUris}
            onRemove={onRemovePhoto}
            onAdd={() => void handleCapture()}
            canAddMore={canAddMore}
            maxPhotos={maxPhotos}
            variant="camera"
          />
          <Pressable onPress={handleAnalyzePhotos} style={styles.analyzeButton}>
            <ScanLine size={20} color={colors.onPrimary} strokeWidth={2} />
            <Text style={styles.analyzeText}>
              {t('analyze_photos', { count: capturedPhotos.length })}
            </Text>
          </Pressable>
        </View>
      )}

      {isBusy && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>{t('analyzing')}</Text>
          <Text style={styles.loadingSubtext}>{t('analyzing_subtitle')}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{t('scan_error')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  fallbackTitle: {
    ...typography.headlineLg,
    color: colors.onSurface,
    marginTop: spacing.md,
  },
  text: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  galleryFallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    marginTop: spacing.lg,
    width: '100%',
  },
  galleryFallbackText: {
    ...typography.titleMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  errorFallback: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  photoStripContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.full,
    marginHorizontal: spacing.md,
  },
  analyzeText: {
    ...typography.titleMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.titleLg,
    color: '#FFFFFF',
    marginTop: spacing.md,
  },
  loadingSubtext: {
    ...typography.bodyMd,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 120,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.errorContainer,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.onErrorContainer,
    textAlign: 'center',
  },
});
