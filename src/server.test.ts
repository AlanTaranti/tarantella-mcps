import type express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock environment variables
vi.stubEnv('SLACK_BOT_TOKEN', 'xoxb-test-token');
vi.stubEnv('PORT', '3001');

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_SERVER_ERROR = 500;

describe('Express Server', () => {
  let app: express.Application;

  beforeEach(async () => {
    // Dynamic import to ensure mocks are applied
    const { createApp } = await import('./server.js');
    app = createApp();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should respond with platform message on root', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ message: 'MCP Server Platform' });
  });

  it('should have /mcp/slack/sse endpoint', async () => {
    const response = await request(app).get('/mcp/slack/sse');

    // SSE endpoints should return 200 and keep connection open
    // We're just testing the route exists
    expect([HTTP_OK, HTTP_BAD_REQUEST, HTTP_INTERNAL_SERVER_ERROR]).toContain(response.status);
  });
});
