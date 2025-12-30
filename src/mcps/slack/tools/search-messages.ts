import { z } from 'zod';
import type { SlackSearchParams } from '../../../shared/types.js';
import type { SlackClient } from '../services/slack-client.js';

const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

export const searchMessagesSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(MIN_LIMIT, `Limit must be at least ${MIN_LIMIT}`)
    .max(MAX_LIMIT, `Limit cannot exceed ${MAX_LIMIT}`)
    .optional(),
  cursor: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  user_id: z.string().optional(),
  has_reactions: z.boolean().optional(),
  has_threads: z.boolean().optional(),
});

export type SearchMessagesInput = z.infer<typeof searchMessagesSchema>;

export const createSearchMessagesHandler = (client: SlackClient) => {
  return async (input: SearchMessagesInput) => {
    // Transform snake_case MCP input to camelCase internal API params
    const params: SlackSearchParams = {
      query: input.query,
      ...(input.limit !== undefined && { limit: input.limit }),
      ...(input.cursor !== undefined && { cursor: input.cursor }),
      ...(input.from_date !== undefined && { fromDate: input.from_date }),
      ...(input.to_date !== undefined && { toDate: input.to_date }),
      ...(input.user_id !== undefined && { userId: input.user_id }),
      ...(input.has_reactions !== undefined && { hasReactions: input.has_reactions }),
      ...(input.has_threads !== undefined && { hasThreads: input.has_threads }),
    };

    const results = await client.searchMessages(params);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  };
};
