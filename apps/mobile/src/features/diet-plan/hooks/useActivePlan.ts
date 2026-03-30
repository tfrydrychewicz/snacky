import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';
import type { DietPlan, DietPlanWithMeals, PlanMeal } from '../types';

async function fetchActivePlan(): Promise<DietPlanWithMeals | null> {
  const supabase = getSupabase();

  const { data: plan, error } = await supabase
    .from('diet_plans')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[ActivePlan] Fetch error:', error.message);
    throw new Error(error.message);
  }

  if (!plan) return null;

  const typedPlan = plan as unknown as DietPlan;

  const { data: meals, error: mealError } = await supabase
    .from('diet_plan_meals')
    .select('*')
    .eq('diet_plan_id', typedPlan.id)
    .order('day_number', { ascending: true })
    .order('sort_order', { ascending: true });

  if (mealError) {
    console.error('[ActivePlan] Meals fetch error:', mealError.message);
    throw new Error(mealError.message);
  }

  return {
    ...typedPlan,
    meals: (meals ?? []) as unknown as PlanMeal[],
  };
}

async function fetchPlanById(planId: string): Promise<DietPlanWithMeals | null> {
  const supabase = getSupabase();

  const { data: plan, error } = await supabase
    .from('diet_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error || !plan) return null;

  const typedPlan = plan as unknown as DietPlan;

  const { data: meals, error: mealError } = await supabase
    .from('diet_plan_meals')
    .select('*')
    .eq('diet_plan_id', planId)
    .order('day_number', { ascending: true })
    .order('sort_order', { ascending: true });

  if (mealError) throw new Error(mealError.message);

  return {
    ...typedPlan,
    meals: (meals ?? []) as unknown as PlanMeal[],
  };
}

export const useActivePlan = () => {
  return useQuery({
    queryKey: ['diet-plan', 'active'],
    queryFn: fetchActivePlan,
    staleTime: 5 * 60 * 1000,
  });
};

interface PlanByIdOptions {
  refetchInterval?: number | false;
}

export const usePlanById = (planId: string, options?: PlanByIdOptions) => {
  return useQuery({
    queryKey: ['diet-plan', planId],
    queryFn: () => fetchPlanById(planId),
    enabled: !!planId,
    staleTime: options?.refetchInterval ? 0 : 5 * 60 * 1000,
    refetchInterval: options?.refetchInterval,
  });
};

interface GeneratingPlanInfo {
  planId: string;
  createdAt: string;
}

async function fetchGeneratingPlan(): Promise<GeneratingPlanInfo | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('diet_plans')
    .select('id, created_at')
    .eq('status', 'generating')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    planId: (data as { id: string; created_at: string }).id,
    createdAt: (data as { id: string; created_at: string }).created_at,
  };
}

export const useGeneratingPlan = () => {
  return useQuery({
    queryKey: ['diet-plan', 'generating'],
    queryFn: fetchGeneratingPlan,
    staleTime: 0,
    refetchOnMount: 'always' as const,
  });
};
