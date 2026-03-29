import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';
import { useAuth } from '~/app/providers/AuthProvider';
import type { MeasurementRow, MeasurementInput } from '../types';

async function fetchMeasurements(userId: string): Promise<MeasurementRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as MeasurementRow[];
}

export function useMeasurements() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['measurements', user?.id],
    queryFn: () => fetchMeasurements(user!.id),
    enabled: !!user?.id,
  });
}

export function useAddMeasurement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MeasurementInput) => {
      if (!user) throw new Error('Not authenticated');
      const supabase = getSupabase();

      const { error } = await supabase.from('measurements').insert({
        user_id: user.id,
        measured_at: input.measured_at ?? new Date().toISOString(),
        weight_kg: input.weight_kg ?? null,
        waist_cm: input.waist_cm ?? null,
        chest_cm: input.chest_cm ?? null,
        hips_cm: input.hips_cm ?? null,
        body_fat_pct: input.body_fat_pct ?? null,
        source: input.source ?? 'manual',
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['measurements', user?.id] });
    },
  });
}

export function useDeleteMeasurement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (measurementId: string) => {
      const supabase = getSupabase();
      const { error } = await supabase.from('measurements').delete().eq('id', measurementId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['measurements', user?.id] });
    },
  });
}
