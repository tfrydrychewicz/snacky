import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';
import { useAuth } from '~/app/providers/AuthProvider';
import type { MealRow } from '~/features/meals/types';

export interface DailySummary {
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  totalSugarG: number;
  mealCount: number;
  meals: MealRow[];
}

const EMPTY: DailySummary = {
  totalCalories: 0,
  totalProteinG: 0,
  totalCarbsG: 0,
  totalFatG: 0,
  totalFiberG: 0,
  totalSugarG: 0,
  mealCount: 0,
  meals: [],
};

const fetchDailySummary = async (userId: string, dateKey: string): Promise<DailySummary> => {
  const supabase = getSupabase();

  const dayStart = `${dateKey}T00:00:00.000Z`;
  const dayEnd = `${dateKey}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', dayStart)
    .lte('logged_at', dayEnd)
    .order('logged_at', { ascending: false });

  if (error) throw new Error(error.message);

  const meals = (data ?? []) as MealRow[];

  return meals.reduce<DailySummary>(
    (acc, meal) => ({
      totalCalories: acc.totalCalories + Number(meal.total_calories),
      totalProteinG: acc.totalProteinG + Number(meal.total_protein_g),
      totalCarbsG: acc.totalCarbsG + Number(meal.total_carbs_g),
      totalFatG: acc.totalFatG + Number(meal.total_fat_g),
      totalFiberG: acc.totalFiberG + Number(meal.total_fiber_g),
      totalSugarG: acc.totalSugarG + Number(meal.total_sugar_g),
      mealCount: acc.mealCount + 1,
      meals: acc.meals.concat(meal),
    }),
    EMPTY,
  );
};

const getTodayKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const useDailySummary = () => {
  const { user } = useAuth();
  const dateKey = getTodayKey();

  return useQuery({
    queryKey: ['daily_summary', user?.id, dateKey],
    queryFn: () => fetchDailySummary(user!.id, dateKey),
    enabled: !!user,
    refetchInterval: 30_000,
  });
};
