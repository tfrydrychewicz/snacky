import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import {
  Bot,
  AlertTriangle,
  UtensilsCrossed,
  Dumbbell,
  Clock,
  PlusCircle,
  ArrowUp,
} from 'lucide-react-native';
import { AppHeader } from '~/shared/components/AppHeader';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  badge?: { label: string; value: string; pct: number };
  suggestion?: { title: string; protein: string; time: string };
}

const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    text: 'How is my protein intake looking for the last week?',
  },
  {
    id: '2',
    role: 'assistant',
    text: 'Looking at your meals from the past 7 days, your average daily protein intake was 68g, which is about 72% of your target of 95g.',
    badge: { label: 'Protein Status', value: 'Below Target', pct: 72 },
    suggestion: { title: 'Protein-Packed Avocado Toast', protein: '24g Protein', time: '12 mins' },
  },
];

const UserBubble = ({ text }: { text: string }) => (
  <Animated.View
    entering={FadeInRight.duration(400)}
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
    <Text style={{ ...typography.bodyLg, color: colors.onPrimary, fontWeight: '500' }}>{text}</Text>
  </Animated.View>
);

const AssistantBubble = ({ msg }: { msg: ChatMessage }) => (
  <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{ gap: spacing.md }}>
    {/* Label */}
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
        AI Assistant
      </Text>
    </View>

    {/* Message Card */}
    <View
      style={{
        backgroundColor: colors.surfaceContainerLowest,
        borderTopRightRadius: radii.DEFAULT,
        borderBottomLeftRadius: radii.DEFAULT,
        borderBottomRightRadius: radii.DEFAULT,
        borderTopLeftRadius: 4,
        padding: spacing.lg,
        ...elevation.ambient,
        gap: spacing.md,
      }}
    >
      <Text
        style={{
          ...typography.bodyLg,
          color: colors.onSurfaceVariant,
          fontWeight: '500',
          lineHeight: 24,
        }}
      >
        {msg.text.split('68g').length > 1 ? (
          <>
            {msg.text.split('68g')[0]}
            <Text style={{ color: colors.secondary, fontWeight: '700' }}>68g</Text>
            {(msg.text.split('68g')[1] ?? '').split('72%')[0]}
            <Text style={{ color: colors.secondary, fontWeight: '700' }}>72%</Text>
            {msg.text.split('72%')[1] ?? ''}
          </>
        ) : (
          msg.text
        )}
      </Text>

      {msg.badge && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.md,
            backgroundColor: `${colors.secondary}08`,
            borderRadius: radii.DEFAULT,
            gap: spacing.md,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: `${colors.secondaryContainer}40`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={20} color={colors.secondary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  ...typography.labelSm,
                  color: colors.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {msg.badge.label}
              </Text>
              <View
                style={{
                  backgroundColor: colors.secondary,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: radii.full,
                }}
              >
                <Text style={{ ...typography.labelSm, color: '#FFF' }}>{msg.badge.value}</Text>
              </View>
            </View>
            <View
              style={{
                height: 5,
                backgroundColor: `${colors.secondary}15`,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  backgroundColor: colors.secondary,
                  borderRadius: 3,
                  width: `${msg.badge.pct}%`,
                }}
              />
            </View>
          </View>
        </View>
      )}

      {msg.text.includes('68g') && (
        <Text style={{ ...typography.bodyLg, color: colors.onSurfaceVariant, lineHeight: 22 }}>
          Would you like some high-protein breakfast ideas to help close the gap tomorrow?
        </Text>
      )}

      {msg.suggestion && (
        <Pressable
          style={({ pressed }) => ({
            flexDirection: 'row',
            backgroundColor: colors.surfaceContainerLow,
            borderRadius: radii.DEFAULT,
            overflow: 'hidden',
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <View
            style={{
              width: 80,
              backgroundColor: colors.surfaceContainerHigh,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UtensilsCrossed size={28} color={colors.primary} strokeWidth={1.5} />
          </View>
          <View style={{ flex: 1, padding: spacing.md, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <UtensilsCrossed size={12} color={colors.primary} strokeWidth={2} />
              <Text
                style={{
                  ...typography.labelSm,
                  color: colors.primary,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Breakfast Suggestion
              </Text>
            </View>
            <Text
              style={{
                ...typography.titleMd,
                fontWeight: '700',
                color: colors.onSurface,
                marginBottom: 4,
              }}
            >
              {msg.suggestion.title}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Dumbbell size={13} color={colors.secondary} strokeWidth={2} />
                <Text style={{ ...typography.bodySm, color: colors.secondary }}>
                  {msg.suggestion.protein}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Clock size={13} color={colors.outline} strokeWidth={2} />
                <Text style={{ ...typography.bodySm, color: colors.outline }}>
                  {msg.suggestion.time}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      )}
    </View>
  </Animated.View>
);

export const ChatScreen = () => {
  const { t } = useTranslation('chat');
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160, gap: spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          {DEMO_MESSAGES.map((msg) =>
            msg.role === 'user' ? (
              <UserBubble key={msg.id} text={msg.text} />
            ) : (
              <AssistantBubble key={msg.id} msg={msg} />
            ),
          )}
        </ScrollView>

        {/* Floating Input */}
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 80,
            left: spacing.md,
            right: spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: radii.lg,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              ...elevation.float,
              gap: spacing.xs,
            }}
          >
            <Pressable
              style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
            >
              <PlusCircle size={22} color={colors.outline} strokeWidth={1.5} />
            </Pressable>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t('input_placeholder')}
              placeholderTextColor={colors.outline}
              style={{
                flex: 1,
                ...typography.bodyLg,
                color: colors.onSurface,
                paddingVertical: 10,
              }}
            />
            <Pressable
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <ArrowUp size={18} color={colors.onPrimary} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
