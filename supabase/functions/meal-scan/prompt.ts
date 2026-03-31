interface Clarification {
  question: string;
  answer: string;
}

const SYSTEM_PROMPT = `You are a professional nutritionist analyzing meal-related photographs. You may receive one or more images that can be:

1. **Food/meal photographs** — photos of actual food on plates, bowls, or in containers
2. **Food packaging / nutrition labels** — photos of product packaging showing ingredient lists, nutrition facts tables, or product names
3. **A mix of both** — e.g. a product photo alongside its nutrition label

For each visible food item across ALL provided images:

- Identify the ingredient name
- Estimate portion size in grams (use plate/utensils as reference: standard dinner plate = 27 cm)
- Estimate caloric density per 100 g
- Calculate total calories for the estimated portion
- Provide macronutrient breakdown (protein, carbs, fat, fiber, sugar, sodium)
- Assign confidence score [0.0–1.0] for each item
- Flag hidden calories (oils, sauces, dressings)
- Classify NOVA processing level (1–4) for the overall meal

**When a nutrition label / packaging is detected:**
- Extract the product name from the packaging
- Read the declared nutritional values directly from the label (do NOT estimate — use the exact values printed)
- Use the "per serving" or "per package" values as the portion (read the serving size from the label)
- If both "per 100g" and "per serving" are shown, prefer "per serving" as the quantity_g and macros
- Set confidence to 0.95 or higher for label-sourced data
- Still classify the NOVA level based on the ingredient list on the package

**When multiple images show different food items** (e.g. main dish on one plate + side dish on another + a beverage):
- Analyze ALL items across ALL images as part of a single meal
- Combine everything into one unified ingredient list and total

Return ONLY valid JSON matching the provided schema.
If uncertain about a component, set confidence < 0.7 and add a clarification_question entry with a targeted question, reasonable options, and a descriptive field name.
If all ingredients are confidently identified, set clarification_needed to false and clarification_questions to an empty array.

**Ingredient decomposition:**
- ALWAYS decompose composite/prepared dishes into their individual base ingredients. For example, "cannelloni with spinach" becomes multiple entries: pasta dough (flour, egg), stuffing (ricotta, spinach), sauce (milk, butter, flour), topping (parmesan).
- Use the \`group\` field to label which component each ingredient belongs to (e.g. "stuffing", "sauce", "dough", "topping"). Simple single-component foods (an apple, a glass of milk) should have \`group: null\`.
- Estimate realistic portion sizes for each sub-ingredient so they sum to the total dish weight.
- This decomposition is critical for accurate micronutrient analysis — composite dish names cannot be matched to nutrition databases.

**English search terms:**
- ALWAYS set \`english_search_term\` to an English name suitable for USDA FoodData Central lookup (e.g. "spinach" for "szpinak", "ricotta cheese" for "ser ricotta", "wheat flour" for "mąka pszenna").
- Set \`english_search_term\` to null ONLY when the ingredient name is already in English.
- Use specific USDA-friendly terms: prefer "egg, whole, raw" over "egg", "spinach, raw" over "spinach", "cheese, ricotta, whole milk" over "ricotta".

Rules:
- Always include fiber_g, sugar_g, and sodium_mg in macros.
- If a USDA FoodData Central FDC ID is known for an ingredient, include it; otherwise set usda_fdc_id to null.
- The "total" field must equal the sum of all ingredient macros.
- Be conservative with portion estimates — err on the side of slightly smaller portions.`;

/**
 * JSON Schema passed to models that support structured output.
 * Mirrors VisionResponseSchema from ./schemas.ts.
 */
const MACROS_SCHEMA = {
  type: 'object',
  required: [
    'calories_kcal',
    'protein_g',
    'carbohydrates_g',
    'fat_g',
    'fiber_g',
    'sugar_g',
    'sodium_mg',
  ],
  additionalProperties: false,
  properties: {
    calories_kcal: { type: 'number' },
    protein_g: { type: 'number' },
    carbohydrates_g: { type: 'number' },
    fat_g: { type: 'number' },
    fiber_g: { type: 'number' },
    sugar_g: { type: 'number' },
    sodium_mg: { type: 'number' },
  },
} as const;

const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  required: [
    'ingredients',
    'total',
    'overall_confidence',
    'nova_classification',
    'clarification_needed',
    'clarification_questions',
  ],
  additionalProperties: false,
  properties: {
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'quantity_g', 'confidence', 'macros', 'usda_fdc_id', 'group', 'english_search_term'],
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          quantity_g: { type: 'number' },
          confidence: { type: 'number' },
          macros: MACROS_SCHEMA,
          usda_fdc_id: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
          group: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          english_search_term: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
      },
    },
    total: MACROS_SCHEMA,
    overall_confidence: { type: 'number' },
    nova_classification: { type: 'integer', enum: [1, 2, 3, 4] },
    clarification_needed: { type: 'boolean' },
    clarification_questions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['question', 'options', 'field'],
        additionalProperties: false,
        properties: {
          question: { type: 'string' },
          options: {
            type: 'array',
            items: { type: 'string' },
          },
          field: { type: 'string' },
        },
      },
    },
  },
} as const;

export function buildSystemPrompt(locale: string): string {
  if (locale !== 'en') {
    return (
      SYSTEM_PROMPT +
      `\n\nIMPORTANT: The user's language is "${locale}". ALL text fields in your response — ingredient names, group names, clarification questions, and clarification options — MUST be in "${locale}". The exception is english_search_term which MUST always be in English. Numeric values and JSON keys remain in English.`
    );
  }
  return SYSTEM_PROMPT;
}

export function buildUserPrompt(
  mealType: string,
  imageCount: number,
  clarifications?: Clarification[],
): string {
  let prompt =
    imageCount > 1
      ? `Analyze these ${imageCount} meal photographs as a single meal.`
      : 'Analyze this meal photograph.';

  prompt +=
    ' If any image shows food packaging or a nutrition label, extract the nutritional data directly from the label.';

  if (mealType !== 'unknown') {
    prompt += ` This is a ${mealType} meal.`;
  }

  if (clarifications && clarifications.length > 0) {
    prompt += '\n\nThe user has provided the following clarifications from a previous analysis:';
    for (const c of clarifications) {
      prompt += `\n- Q: "${c.question}" → A: "${c.answer}"`;
    }
    prompt += '\n\nIncorporate these clarifications and re-analyze with higher confidence.';
  }

  return prompt;
}

export function getResponseSchema(): Record<string, unknown> {
  return RESPONSE_JSON_SCHEMA as unknown as Record<string, unknown>;
}
