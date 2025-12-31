import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SlackClient } from '../../services/slack-client.js';
import { createSearchMessagesHandler, searchMessagesSchema } from '../search-messages.js';

const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

describe('searchMessagesSchema', () => {
  it('should validate minimal valid input', () => {
    const result = searchMessagesSchema.safeParse({
      query: 'test search',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('test search');
    }
  });

  it('should validate full input with all optional fields', () => {
    const input = {
      query: 'bug fix',
      limit: 50,
      cursor: 'page_token',
      from_date: '2024-01-01',
      to_date: '2024-12-31',
      user_id: 'U123456',
      has_reactions: true,
      has_threads: false,
    };

    const result = searchMessagesSchema.safeParse(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(input);
    }
  });

  it('should reject empty query', () => {
    const result = searchMessagesSchema.safeParse({
      query: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing query', () => {
    const result = searchMessagesSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('should reject invalid limit (negative)', () => {
    const result = searchMessagesSchema.safeParse({
      query: 'test',
      limit: -5,
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid limit (too large)', () => {
    const result = searchMessagesSchema.safeParse({
      query: 'test',
      limit: 150,
    });

    expect(result.success).toBe(false);
  });

  it('should accept valid limit boundaries', () => {
    const min = searchMessagesSchema.safeParse({
      query: 'test',
      limit: MIN_LIMIT,
    });
    const max = searchMessagesSchema.safeParse({
      query: 'test',
      limit: MAX_LIMIT,
    });

    expect(min.success).toBe(true);
    expect(max.success).toBe(true);
    if (min.success) {
      expect(min.data.limit).toBe(MIN_LIMIT);
    }
    if (max.success) {
      expect(max.data.limit).toBe(MAX_LIMIT);
    }
  });

  it('should reject non-integer limit', () => {
    const result = searchMessagesSchema.safeParse({
      query: 'test',
      limit: 50.5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Limit must be an integer');
    }
  });

  it('should accept optional string fields', () => {
    const withCursor = searchMessagesSchema.safeParse({
      query: 'test',
      cursor: 'next_page_token',
    });
    const withFromDate = searchMessagesSchema.safeParse({
      query: 'test',
      from_date: '2024-01-01',
    });
    const withToDate = searchMessagesSchema.safeParse({
      query: 'test',
      to_date: '2024-12-31',
    });
    const withUserId = searchMessagesSchema.safeParse({
      query: 'test',
      user_id: 'U12345678',
    });

    expect(withCursor.success).toBe(true);
    expect(withFromDate.success).toBe(true);
    expect(withToDate.success).toBe(true);
    expect(withUserId.success).toBe(true);

    if (withCursor.success) {
      expect(withCursor.data.cursor).toBe('next_page_token');
    }
    if (withFromDate.success) {
      expect(withFromDate.data.from_date).toBe('2024-01-01');
    }
    if (withToDate.success) {
      expect(withToDate.data.to_date).toBe('2024-12-31');
    }
    if (withUserId.success) {
      expect(withUserId.data.user_id).toBe('U12345678');
    }
  });

  it('should accept boolean fields', () => {
    const withReactionsTrue = searchMessagesSchema.safeParse({
      query: 'test',
      has_reactions: true,
    });
    const withReactionsFalse = searchMessagesSchema.safeParse({
      query: 'test',
      has_reactions: false,
    });
    const withThreadsTrue = searchMessagesSchema.safeParse({
      query: 'test',
      has_threads: true,
    });
    const withThreadsFalse = searchMessagesSchema.safeParse({
      query: 'test',
      has_threads: false,
    });

    expect(withReactionsTrue.success).toBe(true);
    expect(withReactionsFalse.success).toBe(true);
    expect(withThreadsTrue.success).toBe(true);
    expect(withThreadsFalse.success).toBe(true);

    if (withReactionsTrue.success) {
      expect(withReactionsTrue.data.has_reactions).toBe(true);
    }
    if (withReactionsFalse.success) {
      expect(withReactionsFalse.data.has_reactions).toBe(false);
    }
    if (withThreadsTrue.success) {
      expect(withThreadsTrue.data.has_threads).toBe(true);
    }
    if (withThreadsFalse.success) {
      expect(withThreadsFalse.data.has_threads).toBe(false);
    }
  });
});

describe('createSearchMessagesHandler', () => {
  let mockClient: SlackClient;

  beforeEach(() => {
    mockClient = {
      searchMessages: vi.fn(),
    } as unknown as SlackClient;
  });

  it('should call SlackClient.searchMessages with transformed params', async () => {
    const mockResults = {
      results: [
        {
          text: 'Test message',
          author: 'U123',
          channel: 'C456',
          timestamp: '123.456',
        },
      ],
      nextCursor: 'next_page',
    };

    vi.mocked(mockClient.searchMessages).mockResolvedValueOnce(mockResults);

    const handler = createSearchMessagesHandler(mockClient);
    const result = await handler({
      query: 'urgent bug',
      limit: 25,
      user_id: 'U789',
    });

    expect(mockClient.searchMessages).toHaveBeenCalledWith({
      query: 'urgent bug',
      limit: 25,
      userId: 'U789',
    });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockResults, null, 2),
        },
      ],
    });
  });

  it('should handle all optional parameters', async () => {
    vi.mocked(mockClient.searchMessages).mockResolvedValueOnce({
      results: [],
    });

    const handler = createSearchMessagesHandler(mockClient);
    await handler({
      query: 'test',
      limit: 10,
      cursor: 'page2',
      from_date: '2024-01-01',
      to_date: '2024-12-31',
      user_id: 'U111',
      has_reactions: true,
      has_threads: false,
    });

    expect(mockClient.searchMessages).toHaveBeenCalledWith({
      query: 'test',
      limit: 10,
      cursor: 'page2',
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
      userId: 'U111',
      hasReactions: true,
      hasThreads: false,
    });
  });

  it('should propagate errors from SlackClient', async () => {
    const error = new Error('Search failed');
    vi.mocked(mockClient.searchMessages).mockRejectedValueOnce(error);

    const handler = createSearchMessagesHandler(mockClient);
    await expect(handler({ query: 'test' })).rejects.toThrow('Search failed');
  });

  it('should format empty results correctly', async () => {
    vi.mocked(mockClient.searchMessages).mockResolvedValueOnce({ results: [] });

    const handler = createSearchMessagesHandler(mockClient);
    const result = await handler({ query: 'no matches' });

    expect(result.content[0]?.type).toBe('text');
    expect(result.content[0]?.text).toContain('results');
    expect(result.content[0]?.text).toContain('[]');
  });
});
