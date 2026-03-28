import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { DashboardScreen } from '~/features/dashboard/screens/DashboardScreen';
import { EmptyState } from '~/shared/components/EmptyState';
import { TabIcon } from '~/shared/components/TabIcon';
import { colors } from '~/shared/theme/tokens';

const Tab = createBottomTabNavigator();

const ScannerPlaceholder = () => <EmptyState icon="📸" title="Scanner" subtitle="Coming soon" />;
const DietPlanPlaceholder = () => <EmptyState icon="🍽️" title="Diet Plan" subtitle="Coming soon" />;
const ChatPlaceholder = () => <EmptyState icon="💬" title="Chat" subtitle="Coming soon" />;
const ProgressPlaceholder = () => <EmptyState icon="📊" title="Progress" subtitle="Coming soon" />;

export const MainTabNavigator = () => {
  const { t } = useTranslation('common');

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 8,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 8,
          shadowOpacity: 0.06,
          shadowColor: '#000',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        animation: 'fade',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('common.tabs.dashboard'),
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerPlaceholder}
        options={{
          tabBarLabel: t('common.tabs.scanner'),
          tabBarIcon: ({ focused }) => <TabIcon icon="📸" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="DietPlan"
        component={DietPlanPlaceholder}
        options={{
          tabBarLabel: t('common.tabs.dietPlan'),
          tabBarIcon: ({ focused }) => <TabIcon icon="🍽️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatPlaceholder}
        options={{
          tabBarLabel: t('common.tabs.chat'),
          tabBarIcon: ({ focused }) => <TabIcon icon="💬" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressPlaceholder}
        options={{
          tabBarLabel: t('common.tabs.progress'),
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};
