import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';

const SIGNED_URL_EXPIRY = 3600;

const fetchSignedUrl = async (imageKey: string): Promise<string | null> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from('meal-photos')
    .createSignedUrl(imageKey, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
};

export const useMealPhoto = (imageKey: string | null) => {
  return useQuery({
    queryKey: ['meal-photo', imageKey],
    queryFn: () => fetchSignedUrl(imageKey!),
    enabled: !!imageKey,
    staleTime: (SIGNED_URL_EXPIRY - 300) * 1000,
  });
};
