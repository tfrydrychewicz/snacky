import React from 'react';
import { View } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { useTranslation } from 'react-i18next';

export const PlaceholderScreen = () => {
  const { t } = useTranslation('common');

  return (
    <View className="bg-surface-background flex-1 items-center justify-center">
      <Text className="text-heading-2 text-primary">{t('common.appName')}</Text>
      <Text className="mt-sm text-body-md text-gray-500">{t('common.loading')}</Text>
    </View>
  );
};
