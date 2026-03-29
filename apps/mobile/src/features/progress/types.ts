export type { Measurement, MeasurementType } from '@snacky/shared-types';

export interface MeasurementRow {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  hips_cm: number | null;
  body_fat_pct: number | null;
  source: 'manual' | 'healthkit' | 'health_connect';
  created_at: string;
}

export interface MeasurementInput {
  weight_kg?: number;
  waist_cm?: number;
  chest_cm?: number;
  hips_cm?: number;
  body_fat_pct?: number;
  source?: 'manual' | 'healthkit' | 'health_connect';
  measured_at?: string;
}
