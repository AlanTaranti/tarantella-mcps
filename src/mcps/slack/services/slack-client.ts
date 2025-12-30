import { WebClient } from '@slack/web-api';
import type { SlackMessage, SlackSearchParams, SlackSearchResult } from '../../../shared/types.js';

export class SlackClient {
  private readonly client: WebClient;

  constructor(token: string) {
    if (!token) {
      throw new Error('Slack bot token is required');
    }
    this.client = new WebClient(token);
  }

  async searchMessages(params: SlackSearchParams): Promise<SlackSearchResult> {
    const query = this.buildSearchQuery(params);
    const DEFAULT_LIMIT = 20;

    const response = await this.client.search.messages({
      query,
      count: params.limit ?? DEFAULT_LIMIT,
      ...(params.cursor && { cursor: params.cursor }),
    });

    if (!(response.ok && response.messages)) {
      return { results: [] };
    }

    const matches = response.messages.matches ?? [];
    const results: SlackMessage[] = matches.map((match) => ({
      text: match.text ?? '',
      author: match.user ?? '',
      channel: typeof match.channel === 'object' ? (match.channel.id ?? '') : '',
      timestamp: match.ts ?? '',
    }));

    const nextCursor = response.response_metadata?.next_cursor;

    return nextCursor ? { results, nextCursor } : { results };
  }

  private buildSearchQuery(params: SlackSearchParams): string {
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

    return query;
  }
}
