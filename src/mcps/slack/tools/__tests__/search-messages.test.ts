import { describe, it, expect } from 'vitest';
import { searchMessagesSchema } from '../search-messages.js';

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
});
