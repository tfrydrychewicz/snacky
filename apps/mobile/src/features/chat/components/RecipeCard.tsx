import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { UtensilsCrossed, Clock, Dumbbell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

interface RecipeCardProps {
  title: string;
  protein?: string;
  time?: string;
  onPress?: () => void;
}

export const RecipeCard = ({ title, protein, time, onPress }: RecipeCardProps) => {
  const { t } = useTranslation('chat');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: radii.DEFAULT,
        overflow: 'hidden',
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        style={{
          width: 72,
          backgroundColor: colors.surfaceContainerHigh,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <UtensilsCrossed size={28} color={colors.primary} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1, padding: spacing.md, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <UtensilsCrossed size={12} color={colors.primary} strokeWidth={2} />
          <Text
            style={{
              ...typography.labelSm,
              color: colors.primary,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {t('recipe_suggestion')}
          </Text>
        </View>
        <Text
          style={{
            ...typography.titleMd,
            fontWeight: '700',
            color: colors.onSurface,
            marginBottom: 4,
          }}
        >
          {title}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {protein && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Dumbbell size={13} color={colors.secondary} strokeWidth={2} />
              <Text style={{ ...typography.bodySm, color: colors.secondary }}>{protein}</Text>
            </View>
          )}
          {time && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={13} color={colors.outline} strokeWidth={2} />
              <Text style={{ ...typography.bodySm, color: colors.outline }}>{time}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};
