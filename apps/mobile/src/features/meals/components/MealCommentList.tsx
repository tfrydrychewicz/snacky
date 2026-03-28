import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Send, Trash2, MessageSquare } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';
import { useAuth } from '~/app/providers/AuthProvider';
import { useMealComments, useAddComment, useDeleteComment } from '../hooks/useMealComments';

interface MealCommentListProps {
  mealId: string;
}

const formatRelativeTime = (dateStr: string): { key: 'comments_just_now' | 'comments_minutes_ago' | 'comments_hours_ago'; opts?: { count: number }; fallback?: string } => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);

  if (minutes < 1) return { key: 'comments_just_now' };
  if (minutes < 60) return { key: 'comments_minutes_ago', opts: { count: minutes } };
  if (hours < 24) return { key: 'comments_hours_ago', opts: { count: hours } };

  return {
    key: 'comments_just_now',
    fallback: new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

export const MealCommentList = ({ mealId }: MealCommentListProps) => {
  const { t } = useTranslation('meals');
  const { user } = useAuth();
  const { data: comments, isLoading } = useMealComments(mealId);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const [text, setText] = useState('');

  const handleSend = () => {
    const content = text.trim();
    if (!content) return;
    addComment.mutate({ mealId, content });
    setText('');
  };

  const handleDelete = (commentId: string) => {
    Alert.alert(t('comments_delete'), t('comments_delete_confirm'), [
      { text: t('edit_cancel'), style: 'cancel' },
      {
        text: t('comments_delete'),
        style: 'destructive',
        onPress: () => deleteComment.mutate({ commentId, mealId }),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <MessageSquare size={18} color={colors.onSurface} strokeWidth={2} />
        <Text style={styles.title}>{t('comments_title')}</Text>
      </View>

      {isLoading ? null : !comments || comments.length === 0 ? (
        <Text style={styles.emptyText}>{t('comments_empty')}</Text>
      ) : (
        <View style={styles.list}>
          {comments.map((comment, i) => (
            <Animated.View key={comment.id} entering={FadeInDown.delay(i * 40).duration(300)} style={styles.comment}>
              <View style={styles.commentContent}>
                <Text style={styles.commentText}>{comment.content}</Text>
                <Text style={styles.commentTime}>
                  {(() => {
                    const rel = formatRelativeTime(comment.created_at);
                    return rel.fallback ?? t(rel.key, rel.opts);
                  })()}
                </Text>
              </View>
              {user?.id === comment.user_id && (
                <Pressable
                  onPress={() => handleDelete(comment.id)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}
                >
                  <Trash2 size={14} color={colors.error} strokeWidth={2} />
                </Pressable>
              )}
            </Animated.View>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('comments_placeholder')}
          placeholderTextColor={colors.outline}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || addComment.isPending}
          style={({ pressed }) => [
            styles.sendBtn,
            (!text.trim() || addComment.isPending) && { opacity: 0.4 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Send size={18} color={colors.onPrimary} strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleLg,
    color: colors.onSurface,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  list: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  comment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.sm,
    padding: spacing.sm,
    alignItems: 'flex-start',
  },
  commentContent: {
    flex: 1,
  },
  commentText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  commentTime: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
