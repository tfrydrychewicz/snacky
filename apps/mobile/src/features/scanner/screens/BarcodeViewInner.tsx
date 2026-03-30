import React, { useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  type Code,
} from 'react-native-vision-camera';
import type { TFunction } from 'i18next';
import { CameraIcon, ScanLine } from 'lucide-react-native';
import { colors, typography, spacing, radii } from '~/shared/theme/tokens';

type Props = {
  onBarcodeScanned: (code: string) => void;
  onBack: () => void;
  isLooking: boolean;
  notFound: boolean;
  error: string | null;
  onSwitchToPhoto: () => void;
  t: TFunction<'scanner'>;
};

export const BarcodeViewInner = ({
  onBarcodeScanned,
  onBack,
  isLooking,
  notFound,
  error,
  onSwitchToPhoto,
  t,
}: Props) => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  useEffect(() => {
    if (!hasPermission) {
      void requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128', 'code-39'],
    onCodeScanned: useCallback(
      (codes: Code[]) => {
        if (isLooking) return;
        const code = codes[0]?.value;
        if (code) onBarcodeScanned(code);
      },
      [isLooking, onBarcodeScanned],
    ),
  });

  if (!hasPermission || !device) {
    return (
      <View style={styles.center}>
        <CameraIcon size={64} color={colors.outline} strokeWidth={1.2} />
        <Text style={styles.text}>
          {!hasPermission ? t('camera_permission_message') : t('camera_no_device')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        device={device}
        isActive={!isLooking}
        codeScanner={codeScanner}
        style={StyleSheet.absoluteFill}
      />

      {/* Scanning overlay */}
      <View style={styles.overlay}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <View style={styles.hintContainer}>
          {isLooking ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.hintText}>{t('barcode_looking_up')}</Text>
            </>
          ) : notFound ? (
            <>
              <Text style={styles.hintText}>{t('barcode_not_found')}</Text>
              <Text style={styles.hintSubtext}>{t('barcode_not_found_hint')}</Text>
              <Pressable onPress={onSwitchToPhoto} style={styles.switchButton}>
                <ScanLine size={18} color={colors.onPrimary} />
                <Text style={styles.switchText}>{t('barcode_try_photo')}</Text>
              </Pressable>
            </>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <Text style={styles.hintText}>{t('barcode_scanning')}</Text>
              <Text style={styles.hintSubtext}>{t('barcode_scanning_hint')}</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const FRAME_SIZE = 260;
const CORNER_SIZE = 30;
const CORNER_WIDTH = 4;

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
    gap: spacing.md,
  },
  text: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE * 0.6,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: colors.primary,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: colors.primary,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: colors.primary,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: colors.primary,
    borderBottomRightRadius: 8,
  },
  hintContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  hintText: {
    ...typography.titleMd,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  hintSubtext: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radii.full,
    marginTop: spacing.sm,
  },
  switchText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
