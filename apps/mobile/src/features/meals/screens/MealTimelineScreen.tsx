import React, { useCallback, useMemo } from 'react';
import { View, Text, SectionList, RefreshControl, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UtensilsCrossed, Plus, ImageIcon } from 'lucide-react-native';
import { EmptyState } from '~/shared/components/EmptyState';
import { SkeletonLoader } from '~/shared/components/SkeletonLoader';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';
import type { RootStackParamList } from '~/app/navigation/types';
import { useMeals } from '../hooks/useMeals';
import { MealCard } from '../components/MealCard';
import { useMealPhoto } from '../hooks/useMealPhoto';
import type { MealRow } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface DayGroup {
  title: string;
  data: MealRow[];
}

const formatDayHeader = (dateStr: string, todayLabel: string, yesterdayLabel: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const mealDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (mealDate.getTime() === today.getTime()) return todayLabel;
  if (mealDate.getTime() === yesterday.getTime()) return yesterdayLabel;

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

export const MealTimelineScreen = () => {
  const { t } = useTranslation('meals');
  const { t: tc } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { data, isLoading, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useMeals();

  const sections: DayGroup[] = useMemo(() => {
    if (!data?.pages) return [];

    const allMeals = data.pages.flatMap((p) => p.meals);
    const groups = new Map<string, MealRow[]>();

    for (const meal of allMeals) {
      const dayKey = new Date(meal.logged_at).toISOString().slice(0, 10);
      const existing = groups.get(dayKey);
      if (existing) {
        existing.push(meal);
      } else {
        groups.set(dayKey, [meal]);
      }
    }

    return Array.from(groups.entries()).map(([dayKey, meals]) => ({
      title: formatDayHeader(dayKey, tc('common.today'), tc('common.yesterday')),
      data: meals,
    }));
  }, [data, tc]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('timeline_title')}</Text>
        </View>
        <View style={styles.skeletonList}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLoader
              key={i}
              height={80}
              borderRadius={radii.DEFAULT}
              style={{ marginBottom: spacing.sm, marginHorizontal: spacing.md }}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>{t('timeline_title')}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Pressable
            onPress={() => navigation.navigate('MealPhotoGallery')}
            style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.7 }]}
          >
            <ImageIcon size={18} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('ManualMealEntry')}
            style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}
          >
            <Plus size={20} color={colors.onPrimary} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      {sections.length === 0 ? (
        <EmptyState
          Icon={UtensilsCrossed}
          title={t('timeline_empty_title')}
          subtitle={t('timeline_empty_subtitle')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <MealCardWithPhoto
              meal={item}
              index={index}
              onPress={() => navigation.navigate('MealDetail', { mealId: item.id })}
            />
          )}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          stickySectionHeadersEnabled={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
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

const MealCardWithPhoto = ({
  meal,
  index,
  onPress,
}: {
  meal: MealRow;
  index: number;
  onPress: () => void;
}) => {
  const { data: imageUrl } = useMealPhoto(meal.image_key);
  return <MealCard meal={meal} index={index} imageUrl={imageUrl ?? null} onPress={onPress} />;
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
    ...typography.headlineLg,
    color: colors.onSurface,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  skeletonList: {
    paddingTop: spacing.md,
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
