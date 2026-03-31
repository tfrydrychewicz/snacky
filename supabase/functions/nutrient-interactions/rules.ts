export type NutrientKey =
  | 'calcium_mg' | 'iron_mg' | 'zinc_mg' | 'copper_mg' | 'magnesium_mg'
  | 'phosphorus_mg' | 'potassium_mg' | 'selenium_ug' | 'sodium_mg'
  | 'vitamin_a_ug' | 'vitamin_c_mg' | 'vitamin_d_ug' | 'vitamin_e_mg'
  | 'vitamin_k_ug' | 'thiamin_mg' | 'riboflavin_mg' | 'niacin_mg'
  | 'vitamin_b6_mg' | 'folate_ug' | 'vitamin_b12_ug' | 'choline_mg'
  | 'fat_g' | 'fiber_g' | 'protein_g' | 'sugar_g' | 'calories_kcal'
  | 'saturated_fat_g';

export type InteractionDirection =
  | 'a_inhibits_b' | 'b_inhibits_a' | 'bidirectional' | 'synergy' | 'depletion';

export type InteractionType =
  | 'absorption_inhibition' | 'enhancement' | 'metabolic_dependency'
  | 'depletion' | 'competition' | 'ratio';

export type Severity = 'strong' | 'moderate' | 'mild';

export interface InteractionRule {
  id: string;
  nutrientA: NutrientKey;
  nutrientB: NutrientKey;
  direction: InteractionDirection;
  type: InteractionType;
  severity: Severity;
  mealRelevant: boolean;
  thresholdA?: number;
  thresholdB?: number;
  ratioTrigger?: string;
  mechanism: string;
  suggestionHint: string;
}

export const USDA_COL_TO_KEY: Record<string, NutrientKey> = {
  calcium_mg_per_100g: 'calcium_mg',
  iron_mg_per_100g: 'iron_mg',
  zinc_mg_per_100g: 'zinc_mg',
  copper_mg_per_100g: 'copper_mg',
  magnesium_mg_per_100g: 'magnesium_mg',
  phosphorus_mg_per_100g: 'phosphorus_mg',
  potassium_mg_per_100g: 'potassium_mg',
  selenium_ug_per_100g: 'selenium_ug',
  vitamin_a_ug_per_100g: 'vitamin_a_ug',
  vitamin_c_mg_per_100g: 'vitamin_c_mg',
  vitamin_d_ug_per_100g: 'vitamin_d_ug',
  vitamin_e_mg_per_100g: 'vitamin_e_mg',
  vitamin_k_ug_per_100g: 'vitamin_k_ug',
  thiamin_mg_per_100g: 'thiamin_mg',
  riboflavin_mg_per_100g: 'riboflavin_mg',
  niacin_mg_per_100g: 'niacin_mg',
  vitamin_b6_mg_per_100g: 'vitamin_b6_mg',
  folate_ug_per_100g: 'folate_ug',
  vitamin_b12_ug_per_100g: 'vitamin_b12_ug',
  choline_mg_per_100g: 'choline_mg',
};

export const USDA_MICRO_SELECT = [
  'fdc_id',
  ...Object.keys(USDA_COL_TO_KEY),
].join(',');

export const RULES: InteractionRule[] = [
  // ── Absorption Inhibitions ──
  { id: 'calcium_iron_inhibition', nutrientA: 'calcium_mg', nutrientB: 'iron_mg', direction: 'a_inhibits_b', type: 'absorption_inhibition', severity: 'strong', mealRelevant: true, thresholdA: 300,
    mechanism: 'Calcium inhibits DMT1 and reduces ferroportin, blocking both heme and non-heme iron absorption by 50-60% at ≥300 mg per meal.',
    suggestionHint: 'Separate calcium-rich and iron-rich foods into different meals, or add vitamin C to counteract.' },
  { id: 'iron_zinc_competition', nutrientA: 'iron_mg', nutrientB: 'zinc_mg', direction: 'a_inhibits_b', type: 'competition', severity: 'moderate', mealRelevant: true, ratioTrigger: 'a:b >= 2',
    mechanism: 'Iron and zinc compete for DMT1 transport. Fe:Zn ratio ≥2:1 significantly impairs zinc absorption.',
    suggestionHint: 'Balance iron and zinc intake; avoid very high iron with zinc-rich foods.' },
  { id: 'zinc_copper_depletion', nutrientA: 'zinc_mg', nutrientB: 'copper_mg', direction: 'a_inhibits_b', type: 'depletion', severity: 'strong', mealRelevant: false, thresholdA: 40, ratioTrigger: 'a:b > 15',
    mechanism: 'High zinc induces metallothionein which traps copper in enterocytes. Chronic Zn >40 mg/day causes copper deficiency.',
    suggestionHint: 'Monitor zinc:copper ratio if supplementing zinc.' },
  { id: 'calcium_magnesium_competition', nutrientA: 'calcium_mg', nutrientB: 'magnesium_mg', direction: 'bidirectional', type: 'competition', severity: 'moderate', mealRelevant: true, ratioTrigger: 'a:b > 3',
    mechanism: 'Calcium and magnesium share paracellular absorption pathways. Ca:Mg ratio >3:1 impairs magnesium absorption.',
    suggestionHint: 'Add magnesium-rich foods like nuts, seeds, or dark leafy greens.' },
  { id: 'calcium_zinc_competition', nutrientA: 'calcium_mg', nutrientB: 'zinc_mg', direction: 'a_inhibits_b', type: 'competition', severity: 'mild', mealRelevant: true, thresholdA: 1500,
    mechanism: 'Very high calcium (>1500 mg) may reduce zinc absorption via paracellular pathway saturation.',
    suggestionHint: 'Not a major concern at normal dietary levels.' },
  // ── Phytate / Fiber Chelation ──
  { id: 'fiber_iron_chelation', nutrientA: 'fiber_g', nutrientB: 'iron_mg', direction: 'a_inhibits_b', type: 'absorption_inhibition', severity: 'strong', mealRelevant: true, thresholdA: 8,
    mechanism: 'Phytic acid in high-fiber foods chelates iron forming insoluble complexes, reducing non-heme iron absorption by ~50%.',
    suggestionHint: 'Add vitamin C (citrus, bell peppers) to counteract phytate inhibition of iron.' },
  { id: 'fiber_zinc_chelation', nutrientA: 'fiber_g', nutrientB: 'zinc_mg', direction: 'a_inhibits_b', type: 'absorption_inhibition', severity: 'strong', mealRelevant: true, thresholdA: 8,
    mechanism: 'Phytic acid chelates zinc forming insoluble complexes.',
    suggestionHint: 'Pair high-fiber foods with animal protein or fermented foods to improve zinc absorption.' },
  { id: 'fiber_calcium_chelation', nutrientA: 'fiber_g', nutrientB: 'calcium_mg', direction: 'a_inhibits_b', type: 'absorption_inhibition', severity: 'moderate', mealRelevant: true, thresholdA: 10,
    mechanism: 'Phytic acid chelates calcium, though less dramatic than for iron/zinc due to vitamin D-dependent active transport.',
    suggestionHint: 'Ensure adequate vitamin D to maintain calcium absorption despite fiber.' },
  { id: 'fiber_magnesium_chelation', nutrientA: 'fiber_g', nutrientB: 'magnesium_mg', direction: 'a_inhibits_b', type: 'absorption_inhibition', severity: 'moderate', mealRelevant: true, thresholdA: 10,
    mechanism: 'Phytic acid chelates magnesium through the same mechanism as other divalent minerals.',
    suggestionHint: 'Consider soaking or fermenting grains/legumes to reduce phytate content.' },
  // ── Enhancement / Synergy ──
  { id: 'vitc_iron_enhancement', nutrientA: 'vitamin_c_mg', nutrientB: 'iron_mg', direction: 'synergy', type: 'enhancement', severity: 'strong', mealRelevant: true, thresholdA: 25,
    mechanism: 'Vitamin C reduces Fe³⁺ to Fe²⁺ and forms soluble chelates, increasing non-heme iron absorption up to 9.6× at 1000 mg. Counteracts phytate and polyphenol inhibition.',
    suggestionHint: 'Great combination! Vitamin C strongly enhances iron absorption.' },
  { id: 'vitd_calcium_enhancement', nutrientA: 'vitamin_d_ug', nutrientB: 'calcium_mg', direction: 'synergy', type: 'enhancement', severity: 'strong', mealRelevant: true,
    mechanism: 'Vitamin D upregulates TRPV6 calcium channels and calbindin, increasing calcium absorption from 10-15% to 30-40%.',
    suggestionHint: 'Vitamin D and calcium together maximize calcium absorption.' },
  { id: 'vitd_vitk_calcium_synergy', nutrientA: 'vitamin_d_ug', nutrientB: 'vitamin_k_ug', direction: 'synergy', type: 'enhancement', severity: 'moderate', mealRelevant: true,
    mechanism: 'Vitamin D stimulates calcium absorption; vitamin K activates osteocalcin and MGP to direct calcium to bones and prevent vascular calcification.',
    suggestionHint: 'Excellent trio: vitamins D and K work together to properly utilize calcium.' },
  { id: 'vita_iron_enhancement', nutrientA: 'vitamin_a_ug', nutrientB: 'iron_mg', direction: 'synergy', type: 'enhancement', severity: 'strong', mealRelevant: true, thresholdA: 100,
    mechanism: 'Vitamin A modulates hepcidin and β-carotene forms soluble iron complexes that counteract phytate inhibition.',
    suggestionHint: 'Vitamin A enhances iron mobilization and absorption.' },
  { id: 'vite_selenium_synergy', nutrientA: 'vitamin_e_mg', nutrientB: 'selenium_ug', direction: 'synergy', type: 'enhancement', severity: 'strong', mealRelevant: true,
    mechanism: 'Complementary antioxidant pathways: vitamin E scavenges lipid radicals while selenium-GPx reduces hydroperoxides.',
    suggestionHint: 'Strong antioxidant combination with mutual protective benefits.' },
  { id: 'vitc_vite_recycling', nutrientA: 'vitamin_c_mg', nutrientB: 'vitamin_e_mg', direction: 'synergy', type: 'enhancement', severity: 'moderate', mealRelevant: true, thresholdA: 30,
    mechanism: 'Ascorbate regenerates oxidized vitamin E at the membrane-water interface.',
    suggestionHint: 'Vitamin C recycles vitamin E, extending its antioxidant activity.' },
  { id: 'protein_iron_enhancement', nutrientA: 'protein_g', nutrientB: 'iron_mg', direction: 'synergy', type: 'enhancement', severity: 'strong', mealRelevant: true, thresholdA: 15,
    mechanism: 'Cysteine-containing peptides from meat protein chelate non-heme iron, keeping it soluble. 15-30 g muscle protein increases absorption 2-3×.',
    suggestionHint: 'Protein-rich foods enhance non-heme iron absorption.' },
  { id: 'protein_zinc_enhancement', nutrientA: 'protein_g', nutrientB: 'zinc_mg', direction: 'synergy', type: 'enhancement', severity: 'moderate', mealRelevant: true, thresholdA: 15,
    mechanism: 'Cysteine and methionine from protein form soluble zinc-amino acid chelates.',
    suggestionHint: 'Protein improves zinc bioavailability from this meal.' },
  { id: 'fat_vita_absorption', nutrientA: 'fat_g', nutrientB: 'vitamin_a_ug', direction: 'synergy', type: 'enhancement', severity: 'strong', mealRelevant: true, thresholdA: 5,
    mechanism: 'Fat triggers bile/enzyme secretion for micelle formation, required for fat-soluble vitamin absorption.',
    suggestionHint: 'Dietary fat dramatically improves absorption of fat-soluble vitamins.' },
  { id: 'fat_vitd_absorption', nutrientA: 'fat_g', nutrientB: 'vitamin_d_ug', direction: 'synergy', type: 'enhancement', severity: 'strong', mealRelevant: true, thresholdA: 5,
    mechanism: 'Vitamin D requires micelle formation from dietary fat for intestinal absorption.',
    suggestionHint: 'Dietary fat helps absorb vitamin D.' },
  { id: 'fat_vite_absorption', nutrientA: 'fat_g', nutrientB: 'vitamin_e_mg', direction: 'synergy', type: 'enhancement', severity: 'strong', mealRelevant: true, thresholdA: 5,
    mechanism: 'Vitamin E requires micelle formation from dietary fat for absorption.',
    suggestionHint: 'Dietary fat enables vitamin E absorption.' },
  { id: 'fat_vitk_absorption', nutrientA: 'fat_g', nutrientB: 'vitamin_k_ug', direction: 'synergy', type: 'enhancement', severity: 'strong', mealRelevant: true, thresholdA: 5,
    mechanism: 'Vitamin K requires micelle formation from dietary fat for absorption.',
    suggestionHint: 'Dietary fat enables vitamin K absorption.' },
  { id: 'potassium_calcium_retention', nutrientA: 'potassium_mg', nutrientB: 'calcium_mg', direction: 'synergy', type: 'enhancement', severity: 'moderate', mealRelevant: false,
    mechanism: 'Potassium reduces urinary calcium excretion by promoting natriuresis and alkalinizing urine.',
    suggestionHint: 'Potassium-rich foods help retain calcium in the body.' },
  // ── Metabolic Dependencies ──
  { id: 'magnesium_vitd_activation', nutrientA: 'magnesium_mg', nutrientB: 'vitamin_d_ug', direction: 'synergy', type: 'metabolic_dependency', severity: 'strong', mealRelevant: true,
    mechanism: 'Magnesium is essential cofactor for all vitamin D metabolism enzymes (CYP2R1, CYP27B1, CYP24A1). Without adequate Mg, vitamin D remains inactive.',
    suggestionHint: 'Magnesium is needed to activate vitamin D.' },
  { id: 'zinc_vita_transport', nutrientA: 'zinc_mg', nutrientB: 'vitamin_a_ug', direction: 'synergy', type: 'metabolic_dependency', severity: 'moderate', mealRelevant: true,
    mechanism: 'Zinc is required for retinol-binding protein synthesis and retinol dehydrogenase, essential for vitamin A transport.',
    suggestionHint: 'Zinc supports vitamin A utilization.' },
  { id: 'riboflavin_b6_activation', nutrientA: 'riboflavin_mg', nutrientB: 'vitamin_b6_mg', direction: 'synergy', type: 'metabolic_dependency', severity: 'strong', mealRelevant: true,
    mechanism: 'FMN (from riboflavin) is required by pyridoxine-5-phosphate oxidase to produce PLP, the active form of B6.',
    suggestionHint: 'Riboflavin activates vitamin B6.' },
  { id: 'riboflavin_folate_mthfr', nutrientA: 'riboflavin_mg', nutrientB: 'folate_ug', direction: 'synergy', type: 'metabolic_dependency', severity: 'strong', mealRelevant: true,
    mechanism: 'MTHFR requires FAD (from riboflavin) to convert folate to its active methylated form.',
    suggestionHint: 'Riboflavin is critical for proper folate metabolism.' },
  { id: 'riboflavin_iron_mobilization', nutrientA: 'riboflavin_mg', nutrientB: 'iron_mg', direction: 'synergy', type: 'metabolic_dependency', severity: 'moderate', mealRelevant: true,
    mechanism: 'FMN-dependent oxidoreductase releases iron from ferritin stores.',
    suggestionHint: 'Riboflavin helps mobilize stored iron.' },
  { id: 'b12_folate_methyl_trap', nutrientA: 'vitamin_b12_ug', nutrientB: 'folate_ug', direction: 'bidirectional', type: 'metabolic_dependency', severity: 'strong', mealRelevant: false,
    mechanism: 'B12 is needed to recycle 5-methylTHF back to THF. Without B12, folate is trapped. High folate can mask B12 deficiency.',
    suggestionHint: 'B12 and folate are interdependent — ensure adequate intake of both.' },
  { id: 'copper_iron_metabolism', nutrientA: 'copper_mg', nutrientB: 'iron_mg', direction: 'synergy', type: 'metabolic_dependency', severity: 'strong', mealRelevant: true,
    mechanism: 'Copper-dependent hephaestin and ceruloplasmin are ferroxidases essential for iron export and transport.',
    suggestionHint: 'Copper supports iron utilization.' },
  { id: 'magnesium_thiamin_activation', nutrientA: 'magnesium_mg', nutrientB: 'thiamin_mg', direction: 'synergy', type: 'metabolic_dependency', severity: 'moderate', mealRelevant: true,
    mechanism: 'Magnesium is required for converting thiamin to its active TPP form.',
    suggestionHint: 'Magnesium helps activate thiamin.' },
  { id: 'b6_magnesium_synergy', nutrientA: 'vitamin_b6_mg', nutrientB: 'magnesium_mg', direction: 'synergy', type: 'metabolic_dependency', severity: 'moderate', mealRelevant: true,
    mechanism: 'B6 (PLP) facilitates magnesium cellular transport via TRPM6/7 channels.',
    suggestionHint: 'B6 and magnesium enhance each other.' },
  { id: 'riboflavin_niacin_synthesis', nutrientA: 'riboflavin_mg', nutrientB: 'niacin_mg', direction: 'synergy', type: 'metabolic_dependency', severity: 'moderate', mealRelevant: true,
    mechanism: 'FAD-dependent kynurenine 3-monooxygenase in the tryptophan-to-NAD pathway requires riboflavin.',
    suggestionHint: 'Riboflavin supports niacin synthesis from tryptophan.' },
  { id: 'riboflavin_b12_regeneration', nutrientA: 'riboflavin_mg', nutrientB: 'vitamin_b12_ug', direction: 'synergy', type: 'metabolic_dependency', severity: 'moderate', mealRelevant: true,
    mechanism: 'Methionine synthase reductase requires both FMN and FAD for methylcobalamin regeneration.',
    suggestionHint: 'Riboflavin helps regenerate active B12.' },
  { id: 'b6_niacin_synthesis', nutrientA: 'vitamin_b6_mg', nutrientB: 'niacin_mg', direction: 'synergy', type: 'metabolic_dependency', severity: 'moderate', mealRelevant: true,
    mechanism: 'PLP-dependent kynureninase in the tryptophan-to-NAD pathway.',
    suggestionHint: 'B6 supports niacin production from tryptophan.' },
  { id: 'vitk_calcium_direction', nutrientA: 'vitamin_k_ug', nutrientB: 'calcium_mg', direction: 'synergy', type: 'metabolic_dependency', severity: 'strong', mealRelevant: true,
    mechanism: 'Vitamin K activates osteocalcin (directs calcium to bones) and matrix Gla protein (prevents vascular calcification).',
    suggestionHint: 'Vitamin K ensures calcium is directed to bones rather than arteries.' },
  // ── Depletion / Enhanced Excretion ──
  { id: 'sodium_calcium_excretion', nutrientA: 'sodium_mg', nutrientB: 'calcium_mg', direction: 'depletion', type: 'depletion', severity: 'strong', mealRelevant: true, thresholdA: 1500,
    mechanism: 'Sodium and calcium share renal reabsorption pathways. ~40 mg calcium lost per 2300 mg sodium.',
    suggestionHint: 'High sodium increases calcium loss through urine. Consider reducing salt.' },
  { id: 'phosphorus_calcium_pth', nutrientA: 'phosphorus_mg', nutrientB: 'calcium_mg', direction: 'depletion', type: 'depletion', severity: 'strong', mealRelevant: true, ratioTrigger: 'a:b > 2',
    mechanism: 'High phosphorus lowers ionized calcium, triggering PTH release and bone resorption. Optimal Ca:P ratio is 1:1 to 2:1.',
    suggestionHint: 'This meal is high in phosphorus relative to calcium. Add calcium-rich foods to balance.' },
  { id: 'sugar_magnesium_excretion', nutrientA: 'sugar_g', nutrientB: 'magnesium_mg', direction: 'depletion', type: 'depletion', severity: 'moderate', mealRelevant: true, thresholdA: 30,
    mechanism: 'Elevated insulin and blood glucose inhibit tubular magnesium reabsorption.',
    suggestionHint: 'High sugar intake may deplete magnesium. Consider reducing added sugars.' },
  { id: 'sugar_calcium_excretion', nutrientA: 'sugar_g', nutrientB: 'calcium_mg', direction: 'depletion', type: 'depletion', severity: 'moderate', mealRelevant: true, thresholdA: 40,
    mechanism: 'High sugar intake increases urinary calcium excretion via insulin-mediated renal calcium handling.',
    suggestionHint: 'Reducing sugar helps retain calcium.' },
  { id: 'carbs_thiamin_requirement', nutrientA: 'calories_kcal', nutrientB: 'thiamin_mg', direction: 'depletion', type: 'depletion', severity: 'strong', mealRelevant: true, thresholdA: 600,
    mechanism: 'Thiamin requirement is 0.5 mg per 1000 kcal. High-calorie meals increase thiamin demand.',
    suggestionHint: 'High-calorie meal — ensure adequate B1 from whole grains or legumes.' },
  { id: 'protein_b6_requirement', nutrientA: 'protein_g', nutrientB: 'vitamin_b6_mg', direction: 'depletion', type: 'depletion', severity: 'moderate', mealRelevant: true, thresholdA: 40,
    mechanism: 'B6 is essential for amino acid metabolism. Requirement scales at ~0.016 mg B6 per gram of protein.',
    suggestionHint: 'High-protein meals increase B6 needs. Include poultry, fish, potatoes, or bananas.' },
  // ── Vitamin Antagonisms ──
  { id: 'vite_vitk_antagonism', nutrientA: 'vitamin_e_mg', nutrientB: 'vitamin_k_ug', direction: 'a_inhibits_b', type: 'absorption_inhibition', severity: 'moderate', mealRelevant: false, thresholdA: 268,
    mechanism: 'Oxidized vitamin E metabolite inhibits vitamin K-dependent γ-glutamyl carboxylase. Significant at ≥1000 IU/day.',
    suggestionHint: 'Very high vitamin E can impair vitamin K function. Only relevant at supplement doses.' },
  { id: 'glucose_vitc_competition', nutrientA: 'sugar_g', nutrientB: 'vitamin_c_mg', direction: 'a_inhibits_b', type: 'competition', severity: 'moderate', mealRelevant: true, thresholdA: 40,
    mechanism: 'Dehydroascorbic acid and glucose share GLUT transporters. High blood glucose reduces cellular vitamin C uptake by >50%.',
    suggestionHint: 'High sugar may reduce vitamin C cellular uptake.' },
  // ── Low-Fat Warning ──
  { id: 'low_fat_fatsol_warning', nutrientA: 'fat_g', nutrientB: 'vitamin_a_ug', direction: 'a_inhibits_b', type: 'absorption_inhibition', severity: 'strong', mealRelevant: true,
    mechanism: 'Fat-soluble vitamins (A, D, E, K) need dietary fat for micelle formation. Severely impaired at ≤5 g fat per meal.',
    suggestionHint: 'This meal has fat-soluble vitamins but very little fat. Add olive oil, nuts, or avocado.' },
  // ── Misc synergies ──
  { id: 'selenium_zinc_synergy', nutrientA: 'selenium_ug', nutrientB: 'zinc_mg', direction: 'synergy', type: 'enhancement', severity: 'moderate', mealRelevant: true,
    mechanism: 'Both serve as cofactors in complementary antioxidant enzyme systems (GPx and SOD).',
    suggestionHint: 'Selenium and zinc together support antioxidant defense.' },
  { id: 'vitc_vita_protection', nutrientA: 'vitamin_c_mg', nutrientB: 'vitamin_a_ug', direction: 'synergy', type: 'enhancement', severity: 'mild', mealRelevant: true,
    mechanism: 'Vitamin C scavenges reactive oxygen species that would otherwise oxidize retinol and carotenoids.',
    suggestionHint: 'Vitamin C protects vitamin A from oxidative degradation.' },
  { id: 'choline_folate_methyl', nutrientA: 'choline_mg', nutrientB: 'folate_ug', direction: 'synergy', type: 'metabolic_dependency', severity: 'moderate', mealRelevant: false,
    mechanism: 'Betaine (from choline) provides a parallel homocysteine remethylation pathway independent of folate/B12.',
    suggestionHint: 'Choline and folate support each other in methyl group metabolism.' },
  { id: 'iron_copper_bidirectional', nutrientA: 'iron_mg', nutrientB: 'copper_mg', direction: 'bidirectional', type: 'competition', severity: 'moderate', mealRelevant: true,
    mechanism: 'Copper is essential for iron export (hephaestin/ceruloplasmin), but excess iron suppresses copper absorption.',
    suggestionHint: 'Both iron and copper are present — they support each other at normal dietary levels.' },
  { id: 'magnesium_phosphorus_complex', nutrientA: 'magnesium_mg', nutrientB: 'phosphorus_mg', direction: 'bidirectional', type: 'absorption_inhibition', severity: 'mild', mealRelevant: true,
    mechanism: 'High phosphorus can bind magnesium in the gut to form insoluble magnesium phosphate.',
    suggestionHint: 'Very high phosphorus and magnesium together may slightly reduce absorption of both.' },
];

export const MEAL_RELEVANT_RULES = RULES.filter((r) => r.mealRelevant);
