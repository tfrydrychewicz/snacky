import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';
import { useAuth } from '~/app/providers/AuthProvider';
import type { MeasurementRow } from '~/features/progress/types';

export interface DayAggregate {
  date: string;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  mealCount: number;
}

export interface WeeklyReport {
  avgCalories: number;
  avgProteinG: number;
  avgCarbsG: number;
  avgFatG: number;
  daysTracked: number;
  totalDays: number;
  adherencePct: number;
  proteinAdherencePct: number;
  carbsAdherencePct: number;
  fatAdherencePct: number;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${dateKey(d)}T00:00:00.000Z`;
}

interface MealRow {
  logged_at: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

async function fetchDailyAggregates(userId: string, days: number): Promise<DayAggregate[]> {
  const supabase = getSupabase();
  const since = daysAgo(days);

  const { data, error } = await supabase
    .from('meals')
    .select('logged_at, total_calories, total_protein_g, total_carbs_g, total_fat_g')
    .eq('user_id', userId)
    .gte('logged_at', since)
    .order('logged_at', { ascending: true });

  if (error) throw new Error(error.message);

  const meals = (data ?? []) as MealRow[];
  const byDay = new Map<string, DayAggregate>();

  for (const m of meals) {
    const day = dateKey(new Date(m.logged_at));
    const existing = byDay.get(day) ?? {
      date: day,
      totalCalories: 0,
      totalProteinG: 0,
      totalCarbsG: 0,
      totalFatG: 0,
      mealCount: 0,
    };
    existing.totalCalories += Number(m.total_calories);
    existing.totalProteinG += Number(m.total_protein_g);
    existing.totalCarbsG += Number(m.total_carbs_g);
    existing.totalFatG += Number(m.total_fat_g);
    existing.mealCount += 1;
    byDay.set(day, existing);
  }

  const result: DayAggregate[] = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    result.push(
      byDay.get(key) ?? {
        date: key,
        totalCalories: 0,
        totalProteinG: 0,
        totalCarbsG: 0,
        totalFatG: 0,
        mealCount: 0,
      },
    );
  }

  return result;
}

export function useDailyAggregates(days = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['daily_aggregates', user?.id, days],
    queryFn: () => fetchDailyAggregates(user!.id, days),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

async function fetchWeightTrend(userId: string, days: number): Promise<MeasurementRow[]> {
  const supabase = getSupabase();
  const since = daysAgo(days);

  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('user_id', userId)
    .not('weight_kg', 'is', null)
    .gte('measured_at', since)
    .order('measured_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MeasurementRow[];
}

export function useWeightTrend(days = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['weight_trend', user?.id, days],
    queryFn: () => fetchWeightTrend(user!.id, days),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

export function computeWeeklyReport(
  aggregates: DayAggregate[],
  targetKcal: number,
  targetProteinG: number,
  targetCarbsG: number,
  targetFatG: number,
): WeeklyReport {
  const last7 = aggregates.slice(-7);
  const tracked = last7.filter((d) => d.mealCount > 0);

  const daysTracked = tracked.length;
  const totalDays = last7.length;

  if (daysTracked === 0) {
    return {
      avgCalories: 0,
      avgProteinG: 0,
      avgCarbsG: 0,
      avgFatG: 0,
      daysTracked: 0,
      totalDays,
      adherencePct: 0,
      proteinAdherencePct: 0,
      carbsAdherencePct: 0,
      fatAdherencePct: 0,
    };
  }

  const avgCalories = tracked.reduce((s, d) => s + d.totalCalories, 0) / daysTracked;
  const avgProteinG = tracked.reduce((s, d) => s + d.totalProteinG, 0) / daysTracked;
  const avgCarbsG = tracked.reduce((s, d) => s + d.totalCarbsG, 0) / daysTracked;
  const avgFatG = tracked.reduce((s, d) => s + d.totalFatG, 0) / daysTracked;

  const withinRange = (val: number, target: number, tolerance = 0.15) =>
    val >= target * (1 - tolerance) && val <= target * (1 + tolerance);

  const daysOnTarget = tracked.filter((d) => withinRange(d.totalCalories, targetKcal)).length;

  return {
    avgCalories: Math.round(avgCalories),
    avgProteinG: Math.round(avgProteinG),
    avgCarbsG: Math.round(avgCarbsG),
    avgFatG: Math.round(avgFatG),
    daysTracked,
    totalDays,
    adherencePct: Math.round((daysOnTarget / daysTracked) * 100),
    proteinAdherencePct: Math.round(Math.min(100, (avgProteinG / targetProteinG) * 100)),
    carbsAdherencePct: Math.round(Math.min(100, (avgCarbsG / targetCarbsG) * 100)),
    fatAdherencePct: Math.round(Math.min(100, (avgFatG / targetFatG) * 100)),
  };
}
