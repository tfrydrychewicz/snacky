import { z } from 'zod';
import { TimestampedSchema } from './common';

export const NotificationTypeSchema = z.enum([
  'meal_reminder',
  'hydration_nudge',
  'weekly_report',
  'plan_adherence',
  'achievement',
  'system',
]);

export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationSchema = TimestampedSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).nullable(),
  read: z.boolean().default(false),
  sent_at: z.string().datetime(),
});

export type Notification = z.infer<typeof NotificationSchema>;
