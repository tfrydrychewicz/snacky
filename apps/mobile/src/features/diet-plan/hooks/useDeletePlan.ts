import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';

async function deletePlan(planId: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.from('diet_plans').delete().eq('id', planId);

  if (error) {
    throw new Error(error.message);
  }
}

export const useDeletePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['diet-plan'] });
    },
  });
};
