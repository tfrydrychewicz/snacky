import React, { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { UtensilsCrossed, ChevronRight, Sparkles } from 'lucide-react-native';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import { useActivePlan, useGeneratingPlan } from '../hooks/useActivePlan';
import { getPersistedGeneration, clearPersistedGeneration } from '../hooks/useWorkflowGeneration';

interface DietPlanTileProps {
  onCreatePlan: () => void;
  onViewPlan: (planId: string) => void;
  index?: number;
}

export const DietPlanTile = ({ onCreatePlan, onViewPlan, index = 0 }: DietPlanTileProps) => {
  const { t } = useTranslation('dietPlan');
  const queryClient = useQueryClient();
  const { data: plan } = useActivePlan();
  const { data: generatingPlan, isPending: isCheckingGeneration } = useGeneratingPlan();

  const persistedGeneration = getPersistedGeneration();

  // When DB confirms no generating plan but MMKV still thinks one exists,
  // the generation finished while we were away — clean up and refetch.
  useEffect(() => {
    if (!isCheckingGeneration && !generatingPlan && persistedGeneration) {
      clearPersistedGeneration();
      void queryClient.invalidateQueries({ queryKey: ['diet-plan'] });
    }
  }, [isCheckingGeneration, generatingPlan, persistedGeneration, queryClient]);

  // MMKV gives an instant answer while DB query loads; once resolved, DB is source of truth
  const generatingPlanId = isCheckingGeneration
    ? persistedGeneration?.planId ?? null
    : generatingPlan?.planId ?? null;
  const isGenerating = generatingPlanId != null;
  const hasActivePlan = plan != null;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(350).springify()}>
      <Pressable
        onPress={() => {
          if (isGenerating) {
            onViewPlan(generatingPlanId);
          } else if (hasActivePlan) {
            onViewPlan(plan.id);
          } else {
            onCreatePlan();
          }
        }}
        style={({ pressed }) => ({
          backgroundColor: isGenerating
            ? colors.tertiaryContainer
            : hasActivePlan
              ? colors.primaryContainer
              : colors.surfaceContainerLow,
          borderRadius: radii.DEFAULT,
          padding: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          ...(hasActivePlan || isGenerating ? elevation.ambient : elevation.none),
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: isGenerating
              ? `${colors.onTertiaryContainer}20`
              : hasActivePlan
                ? `${colors.onPrimaryContainer}20`
                : `${colors.primary}15`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color={colors.onTertiaryContainer} />
          ) : hasActivePlan ? (
            <UtensilsCrossed size={22} color={colors.onPrimaryContainer} strokeWidth={2} />
          ) : (
            <Sparkles size={22} color={colors.primary} strokeWidth={2} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...typography.titleMd,
              color: isGenerating
                ? colors.onTertiaryContainer
                : hasActivePlan
                  ? colors.onPrimaryContainer
                  : colors.onSurface,
              fontWeight: '700',
            }}
          >
            {t('tile.title')}
          </Text>
          <Text
            style={{
              ...typography.bodySm,
              color: isGenerating
                ? colors.onTertiaryContainer
                : hasActivePlan
                  ? colors.onPrimaryContainer
                  : colors.onSurfaceVariant,
              marginTop: 2,
            }}
          >
            {isGenerating
              ? t('tile.generating')
              : hasActivePlan
                ? t('tile.activePlan', { days: plan.config?.duration_days ?? '—' })
                : t('tile.noPlan')}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: isGenerating
              ? colors.onTertiaryContainer
              : hasActivePlan
                ? colors.onPrimaryContainer
                : colors.primary,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: radii.full,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Text
            style={{
              ...typography.labelMd,
              color: isGenerating
                ? colors.tertiaryContainer
                : hasActivePlan
                  ? colors.primaryContainer
                  : colors.onPrimary,
            }}
          >
            {isGenerating
              ? t('tile.viewProgress')
              : hasActivePlan
                ? t('tile.viewPlan')
                : t('tile.createPlan')}
          </Text>
          <ChevronRight
            size={14}
            color={isGenerating
              ? colors.tertiaryContainer
              : hasActivePlan
                ? colors.primaryContainer
                : colors.onPrimary}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
};
