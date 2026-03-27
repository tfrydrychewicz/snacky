import { z } from 'zod';
import { TimestampedSchema } from './common';

export const MeasurementTypeSchema = z.enum([
  'weight_kg',
  'body_fat_pct',
  'waist_cm',
  'hip_cm',
  'chest_cm',
  'arm_cm',
  'thigh_cm',
]);

export type MeasurementType = z.infer<typeof MeasurementTypeSchema>;

export const MeasurementSchema = TimestampedSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: MeasurementTypeSchema,
  value: z.number().positive(),
  measured_at: z.string().datetime(),
  notes: z.string().nullable(),
});

export type Measurement = z.infer<typeof MeasurementSchema>;
