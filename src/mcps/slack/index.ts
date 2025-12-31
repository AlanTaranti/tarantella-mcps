import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SlackClient } from './services/slack-client.js';
import { createSearchInChannelHandler, searchInChannelSchema } from './tools/search-in-channel.js';
import { createSearchMessagesHandler, searchMessagesSchema } from './tools/search-messages.js';

const SERVER_NAME = 'slack-mcp';
const SERVER_VERSION = '1.0.0';

export const createSlackMcpServer = (botToken: string): McpServer => {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Initialize Slack client
  const slackClient = new SlackClient(botToken);

  // Create tool handlers
  const searchMessagesHandler = createSearchMessagesHandler(slackClient);
  const searchInChannelHandler = createSearchInChannelHandler(slackClient);

  // Register search_messages tool
  server.registerTool(
    'search_messages',
    {
      description:
        'Search across all Slack messages in all channels and conversations. Supports filtering by date range, user, reactions, and threads.',
      inputSchema: searchMessagesSchema,
    },
    async (args, _extra) => {
      return await searchMessagesHandler(args);
    }
  );

  // Register search_in_channel tool
  server.registerTool(
    'search_in_channel',
    {
      description:
        'Search within a specific Slack channel. Useful when you know the channel ID and want to search only within that channel.',
      inputSchema: searchInChannelSchema,
    },
    async (args, _extra) => {
      return await searchInChannelHandler(args);
    }
  );

  return server;
};
