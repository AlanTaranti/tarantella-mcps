import type { WebClient } from '@slack/web-api';
import { describe, expect, it, vi } from 'vitest';
import type { SlackChannelSearchParams, SlackSearchParams } from '../../../../shared/types.js';
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

    it('should handle API error when response.ok is false', async () => {
      const client = new SlackClient(MOCK_TOKEN);
      const mockSearch = getMockSearch(client);

      mockSearch.mockResolvedValueOnce({
        ok: false,
        error: 'invalid_auth',
      });

      const result = await client.searchMessages({ query: 'test' });

      expect(result.results).toHaveLength(0);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should handle missing messages in response', async () => {
      const client = new SlackClient(MOCK_TOKEN);
      const mockSearch = getMockSearch(client);

      mockSearch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await client.searchMessages({ query: 'test' });

      expect(result.results).toHaveLength(0);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should transform messages with missing or null fields', async () => {
      const client = new SlackClient(MOCK_TOKEN);
      const mockSearch = getMockSearch(client);

      const EDGE_CASE_MESSAGE_COUNT = 3;
      mockSearch.mockResolvedValueOnce({
        ok: true,
        messages: {
          // Using unknown type assertion to test edge cases with null/undefined values
          // that may occur in real API responses despite type definitions
          matches: [
            {
              text: null as unknown as string,
              user: null as unknown as string,
              channel: null as unknown as { id: string },
              ts: null as unknown as string,
            },
            {
              text: undefined as unknown as string,
              user: undefined as unknown as string,
              channel: { id: undefined as unknown as string },
              ts: undefined as unknown as string,
            },
            {
              // All fields completely missing
            },
          ] as unknown as Array<{
            text?: string;
            user?: string;
            channel?: { id?: string };
            ts?: string;
          }>,
        },
      });

      const result = await client.searchMessages({ query: 'test' });

      expect(result.results).toHaveLength(EDGE_CASE_MESSAGE_COUNT);
      expect(result.results[0]).toEqual({
        text: '',
        author: '',
        channel: '',
        timestamp: '',
      });
      expect(result.results[1]).toEqual({
        text: '',
        author: '',
        channel: '',
        timestamp: '',
      });
      expect(result.results[2]).toEqual({
        text: '',
        author: '',
        channel: '',
        timestamp: '',
      });
    });

    it('should use default limit of 20 when limit is not provided', async () => {
      const client = new SlackClient(MOCK_TOKEN);
      const mockSearch = getMockSearch(client);

      mockSearch.mockResolvedValueOnce({
        ok: true,
        messages: { matches: [] },
      });

      await client.searchMessages({ query: 'test' });

      expect(mockSearch).toHaveBeenCalledWith({
        query: 'test',
        count: 20,
      });
    });
  });

  describe('searchInChannel', () => {
    it('should search in specific channel', async () => {
      const client = new SlackClient(MOCK_TOKEN);
      const mockSearch = getMockSearch(client);

      mockSearch.mockResolvedValueOnce({
        ok: true,
        messages: {
          matches: [
            {
              text: 'Channel message',
              user: 'U999',
              channel: { id: 'C123' },
              ts: '9999.999',
            },
          ],
        },
      });

      const params: SlackChannelSearchParams = {
        query: 'test',
        channelId: 'C123',
      };

      const result = await client.searchInChannel(params);

      expect(mockSearch).toHaveBeenCalledWith({
        query: 'test in:C123',
        count: 20,
        cursor: undefined,
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.channel).toBe('C123');
    });

    it('should combine channel filter with other filters', async () => {
      const client = new SlackClient(MOCK_TOKEN);
      const mockSearch = getMockSearch(client);

      mockSearch.mockResolvedValueOnce({
        ok: true,
        messages: { matches: [] },
      });

      const params: SlackChannelSearchParams = {
        query: 'urgent',
        channelId: 'C456',
        userId: 'U789',
        hasReactions: true,
      };

      await client.searchInChannel(params);

      expect(mockSearch).toHaveBeenCalledWith({
        query: 'urgent from:U789 has:reaction in:C456',
        count: 20,
        cursor: undefined,
      });
    });

    it('should handle API errors in channel search', async () => {
      const client = new SlackClient(MOCK_TOKEN);
      const mockSearch = getMockSearch(client);

      mockSearch.mockResolvedValueOnce({
        ok: false,
        error: 'channel_not_found',
      });

      const result = await client.searchInChannel({
        query: 'test',
        channelId: 'C999',
      });

      expect(result.results).toHaveLength(0);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should handle empty results in channel search', async () => {
      const client = new SlackClient(MOCK_TOKEN);
      const mockSearch = getMockSearch(client);

      mockSearch.mockResolvedValueOnce({
        ok: true,
        messages: { matches: [] },
      });

      const result = await client.searchInChannel({
        query: 'nonexistent',
        channelId: 'C123',
      });

      expect(result.results).toHaveLength(0);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should use default limit when not provided', async () => {
      const client = new SlackClient(MOCK_TOKEN);
      const mockSearch = getMockSearch(client);

      mockSearch.mockResolvedValueOnce({
        ok: true,
        messages: { matches: [] },
      });

      await client.searchInChannel({
        query: 'test',
        channelId: 'C123',
      });

      expect(mockSearch).toHaveBeenCalledWith({
        query: 'test in:C123',
        count: 20,
        cursor: undefined,
      });
    });

    it('should handle pagination with nextCursor', async () => {
      const client = new SlackClient(MOCK_TOKEN);
      const mockSearch = getMockSearch(client);

      mockSearch.mockResolvedValueOnce({
        ok: true,
        messages: {
          matches: [
            {
              text: 'Message 1',
              user: 'U111',
              channel: { id: 'C123' },
              ts: '1111.111',
            },
          ],
        },
        response_metadata: {
          next_cursor: 'cursor_page_2',
        },
      });

      const result = await client.searchInChannel({
        query: 'test',
        channelId: 'C123',
        limit: 10,
        cursor: 'cursor_page_1',
      });

      expect(mockSearch).toHaveBeenCalledWith({
        query: 'test in:C123',
        count: 10,
        cursor: 'cursor_page_1',
      });
      expect(result.results).toHaveLength(1);
      expect(result.nextCursor).toBe('cursor_page_2');
    });
  });
});
