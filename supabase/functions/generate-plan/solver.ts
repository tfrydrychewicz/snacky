import type {
  CandidateFood,
  MealSlot,
  MicronutrientTotals,
  PlannedMeal,
  SlotAssignment,
  SolverResult,
  UserProfile,
  PlanRequest,
} from './schemas.ts';
import { categorizeFoods } from './candidates.ts';
import {
  getRda,
  MICRONUTRIENT_KEYS,
  FOOD_COL_TO_RDA_KEY,
  type RdaValues,
} from './rda.ts';
import {
  fuzzyMacroPenalty,
  fuzzyPortionPenalty,
  fuzzyCalorieCorrectionStrength,
  fuzzyMicroUrgency,
  fuzzyDampenScale,
} from './fuzzy.ts';

const SOLVER_TIMEOUT_MS = 30_000;
const MAX_FOODS_PER_SLOT = 5;
const MIN_PORTION_G = 20;
const MAX_PORTION_G = 500;
const NO_REPEAT_WINDOW = 3;
const MAX_REPAIR_PASSES = 3;
const MICRO_URGENCY_THRESHOLD = 0.15;

const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack_1', 'snack_2'];

interface MacroTargets {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

// ---------------------------------------------------------------------------
// Micronutrient helpers
// ---------------------------------------------------------------------------

function emptyMicroTotals(): MicronutrientTotals {
  const t: Record<string, number> = {};
  for (const k of MICRONUTRIENT_KEYS) t[k] = 0;
  return t as unknown as MicronutrientTotals;
}

/**
 * Computes micronutrient totals for a list of food assignments.
 */
function computeMealMicros(assignments: SlotAssignment[]): MicronutrientTotals {
  const totals = emptyMicroTotals();
  for (const a of assignments) {
    const scale = a.portion_g / 100;
    for (const [col, key] of Object.entries(FOOD_COL_TO_RDA_KEY)) {
      const val = (a.food as unknown as Record<string, number | null>)[col];
      if (val != null) {
        (totals as unknown as Record<string, number>)[key] += val * scale;
      }
    }
  }
  return totals;
}

/**
 * Sums micronutrient totals from multiple meals into one day total.
 */
function sumMicroTotals(meals: PlannedMeal[]): MicronutrientTotals {
  const sum = emptyMicroTotals();
  for (const meal of meals) {
    for (const k of MICRONUTRIENT_KEYS) {
      (sum as unknown as Record<string, number>)[k] +=
        (meal.micronutrients as unknown as Record<string, number>)[k] ?? 0;
    }
  }
  return sum;
}

/**
 * Computes a 3-day rolling average of micronutrient totals.
 */
function rollingAverage(
  dayTotals: MicronutrientTotals[],
  windowSize: number,
): MicronutrientTotals {
  const avg = emptyMicroTotals();
  const n = Math.min(windowSize, dayTotals.length);
  if (n === 0) return avg;

  const window = dayTotals.slice(-n);
  for (const day of window) {
    for (const k of MICRONUTRIENT_KEYS) {
      (avg as unknown as Record<string, number>)[k] +=
        (day as unknown as Record<string, number>)[k];
    }
  }
  for (const k of MICRONUTRIENT_KEYS) {
    (avg as unknown as Record<string, number>)[k] /= n;
  }
  return avg;
}

/**
 * Returns micronutrient keys with non-trivial repair urgency (fuzzy evaluation).
 * Each entry includes the RDA coverage ratio and a fuzzy urgency score [0, 1].
 * Sorted by urgency descending — most critical deficits first.
 */
function findDeficits(
  avg: MicronutrientTotals,
  rda: RdaValues,
): Array<{ key: keyof RdaValues; ratio: number; urgency: number }> {
  const deficits: Array<{ key: keyof RdaValues; ratio: number; urgency: number }> = [];
  for (const k of MICRONUTRIENT_KEYS) {
    const rdaVal = rda[k];
    if (rdaVal <= 0) continue;
    const ratio = (avg as unknown as Record<string, number>)[k] / rdaVal;
    const urgency = fuzzyMicroUrgency(ratio);
    if (urgency > MICRO_URGENCY_THRESHOLD) {
      deficits.push({ key: k, ratio, urgency });
    }
  }
  return deficits.sort((a, b) => b.urgency - a.urgency);
}

/**
 * Scores how well a candidate food addresses a set of micronutrient deficits.
 * Higher = more helpful. Contributions are weighted by fuzzy urgency so that
 * critical deficits matter more than borderline ones.
 */
function scoreFoodForDeficits(
  food: CandidateFood,
  deficits: Array<{ key: keyof RdaValues; ratio: number; urgency: number }>,
  rda: RdaValues,
): number {
  const portionG = food.serving_size_g ?? 100;
  const scale = portionG / 100;
  let score = 0;

  for (const { key, urgency } of deficits) {
    const col = Object.entries(FOOD_COL_TO_RDA_KEY).find(([, v]) => v === key)?.[0];
    if (!col) continue;
    const val = (food as unknown as Record<string, number | null>)[col];
    if (val == null) continue;

    const contribution = (val * scale) / rda[key];
    score += contribution * urgency;
  }

  return score;
}

// ---------------------------------------------------------------------------
// Macro helpers (unchanged logic)
// ---------------------------------------------------------------------------

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
 * Scores a food for a slot using fuzzy macro deviation evaluation.
 * Small deviations (<10%) produce near-zero penalty; large ones (>25%)
 * produce steep penalty — creating a smooth, non-linear preference curve.
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

  return (
    fuzzyMacroPenalty(kcalDev) * 2.0 +
    fuzzyMacroPenalty(proteinDev) * 1.5 +
    fuzzyMacroPenalty(carbsDev) * 1.0 +
    fuzzyMacroPenalty(fatDev) * 1.0
  );
}

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

  const A: number[][] = [];
  const b = [target.kcal, target.protein_g, target.carbs_g, target.fat_g];
  const weights = [2.0, 1.5, 1.0, 1.0];

  for (const f of foods) {
    A.push([
      (f.calories_per_100g ?? 0) / 100,
      (f.protein_per_100g ?? 0) / 100,
      (f.carbs_per_100g ?? 0) / 100,
      (f.fat_per_100g ?? 0) / 100,
    ]);
  }

  const m = 4;
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

  const raw = solveLinearSystem(ATA, ATb);

  // Hard-clamp to physical limits, then iteratively nudge portions that
  // incur high fuzzy penalty towards the acceptable range centre (150g).
  return raw.map((v) => {
    let p = Math.min(MAX_PORTION_G, Math.max(MIN_PORTION_G, v));
    const penalty = fuzzyPortionPenalty(p);
    if (penalty > 0.1) {
      const centre = 150;
      p = p + (centre - p) * penalty * 0.3;
      p = Math.min(MAX_PORTION_G, Math.max(MIN_PORTION_G, p));
    }
    return Math.round(p);
  });
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

// ---------------------------------------------------------------------------
// Food selection
// ---------------------------------------------------------------------------

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

    const scored = available
      .map((f) => ({ food: f, score: scoreFoodForSlot(f, remaining) }))
      .sort((a, b) => a.score - b.score);

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

// ---------------------------------------------------------------------------
// Post-hoc adjustments
// ---------------------------------------------------------------------------

/**
 * Fuzzy calorie adjustment: evaluates the deviation with fuzzyCalorieCorrectionStrength
 * to determine how much correction to apply, then dampens the raw scale factor
 * via fuzzyDampenScale to prevent drastic changes.
 */
function adjustDayPortions(meals: PlannedMeal[], day: number, targets: MacroTargets): void {
  const dayMeals = meals.filter((m) => m.day_number === day);
  const totalKcal = dayMeals.reduce((s, m) => s + m.total_calories, 0);

  if (totalKcal <= 0) return;

  const deviationFraction = Math.abs(totalKcal - targets.kcal) / targets.kcal;
  const correctionStrength = fuzzyCalorieCorrectionStrength(deviationFraction);

  if (correctionStrength < 0.05) return;

  const rawScale = targets.kcal / totalKcal;
  if (rawScale < 0.5 || rawScale > 2.0) return;

  const dampenedScale = fuzzyDampenScale(rawScale);
  // Blend between no correction (1.0) and full dampened correction based on strength
  const finalScale = 1 + (dampenedScale - 1) * correctionStrength;

  for (const meal of dayMeals) {
    for (const a of meal.foods) {
      a.portion_g = Math.round(a.portion_g * finalScale);
    }
    meal.total_calories = Math.round(meal.total_calories * finalScale);
    meal.total_protein_g = Math.round(meal.total_protein_g * finalScale * 10) / 10;
    meal.total_carbs_g = Math.round(meal.total_carbs_g * finalScale * 10) / 10;
    meal.total_fat_g = Math.round(meal.total_fat_g * finalScale * 10) / 10;
    meal.micronutrients = computeMealMicros(meal.foods);
  }
}

/**
 * Builds a PlannedMeal from slot metadata + assignments.
 */
function buildPlannedMeal(
  day: number,
  slot: MealSlot,
  assignments: SlotAssignment[],
): PlannedMeal {
  let slotKcal = 0, slotP = 0, slotC = 0, slotF = 0;
  for (const a of assignments) {
    const scale = a.portion_g / 100;
    slotKcal += (a.food.calories_per_100g ?? 0) * scale;
    slotP += (a.food.protein_per_100g ?? 0) * scale;
    slotC += (a.food.carbs_per_100g ?? 0) * scale;
    slotF += (a.food.fat_per_100g ?? 0) * scale;
  }

  return {
    day_number: day,
    meal_slot: slot,
    foods: assignments,
    total_calories: Math.round(slotKcal),
    total_protein_g: Math.round(slotP * 10) / 10,
    total_carbs_g: Math.round(slotC * 10) / 10,
    total_fat_g: Math.round(slotF * 10) / 10,
    micronutrients: computeMealMicros(assignments),
  };
}

// ---------------------------------------------------------------------------
// Micronutrient repair pass
// ---------------------------------------------------------------------------

/**
 * Attempts to fix micronutrient deficits for a given day by swapping the
 * weakest food in the worst-performing slot with a micronutrient-dense
 * alternative.  Bounded to MAX_REPAIR_PASSES per day.
 */
function repairMicroDeficits(
  meals: PlannedMeal[],
  day: number,
  dayTotals: MicronutrientTotals[],
  rda: RdaValues,
  candidates: CandidateFood[],
  slotTargets: Record<MealSlot, MacroTargets>,
  usedFoodIdsInDay: Set<number>,
): void {
  for (let pass = 0; pass < MAX_REPAIR_PASSES; pass++) {
    const avg = rollingAverage(dayTotals, 3);
    const deficits = findDeficits(avg, rda);
    if (deficits.length === 0) break;

    const dayMeals = meals.filter((m) => m.day_number === day);
    if (dayMeals.length === 0) break;

    // Find the meal slot that contributes least to the worst deficit
    const worstKey = deficits[0].key;
    let worstMeal: PlannedMeal | undefined;
    let worstFoodIdx = -1;
    let worstContribution = Infinity;

    for (const meal of dayMeals) {
      for (let fi = 0; fi < meal.foods.length; fi++) {
        const a = meal.foods[fi];
        const col = Object.entries(FOOD_COL_TO_RDA_KEY).find(([, v]) => v === worstKey)?.[0];
        if (!col) continue;
        const val = (a.food as unknown as Record<string, number | null>)[col] ?? 0;
        const contribution = (val as number) * (a.portion_g / 100);
        if (contribution < worstContribution) {
          worstContribution = contribution;
          worstMeal = meal;
          worstFoodIdx = fi;
        }
      }
    }

    if (!worstMeal || worstFoodIdx < 0) break;

    // Find a replacement from candidates that addresses the deficits
    const currentFoodId = worstMeal.foods[worstFoodIdx].food.fdc_id;
    const scoredCandidates = candidates
      .filter((c) => c.fdc_id !== currentFoodId && !usedFoodIdsInDay.has(c.fdc_id))
      .map((c) => ({ food: c, score: scoreFoodForDeficits(c, deficits, rda) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scoredCandidates.length === 0) break;

    const topN = Math.min(3, scoredCandidates.length);
    const replacement = scoredCandidates[Math.floor(Math.random() * topN)].food;

    worstMeal.foods[worstFoodIdx] = {
      food: replacement,
      portion_g: worstMeal.foods[worstFoodIdx].portion_g,
    };

    // Re-optimize portions for the affected meal
    const target = slotTargets[worstMeal.meal_slot];
    if (target) {
      const foods = worstMeal.foods.map((a) => a.food);
      const newPortions = optimizePortions(foods, target);
      for (let i = 0; i < worstMeal.foods.length; i++) {
        worstMeal.foods[i].portion_g = newPortions[i] ?? 100;
      }
    }

    // Recompute meal totals
    let kcal = 0, p = 0, c = 0, f = 0;
    for (const a of worstMeal.foods) {
      const scale = a.portion_g / 100;
      kcal += (a.food.calories_per_100g ?? 0) * scale;
      p += (a.food.protein_per_100g ?? 0) * scale;
      c += (a.food.carbs_per_100g ?? 0) * scale;
      f += (a.food.fat_per_100g ?? 0) * scale;
    }
    worstMeal.total_calories = Math.round(kcal);
    worstMeal.total_protein_g = Math.round(p * 10) / 10;
    worstMeal.total_carbs_g = Math.round(c * 10) / 10;
    worstMeal.total_fat_g = Math.round(f * 10) / 10;
    worstMeal.micronutrients = computeMealMicros(worstMeal.foods);

    usedFoodIdsInDay.add(replacement.fdc_id);

    // Update the day's totals for next iteration
    const dayIdx = dayTotals.length - 1;
    dayTotals[dayIdx] = sumMicroTotals(meals.filter((m) => m.day_number === day));
  }
}

// ---------------------------------------------------------------------------
// Main solver
// ---------------------------------------------------------------------------

/**
 * Main solver: greedy food selection with portion optimization and
 * micronutrient constraint enforcement via 3-day rolling average.
 */
export function solve(
  candidates: CandidateFood[],
  profile: UserProfile,
  request: PlanRequest,
): SolverResult {
  const startTime = performance.now();
  const categorized = categorizeFoods(candidates);
  const rda = getRda(profile.biological_sex, profile.date_of_birth);

  const dailyTargets: MacroTargets = {
    kcal: profile.target_kcal,
    protein_g: profile.target_protein_g,
    carbs_g: profile.target_carbs_g,
    fat_g: profile.target_fat_g,
  };

  const activeSlots = SLOT_ORDER.slice(0, request.meals_per_day);
  const slotTargets = getSlotTargets(dailyTargets, request.meals_per_day);

  const meals: PlannedMeal[] = [];
  const recentBySlot: Record<string, number[][]> = {};
  for (const slot of activeSlots) {
    recentBySlot[slot] = [];
  }

  let totalDeviation = 0;
  let iterations = 0;
  const usedFoodIds = new Set<number>();
  const dayMicroTotals: MicronutrientTotals[] = [];

  for (let day = 1; day <= request.duration_days; day++) {
    if (performance.now() - startTime > SOLVER_TIMEOUT_MS) break;

    const dayRemaining: MacroTargets = { ...dailyTargets };
    const dayFoodIds = new Set<number>();

    for (const slot of activeSlots) {
      iterations++;
      const target = slotTargets[slot];
      if (!target) continue;

      const recentIds = recentBySlot[slot]
        .slice(-NO_REPEAT_WINDOW)
        .flat();
      const recentSet = new Set(recentIds);

      const selectedFoods = selectFoodsForSlot(
        categorized,
        target,
        recentSet,
        slot,
      );

      const portions = optimizePortions(selectedFoods, target);

      const assignments: SlotAssignment[] = selectedFoods.map((food, i) => ({
        food,
        portion_g: portions[i] ?? 100,
      }));

      const meal = buildPlannedMeal(day, slot as MealSlot, assignments);

      const dev =
        Math.abs(meal.total_calories - target.kcal) / Math.max(target.kcal, 1) +
        Math.abs(meal.total_protein_g - target.protein_g) / Math.max(target.protein_g, 1) +
        Math.abs(meal.total_carbs_g - target.carbs_g) / Math.max(target.carbs_g, 1) +
        Math.abs(meal.total_fat_g - target.fat_g) / Math.max(target.fat_g, 1);
      totalDeviation += dev;

      dayRemaining.kcal -= meal.total_calories;
      dayRemaining.protein_g -= meal.total_protein_g;
      dayRemaining.carbs_g -= meal.total_carbs_g;
      dayRemaining.fat_g -= meal.total_fat_g;

      const slotFoodIds = selectedFoods.map((f) => f.fdc_id);
      recentBySlot[slot].push(slotFoodIds);
      slotFoodIds.forEach((id) => {
        usedFoodIds.add(id);
        dayFoodIds.add(id);
      });

      meals.push(meal);
    }

    // Fuzzy calorie adjustment — decides internally how much to correct
    adjustDayPortions(meals, day, dailyTargets);

    // Record day micronutrient totals
    const dayMeals = meals.filter((m) => m.day_number === day);
    dayMicroTotals.push(sumMicroTotals(dayMeals));

    // Micronutrient repair pass (enabled once we have enough days for the window)
    if (dayMicroTotals.length >= 1) {
      repairMicroDeficits(
        meals,
        day,
        dayMicroTotals,
        rda,
        candidates,
        slotTargets,
        dayFoodIds,
      );
    }
  }

  // Compute micronutrient coverage score (average % RDA across all days)
  let microScore = 0;
  if (dayMicroTotals.length > 0) {
    for (const dayTotal of dayMicroTotals) {
      for (const k of MICRONUTRIENT_KEYS) {
        const rdaVal = rda[k];
        if (rdaVal <= 0) continue;
        const ratio = (dayTotal as unknown as Record<string, number>)[k] / rdaVal;
        microScore += Math.min(ratio, 1.0);
      }
    }
    microScore /= dayMicroTotals.length * MICRONUTRIENT_KEYS.length;
  }

  return {
    meals,
    objective_value: Math.round((totalDeviation + (1 - microScore) * 10) * 1000) / 1000,
    solver_time_ms: Math.round(performance.now() - startTime),
    method: 'heuristic',
    iterations,
    unique_ingredients: usedFoodIds.size,
  };
}
