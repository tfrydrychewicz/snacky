import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type PhotoFile,
} from 'react-native-vision-camera';
import type { TFunction } from 'i18next';
import type { MealType } from '@snacky/shared-types';
import { CameraOverlay } from '../components/CameraOverlay';
import { useImageCompression } from '../hooks/useImageCompression';
import { colors, typography, spacing } from '~/shared/theme/tokens';

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

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>{t('camera_permission_message')}</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{t('camera_no_device')}</Text>
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
  text: {
    ...typography.bodyLg,
    color: colors.onSurfaceVariant,
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
