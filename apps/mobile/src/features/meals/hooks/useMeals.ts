import { useInfiniteQuery } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';
import { useAuth } from '~/app/providers/AuthProvider';
import type { MealRow } from '../types';

const PAGE_SIZE = 20;

interface MealPage {
  meals: MealRow[];
  nextCursor: string | null;
}

const fetchMeals = async (cursor: string | null, userId: string): Promise<MealPage> => {
  const supabase = getSupabase();

  let query = supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) {
    query = query.lt('logged_at', cursor);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const meals = (data ?? []) as MealRow[];
  const nextCursor =
    meals.length === PAGE_SIZE ? meals[meals.length - 1]?.logged_at ?? null : null;

  return { meals, nextCursor };
};

export const useMeals = () => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['meals', user?.id],
    queryFn: ({ pageParam }) => fetchMeals(pageParam, user!.id),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user,
  });
};
