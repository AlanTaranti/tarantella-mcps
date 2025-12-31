# Tarantella MCPs - Slack MCP Server

A Model Context Protocol (MCP) server implementation that provides Slack search capabilities to Claude and other MCP clients.

## Overview

This MCP server enables AI assistants to search Slack messages and channels using the Slack Web API. It provides two main tools:

- **search-messages**: Search across all accessible Slack messages
- **search-in-channel**: Search within a specific Slack channel

## Prerequisites

- Node.js v22 or later (see `.nvmrc`)
- A Slack workspace with API access
- A Slack Bot Token with appropriate permissions

## Slack Setup

### 1. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" and choose "From scratch"
3. Give your app a name (e.g., "MCP Search Bot") and select your workspace
4. Click "Create App"

### 2. Configure OAuth Scopes

1. Navigate to "OAuth & Permissions" in the sidebar
2. Under "Bot Token Scopes", add the following scopes:
   - `search:read` - Search workspace content
   - `channels:read` - View basic channel information
   - `groups:read` - View basic private channel information
   - `im:read` - View basic direct message information
   - `mpim:read` - View basic group direct message information

### 3. Install App to Workspace

1. Scroll to "OAuth Tokens for Your Workspace"
2. Click "Install to Workspace"
3. Authorize the app
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### 4. Set Environment Variable

Export your token as an environment variable:

```bash
export SLACK_BOT_TOKEN="xoxb-your-token-here"
```

Or create a `.env` file (not committed to git):

```env
SLACK_BOT_TOKEN=xoxb-your-token-here
PORT=3000
```

## Installation

```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SLACK_BOT_TOKEN` | Yes | - | Slack Bot User OAuth Token (starts with `xoxb-`) |
| `PORT` | No | 3000 | Port number for the HTTP server |

## Available MCP Tools

### 1. search-messages

Search across all accessible Slack messages in your workspace.

**Parameters:**
- `query` (required): Search query string
- `limit` (optional): Number of results to return (1-100, default: 20)
- `from_user` (optional): Filter by user ID
- `in_channel` (optional): Filter by channel ID
- `after` (optional): Filter messages after this date (YYYY-MM-DD)
- `before` (optional): Filter messages before this date (YYYY-MM-DD)
- `exclude_bots` (optional): Exclude messages from bots (boolean)
- `has_attachments` (optional): Only messages with attachments (boolean)
- `has_links` (optional): Only messages with links (boolean)

**Example:**
```json
{
  "query": "bug fix",
  "limit": 10,
  "exclude_bots": true,
  "after": "2024-01-01"
}
```

### 2. search-in-channel

Search messages within a specific Slack channel.

**Parameters:**
- `channel_id` (required): Slack channel ID (e.g., C1234567890)
- `query` (required): Search query string
- `limit` (optional): Number of results to return (1-100, default: 20)
- `from_user` (optional): Filter by user ID
- `after` (optional): Filter messages after this date (YYYY-MM-DD)
- `before` (optional): Filter messages before this date (YYYY-MM-DD)
- `exclude_bots` (optional): Exclude messages from bots (boolean)

**Example:**
```json
{
  "channel_id": "C1234567890",
  "query": "deployment",
  "limit": 5
}
```

## MCP Client Configuration

### Claude Desktop

Add this to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "slack": {
      "url": "http://localhost:3000/mcp/slack/sse",
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-token-here"
      }
    }
  }
}
```

### Other MCP Clients

Connect to the SSE endpoint:
```
http://localhost:3000/mcp/slack/sse
```

## Development

### Code Quality

```bash
# Format and lint code
npm run check

# Type checking only
npm run typecheck

# Linting only
npm run lint

# Format only
npm run format
```

### Testing

```bash
# Run tests (watch mode)
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage (80% threshold)
npm run test:coverage

# Run mutation testing (74% threshold)
npm run test:mutation
```

### CI Pipeline

Run the full continuous integration pipeline:

```bash
npm run ci
```

This runs:
1. TypeScript type checking
2. Biome linting
3. Unit tests
4. Mutation tests

## Project Structure

```
src/
├── mcps/
│   └── slack/
│       ├── __tests__/          # Integration tests
│       ├── services/           # Slack API client
│       │   ├── __tests__/
│       │   └── slack-client.ts
│       ├── tools/              # MCP tool implementations
│       │   ├── __tests__/
│       │   ├── search-messages.ts
│       │   └── search-in-channel.ts
│       └── index.ts            # MCP server setup
├── shared/
│   ├── __tests__/
│   ├── config.ts               # Environment validation
│   └── types.ts                # Shared TypeScript types
└── server.ts                   # HTTP server entry point
```

## Technology Stack

- **Runtime**: Node.js v22
- **Language**: TypeScript 5.6+ (ESM modules)
- **MCP SDK**: @modelcontextprotocol/sdk v1.25.1
- **Web Framework**: Express v5.2.1
- **Validation**: Zod v4.2.1
- **Testing**: Vitest 2.x
- **Linter/Formatter**: Biome 2.x
- **Mutation Testing**: Stryker 8.x

## License

See LICENSE file for details.

## Contributing

1. Follow the TypeScript strictness guidelines in `CLAUDE.md`
2. Write tests for all new features (80% coverage minimum)
3. Run `npm run ci` before committing
4. Use named exports only (no default exports)
5. Extract magic numbers to named constants
6. Use bracket notation for `process.env` access

## Troubleshooting

### "SLACK_BOT_TOKEN environment variable is required" error

Make sure you've set the `SLACK_BOT_TOKEN` environment variable:
```bash
export SLACK_BOT_TOKEN="xoxb-your-token-here"
```

### Search returns no results

1. Verify your bot token has the `search:read` scope
2. Ensure the bot has been added to channels you want to search
3. Check that your search query matches actual message content

### API rate limiting

Slack has rate limits on API calls. If you hit rate limits:
- Reduce the search frequency
- Use more specific queries
- Implement caching (not currently included)

### Connection issues

If the MCP client can't connect:
1. Verify the server is running: `curl http://localhost:3000/`
2. Check the port matches your configuration
3. Review server logs for error messages
