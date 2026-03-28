import React from 'react';
import { Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Camera, PenLine } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

interface QuickActionsTileProps {
  onScan: () => void;
  onManualEntry: () => void;
  index?: number;
}

export const QuickActionsTile = ({ onScan, onManualEntry, index = 4 }: QuickActionsTileProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50)
        .duration(350)
        .springify()}
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
      }}
    >
      <Pressable
        onPress={onScan}
        style={({ pressed }) => ({
          flex: 2,
          backgroundColor: colors.primary,
          borderRadius: radii.DEFAULT,
          padding: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <Camera size={28} color={colors.onPrimary} strokeWidth={2} />
        <Text style={{ ...typography.titleMd, color: colors.onPrimary, fontWeight: '700' }}>
          {t('tiles.quickScan')}
        </Text>
      </Pressable>

      <Pressable
        onPress={onManualEntry}
        style={({ pressed }) => ({
          flex: 1,
          backgroundColor: colors.surfaceContainerLow,
          borderRadius: radii.DEFAULT,
          padding: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <PenLine size={24} color={colors.primary} strokeWidth={2} />
        <Text style={{ ...typography.labelMd, color: colors.primary, textAlign: 'center' }}>
          {t('tiles.manualEntry')}
        </Text>
      </Pressable>
    </Animated.View>
  );
};
