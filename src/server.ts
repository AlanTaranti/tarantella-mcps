import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import { createSlackMcpServer } from './mcps/slack/index.js';

const DEFAULT_PORT = 3000;
const HTTP_INTERNAL_SERVER_ERROR = 500;

export const createApp = (): express.Application => {
  const app = express();

  app.get('/', (_req, res) => {
    res.json({ message: 'MCP Server Platform' });
  });

  // Slack MCP SSE endpoint
  app.get('/mcp/slack/sse', async (_req, res) => {
    const token = process.env['SLACK_BOT_TOKEN'];

    if (!token) {
      res.status(HTTP_INTERNAL_SERVER_ERROR).json({
        error: 'SLACK_BOT_TOKEN environment variable not configured',
      });
      return;
    }

    try {
      const slackServer = createSlackMcpServer(token);
      const transport = new SSEServerTransport('/mcp/slack/sse', res);

      await slackServer.connect(transport);
    } catch (error) {
      console.error('Error setting up Slack MCP server:', error);
      res
        .status(HTTP_INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to initialize Slack MCP server' });
    }
  });

  return app;
};

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();
  const PORT = process.env['PORT'] ?? DEFAULT_PORT;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Slack MCP available at: http://localhost:${PORT}/mcp/slack/sse`);
  });
}
