import { z } from 'zod';
import type { SlackChannelSearchParams } from '../../../shared/types.js';
import type { SlackClient } from '../services/slack-client.js';

const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

export const searchInChannelSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  channel_id: z.string().min(1, 'Channel ID is required'),
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

export type SearchInChannelInput = z.infer<typeof searchInChannelSchema>;

export const createSearchInChannelHandler = (client: SlackClient) => {
  return async (input: SearchInChannelInput) => {
    const params: SlackChannelSearchParams = {
      query: input.query,
      channelId: input.channel_id,
      ...(input.limit !== undefined && { limit: input.limit }),
      ...(input.cursor !== undefined && { cursor: input.cursor }),
      ...(input.from_date !== undefined && { fromDate: input.from_date }),
      ...(input.to_date !== undefined && { toDate: input.to_date }),
      ...(input.user_id !== undefined && { userId: input.user_id }),
      ...(input.has_reactions !== undefined && { hasReactions: input.has_reactions }),
      ...(input.has_threads !== undefined && { hasThreads: input.has_threads }),
    };

    const results = await client.searchInChannel(params);

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
