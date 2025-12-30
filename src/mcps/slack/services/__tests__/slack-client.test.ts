import type { WebClient } from '@slack/web-api';
import { describe, expect, it, vi } from 'vitest';
import type { SlackSearchParams } from '../../../../shared/types.js';
import { SlackClient } from '../slack-client.js';

vi.mock('@slack/web-api', () => ({
  WebClient: class {
    search = {
      messages: vi.fn(),
    };
  },
}));

describe('SlackClient', () => {
  const MOCK_TOKEN = 'xoxb-test-token';

  function getMockSearch(client: SlackClient) {
    // Access private field for testing purposes
    const webClient = (client as unknown as { client: WebClient }).client;
    return vi.mocked(webClient.search.messages);
  }

  describe('constructor', () => {
    it('should create instance with valid token', () => {
      const client = new SlackClient(MOCK_TOKEN);
      expect(client).toBeInstanceOf(SlackClient);
    });

    it('should throw error with empty token', () => {
      expect(() => new SlackClient('')).toThrow('Slack bot token is required');
    });
  });

  describe('searchMessages', () => {
    it('should search messages and transform response', async () => {
      const client = new SlackClient(MOCK_TOKEN);
      const mockSearch = getMockSearch(client);

      mockSearch.mockResolvedValueOnce({
        ok: true,
        messages: {
          matches: [
            {
              text: 'Hello world',
              username: 'testuser',
              user: 'U123456',
              channel: { id: 'C789012' },
              ts: '1234567890.123456',
            },
          ],
        },
        response_metadata: {
          next_cursor: 'next_page_cursor',
        },
      });

      const params: SlackSearchParams = {
        query: 'test query',
        limit: 10,
      };

      const result = await client.searchMessages(params);

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        text: 'Hello world',
        author: 'U123456',
        channel: 'C789012',
        timestamp: '1234567890.123456',
      });
      expect(result.nextCursor).toBe('next_page_cursor');
    });

    it('should build query with all parameters', async () => {
      const client = new SlackClient(MOCK_TOKEN);
      const mockSearch = getMockSearch(client);

      mockSearch.mockResolvedValueOnce({
        ok: true,
        messages: { matches: [] },
      });

      const params: SlackSearchParams = {
        query: 'test',
        limit: 5,
        cursor: 'page2',
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
        userId: 'U123',
        hasReactions: true,
        hasThreads: true,
      };

      await client.searchMessages(params);

      expect(mockSearch).toHaveBeenCalledWith({
        query: 'test after:2024-01-01 before:2024-12-31 from:U123 has:reaction has:thread',
        count: 5,
        cursor: 'page2',
      });
    });

    it('should handle search with no results', async () => {
      const client = new SlackClient(MOCK_TOKEN);
      const mockSearch = getMockSearch(client);

      mockSearch.mockResolvedValueOnce({
        ok: true,
        messages: { matches: [] },
      });

      const result = await client.searchMessages({ query: 'nonexistent' });

      expect(result.results).toHaveLength(0);
      expect(result.nextCursor).toBeUndefined();
    });
  });
});
