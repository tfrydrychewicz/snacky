import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, Leaf } from 'lucide-react-native';
import { colors, typography, spacing } from '~/shared/theme/tokens';

interface AppHeaderProps {
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
            backgroundColor: `${colors.primary}15`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Leaf size={20} color={colors.primary} strokeWidth={2.5} />
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
        <Settings size={22} color={colors.outline} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
};
