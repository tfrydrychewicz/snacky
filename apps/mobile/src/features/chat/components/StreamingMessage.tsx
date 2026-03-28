import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Bot } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';

interface StreamingMessageProps {
  text: string;
  isStreaming: boolean;
}

const CursorBlink = () => {
  const blink = useSharedValue(0);

  useEffect(() => {
    blink.value = withRepeat(
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [blink]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(blink.value, [0, 1], [0.2, 1]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: 2,
          height: 18,
          backgroundColor: colors.primary,
          borderRadius: 1,
          marginLeft: 2,
        },
        style,
      ]}
    />
  );
};

export const StreamingMessage = ({ text, isStreaming }: StreamingMessageProps) => {
  const { t } = useTranslation('chat');

  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 2 }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bot size={14} color={colors.onPrimaryContainer} strokeWidth={2.5} />
        </View>
        <Text
          style={{
            ...typography.labelSm,
            color: colors.outline,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
          }}
        >
          {t('assistant_label')}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors.surfaceContainerLowest,
          borderTopRightRadius: radii.DEFAULT,
          borderBottomLeftRadius: radii.DEFAULT,
          borderBottomRightRadius: radii.DEFAULT,
          borderTopLeftRadius: 4,
          padding: spacing.lg,
          ...elevation.ambient,
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Text style={{ ...typography.bodyLg, color: colors.onSurfaceVariant, lineHeight: 24 }}>
            {text || t('thinking')}
          </Text>
          {isStreaming && <CursorBlink />}
        </View>
      </View>
    </Animated.View>
  );
};
