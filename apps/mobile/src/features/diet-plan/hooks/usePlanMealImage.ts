import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';

const SIGNED_URL_EXPIRY = 3600;
const POLL_INTERVAL = 5_000;

async function fetchMealImageUrl(mealId: string): Promise<string | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('diet_plan_meals')
    .select('image_url')
    .eq('id', mealId)
    .single();

  if (error || !data) return null;

  const imageUrl = (data as { image_url: string | null }).image_url;
  if (!imageUrl) return null;

  const { data: signedData, error: signedError } = await supabase.storage
    .from('meal-photos')
    .createSignedUrl(imageUrl, SIGNED_URL_EXPIRY);

  if (signedError || !signedData?.signedUrl) return null;
  return signedData.signedUrl;
}

/**
 * Fetches a signed URL for a plan meal's generated image.
 * Polls every 5s while image_url is null (image still generating).
 * Stops polling once the URL is available.
 */
export const usePlanMealImage = (mealId: string | null, imageUrl: string | null) => {
  return useQuery({
    queryKey: ['plan-meal-image', mealId],
    queryFn: () => fetchMealImageUrl(mealId!),
    enabled: !!mealId,
    staleTime: imageUrl ? (SIGNED_URL_EXPIRY - 300) * 1000 : 0,
    refetchInterval: imageUrl ? false : POLL_INTERVAL,
  });
};
