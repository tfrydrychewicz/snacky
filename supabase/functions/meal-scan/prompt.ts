interface Clarification {
  question: string;
  answer: string;
}

const SYSTEM_PROMPT = `You are a professional nutritionist analyzing a meal photograph. For each visible food item:

- Identify the ingredient name
- Estimate portion size in grams (use plate/utensils as reference: standard dinner plate = 27 cm)
- Estimate caloric density per 100 g
- Calculate total calories for the estimated portion
- Provide macronutrient breakdown (protein, carbs, fat, fiber, sugar, sodium)
- Assign confidence score [0.0–1.0] for each item
- Flag hidden calories (oils, sauces, dressings)
- Classify NOVA processing level (1–4) for the overall meal

Return ONLY valid JSON matching the provided schema.
If uncertain about a component, set confidence < 0.7 and add a clarification_question entry with a targeted question, reasonable options, and a descriptive field name.
If all ingredients are confidently identified, set clarification_needed to false and clarification_questions to an empty array.

Rules:
- Always include fiber_g, sugar_g, and sodium_mg in macros.
- If a USDA FoodData Central FDC ID is known for an ingredient, include it; otherwise set usda_fdc_id to null.
- The "total" field must equal the sum of all ingredient macros.
- Be conservative with portion estimates — err on the side of slightly smaller portions.`;

/**
 * JSON Schema passed to models that support structured output.
 * Mirrors VisionResponseSchema from ./schemas.ts.
 */
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
  properties: {
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'quantity_g', 'confidence', 'macros', 'usda_fdc_id'],
        properties: {
          name: { type: 'string' },
          quantity_g: { type: 'number', minimum: 0 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          macros: {
            type: 'object',
            required: ['calories_kcal', 'protein_g', 'carbohydrates_g', 'fat_g'],
            properties: {
              calories_kcal: { type: 'number', minimum: 0 },
              protein_g: { type: 'number', minimum: 0 },
              carbohydrates_g: { type: 'number', minimum: 0 },
              fat_g: { type: 'number', minimum: 0 },
              fiber_g: { type: 'number', minimum: 0 },
              sugar_g: { type: 'number', minimum: 0 },
              sodium_mg: { type: 'number', minimum: 0 },
            },
          },
          usda_fdc_id: { type: ['integer', 'null'] },
        },
      },
    },
    total: {
      type: 'object',
      required: ['calories_kcal', 'protein_g', 'carbohydrates_g', 'fat_g'],
      properties: {
        calories_kcal: { type: 'number', minimum: 0 },
        protein_g: { type: 'number', minimum: 0 },
        carbohydrates_g: { type: 'number', minimum: 0 },
        fat_g: { type: 'number', minimum: 0 },
        fiber_g: { type: 'number', minimum: 0 },
        sugar_g: { type: 'number', minimum: 0 },
        sodium_mg: { type: 'number', minimum: 0 },
      },
    },
    overall_confidence: { type: 'number', minimum: 0, maximum: 1 },
    nova_classification: { type: 'integer', enum: [1, 2, 3, 4] },
    clarification_needed: { type: 'boolean' },
    clarification_questions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['question', 'options', 'field'],
        properties: {
          question: { type: 'string' },
          options: {
            type: 'array',
            items: { type: 'string' },
            minItems: 2,
          },
          field: { type: 'string' },
        },
      },
    },
  },
} as const;

export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildUserPrompt(mealType: string, clarifications?: Clarification[]): string {
  let prompt = 'Analyze this meal photograph.';

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
