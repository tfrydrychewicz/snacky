import { z } from 'zod';
import { TimestampedSchema } from './common';

export const ChatRoleSchema = z.enum(['user', 'assistant']);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatMessageSchema = TimestampedSchema.extend({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  role: ChatRoleSchema,
  content: z.string(),
  metadata: z.record(z.unknown()).nullable(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatSessionSchema = TimestampedSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().nullable(),
  message_count: z.number().int().nonnegative(),
});

export type ChatSession = z.infer<typeof ChatSessionSchema>;
