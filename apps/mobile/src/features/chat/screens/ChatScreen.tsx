import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react-native';
import { MMKV } from 'react-native-mmkv';
import { AppHeader } from '~/shared/components/AppHeader';
import { EmptyState } from '~/shared/components/EmptyState';
import { ChatBubble } from '../components/ChatBubble';
import { ChatInput } from '../components/ChatInput';
import { useChatStream } from '../hooks/useChatStream';
import { useChatHistory, type ChatMessageRow } from '../hooks/useChatHistory';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

const chatCache = new MMKV({ id: 'chat-cache' });
const CACHE_KEY = 'chat_messages_cache';
const MAX_CACHED = 100;

function getCachedMessages(): ChatMessageRow[] {
  const raw = chatCache.getString(CACHE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatMessageRow[];
  } catch {
    return [];
  }
}

function setCachedMessages(messages: ChatMessageRow[]): void {
  const toCache = messages.slice(-MAX_CACHED);
  chatCache.set(CACHE_KEY, JSON.stringify(toCache));
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
}

export const ChatScreen = () => {
  const { t } = useTranslation('chat');
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<DisplayMessage>>(null);
  const queryClient = useQueryClient();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<DisplayMessage[]>([]);
  const [isWaiting, setIsWaiting] = useState(false);

  const { state: streamState, sendMessage, cancelStream } = useChatStream();
  const {
    data: historyData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatHistory(sessionId);

  const historyMessages: ChatMessageRow[] = useMemo(() => {
    if (!historyData?.pages) return getCachedMessages();
    const all = historyData.pages.flatMap((p) => p.messages);
    if (all.length > 0) setCachedMessages(all);
    return all;
  }, [historyData]);

  const displayMessages: DisplayMessage[] = useMemo(() => {
    const fromHistory: DisplayMessage[] = historyMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    }));

    const historyContents = new Set(historyMessages.map((m) => `${m.role}:${m.content}`));
    const uniqueOptimistic = optimisticMessages.filter(
      (m) => !historyContents.has(`${m.role}:${m.content}`),
    );

    return [...fromHistory, ...uniqueOptimistic];
  }, [historyMessages, optimisticMessages]);

  useEffect(() => {
    if (streamState.sessionId && streamState.sessionId !== sessionId) {
      setSessionId(streamState.sessionId);
    }
  }, [streamState.sessionId, sessionId]);

  const scrollToBottom = useCallback(() => {
    if (displayMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [displayMessages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages.length, scrollToBottom]);

  const handleSend = useCallback(
    async (message: string) => {
      const userMsg: DisplayMessage = {
        id: `opt_user_${Date.now()}`,
        role: 'user',
        content: message,
      };
      setOptimisticMessages((prev) => [...prev, userMsg]);
      setIsWaiting(true);

      const result = await sendMessage(message, sessionId ?? undefined);

      if (result) {
        const assistantMsg: DisplayMessage = {
          id: `opt_asst_${Date.now()}`,
          role: 'assistant',
          content: result.content,
        };
        setOptimisticMessages((prev) => [...prev, assistantMsg]);
        setIsWaiting(false);

        if (result.session_id !== sessionId) {
          setSessionId(result.session_id);
        }
        void queryClient.invalidateQueries({
          queryKey: ['chat_messages', result.session_id],
        });
      } else if (streamState.error) {
        const errorMsg: DisplayMessage = {
          id: `opt_err_${Date.now()}`,
          role: 'error',
          content: streamState.error,
        };
        setOptimisticMessages((prev) => [...prev, errorMsg]);
        setIsWaiting(false);
      } else {
        setIsWaiting(false);
      }
    },
    [sendMessage, sessionId, streamState.error, queryClient],
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<DisplayMessage>) => {
      if (item.role === 'error') {
        return (
          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}>
            <View
              style={{
                backgroundColor: colors.errorContainer,
                borderRadius: radii.DEFAULT,
                padding: spacing.md,
              }}
            >
              <Text style={{ ...typography.bodySm, color: colors.onErrorContainer }}>
                {t('error_generic')}
              </Text>
            </View>
          </View>
        );
      }

      return (
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}>
          <ChatBubble role={item.role} content={item.content} />
        </View>
      );
    },
    [t],
  );

  const keyExtractor = useCallback((item: DisplayMessage) => item.id, []);

  const isEmpty = displayMessages.length === 0 && !isWaiting;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {isEmpty ? (
          <EmptyState
            Icon={MessageCircle}
            title={t('empty_title')}
            subtitle={t('empty_subtitle')}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{
              paddingTop: spacing.md,
              paddingBottom: 160,
            }}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              isWaiting ? (
                <View
                  style={{
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ ...typography.bodySm, color: colors.outline }}>
                    {t('thinking')}
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 80,
            left: spacing.md,
            right: spacing.md,
          }}
        >
          <ChatInput
            onSend={(msg) => void handleSend(msg)}
            onCancel={cancelStream}
            isStreaming={isWaiting}
            disabled={isWaiting}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
