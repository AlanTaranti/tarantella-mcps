import { z } from 'zod';

const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

export const searchMessagesSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  limit: z.number().min(MIN_LIMIT).max(MAX_LIMIT).optional(),
  cursor: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  user_id: z.string().optional(),
  has_reactions: z.boolean().optional(),
  has_threads: z.boolean().optional(),
});

export type SearchMessagesInput = z.infer<typeof searchMessagesSchema>;
