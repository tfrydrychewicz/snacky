import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, NativeModules } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MealType } from '@snacky/shared-types';
import { Camera as CameraIcon, ImageIcon, ScanLine, Barcode } from 'lucide-react-native';
import { useImageCompression } from '../hooks/useImageCompression';
import { useScanAnalysis } from '../hooks/useScanAnalysis';
import { useBarcodeLookup } from '../hooks/useBarcodeLookup';
import { PhotoStrip } from '../components/PhotoStrip';
import type { CapturedPhoto } from './CameraViewInner';
import type { ScannerStackParamList } from '~/app/navigation/types';
import { colors, typography, spacing, radii } from '~/shared/theme/tokens';
import { launchImageLibrary } from 'react-native-image-picker';

type Nav = NativeStackNavigationProp<ScannerStackParamList, 'Capture'>;
type TabNav = NavigationProp<{ Dashboard: undefined }>;

type ScanMode = 'photo' | 'barcode';

const MAX_PHOTOS = 5;

const nativeModuleAvailable = NativeModules.CameraView != null;

const LazyCameraView = React.lazy(() =>
  import('./CameraViewInner').then((m) => ({ default: m.CameraViewInner })),
);

const LazyBarcodeView = React.lazy(() =>
  import('./BarcodeViewInner').then((m) => ({ default: m.BarcodeViewInner })),
);

export const ScannerScreen = () => {
  const { t } = useTranslation('scanner');
  const navigation = useNavigation<Nav>();
  const tabNavigation = useNavigation<TabNav>();
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [scanMode, setScanMode] = useState<ScanMode>('photo');
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const barcode = useBarcodeLookup();

  const { compressMultiple, isCompressing } = useImageCompression();
  const { analyze, result, isAnalyzing, error, reset } = useScanAnalysis();

  useEffect(() => {
    if (result && capturedPhotos.length > 0) {
      navigation.navigate('Results', {
        scanResult: result,
        photoUris: capturedPhotos.map((p) => p.uri),
        mealType,
      });
      reset();
      setCapturedPhotos([]);
    }
  }, [result, navigation, mealType, capturedPhotos, reset]);

  useEffect(() => {
    if (barcode.product && barcode.lastBarcode) {
      navigation.navigate('BarcodeResult', {
        product: barcode.product,
        barcode: barcode.lastBarcode,
        mealType,
      });
      barcode.reset();
    }
  }, [barcode, navigation, mealType]);

  const handleAnalyze = useCallback(
    async (photos: CapturedPhoto[]) => {
      const uris = photos.map((p) => p.uri);
      const compressed = await compressMultiple(uris);
      if (compressed.length === 0) return;

      const updated = photos.map((p, i) => ({
        ...p,
        base64: compressed[i]?.base64,
      }));
      setCapturedPhotos(updated);

      analyze(
        compressed.map((c) => c.base64),
        mealType,
      );
    },
    [compressMultiple, analyze, mealType],
  );

  const handleGallery = useCallback(async () => {
    try {
      const remaining = MAX_PHOTOS - capturedPhotos.length;
      if (remaining <= 0) return;

      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: remaining,
        quality: 1,
        maxWidth: 2048,
        maxHeight: 2048,
      });

      const assets = result.assets;
      if (result.didCancel || !assets?.length) return;

      const newPhotos: CapturedPhoto[] = assets
        .filter((a) => a.uri != null)
        .map((a) => ({ uri: a.uri! }));

      const allPhotos = [...capturedPhotos, ...newPhotos].slice(0, MAX_PHOTOS);
      setCapturedPhotos(allPhotos);

      if (capturedPhotos.length === 0) {
        void handleAnalyze(allPhotos);
      }
    } catch (err) {
      console.error('Gallery pick failed:', err);
    }
  }, [capturedPhotos, handleAnalyze]);

  const handleRemovePhoto = useCallback((index: number) => {
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleBack = useCallback(() => {
    tabNavigation.navigate('Dashboard');
  }, [tabNavigation]);

  const showLoader = isCompressing || isAnalyzing;
  const hasPhotos = capturedPhotos.length > 0;

  if (!nativeModuleAvailable) {
    return (
      <View style={styles.center}>
        <CameraIcon size={64} color={colors.outline} strokeWidth={1.2} />
        <Text style={styles.fallbackTitle}>{t('camera_title')}</Text>
        <Text style={styles.permissionText}>{t('camera_no_device')}</Text>

        <MealTypePicker selected={mealType} onSelect={setMealType} t={t} />

        {hasPhotos && (
          <PhotoStrip
            photoUris={capturedPhotos.map((p) => p.uri)}
            onRemove={handleRemovePhoto}
            onAdd={() => void handleGallery()}
            canAddMore={capturedPhotos.length < MAX_PHOTOS}
            maxPhotos={MAX_PHOTOS}
            variant="light"
          />
        )}

        <View style={styles.fallbackActions}>
          {hasPhotos ? (
            <Pressable
              onPress={() => void handleAnalyze(capturedPhotos)}
              disabled={showLoader}
              style={[styles.galleryButton, showLoader && { opacity: 0.6 }]}
            >
              <ScanLine size={22} color={colors.onPrimary} strokeWidth={2} />
              <Text style={styles.galleryButtonText}>
                {showLoader
                  ? t('analyzing')
                  : t('analyze_photos', { count: capturedPhotos.length })}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void handleGallery()}
              disabled={showLoader}
              style={[styles.galleryButton, showLoader && { opacity: 0.6 }]}
            >
              <ImageIcon size={22} color={colors.onPrimary} strokeWidth={2} />
              <Text style={styles.galleryButtonText}>
                {showLoader ? t('analyzing') : t('gallery_pick')}
              </Text>
            </Pressable>
          )}
        </View>

        {error && <Text style={styles.errorInline}>{t('scan_error')}</Text>}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Suspense
        fallback={
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        }
      >
        {scanMode === 'photo' ? (
          <LazyCameraView
            mealType={mealType}
            onMealTypeChange={setMealType}
            onAnalyze={(base64s, mt) => analyze(base64s, mt)}
            onPhotosChanged={setCapturedPhotos}
            onGallery={() => void handleGallery()}
            onBack={handleBack}
            showLoader={showLoader}
            error={error}
            capturedPhotos={capturedPhotos}
            onRemovePhoto={handleRemovePhoto}
            canAddMore={capturedPhotos.length < MAX_PHOTOS}
            maxPhotos={MAX_PHOTOS}
            t={t}
          />
        ) : (
          <LazyBarcodeView
            onBarcodeScanned={(code) => void barcode.lookup(code)}
            onBack={handleBack}
            isLooking={barcode.isLooking}
            notFound={barcode.notFound}
            error={barcode.error}
            onSwitchToPhoto={() => {
              barcode.reset();
              setScanMode('photo');
            }}
            t={t}
          />
        )}
      </Suspense>

      {/* Mode toggle */}
      <View style={styles.modeToggleContainer}>
        <View style={styles.modeToggle}>
          <Pressable
            onPress={() => { barcode.reset(); setScanMode('photo'); }}
            style={[styles.modeButton, scanMode === 'photo' && styles.modeButtonActive]}
          >
            <CameraIcon size={16} color={scanMode === 'photo' ? colors.onPrimary : colors.onSurfaceVariant} />
            <Text style={[styles.modeLabel, scanMode === 'photo' && styles.modeLabelActive]}>
              {t('mode_photo')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { setScanMode('barcode'); }}
            style={[styles.modeButton, scanMode === 'barcode' && styles.modeButtonActive]}
          >
            <Barcode size={16} color={scanMode === 'barcode' ? colors.onPrimary : colors.onSurfaceVariant} />
            <Text style={[styles.modeLabel, scanMode === 'barcode' && styles.modeLabelActive]}>
              {t('mode_barcode')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const MealTypePicker = ({
  selected,
  onSelect,
  t,
}: {
  selected: MealType;
  onSelect: (type: MealType) => void;
  t: ReturnType<typeof useTranslation<'scanner'>>['t'];
}) => {
  const types: { key: MealType; label: string }[] = [
    { key: 'breakfast', label: t('meal_type_breakfast') },
    { key: 'lunch', label: t('meal_type_lunch') },
    { key: 'dinner', label: t('meal_type_dinner') },
    { key: 'snack', label: t('meal_type_snack') },
  ];

  return (
    <View style={styles.mealTypePicker}>
      <Text style={styles.mealTypeTitle}>{t('meal_type_title')}</Text>
      <View style={styles.mealTypeRow}>
        {types.map((mt) => (
          <Pressable
            key={mt.key}
            onPress={() => onSelect(mt.key)}
            style={[styles.mealTypeChip, mt.key === selected && styles.mealTypeChipSelected]}
          >
            <Text
              style={[styles.mealTypeLabel, mt.key === selected && styles.mealTypeLabelSelected]}
            >
              {mt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  fallbackTitle: {
    ...typography.headlineLg,
    color: colors.onSurface,
    marginTop: spacing.md,
  },
  permissionText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  fallbackActions: {
    marginTop: spacing.lg,
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.full,
  },
  galleryButtonText: {
    ...typography.titleMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  errorInline: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  mealTypePicker: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  mealTypeTitle: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mealTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  mealTypeChipSelected: {
    backgroundColor: colors.primary,
  },
  mealTypeLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  mealTypeLabelSelected: {
    color: colors.onPrimary,
  },
  modeToggleContainer: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radii.full,
    padding: 3,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  modeLabelActive: {
    color: colors.onPrimary,
  },
});
