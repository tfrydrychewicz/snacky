import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';
import { useAuth } from '~/app/providers/AuthProvider';
import type { MealCommentRow } from '../types';

const fetchComments = async (mealId: string): Promise<MealCommentRow[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('meal_comments')
    .select('*')
    .eq('meal_id', mealId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MealCommentRow[];
};

export const useMealComments = (mealId: string) => {
  return useQuery({
    queryKey: ['meal_comments', mealId],
    queryFn: () => fetchComments(mealId),
    enabled: !!mealId,
  });
};

export const useAddComment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mealId, content }: { mealId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');
      const supabase = getSupabase();
      const { error } = await supabase.from('meal_comments').insert({
        meal_id: mealId,
        user_id: user.id,
        content,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['meal_comments', variables.mealId] });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, mealId }: { commentId: string; mealId: string }) => {
      const supabase = getSupabase();
      const { error } = await supabase.from('meal_comments').delete().eq('id', commentId);
      if (error) throw new Error(error.message);
      return mealId;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['meal_comments', variables.mealId] });
    },
  });
};
