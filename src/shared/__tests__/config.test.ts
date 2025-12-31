import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateConfig } from '../config.js';

describe('validateConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a fresh copy of env for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env after each test
    process.env = originalEnv;
  });

  it('should return valid config when all environment variables are set', () => {
    process.env['SLACK_BOT_TOKEN'] = 'xoxb-test-token';
    process.env['PORT'] = '8080';

    const config = validateConfig();

    expect(config).toEqual({
      slackBotToken: 'xoxb-test-token',
      port: 8080,
    });
  });

  it('should use default port when PORT is not set', () => {
    process.env['SLACK_BOT_TOKEN'] = 'xoxb-test-token';
    delete process.env['PORT'];

    const config = validateConfig();

    expect(config).toEqual({
      slackBotToken: 'xoxb-test-token',
      port: 3000,
    });
  });

  it('should trim whitespace from SLACK_BOT_TOKEN', () => {
    process.env['SLACK_BOT_TOKEN'] = '  xoxb-test-token  ';

    const config = validateConfig();

    expect(config.slackBotToken).toBe('xoxb-test-token');
  });

  it('should throw error when SLACK_BOT_TOKEN is missing', () => {
    delete process.env['SLACK_BOT_TOKEN'];

    expect(() => validateConfig()).toThrow(
      'SLACK_BOT_TOKEN environment variable is required',
    );
  });

  it('should throw error when SLACK_BOT_TOKEN is empty string', () => {
    process.env['SLACK_BOT_TOKEN'] = '';

    expect(() => validateConfig()).toThrow(
      'SLACK_BOT_TOKEN environment variable is required',
    );
  });

  it('should throw error when SLACK_BOT_TOKEN is only whitespace', () => {
    process.env['SLACK_BOT_TOKEN'] = '   ';

    expect(() => validateConfig()).toThrow(
      'SLACK_BOT_TOKEN environment variable is required',
    );
  });

  it('should parse PORT as integer', () => {
    const CUSTOM_PORT = 9000;
    process.env['SLACK_BOT_TOKEN'] = 'xoxb-test-token';
    process.env['PORT'] = '9000';

    const config = validateConfig();

    expect(config.port).toBe(CUSTOM_PORT);
    expect(typeof config.port).toBe('number');
  });
});
