/**
 * DQI-I (Diet Quality Index – International) scoring algorithm.
 *
 * Adapted for the data available in Snacky: per-meal totals (calories, protein,
 * carbs, fat, fiber, sugar, sodium, NOVA class) and per-ingredient USDA food
 * categories. Scored over a 7-day window, 0–100 scale.
 *
 * Components:
 *   Variety      0–20 pts   food group diversity + protein source diversity
 *   Adequacy     0–40 pts   fiber, protein, fruit/veg servings, grain servings
 *   Moderation   0–30 pts   fat %, sodium, sugar %, ultra-processed proportion
 *   Balance      0–10 pts   macronutrient ratio + meal regularity
 *
 * Reference: Kim et al. 2003, "The DQI-I provides an effective tool for
 * cross-national comparison of diet quality", Journal of Nutrition.
 */

export interface DQIInput {
  days: DQIDayInput[];
  targetProteinG: number;
}

export interface DQIDayInput {
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  totalSugarG: number;
  totalSodiumMg: number;
  mealCount: number;
  novaClasses: number[];
  foodCategories: string[];
  proteinSourceCategories: string[];
}

export interface DQIScore {
  total: number;
  variety: DQIComponentScore;
  adequacy: DQIComponentScore;
  moderation: DQIComponentScore;
  balance: DQIComponentScore;
}

export interface DQIComponentScore {
  score: number;
  maxScore: number;
  details: Record<string, number>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function linearScore(value: number, min: number, max: number, maxPoints: number): number {
  if (max === min) return value >= max ? maxPoints : 0;
  return clamp(((value - min) / (max - min)) * maxPoints, 0, maxPoints);
}

function inverseLinearScore(
  value: number,
  goodMax: number,
  badMax: number,
  maxPoints: number,
): number {
  if (value <= goodMax) return maxPoints;
  if (value >= badMax) return 0;
  return clamp(((badMax - value) / (badMax - goodMax)) * maxPoints, 0, maxPoints);
}

const FRUIT_CATEGORIES = ['Fruits and Fruit Juices', 'Fruits', 'Fruit Juices'];

const VEGETABLE_CATEGORIES = [
  'Vegetables and Vegetable Products',
  'Vegetables',
  'Legumes and Legume Products',
];

const GRAIN_CATEGORIES = [
  'Cereal Grains and Pasta',
  'Breakfast Cereals',
  'Baked Products',
  'Bread',
];


function matchesAny(category: string, list: string[]): boolean {
  const lower = category.toLowerCase();
  return list.some((c) => lower.includes(c.toLowerCase()));
}

function scoreVariety(days: DQIDayInput[]): DQIComponentScore {
  const allCategories = new Set<string>();
  const proteinSources = new Set<string>();

  for (const day of days) {
    for (const cat of day.foodCategories) {
      if (cat) allCategories.add(cat);
    }
    for (const src of day.proteinSourceCategories) {
      if (src) proteinSources.add(src);
    }
  }

  // Food group variety: 0–15 pts (1+ distinct categories up to 8+)
  const groupVarietyPts = linearScore(allCategories.size, 0, 8, 15);

  // Protein source variety: 0–5 pts (distinct protein source categories up to 4+)
  const proteinVarietyPts = linearScore(proteinSources.size, 0, 4, 5);

  return {
    score: Math.round(groupVarietyPts + proteinVarietyPts),
    maxScore: 20,
    details: {
      foodGroups: Math.round(groupVarietyPts * 10) / 10,
      proteinSources: Math.round(proteinVarietyPts * 10) / 10,
    },
  };
}

function scoreAdequacy(days: DQIDayInput[], targetProteinG: number): DQIComponentScore {
  const tracked = days.filter((d) => d.mealCount > 0);
  const n = tracked.length || 1;

  const avgFiber = tracked.reduce((s, d) => s + d.totalFiberG, 0) / n;
  const avgProtein = tracked.reduce((s, d) => s + d.totalProteinG, 0) / n;

  // Fiber: 0–10 pts (target 25g/day)
  const fiberPts = linearScore(avgFiber, 0, 25, 10);

  // Protein: 0–10 pts (vs user target)
  const proteinPts = linearScore(avgProtein, 0, targetProteinG, 10);

  // Fruit servings: count days with fruit-category ingredients
  let fruitDays = 0;
  let vegDays = 0;
  let grainDays = 0;
  for (const day of tracked) {
    if (day.foodCategories.some((c) => matchesAny(c, FRUIT_CATEGORIES))) fruitDays++;
    if (day.foodCategories.some((c) => matchesAny(c, VEGETABLE_CATEGORIES))) vegDays++;
    if (day.foodCategories.some((c) => matchesAny(c, GRAIN_CATEGORIES))) grainDays++;
  }

  // Fruit frequency: 0–8 pts (daily = 8)
  const fruitPts = linearScore(fruitDays, 0, n, 8);
  // Vegetable frequency: 0–8 pts
  const vegPts = linearScore(vegDays, 0, n, 8);
  // Grain frequency: 0–4 pts
  const grainPts = linearScore(grainDays, 0, n, 4);

  return {
    score: Math.round(fiberPts + proteinPts + fruitPts + vegPts + grainPts),
    maxScore: 40,
    details: {
      fiber: Math.round(fiberPts * 10) / 10,
      protein: Math.round(proteinPts * 10) / 10,
      fruit: Math.round(fruitPts * 10) / 10,
      vegetables: Math.round(vegPts * 10) / 10,
      grains: Math.round(grainPts * 10) / 10,
    },
  };
}

function scoreModeration(days: DQIDayInput[]): DQIComponentScore {
  const tracked = days.filter((d) => d.mealCount > 0 && d.totalCalories > 0);
  const n = tracked.length || 1;

  const avgCals = tracked.reduce((s, d) => s + d.totalCalories, 0) / n;
  const avgFatG = tracked.reduce((s, d) => s + d.totalFatG, 0) / n;
  const avgSugarG = tracked.reduce((s, d) => s + d.totalSugarG, 0) / n;
  const avgSodiumMg = tracked.reduce((s, d) => s + d.totalSodiumMg, 0) / n;

  // Total fat as % of calories: <=30% is ideal, >=45% is 0 pts
  const fatPct = avgCals > 0 ? ((avgFatG * 9) / avgCals) * 100 : 0;
  const fatPts = inverseLinearScore(fatPct, 30, 45, 8);

  // Sugar as % of calories: <=10% is ideal, >=25% is 0 pts
  const sugarPct = avgCals > 0 ? ((avgSugarG * 4) / avgCals) * 100 : 0;
  const sugarPts = inverseLinearScore(sugarPct, 10, 25, 8);

  // Sodium: <=2300mg is ideal, >=4600mg is 0 pts
  const sodiumPts = inverseLinearScore(avgSodiumMg, 2300, 4600, 7);

  // Ultra-processed (NOVA 4) proportion: 0% is ideal, >=60% is 0 pts
  const allNova = tracked.flatMap((d) => d.novaClasses);
  const nova4Count = allNova.filter((n) => n === 4).length;
  const nova4Pct = allNova.length > 0 ? (nova4Count / allNova.length) * 100 : 0;
  const novaPts = inverseLinearScore(nova4Pct, 0, 60, 7);

  return {
    score: Math.round(fatPts + sugarPts + sodiumPts + novaPts),
    maxScore: 30,
    details: {
      totalFat: Math.round(fatPts * 10) / 10,
      sugar: Math.round(sugarPts * 10) / 10,
      sodium: Math.round(sodiumPts * 10) / 10,
      ultraProcessed: Math.round(novaPts * 10) / 10,
    },
  };
}

function scoreBalance(days: DQIDayInput[]): DQIComponentScore {
  const tracked = days.filter((d) => d.mealCount > 0 && d.totalCalories > 0);
  const n = tracked.length || 1;

  const avgCals = tracked.reduce((s, d) => s + d.totalCalories, 0) / n;
  const avgP = tracked.reduce((s, d) => s + d.totalProteinG, 0) / n;
  const avgC = tracked.reduce((s, d) => s + d.totalCarbsG, 0) / n;
  const avgF = tracked.reduce((s, d) => s + d.totalFatG, 0) / n;

  // Ideal macro ratios: P 10–35%, C 45–65%, F 20–35% of calories
  const pPct = avgCals > 0 ? ((avgP * 4) / avgCals) * 100 : 0;
  const cPct = avgCals > 0 ? ((avgC * 4) / avgCals) * 100 : 0;
  const fPct = avgCals > 0 ? ((avgF * 9) / avgCals) * 100 : 0;

  const pInRange = pPct >= 10 && pPct <= 35;
  const cInRange = cPct >= 45 && cPct <= 65;
  const fInRange = fPct >= 20 && fPct <= 35;

  const inRangeCount = [pInRange, cInRange, fInRange].filter(Boolean).length;
  const macroPts = inRangeCount === 3 ? 6 : inRangeCount === 2 ? 4 : inRangeCount === 1 ? 2 : 0;

  // Meal regularity: 3+ meals/day on average
  const avgMeals = tracked.reduce((s, d) => s + d.mealCount, 0) / n;
  const mealPts = avgMeals >= 3 ? 4 : avgMeals >= 2 ? 2 : 0;

  return {
    score: Math.round(macroPts + mealPts),
    maxScore: 10,
    details: {
      macroBalance: macroPts,
      mealRegularity: mealPts,
    },
  };
}

export function computeDQIScore(input: DQIInput): DQIScore {
  const { days, targetProteinG } = input;

  const variety = scoreVariety(days);
  const adequacy = scoreAdequacy(days, targetProteinG);
  const moderation = scoreModeration(days);
  const balance = scoreBalance(days);

  return {
    total: variety.score + adequacy.score + moderation.score + balance.score,
    variety,
    adequacy,
    moderation,
    balance,
  };
}
