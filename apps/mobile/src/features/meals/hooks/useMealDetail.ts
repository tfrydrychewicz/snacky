import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';
import type { MealWithIngredients } from '../types';

const fetchMealDetail = async (mealId: string): Promise<MealWithIngredients> => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('meals')
    .select('*, meal_ingredients(*)')
    .eq('id', mealId)
    .order('sort_order', { referencedTable: 'meal_ingredients', ascending: true })
    .single();

  if (error) throw new Error(error.message);

  return data as MealWithIngredients;
};

export const useMealDetail = (mealId: string) => {
  return useQuery({
    queryKey: ['meals', mealId],
    queryFn: () => fetchMealDetail(mealId),
    enabled: !!mealId,
  });
};
