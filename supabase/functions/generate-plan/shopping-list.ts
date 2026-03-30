import type { ValidatedMeal, ShoppingListItem, ShoppingCategory } from './schemas.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('shopping-list');

const CATEGORY_KEYWORDS: Array<[ShoppingCategory, string[]]> = [
  ['meat_seafood', [
    'chicken', 'beef', 'pork', 'turkey', 'lamb', 'veal', 'duck',
    'salmon', 'tuna', 'cod', 'shrimp', 'fish', 'seafood', 'crab',
    'lobster', 'bacon', 'sausage', 'ham', 'steak',
    'kurczak', 'wołowina', 'wieprzowina', 'indyk', 'łosoś', 'tuńczyk',
    'krewetki', 'ryba', 'dorsz', 'szynka', 'kiełbasa', 'boczek',
  ]],
  ['dairy_eggs', [
    'milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'cottage',
    'mozzarella', 'cheddar', 'parmesan', 'ricotta', 'whey',
    'mleko', 'ser', 'jogurt', 'masło', 'śmietana', 'jajko', 'jajka',
    'twaróg', 'jaja',
  ]],
  ['produce', [
    'apple', 'banana', 'orange', 'berry', 'grape', 'melon', 'mango',
    'broccoli', 'spinach', 'carrot', 'tomato', 'onion', 'pepper',
    'lettuce', 'cucumber', 'celery', 'potato', 'avocado', 'lemon',
    'garlic', 'ginger', 'mushroom', 'zucchini', 'squash', 'cabbage',
    'kale', 'peas', 'corn', 'fresh', 'raw',
    'jabłko', 'banan', 'pomarańcza', 'brokuły', 'szpinak', 'marchew',
    'pomidor', 'cebula', 'papryka', 'sałata', 'ogórek', 'ziemniak',
    'czosnek', 'pieczarki', 'cukinia', 'kapusta',
  ]],
  ['grains_bread', [
    'rice', 'bread', 'pasta', 'oat', 'cereal', 'flour', 'tortilla',
    'quinoa', 'barley', 'couscous', 'noodle', 'cracker', 'grain',
    'ryż', 'chleb', 'makaron', 'owsianka', 'płatki', 'mąka',
    'kasza', 'kuskus',
  ]],
  ['oils_condiments', [
    'oil', 'vinegar', 'sauce', 'dressing', 'mustard', 'ketchup',
    'mayonnaise', 'honey', 'syrup', 'jam', 'soy sauce', 'salsa',
    'olej', 'oliwa', 'ocet', 'sos', 'musztarda', 'majonez', 'miód',
  ]],
  ['frozen', ['frozen', 'mrożon']],
];

function categorize(name: string): ShoppingCategory {
  const lower = name.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return 'pantry';
}

function formatQty(grams: number): string {
  if (grams >= 1000) {
    return `${(Math.round(grams / 100) / 10)} kg`;
  }
  return `${Math.round(grams)} g`;
}

export function generateShoppingList(meals: ValidatedMeal[]): ShoppingListItem[] {
  const itemMap = new Map<string, { total_g: number; category: ShoppingCategory }>();

  for (const meal of meals) {
    for (const ing of meal.ingredients) {
      const key = ing.name.toLowerCase().trim();
      const existing = itemMap.get(key);

      if (existing) {
        existing.total_g += ing.amount_g;
      } else {
        itemMap.set(key, {
          total_g: ing.amount_g,
          category: categorize(ing.name),
        });
      }
    }
  }

  const items: ShoppingListItem[] = [...itemMap.entries()]
    .map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      total_g: Math.round(data.total_g),
      display_qty: formatQty(data.total_g),
      category: data.category,
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
