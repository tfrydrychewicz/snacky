import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('image-generator');

const IMAGE_MODEL = 'gpt-image-1.5';
const IMAGE_SIZE = '1024x1024';
const IMAGE_QUALITY = 'low';
const IMAGE_FORMAT = 'webp';
const TIMEOUT_MS = 60_000;

interface MealImageInput {
  mealId: string;
  recipeName: string;
  ingredients: string[];
  instructions: string;
  mealSlot: string;
}

/**
 * Generate a realistic food photo via OpenAI Image API,
 * upload it to Supabase Storage, and return the storage path.
 */
export async function generateAndUploadMealImage(
  input: MealImageInput,
  userId: string,
  apiKey: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    const imageBytes = await callImageModel(input, apiKey);
    if (!imageBytes) return null;

    const storagePath = `${userId}/plan/${input.mealId}.webp`;

    const { error: uploadError } = await supabase.storage
      .from('meal-photos')
      .upload(storagePath, imageBytes, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      log.warn('Storage upload failed', { mealId: input.mealId, error: uploadError.message });
      return null;
    }

    log.info('Meal image uploaded', { mealId: input.mealId, path: storagePath });
    return storagePath;
  } catch (err) {
    log.warn('Image generation failed (non-fatal)', {
      mealId: input.mealId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function callImageModel(
  input: MealImageInput,
  apiKey: string,
): Promise<Uint8Array | null> {
  const ingredientList = input.ingredients.slice(0, 8).join(', ');

  const prompt = [
    `Professional food photography of "${input.recipeName}".`,
    `A single beautifully plated ${input.mealSlot} dish, shot from a 45-degree overhead angle.`,
    `The dish is made with: ${ingredientList}.`,
    'Warm natural lighting, shallow depth of field, clean modern plate on a simple wooden or marble surface.',
    'No text, no watermarks, no hands, no utensils in use. Photorealistic.',
  ].join(' ');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        size: IMAGE_SIZE,
        quality: IMAGE_QUALITY,
        output_format: IMAGE_FORMAT,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => `HTTP ${resp.status}`);
    log.warn('Image API error', { status: resp.status, error: errText });
    return null;
  }

  const json = await resp.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    log.warn('Image API returned empty data');
    return null;
  }

  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}
