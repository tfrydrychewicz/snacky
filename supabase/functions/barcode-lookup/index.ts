import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('barcode-lookup');

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v2';
const OFF_TIMEOUT_MS = 8_000;

interface OFFNutriments {
  'energy-kcal_100g'?: number;
  energy_100g?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  sodium_100g?: number;
  'saturated-fat_100g'?: number;
}

interface OFFProduct {
  product_name?: string;
  brands?: string;
  quantity?: string;
  serving_size?: string;
  serving_quantity?: number;
  image_front_url?: string;
  image_front_small_url?: string;
  nutriments?: OFFNutriments;
  nova_group?: number;
  nutriscore_grade?: string;
  categories_tags?: string[];
}

interface BarcodeResult {
  found: boolean;
  barcode: string;
  product?: {
    name: string;
    brand: string | null;
    quantity: string | null;
    serving_size: string | null;
    serving_g: number | null;
    image_url: string | null;
    nova_group: 1 | 2 | 3 | 4 | null;
    nutriscore: string | null;
    per_100g: {
      calories_kcal: number;
      protein_g: number;
      carbohydrates_g: number;
      fat_g: number;
      fiber_g: number | null;
      sugar_g: number | null;
      sodium_mg: number | null;
      saturated_fat_g: number | null;
    };
  };
}

function parseNutriments(n: OFFNutriments): BarcodeResult['product'] extends undefined ? never : NonNullable<BarcodeResult['product']>['per_100g'] {
  const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : 0);
  return {
    calories_kcal: Math.round(kcal * 10) / 10,
    protein_g: Math.round((n.proteins_100g ?? 0) * 10) / 10,
    carbohydrates_g: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
    fat_g: Math.round((n.fat_100g ?? 0) * 10) / 10,
    fiber_g: n.fiber_100g != null ? Math.round(n.fiber_100g * 10) / 10 : null,
    sugar_g: n.sugars_100g != null ? Math.round(n.sugars_100g * 10) / 10 : null,
    sodium_mg: n.sodium_100g != null ? Math.round(n.sodium_100g * 1000) : null,
    saturated_fat_g: n['saturated-fat_100g'] != null ? Math.round(n['saturated-fat_100g'] * 10) / 10 : null,
  };
}

function parseServingSize(product: OFFProduct): number | null {
  if (product.serving_quantity && product.serving_quantity > 0) {
    return product.serving_quantity;
  }
  if (product.serving_size) {
    const match = product.serving_size.match(/(\d+(?:\.\d+)?)\s*g/i);
    if (match?.[1]) return parseFloat(match[1]);
  }
  return null;
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { barcode } = await req.json() as { barcode: string };

    if (!barcode || !/^\d{8,14}$/.test(barcode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid barcode format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    log.info('Looking up barcode', { barcode });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);

    let offResp: Response;
    try {
      offResp = await fetch(
        `${OFF_API_BASE}/product/${barcode}?fields=product_name,brands,quantity,serving_size,serving_quantity,image_front_url,image_front_small_url,nutriments,nova_group,nutriscore_grade,categories_tags`,
        { signal: controller.signal, headers: { 'User-Agent': 'Snacky/1.0 (nutrition-app)' } },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!offResp.ok) {
      log.warn('OFF API error', { status: offResp.status, barcode });
      const result: BarcodeResult = { found: false, barcode };
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await offResp.json();

    if (json.status !== 1 || !json.product) {
      log.info('Product not found', { barcode });
      const result: BarcodeResult = { found: false, barcode };
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const p: OFFProduct = json.product;
    const nutriments = p.nutriments ?? {} as OFFNutriments;

    const result: BarcodeResult = {
      found: true,
      barcode,
      product: {
        name: p.product_name || `Product ${barcode}`,
        brand: p.brands || null,
        quantity: p.quantity || null,
        serving_size: p.serving_size || null,
        serving_g: parseServingSize(p),
        image_url: p.image_front_url || p.image_front_small_url || null,
        nova_group: ([1, 2, 3, 4] as const).includes(p.nova_group as 1 | 2 | 3 | 4)
          ? (p.nova_group as 1 | 2 | 3 | 4)
          : null,
        nutriscore: p.nutriscore_grade || null,
        per_100g: parseNutriments(nutriments),
      },
    };

    log.info('Product found', { barcode, name: result.product?.name });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('Barcode lookup failed', { error: msg });
    return new Response(
      JSON.stringify({ error: 'Barcode lookup failed', detail: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
