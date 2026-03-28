import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';
import { useAuth } from '~/app/providers/AuthProvider';
import type { MealIngredientRow } from '../types';

interface UpdateMealInput {
  mealId: string;
  ingredients: Array<{
    id?: string;
    name: string;
    usda_fdc_id: number | null;
    portion_g: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    confidence: number;
    user_verified: boolean;
    sort_order: number;
  }>;
}

export const useUpdateMeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mealId, ingredients }: UpdateMealInput) => {
      const supabase = getSupabase();

      const totals = ingredients.reduce(
        (acc, ing) => ({
          total_calories: acc.total_calories + ing.calories,
          total_protein_g: acc.total_protein_g + ing.protein_g,
          total_carbs_g: acc.total_carbs_g + ing.carbs_g,
          total_fat_g: acc.total_fat_g + ing.fat_g,
        }),
        { total_calories: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0 },
      );

      const { error: mealError } = await supabase
        .from('meals')
        .update({ ...totals, user_modified: true })
        .eq('id', mealId);

      if (mealError) throw new Error(mealError.message);

      const { error: deleteError } = await supabase
        .from('meal_ingredients')
        .delete()
        .eq('meal_id', mealId);

      if (deleteError) throw new Error(deleteError.message);

      const rows = ingredients.map((ing) => ({
        meal_id: mealId,
        name: ing.name,
        usda_fdc_id: ing.usda_fdc_id,
        portion_g: ing.portion_g,
        calories: ing.calories,
        protein_g: ing.protein_g,
        carbs_g: ing.carbs_g,
        fat_g: ing.fat_g,
        confidence: ing.confidence,
        user_verified: ing.user_verified,
        sort_order: ing.sort_order,
      }));

      const { error: insertError } = await supabase.from('meal_ingredients').insert(rows);

      if (insertError) throw new Error(insertError.message);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['meals'] });
      void queryClient.invalidateQueries({ queryKey: ['meals', variables.mealId] });
    },
  });
};

export const useDeleteMeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mealId: string) => {
      const supabase = getSupabase();
      const { error } = await supabase.from('meals').delete().eq('id', mealId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
};

export const useLogManualMeal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mealType,
      ingredients,
    }: {
      mealType: string;
      ingredients: Array<Omit<MealIngredientRow, 'id' | 'meal_id'>>;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const supabase = getSupabase();

      const totals = ingredients.reduce(
        (acc, ing) => ({
          total_calories: acc.total_calories + ing.calories,
          total_protein_g: acc.total_protein_g + ing.protein_g,
          total_carbs_g: acc.total_carbs_g + ing.carbs_g,
          total_fat_g: acc.total_fat_g + ing.fat_g,
        }),
        { total_calories: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0 },
      );

      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          logged_at: new Date().toISOString(),
          timezone_offset: new Date().getTimezoneOffset(),
          ai_analysis: {},
          ...totals,
          total_fiber_g: 0,
          total_sugar_g: 0,
          total_sodium_mg: 0,
          source: 'manual',
        })
        .select('id')
        .single();

      if (mealError || !meal) throw new Error(mealError?.message ?? 'Failed to create meal');

      const rows = ingredients.map((ing) => ({
        meal_id: (meal as { id: string }).id,
        ...ing,
      }));

      const { error: ingError } = await supabase.from('meal_ingredients').insert(rows);
      if (ingError) throw new Error(ingError.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
};
