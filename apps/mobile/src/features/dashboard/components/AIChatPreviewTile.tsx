import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Zap, Send } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

interface AIChatPreviewTileProps {
  index?: number;
}

export const AIChatPreviewTile = ({ index = 1 }: AIChatPreviewTileProps) => {
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
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${colors.primary}15`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Zap size={20} color={colors.primary} strokeWidth={2.5} />
        </View>
        <Text style={{ ...typography.titleLg }}>Snacky AI</Text>
      </View>

      <View
        style={{
          backgroundColor: colors.surfaceContainerLowest,
          borderRadius: radii.DEFAULT,
          padding: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <Text style={{ ...typography.bodySm, color: colors.onSurface, lineHeight: 20 }}>
          {t('ai_preview')}
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceContainerHighest,
          borderRadius: radii.full,
          paddingHorizontal: spacing.md,
          paddingVertical: 10,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ flex: 1, ...typography.bodySm, color: colors.onSurfaceVariant }}>
          {t('ai_ask')}
        </Text>
        <Send size={18} color={colors.primary} strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
};
