import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Lightbulb } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';
import type { NutrientInsightsResult } from '@snacky/shared-types';

interface Props {
  insights: NutrientInsightsResult | null;
  isLoading: boolean;
  onPress: () => void;
}

export const NutrientInsightsBubble = ({ insights, isLoading, onPress }: Props) => {
  const { t } = useTranslation('scanner');

  if (isLoading) {
    return (
      <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.container}>
        <View style={[styles.bubble, styles.loadingBubble]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>{t('nutrient_insights_loading')}</Text>
        </View>
      </Animated.View>
    );
  }

  if (!insights?.has_insights) return null;

  const hasWarnings = insights.warnings.length > 0;
  const tintColor = hasWarnings ? colors.tertiary : colors.primary;
  const bgColor = hasWarnings ? `${colors.tertiaryFixed}40` : `${colors.primaryFixed}40`;

  return (
    <Animated.View entering={FadeInUp.delay(200).duration(500).springify()} style={styles.container}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.bubble,
          { backgroundColor: bgColor, borderColor: `${tintColor}30` },
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${tintColor}20` }]}>
          <Lightbulb size={18} color={tintColor} strokeWidth={2} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: tintColor }]}>
            {t('nutrient_insights_title')}
          </Text>
          <Text style={styles.count}>
            {t('nutrient_insights_count', { count: insights.insight_count })}
          </Text>
        </View>
        <Text style={[styles.arrow, { color: tintColor }]}>›</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.DEFAULT,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: spacing.sm,
  },
  loadingBubble: {
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.labelLg,
    fontWeight: '700',
  },
  count: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  arrow: {
    fontSize: 24,
    fontWeight: '300',
    marginLeft: spacing.sm,
  },
});
