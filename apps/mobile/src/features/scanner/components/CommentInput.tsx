import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

type Props = {
  value: string;
  onChange: (text: string) => void;
};

export const CommentInput = ({ value, onChange }: Props) => {
  const { t } = useTranslation('scanner');

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <MessageSquare size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
        <Text style={styles.label}>{t('comment_label')}</Text>
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={t('comment_placeholder')}
        placeholderTextColor={colors.outline}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        maxLength={500}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  input: {
    ...typography.bodyMd,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 80,
  },
});
