import { z } from 'zod';

export const PaginationParamsSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export const TimestampedSchema = z.object({
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Timestamped = z.infer<typeof TimestampedSchema>;

export const ApiErrorSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
