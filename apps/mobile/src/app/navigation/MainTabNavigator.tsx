import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Camera, MessageCircle, TrendingUp } from 'lucide-react-native';
import { DashboardScreen } from '~/features/dashboard/screens/DashboardScreen';
import { ScanResultsScreen } from '~/features/scanner/screens/ScanResultsScreen';
import { ChatScreen } from '~/features/chat/screens/ChatScreen';
import { TrendsScreen } from '~/features/trends/screens/TrendsScreen';
import { colors, typography, radii, spacing } from '~/shared/theme/tokens';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Dashboard', Icon: LayoutGrid, labelKey: 'tabs.dashboard' },
  { name: 'Scanner', Icon: Camera, labelKey: 'tabs.scanner' },
  { name: 'Chat', Icon: MessageCircle, labelKey: 'tabs.assistant' },
  { name: 'Trends', Icon: TrendingUp, labelKey: 'tabs.trends' },
] as const;

const SCREEN_MAP: Record<string, React.ComponentType> = {
  Dashboard: DashboardScreen,
  Scanner: ScanResultsScreen,
  Chat: ChatScreen,
  Trends: TrendsScreen,
};

const GlassTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');

  return (
    <View
      style={{
        position: 'absolute',
        bottom: Math.max(insets.bottom, 12),
        left: spacing.lg,
        right: spacing.lg,
        height: 64,
        borderRadius: radii.lg,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          backgroundColor:
            Platform.OS === 'ios' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.95)',
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: `${colors.outlineVariant}25`,
          shadowColor: colors.onSurface,
          shadowOffset: { width: 0, height: 16 },
          shadowRadius: 32,
          shadowOpacity: 0.06,
          elevation: 8,
          paddingHorizontal: spacing.sm,
        }}
      >
        {state.routes.map((route, index) => {
          const tab = TABS[index];
          if (!tab) return null;
          const isFocused = state.index === index;
          const IconComponent = tab.Icon;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isFocused) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 8,
                  shadowOpacity: 0.3,
                  elevation: 4,
                })}
              >
                <IconComponent size={20} color={colors.onPrimary} strokeWidth={2.5} />
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => ({
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 6,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <IconComponent size={20} color={colors.outline} strokeWidth={1.8} />
              <Text
                style={{
                  ...typography.labelSm,
                  color: colors.outline,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontSize: 9,
                  marginTop: 2,
                }}
              >
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export const MainTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <GlassTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    {TABS.map((tab) => {
      const component = SCREEN_MAP[tab.name];
      if (!component) return null;
      return <Tab.Screen key={tab.name} name={tab.name} component={component} />;
    })}
  </Tab.Navigator>
);
