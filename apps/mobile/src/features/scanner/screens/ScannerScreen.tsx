import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, NativeModules } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MealType } from '@snacky/shared-types';
import { Camera as CameraIcon, ImageIcon } from 'lucide-react-native';
import { useImageCapture } from '../hooks/useImageCapture';
import { useImageCompression } from '../hooks/useImageCompression';
import { useScanAnalysis } from '../hooks/useScanAnalysis';
import type { ScannerStackParamList } from '~/app/navigation/types';
import { colors, typography, spacing, radii } from '~/shared/theme/tokens';

type Nav = NativeStackNavigationProp<ScannerStackParamList, 'Capture'>;

const nativeModuleAvailable = NativeModules.CameraView != null;

const LazyCameraView = React.lazy(() =>
  import('./CameraViewInner').then((m) => ({ default: m.CameraViewInner })),
);

export const ScannerScreen = () => {
  const { t } = useTranslation('scanner');
  const navigation = useNavigation<Nav>();
  const [mealType, setMealType] = useState<MealType>('lunch');

  const { pickFromGallery } = useImageCapture();
  const { compress, isCompressing } = useImageCompression();
  const { analyze, result, isAnalyzing, error, reset } = useScanAnalysis();

  useEffect(() => {
    if (result) {
      navigation.navigate('Results', {
        scanResult: result,
        photoUri: '',
        mealType,
      });
      reset();
    }
  }, [result, navigation, mealType, reset]);

  const handleGallery = useCallback(async () => {
    const photo = await pickFromGallery();
    if (!photo) return;

    const compressed = await compress(photo.uri);
    if (!compressed) return;

    analyze(compressed.base64, mealType);
  }, [pickFromGallery, compress, analyze, mealType]);

  const showLoader = isCompressing || isAnalyzing;

  if (!nativeModuleAvailable) {
    return (
      <View style={styles.center}>
        <CameraIcon size={64} color={colors.outline} strokeWidth={1.2} />
        <Text style={styles.fallbackTitle}>{t('camera_title')}</Text>
        <Text style={styles.permissionText}>{t('camera_no_device')}</Text>

        <MealTypePicker selected={mealType} onSelect={setMealType} t={t} />

        <View style={styles.fallbackActions}>
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
        </View>

        {error && <Text style={styles.errorInline}>{t('scan_error')}</Text>}
      </View>
    );
  }

  return (
    <Suspense
      fallback={
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      }
    >
      <LazyCameraView
        mealType={mealType}
        onMealTypeChange={setMealType}
        onAnalyze={analyze}
        onGallery={() => void handleGallery()}
        showLoader={showLoader}
        error={error}
        t={t}
      />
    </Suspense>
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
});
