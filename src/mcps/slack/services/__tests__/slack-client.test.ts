import { describe, it, expect } from 'vitest';
import { SlackClient } from '../slack-client.js';

describe('SlackClient', () => {
  const MOCK_TOKEN = 'xoxb-test-token';

  describe('constructor', () => {
    it('should create instance with valid token', () => {
      const client = new SlackClient(MOCK_TOKEN);
      expect(client).toBeInstanceOf(SlackClient);
    });

    it('should throw error with empty token', () => {
      expect(() => new SlackClient('')).toThrow('Slack bot token is required');
    });
  });
});
