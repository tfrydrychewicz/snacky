import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Bot } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ChatAttachments } from '@snacky/shared-types';
import { ChatBlockRenderer } from './ChatBlockRenderer';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachments | null;
  isLatest?: boolean;
}

const UserBubble = ({ content }: { content: string }) => (
  <Animated.View
    entering={FadeInRight.duration(300).springify()}
    style={{
      alignSelf: 'flex-end',
      maxWidth: '85%',
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopLeftRadius: radii.DEFAULT,
      borderTopRightRadius: radii.DEFAULT,
      borderBottomLeftRadius: radii.DEFAULT,
      borderBottomRightRadius: 4,
    }}
  >
    <Text style={{ ...typography.bodyLg, color: colors.onPrimary, fontWeight: '500' }}>
      {content}
    </Text>
  </Animated.View>
);

const AssistantBubble = ({
  content,
  attachments,
}: {
  content: string;
  attachments?: ChatAttachments | null;
}) => {
  const { t } = useTranslation('chat');
  const blocks = attachments?.blocks ?? [];

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(300).springify()} style={{ gap: 8 }}>
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
        <Text
          style={{ ...typography.bodyLg, color: colors.onSurfaceVariant, lineHeight: 24 }}
          selectable
        >
          {content}
        </Text>
        {blocks.length > 0 && <ChatBlockRenderer blocks={blocks} />}
      </View>
    </Animated.View>
  );
};

export const ChatBubble = ({ role, content, attachments }: ChatBubbleProps) => {
  if (role === 'user') {
    return <UserBubble content={content} />;
  }
  return <AssistantBubble content={content} attachments={attachments} />;
};
