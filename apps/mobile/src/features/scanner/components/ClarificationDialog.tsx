import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { HelpCircle, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ClarificationQuestion } from '@snacky/shared-types';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';

type Props = {
  question: ClarificationQuestion;
  visible: boolean;
  currentRound: number;
  maxRounds: number;
  onSubmit: (question: string, answer: string) => void;
  onSkip: () => void;
};

export const ClarificationDialog = ({
  question,
  visible,
  currentRound,
  maxRounds,
  onSubmit,
  onSkip,
}: Props) => {
  const { t } = useTranslation('scanner');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');

  const handleSubmit = () => {
    const answer = selectedOption ?? customText.trim();
    if (!answer) return;
    onSubmit(question.question, answer);
    setSelectedOption(null);
    setCustomText('');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.iconRow}>
              <HelpCircle size={24} color={colors.secondary} strokeWidth={2} />
              <Text style={styles.title}>{t('clarification_title')}</Text>
            </View>
            <Pressable onPress={onSkip} hitSlop={12}>
              <X size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <Text style={styles.roundIndicator}>
            {t('clarification_round', { current: currentRound, max: maxRounds })}
          </Text>

          <Text style={styles.question}>{question.question}</Text>

          <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
            {question.options.map((option) => {
              const selected = selectedOption === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    setSelectedOption(selected ? null : option);
                    setCustomText('');
                  }}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <TextInput
            style={styles.customInput}
            value={customText}
            onChangeText={(text) => {
              setCustomText(text);
              setSelectedOption(null);
            }}
            placeholder={t('clarification_custom_placeholder')}
            placeholderTextColor={colors.outline}
            multiline={false}
          />

          <View style={styles.actions}>
            <Pressable onPress={onSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>{t('clarification_skip')}</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={!selectedOption && !customText.trim()}
              style={[
                styles.submitBtn,
                !selectedOption && !customText.trim() && styles.submitBtnDisabled,
              ]}
            >
              <Text style={styles.submitText}>{t('clarification_submit')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.DEFAULT,
    padding: spacing.lg,
    ...elevation.float,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.titleLg,
    color: colors.onSurface,
  },
  roundIndicator: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  question: {
    ...typography.bodyLg,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  optionList: {
    maxHeight: 200,
    marginBottom: spacing.md,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primaryContainer}30`,
  },
  optionText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  customInput: {
    ...typography.bodyMd,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.full,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
  },
  skipText: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.full,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    ...typography.titleMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
