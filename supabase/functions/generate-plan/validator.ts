import type {
  PlannedMeal,
  AllergenFlag,
  ValidationResult,
  ShoppingListItem,
  ShoppingCategory,
  UserProfile,
  PlanRequest,
} from './schemas.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('plan-validator');

// Max acceptable nutrition drift between solver targets and final values
const MAX_DRIFT_PCT = 5;

// ---------------------------------------------------------------------------
// Allergen verification
//
// These keyword lists are intentionally English: they match against USDA food
// descriptions (always English) and LLM-generated recipe text (which may be
// localised but always references English USDA ingredient names internally).
// ---------------------------------------------------------------------------

const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  milk: ['dairy', 'cream', 'cheese', 'butter', 'whey', 'casein', 'lactose', 'yogurt', 'ghee'],
  egg: ['eggs', 'albumin', 'meringue', 'mayonnaise'],
  peanut: ['peanuts', 'groundnut'],
  'tree nut': ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'macadamia', 'hazelnut', 'brazil nut'],
  wheat: ['flour', 'bread', 'pasta', 'couscous', 'semolina', 'spelt', 'kamut', 'durum'],
  soy: ['soybean', 'tofu', 'tempeh', 'edamame', 'miso', 'soy sauce'],
  fish: ['salmon', 'tuna', 'cod', 'halibut', 'tilapia', 'anchovy', 'sardine', 'bass', 'trout', 'mackerel'],
  shellfish: ['shrimp', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'scallop', 'crawfish', 'prawn'],
  sesame: ['tahini', 'sesame seed', 'sesame oil'],
  gluten: ['wheat', 'barley', 'rye', 'flour', 'bread', 'pasta', 'couscous', 'semolina'],
};

function expandAllergen(allergen: string): string[] {
  const key = allergen.toLowerCase().trim();
  const synonyms = ALLERGEN_SYNONYMS[key] ?? [];
  return [key, ...synonyms];
}

export function checkAllergens(
  meals: PlannedMeal[],
  allergies: string[],
): AllergenFlag[] {
  if (allergies.length === 0) return [];

  const flags: AllergenFlag[] = [];
  const allergenTerms = new Map<string, string[]>();

  for (const allergy of allergies) {
    allergenTerms.set(allergy, expandAllergen(allergy));
  }

  for (const meal of meals) {
    const textToCheck = [
      meal.recipe_name ?? '',
      meal.recipe_instructions ?? '',
      ...meal.foods.map((f) => f.food.description),
    ]
      .join(' ')
      .toLowerCase();

    for (const [allergen, terms] of allergenTerms) {
      for (const term of terms) {
        if (textToCheck.includes(term)) {
          flags.push({
            meal_day: meal.day_number,
            meal_slot: meal.meal_slot,
            allergen,
            found_in: term,
          });
          break;
        }
      }
    }
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Nutrition drift check
// ---------------------------------------------------------------------------

export function checkNutritionDrift(
  meals: PlannedMeal[],
  profile: UserProfile,
  durationDays: number,
): number {
  const totalCals = meals.reduce((s, m) => s + m.total_calories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.total_protein_g, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.total_carbs_g, 0);
  const totalFat = meals.reduce((s, m) => s + m.total_fat_g, 0);

  const expectedCals = profile.target_kcal * durationDays;
  const expectedProtein = profile.target_protein_g * durationDays;
  const expectedCarbs = profile.target_carbs_g * durationDays;
  const expectedFat = profile.target_fat_g * durationDays;

  const drifts = [
    Math.abs(totalCals - expectedCals) / Math.max(expectedCals, 1),
    Math.abs(totalProtein - expectedProtein) / Math.max(expectedProtein, 1),
    Math.abs(totalCarbs - expectedCarbs) / Math.max(expectedCarbs, 1),
    Math.abs(totalFat - expectedFat) / Math.max(expectedFat, 1),
  ];

  const maxDrift = Math.max(...drifts) * 100;
  return Math.round(maxDrift * 10) / 10;
}

// ---------------------------------------------------------------------------
// Full validation
// ---------------------------------------------------------------------------

export function validatePlan(
  meals: PlannedMeal[],
  profile: UserProfile,
  request: PlanRequest,
): ValidationResult {
  const allergenFlags = checkAllergens(meals, profile.allergies);
  const driftPct = checkNutritionDrift(meals, profile, request.duration_days);
  const passed = allergenFlags.length === 0 && driftPct <= MAX_DRIFT_PCT;

  if (allergenFlags.length > 0) {
    log.warn('Allergen flags detected', {
      user_id: profile.user_id,
      count: allergenFlags.length,
      flags: allergenFlags.slice(0, 5),
    });
  }

  log.info('Validation complete', {
    user_id: profile.user_id,
    allergen_flags: allergenFlags.length,
    nutrition_drift_pct: driftPct,
    passed,
  });

  return {
    allergen_flags: allergenFlags,
    nutrition_drift_pct: driftPct,
    passed,
  };
}

// ---------------------------------------------------------------------------
// Shopping list aggregation
// ---------------------------------------------------------------------------

// Categories match against USDA English descriptions (source of truth for
// ingredient data). Shopping list names are also USDA-derived; localisation
// of display names is handled in the UI layer via i18n.
const CATEGORY_KEYWORDS: Array<[ShoppingCategory, string[]]> = [
  ['meat_seafood', [
    'chicken', 'beef', 'pork', 'turkey', 'lamb', 'veal', 'duck',
    'salmon', 'tuna', 'cod', 'shrimp', 'fish', 'seafood', 'crab',
    'lobster', 'bacon', 'sausage', 'ham', 'steak', 'ground',
  ]],
  ['dairy_eggs', [
    'milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'whey',
    'cottage', 'mozzarella', 'cheddar', 'parmesan', 'ricotta',
  ]],
  ['produce', [
    'apple', 'banana', 'orange', 'berry', 'grape', 'melon', 'mango',
    'broccoli', 'spinach', 'carrot', 'tomato', 'onion', 'pepper',
    'lettuce', 'cucumber', 'celery', 'potato', 'sweet potato',
    'avocado', 'lemon', 'lime', 'garlic', 'ginger', 'mushroom',
    'zucchini', 'squash', 'cabbage', 'kale', 'peas', 'corn',
    'fruit', 'vegetable', 'fresh', 'raw',
  ]],
  ['grains_bread', [
    'rice', 'bread', 'pasta', 'oat', 'cereal', 'flour', 'tortilla',
    'quinoa', 'barley', 'couscous', 'noodle', 'cracker', 'bagel',
    'grain', 'wheat', 'corn meal', 'polenta',
  ]],
  ['oils_condiments', [
    'oil', 'vinegar', 'sauce', 'dressing', 'mustard', 'ketchup',
    'mayonnaise', 'honey', 'syrup', 'jam', 'peanut butter',
    'soy sauce', 'salsa',
  ]],
  ['frozen', ['frozen']],
];

function categorizeIngredient(name: string): ShoppingCategory {
  const lower = name.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return 'pantry';
}

function formatDisplayQty(grams: number): string {
  if (grams >= 1000) {
    const kg = Math.round(grams / 100) / 10;
    return `${kg} kg`;
  }
  return `${Math.round(grams)} g`;
}

export function generateShoppingList(meals: PlannedMeal[]): ShoppingListItem[] {
  const itemMap = new Map<
    string,
    { total_g: number; category: ShoppingCategory; fdc_ids: Set<number> }
  >();

  for (const meal of meals) {
    for (const assignment of meal.foods) {
      const name = assignment.food.description.split(',')[0].trim();
      const existing = itemMap.get(name);

      if (existing) {
        existing.total_g += assignment.portion_g;
        existing.fdc_ids.add(assignment.food.fdc_id);
      } else {
        itemMap.set(name, {
          total_g: assignment.portion_g,
          category: categorizeIngredient(assignment.food.description),
          fdc_ids: new Set([assignment.food.fdc_id]),
        });
      }
    }
  }

  const items: ShoppingListItem[] = [...itemMap.entries()]
    .map(([name, data]) => ({
      name,
      total_g: Math.round(data.total_g),
      display_qty: formatDisplayQty(data.total_g),
      category: data.category,
      usda_fdc_ids: [...data.fdc_ids],
    }))
    .sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });

  log.info('Shopping list generated', {
    unique_items: items.length,
    categories: [...new Set(items.map((i) => i.category))],
  });

  return items;
}
