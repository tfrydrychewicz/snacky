import { z } from 'zod';

export const NotificationTypeSchema = z.enum([
  'meal_reminder',
  'meal_reminder_check',
  'streak_check',
  'budget_alert',
  'weekly_report',
  'system',
]);

export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationPrefsSchema = z.object({
  enabled: z.boolean().default(true),
  meal_reminders: z.boolean().default(true),
  nudges: z.boolean().default(true),
  weekly_report: z.boolean().default(true),
  streak_alerts: z.boolean().default(true),
  budget_alerts: z.boolean().default(true),
  quiet_hours_start: z.string().nullable().default(null),
  quiet_hours_end: z.string().nullable().default(null),
});

export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;

export const NotificationLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).nullable(),
  sent_at: z.string().datetime(),
  delivered_at: z.string().datetime().nullable(),
  opened_at: z.string().datetime().nullable(),
});

export type NotificationLog = z.infer<typeof NotificationLogSchema>;

export const UserDeviceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  fcm_token: z.string(),
  platform: z.enum(['ios', 'android']),
  device_name: z.string().nullable(),
  last_active_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type UserDevice = z.infer<typeof UserDeviceSchema>;
