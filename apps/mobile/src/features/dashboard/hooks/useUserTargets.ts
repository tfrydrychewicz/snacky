import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';
import { useAuth } from '~/app/providers/AuthProvider';

export interface UserTargets {
  targetKcal: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  tdeeKcal: number;
}

const DEFAULTS: UserTargets = {
  targetKcal: 2000,
  targetProteinG: 120,
  targetCarbsG: 250,
  targetFatG: 65,
  tdeeKcal: 2200,
};

const fetchTargets = async (userId: string): Promise<UserTargets> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('target_kcal, target_protein_g, target_carbs_g, target_fat_g, tdee_kcal')
    .eq('user_id', userId)
    .single();

  if (error || !data) return DEFAULTS;

  return {
    targetKcal: (data as Record<string, unknown>).target_kcal as number ?? DEFAULTS.targetKcal,
    targetProteinG: (data as Record<string, unknown>).target_protein_g as number ?? DEFAULTS.targetProteinG,
    targetCarbsG: (data as Record<string, unknown>).target_carbs_g as number ?? DEFAULTS.targetCarbsG,
    targetFatG: (data as Record<string, unknown>).target_fat_g as number ?? DEFAULTS.targetFatG,
    tdeeKcal: (data as Record<string, unknown>).tdee_kcal as number ?? DEFAULTS.tdeeKcal,
  };
};

export const useUserTargets = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user_targets', user?.id],
    queryFn: () => fetchTargets(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};
