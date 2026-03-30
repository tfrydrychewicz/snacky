import { useState, useCallback } from 'react';
import { getSupabase } from '~/shared/api/client';
import type { BarcodeProduct } from '~/app/navigation/types';

interface BarcodeResponse {
  found: boolean;
  barcode: string;
  product?: BarcodeProduct;
}

export const useBarcodeLookup = () => {
  const [isLooking, setIsLooking] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);

  const lookup = useCallback(async (barcode: string) => {
    if (isLooking || barcode === lastBarcode) return;
    setIsLooking(true);
    setProduct(null);
    setNotFound(false);
    setError(null);
    setLastBarcode(barcode);

    try {
      const supabase = getSupabase();
      const { data, error: fnError } = await supabase.functions.invoke<BarcodeResponse>(
        'barcode-lookup',
        { body: { barcode } },
      );

      if (fnError) throw new Error(fnError.message);
      if (!data) throw new Error('Empty response');

      if (data.found && data.product) {
        setProduct(data.product);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLooking(false);
    }
  }, [isLooking, lastBarcode]);

  const reset = useCallback(() => {
    setProduct(null);
    setNotFound(false);
    setError(null);
    setLastBarcode(null);
  }, []);

  return { lookup, product, notFound, isLooking, error, lastBarcode, reset };
};
