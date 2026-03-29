import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';
import { useAuth } from '~/app/providers/AuthProvider';
import { useUserTargets } from '~/features/dashboard/hooks/useUserTargets';
import { computeDQIScore, type DQIDayInput, type DQIScore } from '../lib/dqi-scoring';

interface MealForDQI {
  id: string;
  logged_at: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  total_sugar_g: number;
  total_sodium_mg: number;
  nova_class: number | null;
}

interface IngredientForDQI {
  meal_id: string;
  usda_fdc_id: number | null;
}

interface UsdaFoodCategory {
  fdc_id: number;
  food_category: string | null;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PROTEIN_KEYWORDS = [
  'poultry',
  'beef',
  'pork',
  'fish',
  'shellfish',
  'lamb',
  'veal',
  'game',
  'legume',
  'nut',
  'seed',
  'sausage',
  'luncheon',
  'dairy',
  'egg',
];

function isProteinSource(category: string): boolean {
  const lower = category.toLowerCase();
  return PROTEIN_KEYWORDS.some((kw) => lower.includes(kw));
}

async function fetchWeeklyDQIData(userId: string): Promise<{
  meals: MealForDQI[];
  categoryMap: Map<string, string[]>;
}> {
  const supabase = getSupabase();

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceISO = `${dateKey(since)}T00:00:00.000Z`;

  const { data: meals, error: mealsErr } = await supabase
    .from('meals')
    .select(
      'id, logged_at, total_calories, total_protein_g, total_carbs_g, total_fat_g, total_fiber_g, total_sugar_g, total_sodium_mg, nova_class',
    )
    .eq('user_id', userId)
    .gte('logged_at', sinceISO)
    .order('logged_at', { ascending: true });

  if (mealsErr) throw new Error(mealsErr.message);
  const typedMeals = (meals ?? []) as MealForDQI[];

  if (typedMeals.length === 0) {
    return { meals: typedMeals, categoryMap: new Map() };
  }

  const mealIds = typedMeals.map((m) => m.id);

  const { data: ingredients, error: ingErr } = await supabase
    .from('meal_ingredients')
    .select('meal_id, usda_fdc_id')
    .in('meal_id', mealIds);

  if (ingErr) throw new Error(ingErr.message);
  const typedIngredients = (ingredients ?? []) as IngredientForDQI[];

  const fdcIds = [
    ...new Set(
      typedIngredients.filter((i) => i.usda_fdc_id != null).map((i) => i.usda_fdc_id as number),
    ),
  ];

  const categoryMap = new Map<string, string[]>();

  if (fdcIds.length > 0) {
    const { data: foods, error: foodsErr } = await supabase
      .from('usda_foods')
      .select('fdc_id, food_category')
      .in('fdc_id', fdcIds);

    if (foodsErr) throw new Error(foodsErr.message);
    const typedFoods = (foods ?? []) as UsdaFoodCategory[];

    const fdcToCategory = new Map<number, string>();
    for (const f of typedFoods) {
      if (f.food_category) fdcToCategory.set(f.fdc_id, f.food_category);
    }

    for (const ing of typedIngredients) {
      if (ing.usda_fdc_id != null) {
        const cat = fdcToCategory.get(ing.usda_fdc_id);
        if (cat) {
          const existing = categoryMap.get(ing.meal_id) ?? [];
          existing.push(cat);
          categoryMap.set(ing.meal_id, existing);
        }
      }
    }
  }

  return { meals: typedMeals, categoryMap };
}

function buildDQIDays(meals: MealForDQI[], categoryMap: Map<string, string[]>): DQIDayInput[] {
  const byDay = new Map<string, DQIDayInput>();

  for (const meal of meals) {
    const day = dateKey(new Date(meal.logged_at));
    const cats = categoryMap.get(meal.id) ?? [];
    const proteinCats = cats.filter(isProteinSource);

    const existing = byDay.get(day) ?? {
      totalCalories: 0,
      totalProteinG: 0,
      totalCarbsG: 0,
      totalFatG: 0,
      totalFiberG: 0,
      totalSugarG: 0,
      totalSodiumMg: 0,
      mealCount: 0,
      novaClasses: [],
      foodCategories: [],
      proteinSourceCategories: [],
    };

    existing.totalCalories += Number(meal.total_calories);
    existing.totalProteinG += Number(meal.total_protein_g);
    existing.totalCarbsG += Number(meal.total_carbs_g);
    existing.totalFatG += Number(meal.total_fat_g);
    existing.totalFiberG += Number(meal.total_fiber_g);
    existing.totalSugarG += Number(meal.total_sugar_g);
    existing.totalSodiumMg += Number(meal.total_sodium_mg);
    existing.mealCount += 1;

    if (meal.nova_class != null) existing.novaClasses.push(meal.nova_class);
    existing.foodCategories.push(...cats);
    existing.proteinSourceCategories.push(...proteinCats);

    byDay.set(day, existing);
  }

  const result: DQIDayInput[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    result.push(
      byDay.get(key) ?? {
        totalCalories: 0,
        totalProteinG: 0,
        totalCarbsG: 0,
        totalFatG: 0,
        totalFiberG: 0,
        totalSugarG: 0,
        totalSodiumMg: 0,
        mealCount: 0,
        novaClasses: [],
        foodCategories: [],
        proteinSourceCategories: [],
      },
    );
  }

  return result;
}

export interface WeeklyDQIResult {
  score: DQIScore;
  previousScore: number | null;
  change: number | null;
  hasEnoughData: boolean;
}

export function useWeeklyDQI() {
  const { user } = useAuth();
  const { data: targets } = useUserTargets();

  return useQuery({
    queryKey: ['weekly_dqi', user?.id],
    queryFn: async (): Promise<WeeklyDQIResult> => {
      const { meals, categoryMap } = await fetchWeeklyDQIData(user!.id);
      const days = buildDQIDays(meals, categoryMap);

      const trackedDays = days.filter((d) => d.mealCount > 0).length;
      const hasEnoughData = trackedDays >= 3;

      const score = computeDQIScore({
        days,
        targetProteinG: targets?.targetProteinG ?? 120,
      });

      return {
        score,
        previousScore: null,
        change: null,
        hasEnoughData,
      };
    },
    enabled: !!user?.id && !!targets,
    staleTime: 5 * 60_000,
  });
}
