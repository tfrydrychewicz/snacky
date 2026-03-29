import React from 'react';
import { View, Image, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { X, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radii, typography } from '~/shared/theme/tokens';

const THUMB_SIZE = 68;

type Props = {
  photoUris: string[];
  onRemove: (index: number) => void;
  onAdd: () => void;
  canAddMore: boolean;
  maxPhotos: number;
  variant?: 'camera' | 'light';
};

export const PhotoStrip = ({
  photoUris,
  onRemove,
  onAdd,
  canAddMore,
  maxPhotos,
  variant = 'camera',
}: Props) => {
  const { t } = useTranslation('scanner');
  const isCamera = variant === 'camera';

  if (photoUris.length === 0) return null;

  return (
    <View style={[styles.container, isCamera && styles.containerCamera]}>
      <Text style={[styles.countLabel, isCamera && styles.countLabelCamera]}>
        {t('photo_count', { count: photoUris.length, max: maxPhotos })}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {photoUris.map((uri, i) => (
          <View key={`${uri}-${i}`} style={styles.thumbWrap}>
            <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
            <Pressable
              onPress={() => onRemove(i)}
              style={styles.removeBtn}
              hitSlop={8}
              accessibilityLabel={t('photo_remove')}
            >
              <X size={12} color="#fff" strokeWidth={3} />
            </Pressable>
          </View>
        ))}
        {canAddMore && (
          <Pressable
            onPress={onAdd}
            style={[styles.addBtn, isCamera && styles.addBtnCamera]}
            accessibilityLabel={t('photo_add')}
          >
            <Plus size={24} color={isCamera ? '#fff' : colors.primary} strokeWidth={2} />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  containerCamera: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radii.DEFAULT,
    marginHorizontal: spacing.sm,
  },
  countLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginLeft: spacing.md,
    marginBottom: 4,
  },
  countLabelCamera: {
    color: 'rgba(255,255,255,0.8)',
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnCamera: {
    borderColor: 'rgba(255,255,255,0.6)',
  },
});
