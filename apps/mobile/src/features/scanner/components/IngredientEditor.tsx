import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { IngredientAnalysis } from '@snacky/shared-types';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import { PortionSlider } from './PortionSlider';

type Props = {
  ingredient: IngredientAnalysis;
  visible: boolean;
  onClose: () => void;
  onSave: (updated: IngredientAnalysis) => void;
};

export const IngredientEditor = ({ ingredient, visible, onClose, onSave }: Props) => {
  const { t } = useTranslation('scanner');
  const [name, setName] = useState(ingredient.name);
  const [portionG, setPortionG] = useState(ingredient.quantity_g);

  const scaleFactor = portionG / ingredient.quantity_g;

  const scaledMacros = {
    ...ingredient.macros,
    calories_kcal: ingredient.macros.calories_kcal * scaleFactor,
    protein_g: ingredient.macros.protein_g * scaleFactor,
    carbohydrates_g: ingredient.macros.carbohydrates_g * scaleFactor,
    fat_g: ingredient.macros.fat_g * scaleFactor,
    ...(ingredient.macros.fiber_g != null && {
      fiber_g: ingredient.macros.fiber_g * scaleFactor,
    }),
    ...(ingredient.macros.sugar_g != null && {
      sugar_g: ingredient.macros.sugar_g * scaleFactor,
    }),
    ...(ingredient.macros.sodium_mg != null && {
      sodium_mg: ingredient.macros.sodium_mg * scaleFactor,
    }),
  };

  const handleSave = () => {
    onSave({
      ...ingredient,
      name: name.trim() || ingredient.name,
      quantity_g: portionG,
      macros: scaledMacros,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropTouch} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('edit_ingredient')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={24} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('edit_name')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={ingredient.name}
              placeholderTextColor={colors.outlineVariant}
              autoFocus
            />
          </View>

          <PortionSlider
            value={portionG}
            onChange={setPortionG}
            minValue={10}
            maxValue={Math.max(500, ingredient.quantity_g * 3)}
          />

          <View style={styles.macroPreview}>
            <MacroPreviewItem
              label={t('protein')}
              value={scaledMacros.protein_g}
              color={colors.macro.protein}
            />
            <MacroPreviewItem
              label={t('carbs')}
              value={scaledMacros.carbohydrates_g}
              color={colors.macro.carbs}
            />
            <MacroPreviewItem
              label={t('fats')}
              value={scaledMacros.fat_g}
              color={colors.macro.fat}
            />
            <MacroPreviewItem
              label="kcal"
              value={scaledMacros.calories_kcal}
              color={colors.onSurface}
            />
          </View>

          <View style={styles.buttons}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{t('edit_cancel')}</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveText}>{t('edit_save')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const MacroPreviewItem = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <View style={styles.macroItem}>
    <Text style={[styles.macroValue, { color }]}>{Math.round(value)}</Text>
    <Text style={styles.macroLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    ...elevation.float,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.bodyLg,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  macroPreview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.DEFAULT,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    ...typography.titleLg,
  },
  macroLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    paddingVertical: 14,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  cancelText: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  saveText: {
    ...typography.titleMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
