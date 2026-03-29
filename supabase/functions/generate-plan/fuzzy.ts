/**
 * Lightweight fuzzy logic engine for the diet plan solver.
 *
 * Implements standard membership functions, a FuzzyVariable container,
 * centroid defuzzification, and pre-built variables tuned for nutritional
 * constraint evaluation.
 *
 * Zero external dependencies — pure math.
 */

// ---------------------------------------------------------------------------
// Membership functions
// ---------------------------------------------------------------------------

/** Triangular MF: ramps up from `a` to peak `b`, ramps down to `c`. */
export function triangular(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x <= b) return (x - a) / (b - a);
  return (c - x) / (c - b);
}

/** Trapezoidal MF: ramps up `a..b`, plateau `b..c`, ramps down `c..d`. */
export function trapezoidal(
  x: number,
  a: number,
  b: number,
  c: number,
  d: number,
): number {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}

/** Left-open shoulder: 1 when x <= b, ramps down from b to c, 0 at c+. */
export function leftShoulder(x: number, b: number, c: number): number {
  if (x <= b) return 1;
  if (x >= c) return 0;
  return (c - x) / (c - b);
}

/** Right-open shoulder: 0 when x <= a, ramps up from a to b, 1 at b+. */
export function rightShoulder(x: number, a: number, b: number): number {
  if (x <= a) return 0;
  if (x >= b) return 1;
  return (x - a) / (b - a);
}

/** Smooth sigmoid transition centered at `center` with given `steepness`. */
export function sigmoid(x: number, center: number, steepness: number): number {
  return 1 / (1 + Math.exp(-steepness * (x - center)));
}

// ---------------------------------------------------------------------------
// FuzzyVariable
// ---------------------------------------------------------------------------

export type MembershipFn = (x: number) => number;

export interface FuzzyTerm {
  name: string;
  fn: MembershipFn;
}

export class FuzzyVariable {
  constructor(
    public readonly name: string,
    public readonly terms: FuzzyTerm[],
  ) {}

  /** Evaluate all terms for input `x`. Returns { termName: degree }. */
  evaluate(x: number): Record<string, number> {
    const result: Record<string, number> = {};
    for (const t of this.terms) {
      result[t.name] = t.fn(x);
    }
    return result;
  }

  /** Shorthand: evaluate a single term by name. */
  degree(x: number, termName: string): number {
    const t = this.terms.find((t) => t.name === termName);
    return t ? t.fn(x) : 0;
  }
}

// ---------------------------------------------------------------------------
// Defuzzification
// ---------------------------------------------------------------------------

/**
 * Centroid defuzzification over a discretized universe.
 * Each rule provides an output singleton `value` with an activation `strength`.
 */
export function defuzzifyCentroid(
  rules: Array<{ value: number; strength: number }>,
): number {
  let numerator = 0;
  let denominator = 0;
  for (const r of rules) {
    numerator += r.value * r.strength;
    denominator += r.strength;
  }
  return denominator > 0 ? numerator / denominator : 0;
}

// ---------------------------------------------------------------------------
// Pre-built solver variables
// ---------------------------------------------------------------------------

/**
 * Macro deviation as a fraction (0 = perfect, 1 = 100% off).
 *
 * excellent: 0–10% deviation (near-zero penalty)
 * good:      5–30% deviation (moderate penalty)
 * poor:      25%+ deviation  (heavy penalty)
 */
export const macroDeviation = new FuzzyVariable('macroDeviation', [
  { name: 'excellent', fn: (x) => leftShoulder(x, 0.05, 0.15) },
  { name: 'good', fn: (x) => trapezoidal(x, 0.10, 0.20, 0.30, 0.40) },
  { name: 'poor', fn: (x) => rightShoulder(x, 0.25, 0.40) },
]);

/**
 * Portion size in grams.
 *
 * too_small:  0–40g  (soft discouragement)
 * acceptable: 30–480g (fully OK)
 * too_large:  450–600g+ (soft discouragement)
 */
export const portionAcceptability = new FuzzyVariable('portionAcceptability', [
  { name: 'too_small', fn: (x) => leftShoulder(x, 30, 50) },
  { name: 'acceptable', fn: (x) => trapezoidal(x, 20, 50, 450, 520) },
  { name: 'too_large', fn: (x) => rightShoulder(x, 450, 520) },
]);

/**
 * Daily calorie deviation as a fraction.
 *
 * satisfied: 0–3% (no action needed)
 * marginal:  2–8% (partial correction)
 * violated:  6%+  (full correction)
 */
export const calorieDeviation = new FuzzyVariable('calorieDeviation', [
  { name: 'satisfied', fn: (x) => leftShoulder(x, 0.02, 0.05) },
  { name: 'marginal', fn: (x) => trapezoidal(x, 0.03, 0.05, 0.07, 0.10) },
  { name: 'violated', fn: (x) => rightShoulder(x, 0.06, 0.10) },
]);

/**
 * Micronutrient coverage as a fraction of RDA (0 = none, 1 = 100% RDA).
 *
 * deficit:  below 70% RDA  (high repair priority)
 * adequate: 65–90% RDA     (low priority, borderline)
 * optimal:  85%+ RDA       (no action needed)
 */
export const microCoverage = new FuzzyVariable('microCoverage', [
  { name: 'deficit', fn: (x) => leftShoulder(x, 0.60, 0.75) },
  { name: 'adequate', fn: (x) => trapezoidal(x, 0.65, 0.75, 0.85, 0.92) },
  { name: 'optimal', fn: (x) => rightShoulder(x, 0.85, 0.95) },
]);

/**
 * Scale factor for portion adjustment (1.0 = no change).
 * Input is abs(1 - scaleFactor), i.e. magnitude of change.
 *
 * minimal:    0–10% change (apply fully)
 * moderate:   8–30% change (dampen slightly)
 * aggressive: 25%+ change  (dampen heavily)
 */
export const scaleFactorMagnitude = new FuzzyVariable('scaleFactorMagnitude', [
  { name: 'minimal', fn: (x) => leftShoulder(x, 0.08, 0.15) },
  { name: 'moderate', fn: (x) => trapezoidal(x, 0.10, 0.18, 0.28, 0.40) },
  { name: 'aggressive', fn: (x) => rightShoulder(x, 0.25, 0.45) },
]);

// ---------------------------------------------------------------------------
// Composite scoring helpers
// ---------------------------------------------------------------------------

/**
 * Fuzzy macro deviation score for a single macro dimension.
 * Returns a penalty in [0, 1] where 0 = perfect fit, 1 = terrible fit.
 *
 * Uses weighted sum of term activations:
 *   excellent -> 0.0 penalty
 *   good      -> 0.4 penalty
 *   poor      -> 1.0 penalty
 */
export function fuzzyMacroPenalty(deviationFraction: number): number {
  const d = Math.abs(deviationFraction);
  const terms = macroDeviation.evaluate(d);
  return defuzzifyCentroid([
    { value: 0.0, strength: terms.excellent },
    { value: 0.4, strength: terms.good },
    { value: 1.0, strength: terms.poor },
  ]);
}

/**
 * Fuzzy portion penalty — returns 0 for acceptable portions,
 * ramping up towards 1 for extreme sizes.
 */
export function fuzzyPortionPenalty(portionG: number): number {
  const terms = portionAcceptability.evaluate(portionG);
  return defuzzifyCentroid([
    { value: 1.0, strength: terms.too_small },
    { value: 0.0, strength: terms.acceptable },
    { value: 1.0, strength: terms.too_large },
  ]);
}

/**
 * Returns a damping factor [0, 1] for calorie correction.
 * 0 = no correction needed, 1 = full correction.
 */
export function fuzzyCalorieCorrectionStrength(deviationFraction: number): number {
  const d = Math.abs(deviationFraction);
  const terms = calorieDeviation.evaluate(d);
  return defuzzifyCentroid([
    { value: 0.0, strength: terms.satisfied },
    { value: 0.5, strength: terms.marginal },
    { value: 1.0, strength: terms.violated },
  ]);
}

/**
 * Returns a repair urgency [0, 1] for a micronutrient at given RDA coverage.
 * 0 = no repair needed, 1 = critical deficit.
 */
export function fuzzyMicroUrgency(rdaFraction: number): number {
  const terms = microCoverage.evaluate(rdaFraction);
  return defuzzifyCentroid([
    { value: 1.0, strength: terms.deficit },
    { value: 0.3, strength: terms.adequate },
    { value: 0.0, strength: terms.optimal },
  ]);
}

/**
 * Dampens a scale factor based on its magnitude.
 * Large corrections are attenuated to prevent drastic plan changes.
 * Returns a dampened scale factor.
 */
export function fuzzyDampenScale(rawScale: number): number {
  const magnitude = Math.abs(1 - rawScale);
  const terms = scaleFactorMagnitude.evaluate(magnitude);

  const dampingFactor = defuzzifyCentroid([
    { value: 1.0, strength: terms.minimal },
    { value: 0.7, strength: terms.moderate },
    { value: 0.4, strength: terms.aggressive },
  ]);

  const direction = rawScale >= 1 ? 1 : -1;
  return 1 + direction * magnitude * dampingFactor;
}
