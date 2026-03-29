import type {
  CandidateFood,
  MealSlot,
  PlannedMeal,
  SlotAssignment,
  SolverResult,
  UserProfile,
  PlanRequest,
} from './schemas.ts';
import { categorizeFoods } from './candidates.ts';

const SOLVER_TIMEOUT_MS = 30_000;
const MAX_FOODS_PER_SLOT = 5;
const MIN_PORTION_G = 20;
const MAX_PORTION_G = 500;
const CALORIE_TOLERANCE = 0.05;
const NO_REPEAT_WINDOW = 3;

const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack_1', 'snack_2'];

interface MacroTargets {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/**
 * Determines per-slot macro distribution based on meal slot type.
 */
function getSlotTargets(
  dailyTargets: MacroTargets,
  mealsPerDay: number,
): Record<MealSlot, MacroTargets> {
  const ratios: Record<MealSlot, number> = {
    breakfast: 0.25,
    lunch: 0.35,
    dinner: 0.30,
    snack_1: 0.05,
    snack_2: 0.05,
  };

  if (mealsPerDay <= 3) {
    ratios.breakfast = 0.28;
    ratios.lunch = 0.38;
    ratios.dinner = 0.34;
    ratios.snack_1 = 0;
    ratios.snack_2 = 0;
  } else if (mealsPerDay === 4) {
    ratios.breakfast = 0.25;
    ratios.lunch = 0.33;
    ratios.dinner = 0.30;
    ratios.snack_1 = 0.12;
    ratios.snack_2 = 0;
  }

  const result: Record<string, MacroTargets> = {};
  for (const slot of SLOT_ORDER) {
    const r = ratios[slot];
    if (r <= 0) continue;
    result[slot] = {
      kcal: dailyTargets.kcal * r,
      protein_g: dailyTargets.protein_g * r,
      carbs_g: dailyTargets.carbs_g * r,
      fat_g: dailyTargets.fat_g * r,
    };
  }

  return result as Record<MealSlot, MacroTargets>;
}

/**
 * Scores a food for a slot based on how well it fills remaining macro budget.
 * Lower score = better fit.
 */
function scoreFoodForSlot(food: CandidateFood, remaining: MacroTargets): number {
  const defaultPortion = food.serving_size_g ?? 100;

  const scale = defaultPortion / 100;
  const foodKcal = (food.calories_per_100g ?? 0) * scale;
  const foodP = (food.protein_per_100g ?? 0) * scale;
  const foodC = (food.carbs_per_100g ?? 0) * scale;
  const foodF = (food.fat_per_100g ?? 0) * scale;

  const kcalDev = Math.abs(remaining.kcal - foodKcal) / Math.max(remaining.kcal, 1);
  const proteinDev = Math.abs(remaining.protein_g - foodP) / Math.max(remaining.protein_g, 1);
  const carbsDev = Math.abs(remaining.carbs_g - foodC) / Math.max(remaining.carbs_g, 1);
  const fatDev = Math.abs(remaining.fat_g - foodF) / Math.max(remaining.fat_g, 1);

  return kcalDev * 2 + proteinDev * 1.5 + carbsDev + fatDev;
}

/**
 * Optimizes portion sizes for selected foods to minimize macro deviation.
 * Uses least-squares approach via normal equations.
 */
function optimizePortions(
  foods: CandidateFood[],
  target: MacroTargets,
): number[] {
  const n = foods.length;
  if (n === 0) return [];
  if (n === 1) {
    const f = foods[0];
    const kcalPer = f.calories_per_100g / 100;
    if (kcalPer <= 0) return [100];
    const portion = Math.min(MAX_PORTION_G, Math.max(MIN_PORTION_G, target.kcal / kcalPer));
    return [portion];
  }

  // A * x = b where A is [kcal, protein, carbs, fat] per gram for each food
  // x is portion in grams, b is target macros
  const A: number[][] = [];
  const b = [target.kcal, target.protein_g, target.carbs_g, target.fat_g];
  const weights = [2.0, 1.5, 1.0, 1.0]; // importance weights

  for (const f of foods) {
    A.push([
      (f.calories_per_100g ?? 0) / 100,
      (f.protein_per_100g ?? 0) / 100,
      (f.carbs_per_100g ?? 0) / 100,
      (f.fat_per_100g ?? 0) / 100,
    ]);
  }

  // Weighted least squares: minimize sum_i w_i * (sum_j A_ij*x_j - b_i)^2
  // Normal equations: (A^T W A) x = A^T W b
  const m = 4; // macros
  const ATA = Array.from({ length: n }, () => new Float64Array(n));
  const ATb = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < m; k++) {
        sum += weights[k] * A[i][k] * A[j][k];
      }
      ATA[i][j] = sum;
    }
    let s = 0;
    for (let k = 0; k < m; k++) {
      s += weights[k] * A[i][k] * b[k];
    }
    ATb[i] = s;
  }

  // Solve via Gaussian elimination
  const result = solveLinearSystem(ATA, ATb);

  return result.map((v) =>
    Math.round(Math.min(MAX_PORTION_G, Math.max(MIN_PORTION_G, v)))
  );
}

function solveLinearSystem(A: Float64Array[], b: Float64Array): number[] {
  const n = A.length;
  const aug = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-10) continue;

    for (let j = col; j <= n; j++) aug[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  return aug.map((row) => {
    const v = row[n];
    return isFinite(v) ? v : 100;
  });
}

/**
 * Main solver: greedy food selection with portion optimization.
 *
 * Algorithm:
 * 1. For each day × slot, select foods greedily from categorized pool
 * 2. Enforce diversity constraints (no repeat in same slot within 3 days)
 * 3. Optimize portion sizes via least-squares
 * 4. Calculate total deviation as objective value
 */
export function solve(
  candidates: CandidateFood[],
  profile: UserProfile,
  request: PlanRequest,
): SolverResult {
  const startTime = performance.now();
  const categorized = categorizeFoods(candidates);

  const dailyTargets: MacroTargets = {
    kcal: profile.target_kcal,
    protein_g: profile.target_protein_g,
    carbs_g: profile.target_carbs_g,
    fat_g: profile.target_fat_g,
  };

  const activeSlots = SLOT_ORDER.slice(0, request.meals_per_day);
  const slotTargets = getSlotTargets(dailyTargets, request.meals_per_day);

  const meals: PlannedMeal[] = [];
  // Track recent foods per slot for diversity constraint
  const recentBySlot: Record<string, number[][]> = {};
  for (const slot of activeSlots) {
    recentBySlot[slot] = [];
  }

  let totalDeviation = 0;
  let iterations = 0;
  const usedFoodIds = new Set<number>();

  for (let day = 1; day <= request.duration_days; day++) {
    if (performance.now() - startTime > SOLVER_TIMEOUT_MS) break;

    const dayRemaining: MacroTargets = { ...dailyTargets };

    for (const slot of activeSlots) {
      iterations++;
      const target = slotTargets[slot];
      if (!target) continue;

      const recentIds = recentBySlot[slot]
        .slice(-NO_REPEAT_WINDOW)
        .flat();
      const recentSet = new Set(recentIds);

      // Select foods for this slot
      const selectedFoods = selectFoodsForSlot(
        categorized,
        target,
        recentSet,
        slot,
      );

      // Optimize portion sizes
      const portions = optimizePortions(selectedFoods, target);

      const assignments: SlotAssignment[] = selectedFoods.map((food, i) => ({
        food,
        portion_g: portions[i] ?? 100,
      }));

      // Calculate totals
      let slotKcal = 0, slotP = 0, slotC = 0, slotF = 0;
      for (const a of assignments) {
        const scale = a.portion_g / 100;
        slotKcal += (a.food.calories_per_100g ?? 0) * scale;
        slotP += (a.food.protein_per_100g ?? 0) * scale;
        slotC += (a.food.carbs_per_100g ?? 0) * scale;
        slotF += (a.food.fat_per_100g ?? 0) * scale;
      }

      // Track deviation
      const dev =
        Math.abs(slotKcal - target.kcal) / Math.max(target.kcal, 1) +
        Math.abs(slotP - target.protein_g) / Math.max(target.protein_g, 1) +
        Math.abs(slotC - target.carbs_g) / Math.max(target.carbs_g, 1) +
        Math.abs(slotF - target.fat_g) / Math.max(target.fat_g, 1);
      totalDeviation += dev;

      dayRemaining.kcal -= slotKcal;
      dayRemaining.protein_g -= slotP;
      dayRemaining.carbs_g -= slotC;
      dayRemaining.fat_g -= slotF;

      const slotFoodIds = selectedFoods.map((f) => f.fdc_id);
      recentBySlot[slot].push(slotFoodIds);
      slotFoodIds.forEach((id) => usedFoodIds.add(id));

      meals.push({
        day_number: day,
        meal_slot: slot as MealSlot,
        foods: assignments,
        total_calories: Math.round(slotKcal),
        total_protein_g: Math.round(slotP * 10) / 10,
        total_carbs_g: Math.round(slotC * 10) / 10,
        total_fat_g: Math.round(slotF * 10) / 10,
      });
    }

    // Validate daily calorie constraint (±5%)
    const dayKcal = dailyTargets.kcal - dayRemaining.kcal;
    if (Math.abs(dayKcal - dailyTargets.kcal) / dailyTargets.kcal > CALORIE_TOLERANCE) {
      adjustDayPortions(meals, day, dailyTargets);
    }
  }

  return {
    meals,
    objective_value: Math.round(totalDeviation * 1000) / 1000,
    solver_time_ms: Math.round(performance.now() - startTime),
    method: 'heuristic',
    iterations,
    unique_ingredients: usedFoodIds.size,
  };
}

/**
 * Selects 2-4 foods for a meal slot from categorized pools, building
 * a balanced plate: protein + grain/starch + vegetable + optional extras.
 */
function selectFoodsForSlot(
  categorized: Record<string, CandidateFood[]>,
  target: MacroTargets,
  recentSet: Set<number>,
  slot: string,
): CandidateFood[] {
  const selected: CandidateFood[] = [];
  const remaining = { ...target };

  const isSnack = slot.startsWith('snack');
  const slotPattern = isSnack
    ? [['fruit', 'dairy', 'other'], ['protein', 'grain']]
    : [['protein'], ['grain'], ['vegetable'], ['fruit', 'dairy', 'fat', 'other']];

  const maxItems = isSnack ? 2 : MAX_FOODS_PER_SLOT;

  for (const categoryGroup of slotPattern) {
    if (selected.length >= maxItems) break;

    const pool = categoryGroup.flatMap((cat) => categorized[cat] ?? []);
    const available = pool.filter((f) => !recentSet.has(f.fdc_id));

    if (available.length === 0) continue;

    // Score and pick best
    const scored = available
      .map((f) => ({ food: f, score: scoreFoodForSlot(f, remaining) }))
      .sort((a, b) => a.score - b.score);

    // Add some randomness to avoid monotony
    const topN = Math.min(5, scored.length);
    const pick = scored[Math.floor(Math.random() * topN)];
    selected.push(pick.food);

    const defaultPortion = pick.food.serving_size_g ?? 100;
    const scale = defaultPortion / 100;
    remaining.kcal -= (pick.food.calories_per_100g ?? 0) * scale;
    remaining.protein_g -= (pick.food.protein_per_100g ?? 0) * scale;
    remaining.carbs_g -= (pick.food.carbs_per_100g ?? 0) * scale;
    remaining.fat_g -= (pick.food.fat_per_100g ?? 0) * scale;
  }

  return selected;
}

/**
 * Post-hoc adjustment: scale portions of a day's meals to hit daily calorie target.
 */
function adjustDayPortions(meals: PlannedMeal[], day: number, targets: MacroTargets): void {
  const dayMeals = meals.filter((m) => m.day_number === day);
  const totalKcal = dayMeals.reduce((s, m) => s + m.total_calories, 0);

  if (totalKcal <= 0) return;

  const scaleFactor = targets.kcal / totalKcal;
  if (scaleFactor < 0.5 || scaleFactor > 2.0) return;

  for (const meal of dayMeals) {
    for (const a of meal.foods) {
      a.portion_g = Math.round(a.portion_g * scaleFactor);
    }
    meal.total_calories = Math.round(meal.total_calories * scaleFactor);
    meal.total_protein_g = Math.round(meal.total_protein_g * scaleFactor * 10) / 10;
    meal.total_carbs_g = Math.round(meal.total_carbs_g * scaleFactor * 10) / 10;
    meal.total_fat_g = Math.round(meal.total_fat_g * scaleFactor * 10) / 10;
  }
}
