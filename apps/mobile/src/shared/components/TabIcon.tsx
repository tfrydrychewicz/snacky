import React from 'react';
import { Text } from 'react-native';

interface TabIconProps {
  icon: string;
  focused: boolean;
}

export const TabIcon = ({ icon, focused }: TabIconProps) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
);
