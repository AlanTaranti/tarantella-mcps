import { describe, expect, it } from 'vitest';
import type { SlackMessage, SlackSearchResult } from '../types.js';

describe('Shared Types', () => {
  it('should allow valid SlackMessage structure', () => {
    const message: SlackMessage = {
      text: 'Hello world',
      author: 'U123456',
      channel: 'C789012',
      timestamp: '1234567890.123456',
    };

    expect(message).toHaveProperty('text');
    expect(message).toHaveProperty('author');
    expect(message).toHaveProperty('channel');
    expect(message).toHaveProperty('timestamp');
  });

  it('should allow valid SlackSearchResult structure', () => {
    const result: SlackSearchResult = {
      results: [
        {
          text: 'Hello',
          author: 'U123',
          channel: 'C789',
          timestamp: '123.456',
        },
      ],
      nextCursor: 'cursor123',
    };

    expect(result).toHaveProperty('results');
    expect(result).toHaveProperty('nextCursor');
  });

  it('should allow SlackSearchResult without cursor', () => {
    const result: SlackSearchResult = {
      results: [],
    };

    expect(result).toHaveProperty('results');
    expect(result.nextCursor).toBeUndefined();
  });
});
