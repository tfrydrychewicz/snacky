import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type PhotoFile,
} from 'react-native-vision-camera';
import type { TFunction } from 'i18next';
import type { MealType } from '@snacky/shared-types';
import { CameraIcon, ImageIcon } from 'lucide-react-native';
import { CameraOverlay } from '../components/CameraOverlay';
import { useImageCompression } from '../hooks/useImageCompression';
import { colors, typography, spacing, radii } from '~/shared/theme/tokens';

type Props = {
  mealType: MealType;
  onMealTypeChange: (type: MealType) => void;
  onAnalyze: (base64: string, mealType: MealType) => void;
  onGallery: () => void;
  showLoader: boolean;
  error: string | null;
  t: TFunction<'scanner'>;
};

export const CameraViewInner = ({
  mealType,
  onMealTypeChange,
  onAnalyze,
  onGallery,
  showLoader,
  error,
  t,
}: Props) => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const { compress, isCompressing } = useImageCompression();

  useEffect(() => {
    if (!hasPermission) {
      void requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    setIsCapturing(true);
    try {
      const photo: PhotoFile = await cameraRef.current.takePhoto({
        flash: flashEnabled ? 'on' : 'off',
        enableShutterSound: true,
      });

      const uri = Platform.OS === 'android' ? `file://${photo.path}` : photo.path;
      const compressed = await compress(uri);
      if (!compressed) return;

      onAnalyze(compressed.base64, mealType);
    } catch (err) {
      console.error('Capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [flashEnabled, compress, onAnalyze, mealType]);

  if (!hasPermission || !device) {
    return (
      <View style={styles.center}>
        <CameraIcon size={64} color={colors.outline} strokeWidth={1.2} />
        <Text style={styles.fallbackTitle}>{t('camera_title')}</Text>
        <Text style={styles.text}>
          {!hasPermission ? t('camera_permission_message') : t('camera_no_device')}
        </Text>

        <Pressable
          onPress={onGallery}
          disabled={showLoader}
          style={[styles.galleryFallbackButton, showLoader && { opacity: 0.6 }]}
        >
          <ImageIcon size={22} color={colors.onPrimary} strokeWidth={2} />
          <Text style={styles.galleryFallbackText}>
            {showLoader ? t('analyzing') : t('gallery_pick')}
          </Text>
        </Pressable>

        {error && <Text style={styles.errorFallback}>{t('scan_error')}</Text>}
      </View>
    );
  }

  const isBusy = isCapturing || isCompressing || showLoader;

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        device={device}
        isActive={!isBusy}
        photo={true}
        style={StyleSheet.absoluteFill}
        torch={flashEnabled ? 'on' : 'off'}
      />

      <CameraOverlay
        flashEnabled={flashEnabled}
        onToggleFlash={() => setFlashEnabled((v) => !v)}
        onCapture={() => void handleCapture()}
        onGallery={onGallery}
        isCapturing={isBusy}
        selectedMealType={mealType}
        onMealTypeChange={onMealTypeChange}
      />

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
