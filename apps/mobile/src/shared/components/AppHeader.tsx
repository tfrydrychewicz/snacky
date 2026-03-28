import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '~/shared/theme/tokens';

interface AppHeaderProps {
  avatarUrl?: string;
  onSettingsPress?: () => void;
}

export const AppHeader = ({ onSettingsPress }: AppHeaderProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        paddingTop: insets.top + 8,
        paddingHorizontal: spacing.lg,
        paddingBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.surfaceContainerHigh,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18 }}>🥗</Text>
        </View>
        <Text
          style={{
            ...typography.headlineMd,
            fontWeight: '800',
            fontStyle: 'italic',
            color: colors.primary,
            letterSpacing: -0.5,
          }}
        >
          Snacky
        </Text>
      </View>
      <Pressable
        onPress={onSettingsPress}
        hitSlop={12}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 0.6 })}
      >
        <Text style={{ fontSize: 22 }}>⚙️</Text>
      </Pressable>
    </View>
  );
};
