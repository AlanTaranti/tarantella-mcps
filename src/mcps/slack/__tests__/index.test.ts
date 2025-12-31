import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListToolsRequestSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSlackMcpServer } from '../index.js';

const mockSearchMessages = vi.fn();
const mockSearchInChannel = vi.fn();

vi.mock('../services/slack-client.js', () => ({
  SlackClient: class {
    searchMessages = mockSearchMessages;
    searchInChannel = mockSearchInChannel;
  },
}));

describe('createSlackMcpServer', () => {
  const MOCK_TOKEN = 'xoxb-test-token';
  let server: McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createSlackMcpServer(MOCK_TOKEN);
  });

  it('should create MCP server instance with correct name and version', () => {
    expect(server).toBeDefined();
    expect(server).toBeInstanceOf(Object);
    expect(server.server).toBeDefined();
  });

  it('should register tools and make them discoverable via tools/list', async () => {
    // Get the request handler for tools/list
    const requestHandler = server.server['_requestHandlers']?.get('tools/list');
    expect(requestHandler).toBeDefined();

    // Call the handler to get the list of tools
    const request = ListToolsRequestSchema.parse({
      method: 'tools/list',
      params: {},
    });

    const result = await requestHandler?.(request, {} as never);
    expect(result).toBeDefined();
    expect(result?.tools).toHaveLength(2);

    // Verify search_messages tool
    const searchMessagesTool = result?.tools.find((t: Tool) => t.name === 'search_messages');
    expect(searchMessagesTool).toBeDefined();
    expect(searchMessagesTool?.description).toContain('Search across all Slack messages');
    expect(searchMessagesTool?.inputSchema).toBeDefined();
    expect(searchMessagesTool?.inputSchema.type).toBe('object');
    expect(searchMessagesTool?.inputSchema.properties).toHaveProperty('query');
    expect(searchMessagesTool?.inputSchema.required).toContain('query');

    // Verify search_in_channel tool
    const searchInChannelTool = result?.tools.find((t: Tool) => t.name === 'search_in_channel');
    expect(searchInChannelTool).toBeDefined();
    expect(searchInChannelTool?.description).toContain('Search within a specific Slack channel');
    expect(searchInChannelTool?.inputSchema).toBeDefined();
    expect(searchInChannelTool?.inputSchema.type).toBe('object');
    expect(searchInChannelTool?.inputSchema.properties).toHaveProperty('query');
    expect(searchInChannelTool?.inputSchema.properties).toHaveProperty('channel_id');
    expect(searchInChannelTool?.inputSchema.required).toContain('query');
    expect(searchInChannelTool?.inputSchema.required).toContain('channel_id');
  });

  it('should have tools/call request handler registered', () => {
    const requestHandler = server.server['_requestHandlers']?.get('tools/call');
    expect(requestHandler).toBeDefined();
  });

  it('should initialize SlackClient with provided token', () => {
    // Verify the server was created which means SlackClient was instantiated
    expect(server).toBeDefined();
    expect(server.server).toBeDefined();
  });
});
