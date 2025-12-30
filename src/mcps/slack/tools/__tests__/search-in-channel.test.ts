import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SlackClient } from '../../services/slack-client.js';
import { createSearchInChannelHandler, searchInChannelSchema } from '../search-in-channel.js';

describe('searchInChannelSchema', () => {
  it('should validate valid input with channel_id', () => {
    const result = searchInChannelSchema.safeParse({
      query: 'test',
      channel_id: 'C123456',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('test');
      expect(result.data.channel_id).toBe('C123456');
    }
  });

  it('should reject missing channel_id', () => {
    const result = searchInChannelSchema.safeParse({
      query: 'test',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod 4.x returns this error message for missing required fields
      expect(result.error.issues[0]?.message).toBe(
        'Invalid input: expected string, received undefined'
      );
    }
  });

  it('should validate with all optional fields', () => {
    const input = {
      query: 'important',
      channel_id: 'C999',
      limit: 30,
      cursor: 'dXNlcjpVMDYxTkZUVDI=',
      from_date: '2024-06-01',
      to_date: '2024-12-01',
      user_id: 'U123456',
      has_reactions: true,
      has_threads: false,
    };

    const result = searchInChannelSchema.safeParse(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(input);
    }
  });

  it('should reject empty query string', () => {
    const result = searchInChannelSchema.safeParse({
      query: '',
      channel_id: 'C123456',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Query cannot be empty');
    }
  });

  it('should reject empty channel_id', () => {
    const result = searchInChannelSchema.safeParse({
      query: 'test',
      channel_id: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Channel ID is required');
    }
  });

  it('should reject limit less than minimum', () => {
    const result = searchInChannelSchema.safeParse({
      query: 'test',
      channel_id: 'C123456',
      limit: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Limit must be at least 1');
    }
  });

  it('should reject limit greater than maximum', () => {
    const result = searchInChannelSchema.safeParse({
      query: 'test',
      channel_id: 'C123456',
      limit: 101,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Limit cannot exceed 100');
    }
  });

  it('should reject non-integer limit', () => {
    const result = searchInChannelSchema.safeParse({
      query: 'test',
      channel_id: 'C123456',
      limit: 10.5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Limit must be an integer');
    }
  });
});

describe('createSearchInChannelHandler', () => {
  let mockClient: SlackClient;

  beforeEach(() => {
    mockClient = {
      searchInChannel: vi.fn(),
    } as unknown as SlackClient;
  });

  it('should call SlackClient.searchInChannel with channel_id', async () => {
    const mockResults = {
      results: [
        {
          text: 'Channel message',
          author: 'U111',
          channel: 'C222',
          timestamp: '999.999',
        },
      ],
    };

    vi.mocked(mockClient.searchInChannel).mockResolvedValueOnce(mockResults);

    const handler = createSearchInChannelHandler(mockClient);
    const result = await handler({
      query: 'bug',
      channel_id: 'C222',
    });

    expect(mockClient.searchInChannel).toHaveBeenCalledWith({
      query: 'bug',
      channelId: 'C222',
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

  it('should call SlackClient.searchInChannel with all parameters', async () => {
    const mockResults = {
      results: [
        {
          text: 'Important message',
          author: 'U999',
          channel: 'C888',
          timestamp: '1234567890.123456',
        },
      ],
      cursor: 'nextCursor',
    };

    vi.mocked(mockClient.searchInChannel).mockResolvedValueOnce(mockResults);

    const handler = createSearchInChannelHandler(mockClient);
    const input = {
      query: 'important',
      channel_id: 'C888',
      limit: 50,
      cursor: 'prevCursor',
      from_date: '2024-01-01',
      to_date: '2024-12-31',
      user_id: 'U999',
      has_reactions: true,
      has_threads: false,
    };

    const result = await handler(input);

    expect(mockClient.searchInChannel).toHaveBeenCalledWith({
      query: 'important',
      channelId: 'C888',
      limit: 50,
      cursor: 'prevCursor',
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
      userId: 'U999',
      hasReactions: true,
      hasThreads: false,
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

  it('should propagate errors from SlackClient', async () => {
    const mockError = new Error('Slack API error: channel_not_found');

    vi.mocked(mockClient.searchInChannel).mockRejectedValueOnce(mockError);

    const handler = createSearchInChannelHandler(mockClient);

    await expect(
      handler({
        query: 'test',
        channel_id: 'C_INVALID',
      })
    ).rejects.toThrow('Slack API error: channel_not_found');
  });

  it('should format empty results correctly', async () => {
    const mockResults = {
      results: [],
    };

    vi.mocked(mockClient.searchInChannel).mockResolvedValueOnce(mockResults);

    const handler = createSearchInChannelHandler(mockClient);
    const result = await handler({
      query: 'nonexistent',
      channel_id: 'C123',
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

  it('should not include undefined optional parameters in client call', async () => {
    const mockResults = {
      results: [
        {
          text: 'Test message',
          author: 'U111',
          channel: 'C222',
          timestamp: '1234567890.123456',
        },
      ],
    };

    vi.mocked(mockClient.searchInChannel).mockResolvedValueOnce(mockResults);

    const handler = createSearchInChannelHandler(mockClient);
    await handler({
      query: 'test',
      channel_id: 'C222',
    });

    expect(mockClient.searchInChannel).toHaveBeenCalledWith({
      query: 'test',
      channelId: 'C222',
    });

    // Ensure no undefined fields are passed
    const callArg = vi.mocked(mockClient.searchInChannel).mock.calls[0]?.[0];
    expect(callArg).not.toHaveProperty('limit');
    expect(callArg).not.toHaveProperty('cursor');
    expect(callArg).not.toHaveProperty('fromDate');
    expect(callArg).not.toHaveProperty('toDate');
    expect(callArg).not.toHaveProperty('userId');
    expect(callArg).not.toHaveProperty('hasReactions');
    expect(callArg).not.toHaveProperty('hasThreads');
  });
});
