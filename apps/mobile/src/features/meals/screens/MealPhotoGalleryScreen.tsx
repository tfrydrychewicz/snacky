import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, ImageIcon, Flame, Layers } from 'lucide-react-native';
import { colors, spacing, typography } from '~/shared/theme/tokens';
import { EmptyState } from '~/shared/components/EmptyState';
import { SkeletonLoader } from '~/shared/components/SkeletonLoader';
import type { RootStackParamList } from '~/app/navigation/types';
import { useMealPhotos, type MealPhotoEntry } from '../hooks/useMealPhotos';
import { useMealPhoto } from '../hooks/useMealPhoto';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const NUM_COLUMNS = 3;
const GAP = 2;

export const MealPhotoGalleryScreen = () => {
  const { t } = useTranslation('meals');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();

  const { data, isLoading, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useMealPhotos();

  const photos = useMemo(() => data?.pages.flatMap((p) => p.photos) ?? [], [data]);

  const cellSize = (width - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Header onBack={() => navigation.goBack()} title={t('gallery_title')} />
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonLoader key={i} width={cellSize} height={cellSize} borderRadius={0} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header
        onBack={() => navigation.goBack()}
        title={t('gallery_title')}
        paddingTop={insets.top + 8}
      />

      {photos.length === 0 ? (
        <EmptyState
          Icon={ImageIcon}
          title={t('gallery_empty_title')}
          subtitle={t('gallery_empty_subtitle')}
        />
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.mealId}
          numColumns={NUM_COLUMNS}
          renderItem={({ item }) => (
            <PhotoCell
              entry={item}
              size={cellSize}
              onPress={() =>
                navigation.navigate('MealPhotoDetail', {
                  mealId: item.mealId,
                  imageKey: item.imageKey,
                  imageKeys: item.imageKeys,
                })
              }
            />
          )}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ gap: GAP, paddingBottom: insets.bottom + 40 }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={() => void refetch()}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('loading_more')}</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const Header = ({
  onBack,
  title,
  paddingTop,
}: {
  onBack: () => void;
  title: string;
  paddingTop?: number;
}) => (
  <View style={[styles.header, paddingTop != null ? { paddingTop } : undefined]}>
    <Pressable onPress={onBack} hitSlop={12}>
      <ArrowLeft size={24} color={colors.onSurface} strokeWidth={2} />
    </Pressable>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={{ width: 24 }} />
  </View>
);

const PhotoCell = ({
  entry,
  size,
  onPress,
}: {
  entry: MealPhotoEntry;
  size: number;
  onPress: () => void;
}) => {
  const { data: imageUrl } = useMealPhoto(entry.imageKey);
  const date = new Date(entry.loggedAt);
  const dayLabel = `${date.getDate()}/${date.getMonth() + 1}`;
  const hasMultiplePhotos = entry.imageKeys.length > 1;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size }]}>
          <ImageIcon size={24} color={colors.outlineVariant} strokeWidth={1.5} />
        </View>
      )}

      {hasMultiplePhotos && (
        <View style={styles.multiPhotoBadge}>
          <Layers size={10} color="#fff" strokeWidth={2.5} />
          <Text style={styles.multiPhotoCount}>{entry.imageKeys.length}</Text>
        </View>
      )}

      <View style={styles.overlay}>
        <Text style={styles.overlayDate}>{dayLabel}</Text>
        <View style={styles.overlayCalRow}>
          <Flame size={10} color="#fff" strokeWidth={2.5} />
          <Text style={styles.overlayCal}>{Math.round(entry.totalCalories)}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    padding: 0,
  },
  placeholder: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiPhotoBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  multiPhotoCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overlayDate: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  overlayCalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  overlayCal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  footer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
