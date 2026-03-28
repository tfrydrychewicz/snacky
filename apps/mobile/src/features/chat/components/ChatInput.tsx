import React, { useState, useCallback, useRef } from 'react';
import { View, TextInput, Pressable, type TextInput as TextInputType } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Square } from 'lucide-react-native';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';

interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, onCancel, isStreaming = false, disabled }: ChatInputProps) => {
  const { t } = useTranslation('chat');
  const [input, setInput] = useState('');
  const inputRef = useRef<TextInputType>(null);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  }, [input, onSend]);

  const handlePress = useCallback(() => {
    if (isStreaming) {
      onCancel?.();
    } else {
      handleSend();
    }
  }, [isStreaming, onCancel, handleSend]);

  const canSend = input.trim().length > 0 || isStreaming;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: radii.lg,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        ...elevation.float,
        gap: spacing.xs,
      }}
    >
      <TextInput
        ref={inputRef}
        value={input}
        onChangeText={setInput}
        placeholder={t('input_placeholder')}
        placeholderTextColor={colors.outline}
        editable={!disabled && !isStreaming}
        multiline
        maxLength={2000}
        onSubmitEditing={handleSend}
        blurOnSubmit
        style={{
          flex: 1,
          ...typography.bodyLg,
          color: colors.onSurface,
          paddingVertical: 10,
          maxHeight: 120,
        }}
      />
      <Pressable
        onPress={handlePress}
        disabled={!canSend}
        style={({ pressed }) => ({
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: isStreaming ? colors.error : canSend ? colors.primary : colors.outline,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.8 : canSend ? 1 : 0.4,
        })}
      >
        {isStreaming ? (
          <Square size={14} color={colors.onError} strokeWidth={3} fill={colors.onError} />
        ) : (
          <ArrowUp size={18} color={colors.onPrimary} strokeWidth={2.5} />
        )}
      </Pressable>
    </View>
  );
};
