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
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Plus, Search, Trash2, Check } from 'lucide-react-native';
import type { MealType } from '@snacky/shared-types';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import { useIngredientLookup } from '~/features/scanner/hooks/useIngredientLookup';
import { useLogManualMeal } from '../hooks/useMealMutations';

interface ManualIngredient {
  name: string;
  portion_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  usda_fdc_id: number | null;
  confidence: number;
  user_verified: boolean;
  sort_order: number;
}

export const ManualMealEntryScreen = () => {
  const { t } = useTranslation('meals');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const logMeal = useLogManualMeal();

  const [mealType, setMealType] = useState<MealType>('lunch');
  const [ingredients, setIngredients] = useState<ManualIngredient[]>([]);
  const [searchName, setSearchName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const lookup = useIngredientLookup(searchName, isSearching);

  const totals = useMemo(
    () =>
      ingredients.reduce(
        (acc, ing) => ({
          calories: acc.calories + ing.calories,
          protein: acc.protein + ing.protein_g,
          carbs: acc.carbs + ing.carbs_g,
          fat: acc.fat + ing.fat_g,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [ingredients],
  );

  const handleAddFromSearch = useCallback(() => {
    if (!searchName.trim()) return;

    const portion = 100;
    const scale = portion / 100;
    const macros = lookup.baseMacros;

    const newIngredient: ManualIngredient = {
      name: searchName.trim(),
      portion_g: portion,
      calories: macros ? Math.round(macros.calories_kcal * scale) : 0,
      protein_g: macros ? Math.round(macros.protein_g * scale * 10) / 10 : 0,
      carbs_g: macros ? Math.round(macros.carbohydrates_g * scale * 10) / 10 : 0,
      fat_g: macros ? Math.round(macros.fat_g * scale * 10) / 10 : 0,
      usda_fdc_id: lookup.fdcId,
      confidence: macros ? 0.9 : 1.0,
      user_verified: true,
      sort_order: ingredients.length,
    };

    setIngredients((prev) => [...prev, newIngredient]);
    setSearchName('');
    setIsSearching(false);
  }, [searchName, lookup.baseMacros, lookup.fdcId, ingredients.length]);

  const handleAddCustom = useCallback(() => {
    setIngredients((prev) => [
      ...prev,
      {
        name: '',
        portion_g: 100,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        usda_fdc_id: null,
        confidence: 1.0,
        user_verified: true,
        sort_order: prev.length,
      },
    ]);
  }, []);

  const updateIngredient = useCallback(
    (index: number, field: keyof ManualIngredient, value: string) => {
      setIngredients((prev) => {
        const updated = [...prev];
        const current = updated[index];
        if (!current) return updated;
        const numVal = parseFloat(value) || 0;
        updated[index] = Object.assign({}, current, { [field]: field === 'name' ? value : numVal });
        return updated;
      });
    },
    [],
  );

  const removeIngredient = useCallback(
    (index: number) => {
      const name = ingredients[index]?.name || t('edit_name');
      Alert.alert(t('edit_remove_ingredient'), t('edit_remove_confirm', { name }), [
        { text: t('edit_cancel'), style: 'cancel' },
        {
          text: t('edit_remove_ingredient'),
          style: 'destructive',
          onPress: () => setIngredients((prev) => prev.filter((_, i) => i !== index)),
        },
      ]);
    },
    [ingredients, t],
  );

  const handleLog = useCallback(() => {
    if (ingredients.length === 0) return;
    logMeal.mutate(
      { mealType, ingredients },
      {
        onSuccess: () => {
          Alert.alert(t('manual_log_success'));
          navigation.goBack();
        },
        onError: () => Alert.alert(t('manual_log_error')),
      },
    );
  }, [mealType, ingredients, logMeal, navigation, t]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <ArrowLeft size={24} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('manual_title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Meal Type Selector */}
        <View style={styles.mealTypeSection}>
          <Text style={styles.mealTypeLabel}>{t('manual_meal_type')}</Text>
          <View style={styles.mealTypeRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mt) => (
              <Pressable
                key={mt}
                onPress={() => setMealType(mt)}
                style={[styles.mealTypeChip, mt === mealType && styles.mealTypeChipSelected]}
              >
                <Text
                  style={[
                    styles.mealTypeChipText,
                    mt === mealType && styles.mealTypeChipTextSelected,
                  ]}
                >
                  {t(`meal_type_${mt}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={18} color={colors.outline} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              value={searchName}
              onChangeText={(v) => {
                setSearchName(v);
                setIsSearching(true);
              }}
              placeholder={t('manual_search_placeholder')}
              placeholderTextColor={colors.outline}
              returnKeyType="done"
              onSubmitEditing={handleAddFromSearch}
            />
            {lookup.isSearching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {searchName.trim().length >= 2 && (
            <View style={styles.searchResults}>
              {lookup.isSearching ? (
                <Text style={styles.searchStatus}>{t('manual_searching')}</Text>
              ) : lookup.baseMacros ? (
                <Pressable
                  onPress={handleAddFromSearch}
                  style={({ pressed }) => [styles.searchResultItem, pressed && { opacity: 0.7 }]}
                >
                  <View>
                    <Text style={styles.searchResultName}>{searchName}</Text>
                    <Text style={styles.searchResultMacros}>
                      {Math.round(lookup.baseMacros.calories_kcal)} kcal ·{' '}
                      {Math.round(lookup.baseMacros.protein_g)}g P ·{' '}
                      {Math.round(lookup.baseMacros.carbohydrates_g)}g C ·{' '}
                      {Math.round(lookup.baseMacros.fat_g)}g F
                    </Text>
                  </View>
                  <Plus size={20} color={colors.primary} strokeWidth={2.5} />
                </Pressable>
              ) : lookup.noMatch ? (
                <Text style={styles.searchStatus}>{t('manual_search_empty')}</Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Added Ingredients */}
        <View style={styles.ingredientList}>
          {ingredients.map((ing, i) => (
            <Animated.View
              key={`${ing.name}-${i}`}
              entering={FadeInDown.delay(i * 40).duration(300)}
              style={styles.ingredientCard}
            >
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
                <NumberField
                  label={t('edit_portion')}
                  value={ing.portion_g}
                  onChange={(v) => updateIngredient(i, 'portion_g', v)}
                  suffix="g"
                />
                <NumberField
                  label="kcal"
                  value={ing.calories}
                  onChange={(v) => updateIngredient(i, 'calories', v)}
                />
              </View>
              <View style={styles.fieldRow}>
                <NumberField
                  label={t('nutrition_protein')}
                  value={ing.protein_g}
                  onChange={(v) => updateIngredient(i, 'protein_g', v)}
                  suffix="g"
                />
                <NumberField
                  label={t('nutrition_carbs')}
                  value={ing.carbs_g}
                  onChange={(v) => updateIngredient(i, 'carbs_g', v)}
                  suffix="g"
                />
                <NumberField
                  label={t('nutrition_fat')}
                  value={ing.fat_g}
                  onChange={(v) => updateIngredient(i, 'fat_g', v)}
                  suffix="g"
                />
              </View>
            </Animated.View>
          ))}
        </View>

        <Pressable onPress={handleAddCustom} style={styles.addBtn}>
          <Plus size={18} color={colors.primary} strokeWidth={2.5} />
          <Text style={styles.addBtnText}>{t('manual_add_custom')}</Text>
        </Pressable>

        {/* Totals */}
        {ingredients.length > 0 && (
          <View style={styles.totalBar}>
            <TotalChip label="kcal" value={Math.round(totals.calories)} />
            <TotalChip
              label={t('nutrition_protein')}
              value={`${Math.round(totals.protein)}g`}
              color={colors.macro.protein}
            />
            <TotalChip
              label={t('nutrition_carbs')}
              value={`${Math.round(totals.carbs)}g`}
              color={colors.macro.carbs}
            />
            <TotalChip
              label={t('nutrition_fat')}
              value={`${Math.round(totals.fat)}g`}
              color={colors.macro.fat}
            />
          </View>
        )}
      </ScrollView>

      {/* Log button */}
      {ingredients.length > 0 && (
        <View style={[styles.saveArea, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable
            onPress={handleLog}
            disabled={logMeal.isPending}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              logMeal.isPending && { opacity: 0.6 },
            ]}
          >
            {logMeal.isPending ? (
              <Text style={styles.saveBtnText}>{t('manual_logging')}</Text>
            ) : (
              <>
                <Text style={styles.saveBtnText}>{t('manual_log')}</Text>
                <Check size={18} color={colors.onPrimary} strokeWidth={2.5} />
              </>
            )}
          </Pressable>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
  },
  mealTypeSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  mealTypeLabel: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mealTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  mealTypeChipSelected: {
    backgroundColor: colors.primary,
  },
  mealTypeChipText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  mealTypeChipTextSelected: {
    color: colors.onPrimary,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...elevation.ambient,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: 12,
  },
  searchResults: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.DEFAULT,
    overflow: 'hidden',
    ...elevation.ambient,
  },
  searchStatus: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    padding: spacing.md,
    textAlign: 'center',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  searchResultName: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  searchResultMacros: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
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
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceContainerLowest,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    borderRadius: radii.DEFAULT,
    padding: spacing.md,
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
