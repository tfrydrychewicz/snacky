import React from 'react';
import { Text, View } from 'react-native';

export const PlaceholderScreen = () => (
  <View className="flex-1 items-center justify-center bg-surface-background">
    <Text className="text-heading-2 text-primary">Snacky</Text>
    <Text className="mt-sm text-body-md text-gray-500">App shell ready</Text>
  </View>
);
