import React from 'react';
import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { UtensilsCrossed, Flame } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';
import type { MealRow } from '~/features/meals/types';
import { useMealPhoto } from '~/features/meals/hooks/useMealPhoto';

interface RecentMealsTileProps {
  meals: MealRow[];
  onViewHistory: () => void;
  onMealPress: (mealId: string) => void;
  index?: number;
}

export const RecentMealsTile = ({
  meals,
  onViewHistory,
  onMealPress,
  index = 3,
}: RecentMealsTileProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50)
        .duration(350)
        .springify()}
      style={{
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: radii.DEFAULT,
        padding: spacing.lg,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
        }}
      >
        <Text style={{ ...typography.titleLg }}>{t('tiles.recentMeals')}</Text>
        <Pressable hitSlop={8} onPress={onViewHistory}>
          <Text
            style={{
              ...typography.labelMd,
              color: colors.primary,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {t('tiles.viewHistory')}
          </Text>
        </Pressable>
      </View>

      {meals.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <UtensilsCrossed size={32} color={colors.outlineVariant} strokeWidth={1.5} />
          <Text
            style={{ ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.sm }}
          >
            {t('tiles.noMealsToday')}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {meals.slice(0, 5).map((meal) => (
            <RecentMealCard key={meal.id} meal={meal} onPress={() => onMealPress(meal.id)} />
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
};

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍿',
};

const RecentMealCard = ({ meal, onPress }: { meal: MealRow; onPress: () => void }) => {
  const { data: imageUrl } = useMealPhoto(meal.image_key);
  const time = new Date(meal.logged_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 140,
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radii.DEFAULT,
        padding: spacing.sm,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View
        style={{
          height: 100,
          borderRadius: radii.sm,
          backgroundColor: colors.surfaceContainerHigh,
          marginBottom: spacing.sm,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <UtensilsCrossed size={28} color={colors.outlineVariant} strokeWidth={1.5} />
        )}
      </View>
      <Text
        style={{ ...typography.labelMd, color: colors.onSurface, marginBottom: 2 }}
        numberOfLines={1}
      >
        {MEAL_TYPE_LABEL[meal.meal_type] ?? '🍽️'} {time}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Flame size={12} color={colors.primary} strokeWidth={2.5} />
        <Text style={{ ...typography.labelSm, color: colors.onSurfaceVariant }}>
          {Math.round(meal.total_calories)} kcal
        </Text>
      </View>
    </Pressable>
  );
};
