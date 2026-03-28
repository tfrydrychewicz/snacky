import React from 'react';
import { View, Image, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowLeft, Maximize2 } from 'lucide-react-native';
import { colors, spacing, elevation } from '~/shared/theme/tokens';
import type { RootStackParamList } from '~/app/navigation/types';
import { useMealPhoto } from '../hooks/useMealPhoto';

type DetailRoute = RouteProp<RootStackParamList, 'MealPhotoDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export const MealPhotoDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const { mealId, imageKey } = route.params;
  const { width, height } = useWindowDimensions();

  const { data: imageUrl, isLoading } = useMealPhoto(imageKey);

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => navigation.goBack()} />

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : imageUrl ? (
        <Animated.View entering={FadeIn.duration(300)}>
          <Image
            source={{ uri: imageUrl }}
            style={{ width, height: height * 0.75 }}
            resizeMode="contain"
          />
        </Animated.View>
      ) : null}

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
