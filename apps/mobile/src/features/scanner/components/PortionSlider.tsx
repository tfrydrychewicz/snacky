import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

type Props = {
  value: number;
  onChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
};

export const PortionSlider = ({ value, onChange, minValue = 10, maxValue = 500 }: Props) => {
  const { t } = useTranslation('scanner');

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{t('portion_adjust')}</Text>
        <View style={styles.valueBadge}>
          <Text style={styles.valueText}>{t('portion_value_g', { value: Math.round(value) })}</Text>
        </View>
      </View>
      <Slider
        value={value}
        onValueChange={onChange}
        minimumValue={minValue}
        maximumValue={maxValue}
        step={5}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.outlineVariant}
        thumbTintColor={colors.primary}
        style={styles.slider}
      />
      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>{t('portion_value_g', { value: minValue })}</Text>
        <Text style={styles.rangeText}>{t('portion_value_g', { value: maxValue })}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  valueBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  valueText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeText: {
    ...typography.labelSm,
    color: colors.outline,
  },
});
