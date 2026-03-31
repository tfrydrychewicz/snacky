import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { X, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';
import type { NutrientInsightsResult, NutrientWarning, NutrientSynergy } from '@snacky/shared-types';

interface Props {
  visible: boolean;
  onClose: () => void;
  insights: NutrientInsightsResult;
}

const SEVERITY_CONFIG = {
  strong: { icon: AlertOctagon, color: colors.error, bg: `${colors.errorContainer}60` },
  moderate: { icon: AlertTriangle, color: colors.tertiary, bg: `${colors.tertiaryFixed}30` },
  mild: { icon: AlertTriangle, color: colors.onSurfaceVariant, bg: `${colors.surfaceContainerHigh}80` },
} as const;

const WarningCard = ({ warning, index }: { warning: NutrientWarning; index: number }) => {
  const config = SEVERITY_CONFIG[warning.severity];
  const IconComponent = config.icon;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(300)}
      style={[styles.card, { backgroundColor: config.bg }]}
    >
      <View style={styles.cardHeader}>
        <IconComponent size={20} color={config.color} strokeWidth={2} />
        <Text style={[styles.cardTitle, { color: config.color }]}>{warning.title}</Text>
      </View>
      <Text style={styles.cardDescription}>{warning.description}</Text>
      <View style={styles.suggestionBox}>
        <Text style={styles.suggestionLabel}>💡</Text>
        <Text style={styles.suggestionText}>{warning.suggestion}</Text>
      </View>
    </Animated.View>
  );
};

const SynergyCard = ({ synergy, index }: { synergy: NutrientSynergy; index: number }) => (
  <Animated.View
    entering={FadeInDown.delay(index * 80).duration(300)}
    style={[styles.card, { backgroundColor: `${colors.primaryFixed}30` }]}
  >
    <View style={styles.cardHeader}>
      <CheckCircle size={20} color={colors.primary} strokeWidth={2} />
      <Text style={[styles.cardTitle, { color: colors.primary }]}>{synergy.title}</Text>
    </View>
    <Text style={styles.cardDescription}>{synergy.description}</Text>
  </Animated.View>
);

export const NutrientInsightsSheet = ({ visible, onClose, insights }: Props) => {
  const { t } = useTranslation('scanner');
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('nutrient_insights_title')}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <X size={22} color={colors.onSurface} strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {insights.synergies.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('nutrient_insights_synergies_title')}
              </Text>
              {insights.synergies.map((s, i) => (
                <SynergyCard key={s.id} synergy={s} index={i} />
              ))}
            </View>
          )}

          {insights.warnings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('nutrient_insights_warnings_title')}
              </Text>
              {insights.warnings.map((w, i) => (
                <WarningCard key={w.id} warning={w} index={i} />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  card: {
    borderRadius: radii.DEFAULT,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.labelLg,
    fontWeight: '700',
    flex: 1,
  },
  cardDescription: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 22,
  },
  suggestionBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  suggestionLabel: {
    fontSize: 16,
  },
  suggestionText: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
});
