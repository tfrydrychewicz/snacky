import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { PartyPopper } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '~/app/providers/AuthProvider';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import type { OnboardingStackParamList } from '~/app/navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Complete'>;

const MacroCard = ({
  label,
  value,
  color,
  index,
}: {
  label: string;
  value: string;
  color: string;
  index: number;
}) => (
  <Animated.View
    entering={FadeInUp.delay(600 + index * 100).springify()}
    style={{
      flex: 1,
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: radii.DEFAULT,
      padding: spacing.md,
      alignItems: 'center',
    }}
  >
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        marginBottom: spacing.xs,
      }}
    />
    <Text style={{ ...typography.titleLg, color: colors.onSurface }}>{value}</Text>
    <Text style={{ ...typography.labelMd, color: colors.onSurfaceVariant, marginTop: 2 }}>
      {label}
    </Text>
  </Animated.View>
);

export const OnboardingCompleteScreen = ({ route }: Props) => {
  const { t } = useTranslation('onboarding');
  const insets = useSafeAreaInsets();
  const { refreshProfile } = useAuth();
  const { tdee, targetKcal, proteinG, carbsG, fatG } = route.params;

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        paddingTop: insets.top + spacing['2xl'],
        paddingHorizontal: spacing.lg,
        paddingBottom: Math.max(insets.bottom, spacing.lg),
      }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.primaryFixed,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.xl,
              alignSelf: 'center',
              ...elevation.ambient,
            }}
          >
            <PartyPopper size={44} color={colors.primary} strokeWidth={1.8} />
          </View>
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.delay(200).springify()}
          style={{
            ...typography.displaySm,
            color: colors.onSurface,
            textAlign: 'center',
            marginBottom: spacing.sm,
          }}
        >
          {t('complete.title')}
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(300).springify()}
          style={{
            ...typography.bodyLg,
            color: colors.onSurfaceVariant,
            textAlign: 'center',
            marginBottom: spacing['2xl'],
          }}
        >
          {t('complete.subtitle')}
        </Animated.Text>

        <Animated.View
          entering={FadeInUp.delay(400).springify()}
          style={{
            backgroundColor: colors.surfaceContainerLowest,
            borderRadius: radii.DEFAULT,
            padding: spacing.lg,
            width: '100%',
            ...elevation.ambient,
          }}
        >
          <Text
            style={{
              ...typography.labelMd,
              color: colors.onSurfaceVariant,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: spacing.xs,
            }}
          >
            {t('complete.tdee')}
          </Text>
          <Text
            style={{
              ...typography.displayLg,
              color: colors.primary,
              marginBottom: spacing.lg,
            }}
          >
            {t('complete.kcal', { value: targetKcal })}
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <MacroCard
              label={t('complete.protein')}
              value={t('complete.grams', { value: proteinG })}
              color={colors.macro.protein}
              index={0}
            />
            <MacroCard
              label={t('complete.carbs')}
              value={t('complete.grams', { value: carbsG })}
              color={colors.macro.carbs}
              index={1}
            />
            <MacroCard
              label={t('complete.fat')}
              value={t('complete.grams', { value: fatG })}
              color={colors.macro.fat}
              index={2}
            />
          </View>
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.delay(900).springify()}
          style={{
            ...typography.bodySm,
            color: colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: spacing.lg,
          }}
        >
          {t('complete.adjustLater')}
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInUp.delay(1000).springify()}>
        <Pressable
          onPress={() => {
            void refreshProfile();
          }}
          style={({ pressed }) => ({
            backgroundColor: colors.primary,
            paddingVertical: spacing.md,
            borderRadius: radii.lg,
            alignItems: 'center',
            opacity: pressed ? 0.8 : 1,
            ...elevation.ambient,
          })}
        >
          <Text style={{ ...typography.labelLg, color: colors.onPrimary }}>
            {t('complete.startButton')}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};
