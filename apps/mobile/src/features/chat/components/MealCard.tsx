import React from 'react';
import { View, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UtensilsCrossed } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useMealPhoto } from '~/features/meals/hooks/useMealPhoto';
import { NutrientBadge } from './NutrientBadge';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import type { RootStackParamList } from '~/app/navigation/types';

interface MealCardProps {
  mealId: string;
  mealType: string;
  loggedAt: string;
  imageKey: string | null;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
}

export const MealCard = ({
  mealId,
  mealType,
  loggedAt,
  imageKey,
  totalCalories,
  totalProteinG,
  totalCarbsG,
  totalFatG,
}: MealCardProps) => {
  const { t } = useTranslation('chat');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: photoUrl, isLoading: photoLoading } = useMealPhoto(imageKey);

  const time = new Date(loggedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Pressable
      onPress={() => navigation.navigate('MealDetail', { mealId })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: radii.DEFAULT,
        overflow: 'hidden',
        transform: [{ scale: pressed ? 0.98 : 1 }],
        ...elevation.ambient,
      })}
    >
      <View
        style={{
          width: 72,
          height: 72,
          backgroundColor: colors.surfaceContainerHigh,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {photoLoading ? (
          <ActivityIndicator size="small" color={colors.outline} />
        ) : photoUrl ? (
          <Image source={{ uri: photoUrl }} style={{ width: 72, height: 72 }} resizeMode="cover" />
        ) : (
          <UtensilsCrossed size={28} color={colors.outline} strokeWidth={1.5} />
        )}
      </View>

      <View style={{ flex: 1, padding: spacing.md, justifyContent: 'center', gap: 4 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text style={{ ...typography.labelLg, color: colors.onSurface }}>
            {t(`meal_type_${mealType}`, { defaultValue: mealType })}
          </Text>
          <Text style={{ ...typography.labelSm, color: colors.outline }}>{time}</Text>
        </View>

        <Text style={{ ...typography.titleMd, fontWeight: '700', color: colors.onSurface }}>
          {totalCalories} {t('kcal')}
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
          <NutrientBadge
            label="P"
            value={`${Math.round(totalProteinG)}g`}
            color={colors.macro.protein}
          />
          <NutrientBadge
            label="C"
            value={`${Math.round(totalCarbsG)}g`}
            color={colors.macro.carbs}
          />
          <NutrientBadge label="F" value={`${Math.round(totalFatG)}g`} color={colors.macro.fat} />
        </View>
      </View>
    </Pressable>
  );
};
