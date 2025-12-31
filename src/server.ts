import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import { createSlackMcpServer } from './mcps/slack/index.js';
import { validateConfig } from './shared/config.js';

const HTTP_INTERNAL_SERVER_ERROR = 500;

export const createApp = (slackBotToken: string): express.Application => {
  const app = express();

  app.get('/', (_req, res) => {
    res.json({ message: 'MCP Server Platform' });
  });

  // Slack MCP SSE endpoint
  app.get('/mcp/slack/sse', async (_req, res) => {
    try {
      const slackServer = createSlackMcpServer(slackBotToken);
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
  const config = validateConfig();
  const app = createApp(config.slackBotToken);

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(
      `Slack MCP available at: http://localhost:${config.port}/mcp/slack/sse`,
    );
  });
}
