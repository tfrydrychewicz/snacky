import { useInfiniteQuery } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';
import { useAuth } from '~/app/providers/AuthProvider';

const PAGE_SIZE = 24;

export interface MealPhotoEntry {
  mealId: string;
  imageKey: string;
  loggedAt: string;
  mealType: string;
  totalCalories: number;
}

interface PhotoPage {
  photos: MealPhotoEntry[];
  nextCursor: string | null;
}

const fetchMealPhotos = async (cursor: string | null, userId: string): Promise<PhotoPage> => {
  const supabase = getSupabase();

  let query = supabase
    .from('meals')
    .select('id, image_key, logged_at, meal_type, total_calories')
    .eq('user_id', userId)
    .not('image_key', 'is', null)
    .order('logged_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) {
    query = query.lt('logged_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    id: string;
    image_key: string;
    logged_at: string;
    meal_type: string;
    total_calories: number;
  }>;

  const photos: MealPhotoEntry[] = rows.map((r) => ({
    mealId: r.id,
    imageKey: r.image_key,
    loggedAt: r.logged_at,
    mealType: r.meal_type,
    totalCalories: r.total_calories,
  }));

  const nextCursor =
    photos.length === PAGE_SIZE ? photos[photos.length - 1]?.loggedAt ?? null : null;

  return { photos, nextCursor };
};

export const useMealPhotos = () => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['meal_photos', user?.id],
    queryFn: ({ pageParam }) => fetchMealPhotos(pageParam, user!.id),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user,
  });
};
