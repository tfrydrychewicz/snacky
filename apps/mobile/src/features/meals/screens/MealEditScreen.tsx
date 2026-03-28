import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react-native';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import type { RootStackParamList } from '~/app/navigation/types';
import { useMealDetail } from '../hooks/useMealDetail';
import { useUpdateMeal } from '../hooks/useMealMutations';
import type { MealIngredientRow } from '../types';

type EditRoute = RouteProp<RootStackParamList, 'MealEdit'>;

interface EditableIngredient {
  id?: string;
  name: string;
  portion_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  usda_fdc_id: number | null;
  confidence: number;
  user_verified: boolean;
}

export const MealEditScreen = () => {
  const { t } = useTranslation('meals');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<EditRoute>();
  const { mealId } = route.params;

  const { data: meal, isLoading } = useMealDetail(mealId);
  const updateMeal = useUpdateMeal();

  const [ingredients, setIngredients] = useState<EditableIngredient[] | null>(null);

  const editableIngredients = useMemo(() => {
    if (ingredients) return ingredients;
    if (!meal) return [];
    return meal.meal_ingredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      portion_g: ing.portion_g,
      calories: ing.calories,
      protein_g: ing.protein_g,
      carbs_g: ing.carbs_g,
      fat_g: ing.fat_g,
      usda_fdc_id: ing.usda_fdc_id,
      confidence: ing.confidence,
      user_verified: ing.user_verified,
    }));
  }, [ingredients, meal]);

  const totals = useMemo(
    () =>
      editableIngredients.reduce(
        (acc, ing) => ({
          calories: acc.calories + ing.calories,
          protein: acc.protein + ing.protein_g,
          carbs: acc.carbs + ing.carbs_g,
          fat: acc.fat + ing.fat_g,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [editableIngredients],
  );

  const updateIngredient = useCallback(
    (index: number, field: keyof EditableIngredient, value: string) => {
      setIngredients((prev) => {
        const list = prev ?? editableIngredients;
        const updated = [...list];
        const current = updated[index];
        if (!current) return updated;
        const numVal = parseFloat(value) || 0;
        updated[index] = Object.assign({}, current, { [field]: field === 'name' ? value : numVal });
        return updated;
      });
    },
    [editableIngredients],
  );

  const addIngredient = useCallback(() => {
    setIngredients((prev) => [
      ...(prev ?? editableIngredients),
      {
        name: t('edit_name'),
        portion_g: 100,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        usda_fdc_id: null,
        confidence: 1,
        user_verified: true,
      },
    ]);
  }, [editableIngredients, t]);

  const removeIngredient = useCallback(
    (index: number) => {
      const name = editableIngredients[index]?.name ?? '';
      Alert.alert(t('edit_remove_ingredient'), t('edit_remove_confirm', { name }), [
        { text: t('edit_cancel'), style: 'cancel' },
        {
          text: t('edit_remove_ingredient'),
          style: 'destructive',
          onPress: () =>
            setIngredients((prev) =>
              (prev ?? editableIngredients).filter((_, i) => i !== index),
            ),
        },
      ]);
    },
    [editableIngredients, t],
  );

  const handleSave = useCallback(() => {
    const rows = editableIngredients.map((ing, i) => ({
      id: ing.id,
      name: ing.name,
      usda_fdc_id: ing.usda_fdc_id,
      portion_g: ing.portion_g,
      calories: ing.calories,
      protein_g: ing.protein_g,
      carbs_g: ing.carbs_g,
      fat_g: ing.fat_g,
      confidence: ing.confidence,
      user_verified: true,
      sort_order: i,
    }));

    updateMeal.mutate(
      { mealId, ingredients: rows },
      {
        onSuccess: () => {
          Alert.alert(t('edit_success'));
          navigation.goBack();
        },
        onError: () => Alert.alert(t('edit_error')),
      },
    );
  }, [mealId, editableIngredients, updateMeal, navigation, t]);

  if (isLoading || !meal) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <ArrowLeft size={24} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('edit_title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Total summary */}
        <View style={styles.totalBar}>
          <TotalChip label="kcal" value={Math.round(totals.calories)} />
          <TotalChip label={t('nutrition_protein')} value={`${Math.round(totals.protein)}g`} color={colors.macro.protein} />
          <TotalChip label={t('nutrition_carbs')} value={`${Math.round(totals.carbs)}g`} color={colors.macro.carbs} />
          <TotalChip label={t('nutrition_fat')} value={`${Math.round(totals.fat)}g`} color={colors.macro.fat} />
        </View>

        {/* Ingredient editors */}
        <View style={styles.ingredientList}>
          {editableIngredients.map((ing, i) => (
            <Animated.View key={ing.id ?? `new-${i}`} entering={FadeInDown.delay(i * 40).duration(300)} style={styles.ingredientCard}>
              <View style={styles.ingredientHeader}>
                <TextInput
                  style={styles.nameInput}
                  value={ing.name}
                  onChangeText={(v) => updateIngredient(i, 'name', v)}
                  placeholder={t('edit_name')}
                  placeholderTextColor={colors.outline}
                />
                <Pressable onPress={() => removeIngredient(i)} hitSlop={8}>
                  <Trash2 size={18} color={colors.error} strokeWidth={2} />
                </Pressable>
              </View>
              <View style={styles.fieldRow}>
                <NumberField label={t('edit_portion')} value={ing.portion_g} onChange={(v) => updateIngredient(i, 'portion_g', v)} suffix="g" />
                <NumberField label="kcal" value={ing.calories} onChange={(v) => updateIngredient(i, 'calories', v)} />
              </View>
              <View style={styles.fieldRow}>
                <NumberField label={t('nutrition_protein')} value={ing.protein_g} onChange={(v) => updateIngredient(i, 'protein_g', v)} suffix="g" />
                <NumberField label={t('nutrition_carbs')} value={ing.carbs_g} onChange={(v) => updateIngredient(i, 'carbs_g', v)} suffix="g" />
                <NumberField label={t('nutrition_fat')} value={ing.fat_g} onChange={(v) => updateIngredient(i, 'fat_g', v)} suffix="g" />
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Add ingredient */}
        <Pressable onPress={addIngredient} style={styles.addBtn}>
          <Plus size={18} color={colors.primary} strokeWidth={2.5} />
          <Text style={styles.addBtnText}>{t('edit_add_ingredient')}</Text>
        </Pressable>
      </ScrollView>

      {/* Save button */}
      <View style={[styles.saveArea, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          onPress={handleSave}
          disabled={updateMeal.isPending}
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            updateMeal.isPending && { opacity: 0.6 },
          ]}
        >
          {updateMeal.isPending ? (
            <Text style={styles.saveBtnText}>{t('edit_saving')}</Text>
          ) : (
            <>
              <Text style={styles.saveBtnText}>{t('edit_save')}</Text>
              <Check size={18} color={colors.onPrimary} strokeWidth={2.5} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const NumberField = ({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  suffix?: string;
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldInputRow}>
      <TextInput
        style={styles.fieldInput}
        value={String(Math.round(value * 10) / 10)}
        onChangeText={onChange}
        keyboardType="numeric"
      />
      {suffix && <Text style={styles.fieldSuffix}>{suffix}</Text>}
    </View>
  </View>
);

const TotalChip = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) => (
  <View style={styles.totalChip}>
    <Text style={[styles.totalChipValue, color ? { color } : null]}>{value}</Text>
    <Text style={styles.totalChipLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceContainerLowest,
    marginHorizontal: spacing.md,
    borderRadius: radii.DEFAULT,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...elevation.ambient,
  },
  totalChip: {
    alignItems: 'center',
  },
  totalChipValue: {
    ...typography.titleLg,
    color: colors.onSurface,
  },
  totalChipLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  ingredientList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  ingredientCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.DEFAULT,
    padding: spacing.md,
    ...elevation.ambient,
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  nameInput: {
    flex: 1,
    ...typography.titleMd,
    color: colors.onSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingVertical: 4,
    marginRight: spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
  },
  fieldInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: 6,
  },
  fieldSuffix: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radii.DEFAULT,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  addBtnText: {
    ...typography.titleMd,
    color: colors.primary,
    fontWeight: '600',
  },
  saveArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    ...typography.titleMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
