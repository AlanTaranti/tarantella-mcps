import { WebClient } from '@slack/web-api';
import type {
  SlackChannelSearchParams,
  SlackMessage,
  SlackSearchParams,
  SlackSearchResult,
} from '../../../shared/types.js';

export class SlackClient {
  private static readonly DEFAULT_LIMIT = 20;
  private readonly client: WebClient;

  constructor(token: string) {
    if (!token) {
      throw new Error('Slack bot token is required');
    }
    this.client = new WebClient(token);
  }

  async searchMessages(params: SlackSearchParams): Promise<SlackSearchResult> {
    const query = this.buildSearchQuery(params);
    return this.executeSearch(query, params.limit, params.cursor);
  }

  async searchInChannel(params: SlackChannelSearchParams): Promise<SlackSearchResult> {
    const query = this.buildSearchQuery(params, params.channelId);
    return this.executeSearch(query, params.limit, params.cursor);
  }

  private async executeSearch(
    query: string,
    limit?: number,
    cursor?: string
  ): Promise<SlackSearchResult> {
    const response = await this.client.search.messages({
      query,
      count: limit ?? SlackClient.DEFAULT_LIMIT,
      ...(cursor && { cursor }),
    });

    if (!(response.ok && response.messages)) {
      return { results: [] };
    }

    const matches = response.messages.matches ?? [];
    const results: SlackMessage[] = matches.map((match) => ({
      text: match.text ?? '',
      author: match.user ?? '',
      channel:
        typeof match.channel === 'object' && match.channel !== null ? (match.channel.id ?? '') : '',
      timestamp: match.ts ?? '',
    }));

    const nextCursor = response.response_metadata?.next_cursor;

    return nextCursor ? { results, nextCursor } : { results };
  }

  private buildSearchQuery(params: SlackSearchParams, channelId?: string): string {
    let query = params.query;

    if (params.fromDate) {
      query += ` after:${params.fromDate}`;
    }
    if (params.toDate) {
      query += ` before:${params.toDate}`;
    }
    if (params.userId) {
      query += ` from:${params.userId}`;
    }
    if (params.hasReactions) {
      query += ' has:reaction';
    }
    if (params.hasThreads) {
      query += ' has:thread';
    }
    if (channelId) {
      query += ` in:${channelId}`;
    }

    return query;
  }
}
