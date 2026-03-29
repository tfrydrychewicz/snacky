import React, { useState } from 'react';
import {
  View,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowLeft, Maximize2 } from 'lucide-react-native';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import type { RootStackParamList } from '~/app/navigation/types';
import { useMealPhoto } from '../hooks/useMealPhoto';

type DetailRoute = RouteProp<RootStackParamList, 'MealPhotoDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const PhotoView = ({
  imageKey,
  width,
  height,
}: {
  imageKey: string;
  width: number;
  height: number;
}) => {
  const { data: imageUrl, isLoading } = useMealPhoto(imageKey);

  if (isLoading) {
    return (
      <View style={[{ width, height }, styles.photoLoading]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!imageUrl) return null;

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Image source={{ uri: imageUrl }} style={{ width, height }} resizeMode="contain" />
    </Animated.View>
  );
};

export const MealPhotoDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const { mealId, imageKey, imageKeys: rawImageKeys } = route.params;
  const { width, height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const imageKeys = rawImageKeys && rawImageKeys.length > 0 ? rawImageKeys : [imageKey];
  const hasMultiple = imageKeys.length > 1;

  const photoHeight = height * 0.75;

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => navigation.goBack()} />

      {hasMultiple ? (
        <View style={{ width, height: photoHeight }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveIndex(index);
            }}
          >
            {imageKeys.map((key, i) => (
              <PhotoView key={`photo-${i}`} imageKey={key} width={width} height={photoHeight} />
            ))}
          </ScrollView>

          <View style={styles.paginationDots}>
            {imageKeys.map((_, i) => (
              <View key={`dot-${i}`} style={[styles.dot, i === activeIndex && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.photoCounter}>
            <Text style={styles.photoCounterText}>
              {activeIndex + 1}/{imageKeys.length}
            </Text>
          </View>
        </View>
      ) : (
        <PhotoView imageKey={imageKeys[0] ?? ''} width={width} height={photoHeight} />
      )}

      {/* Back button */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={[styles.backButton, { top: insets.top + 12 }]}
      >
        <ArrowLeft size={22} color="#fff" strokeWidth={2} />
      </Pressable>

      {/* View meal detail */}
      <Pressable
        onPress={() => {
          navigation.goBack();
          setTimeout(() => navigation.navigate('MealDetail', { mealId }), 100);
        }}
        style={[styles.detailButton, { bottom: insets.bottom + 24 }]}
      >
        <Maximize2 size={20} color={colors.onPrimary} strokeWidth={2} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLoading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 20,
  },
  photoCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  photoCounterText: {
    ...typography.labelMd,
    color: '#FFFFFF',
  },
  backButton: {
    position: 'absolute',
    left: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailButton: {
    position: 'absolute',
    right: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.float,
  },
});
