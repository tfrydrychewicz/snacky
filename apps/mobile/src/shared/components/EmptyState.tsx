import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  subtitle?: string;
}

export const EmptyState = ({ icon = '📭', title, subtitle }: EmptyStateProps) => {
  const { t } = useTranslation('common');

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        backgroundColor: '#FAFAFA',
      }}
    >
      <Text style={{ fontSize: 48 }}>{icon}</Text>
      <Text
        style={{
          fontSize: 20,
          fontWeight: '600',
          color: '#212121',
          marginTop: 16,
          textAlign: 'center',
        }}
      >
        {title ?? t('common.empty.title')}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: '#757575',
          marginTop: 4,
          textAlign: 'center',
        }}
      >
        {subtitle ?? t('common.empty.subtitle')}
      </Text>
    </Animated.View>
  );
};
