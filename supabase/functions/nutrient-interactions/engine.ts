import { createServiceClient } from '../_shared/supabase-client.ts';
import { createLogger } from '../_shared/logger.ts';
import {
  MEAL_RELEVANT_RULES,
  USDA_COL_TO_KEY,
  USDA_MICRO_SELECT,
  type NutrientKey,
  type InteractionRule,
  type Severity,
} from './rules.ts';
import type { IngredientInput } from './schemas.ts';

const log = createLogger('nutrient-interactions:engine');

export interface TriggeredInteraction {
  rule: InteractionRule;
  valueA: number;
  valueB: number;
  ingredientNames: string[];
}

export interface EvaluationResult {
  warnings: TriggeredInteraction[];
  synergies: TriggeredInteraction[];
  mealNutrients: Record<NutrientKey, number>;
}

type UsdaRow = Record<string, number | null> & { fdc_id: number };

/**
 * Fetch micronutrient data from usda_foods for all matched ingredients,
 * scale to actual portion, and sum into meal-level totals.
 */
async function buildNutrientProfile(
  ingredients: IngredientInput[],
): Promise<{ totals: Record<NutrientKey, number>; names: string[] }> {
  const supabase = createServiceClient();
  const totals = {} as Record<NutrientKey, number>;
  const names: string[] = [];

  const fdcIds = ingredients
    .filter((i) => i.usda_fdc_id != null)
    .map((i) => i.usda_fdc_id!);

  let usdaRows: UsdaRow[] = [];
  if (fdcIds.length > 0) {
    const { data, error } = await supabase
      .from('usda_foods')
      .select(USDA_MICRO_SELECT)
      .in('fdc_id', fdcIds);
    if (error) {
      log.warn('USDA micro fetch failed', { error: error.message });
    } else {
      usdaRows = (data ?? []) as UsdaRow[];
    }
  }

  const usdaMap = new Map(usdaRows.map((r) => [r.fdc_id, r]));

  for (const ing of ingredients) {
    names.push(ing.name);
    const ratio = ing.quantity_g / 100;

    const macroKeys: [string, NutrientKey][] = [
      ['calories_kcal', 'calories_kcal'],
      ['protein_g', 'protein_g'],
      ['fat_g', 'fat_g'],
      ['fiber_g', 'fiber_g'],
      ['sugar_g', 'sugar_g'],
      ['sodium_mg', 'sodium_mg'],
      ['saturated_fat_g', 'saturated_fat_g'],
    ];

    for (const [macroField, nKey] of macroKeys) {
      const val = (ing.macros as Record<string, number | undefined>)[macroField];
      if (val != null) {
        totals[nKey] = (totals[nKey] ?? 0) + val;
      }
    }

    if (ing.usda_fdc_id != null) {
      const row = usdaMap.get(ing.usda_fdc_id);
      if (row) {
        for (const [col, nKey] of Object.entries(USDA_COL_TO_KEY)) {
          const per100 = row[col];
          if (per100 != null && per100 > 0) {
            totals[nKey] = (totals[nKey] ?? 0) + per100 * ratio;
          }
        }
      }
    }
  }

  return { totals, names };
}

function parseRatio(trigger: string): { op: string; value: number } | null {
  const match = trigger.match(/^a:b\s*(>=|>|<=|<|==)\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { op: match[1]!, value: parseFloat(match[2]!) };
}

function checkRatio(a: number, b: number, trigger: string): boolean {
  if (b <= 0) return false;
  const parsed = parseRatio(trigger);
  if (!parsed) return false;
  const ratio = a / b;
  switch (parsed.op) {
    case '>=': return ratio >= parsed.value;
    case '>': return ratio > parsed.value;
    case '<=': return ratio <= parsed.value;
    case '<': return ratio < parsed.value;
    case '==': return Math.abs(ratio - parsed.value) < 0.01;
    default: return false;
  }
}

function isWarningType(rule: InteractionRule): boolean {
  return (
    rule.type === 'absorption_inhibition' ||
    rule.type === 'depletion' ||
    rule.type === 'competition' ||
    rule.direction === 'a_inhibits_b' ||
    rule.direction === 'b_inhibits_a' ||
    rule.direction === 'depletion'
  );
}

const MIN_PRESENCE: Partial<Record<NutrientKey, number>> = {
  iron_mg: 0.5,
  zinc_mg: 0.3,
  calcium_mg: 20,
  magnesium_mg: 10,
  copper_mg: 0.05,
  phosphorus_mg: 20,
  vitamin_a_ug: 10,
  vitamin_c_mg: 2,
  vitamin_d_ug: 0.2,
  vitamin_e_mg: 0.3,
  vitamin_k_ug: 2,
  thiamin_mg: 0.02,
  riboflavin_mg: 0.02,
  niacin_mg: 0.3,
  vitamin_b6_mg: 0.02,
  folate_ug: 5,
  vitamin_b12_ug: 0.1,
  selenium_ug: 1,
  choline_mg: 5,
  protein_g: 1,
  fat_g: 0.5,
  fiber_g: 0.5,
  sugar_g: 1,
  sodium_mg: 10,
  calories_kcal: 10,
};

function isPresent(key: NutrientKey, value: number): boolean {
  return value >= (MIN_PRESENCE[key] ?? 0.01);
}

export async function evaluate(
  ingredients: IngredientInput[],
): Promise<EvaluationResult> {
  const { totals, names } = await buildNutrientProfile(ingredients);

  const warnings: TriggeredInteraction[] = [];
  const synergies: TriggeredInteraction[] = [];

  for (const rule of MEAL_RELEVANT_RULES) {
    const valA = totals[rule.nutrientA] ?? 0;
    const valB = totals[rule.nutrientB] ?? 0;

    if (!isPresent(rule.nutrientB, valB)) continue;

    if (rule.id === 'low_fat_fatsol_warning') {
      const hasFatSolVitamins =
        (totals['vitamin_a_ug'] ?? 0) > 10 ||
        (totals['vitamin_d_ug'] ?? 0) > 0.2 ||
        (totals['vitamin_e_mg'] ?? 0) > 0.3 ||
        (totals['vitamin_k_ug'] ?? 0) > 2;
      if (hasFatSolVitamins && valA < 5) {
        warnings.push({ rule, valueA: valA, valueB: valB, ingredientNames: names });
      }
      continue;
    }

    if (!isPresent(rule.nutrientA, valA)) continue;

    let triggered = false;

    if (rule.ratioTrigger) {
      triggered = checkRatio(valA, valB, rule.ratioTrigger);
    } else if (rule.thresholdA != null) {
      triggered = valA >= rule.thresholdA;
    } else {
      triggered = true;
    }

    if (!triggered) continue;

    const interaction: TriggeredInteraction = {
      rule,
      valueA: Math.round(valA * 100) / 100,
      valueB: Math.round(valB * 100) / 100,
      ingredientNames: names,
    };

    if (isWarningType(rule) && rule.direction !== 'synergy') {
      warnings.push(interaction);
    } else {
      synergies.push(interaction);
    }
  }

  const sortBySeverity = (a: TriggeredInteraction, b: TriggeredInteraction) => {
    const order: Record<Severity, number> = { strong: 0, moderate: 1, mild: 2 };
    return order[a.rule.severity] - order[b.rule.severity];
  };

  warnings.sort(sortBySeverity);
  synergies.sort(sortBySeverity);

  const MAX_WARNINGS = 5;
  const MAX_SYNERGIES = 4;

  return {
    warnings: warnings.slice(0, MAX_WARNINGS),
    synergies: synergies.slice(0, MAX_SYNERGIES),
    mealNutrients: totals,
  };
}
