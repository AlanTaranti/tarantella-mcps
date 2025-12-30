# Slack MCP Server Design

**Date:** 2025-12-29
**Status:** Approved

## Overview

A multi-MCP server platform that hosts multiple independent MCP servers in a single Express application. Each MCP server is exposed at its own SSE endpoint. Slack is the first integration, with architecture designed to easily add GitHub, Jira, Notion, and other services.

## Goals

- Provide Claude with search access to Slack workspace data
- Enable workspace-wide and channel-specific message search
- Support rich filtering (date range, user, reactions, threads)
- Deploy single application hosting multiple MCP servers
- Make adding new integrations straightforward

## High-Level Architecture

### Project Structure

```
src/
  ├── server.ts              # Main Express app, registers MCPs
  ├── mcps/
  │   ├── slack/
  │   │   ├── index.ts       # Slack MCP server instance
  │   │   ├── tools/         # Tool implementations
  │   │   │   ├── search-messages.ts
  │   │   │   └── search-in-channel.ts
  │   │   └── services/
  │   │       └── slack-client.ts  # Slack Web API wrapper
  │   └── [future-integrations]/
  └── shared/
      ├── types.ts           # Common TypeScript types
      └── utils.ts           # Shared utilities
```

### Multi-MCP Endpoint Pattern

Single Express application exposes multiple MCP servers:
- `/mcp/slack/sse` → Slack MCP server
- `/mcp/github/sse` → Future: GitHub MCP server
- `/mcp/jira/sse` → Future: Jira MCP server
- etc.

Each MCP server is independent with its own tools and services but shares the Express infrastructure.

## Slack MCP Implementation

### Authentication

- **Method:** Single bot token per workspace
- **Configuration:** `SLACK_BOT_TOKEN` environment variable
- **Required Scopes:**
  - `channels:history` - Read public channel messages
  - `channels:read` - List public channels
  - `groups:history` - Read private channel messages
  - `im:history` - Read DM history
  - `users:read` - Get user information
  - `search:read` - Use search API

### MCP Server Setup

**File:** `src/mcps/slack/index.ts`

- Creates `MCPServer` instance with name `'slack-mcp'`
- Registers two tools: `search_messages` and `search_in_channel`
- Tool handlers validate inputs with Zod schemas
- Calls service layer for Slack API interactions
- Returns formatted results to Claude

### Tools

#### `search_messages`

Search across entire Slack workspace.

**Parameters:**
- `query` (string, required) - Search query text
- `limit` (number, optional, default: 20) - Results per page
- `cursor` (string, optional) - Pagination cursor for next page
- `from_date` (string, optional) - ISO date string for start of range
- `to_date` (string, optional) - ISO date string for end of range
- `user_id` (string, optional) - Filter by specific user
- `has_reactions` (boolean, optional) - Only messages with reactions
- `has_threads` (boolean, optional) - Only messages with thread replies

**Returns:**
```typescript
{
  results: Array<{
    text: string,
    author: string,      // User ID
    channel: string,     // Channel ID
    timestamp: string    // Message timestamp
  }>,
  nextCursor?: string    // For pagination
}
```

#### `search_in_channel`

Search within a specific channel.

**Parameters:**
- Same as `search_messages`, plus:
- `channel_id` (string, required) - Channel to search in

**Returns:** Same format as `search_messages`

### Service Layer

**File:** `src/mcps/slack/services/slack-client.ts`

Wraps Slack Web API client using `@slack/web-api` package.

**Responsibilities:**
- Authenticate with bot token
- Provide `searchMessages()` and `searchInChannel()` methods
- Transform Slack API responses into simplified format
- Handle pagination cursors
- Pass through errors to tool handlers

**Data Transformation:**
- Input: Slack API response with full message objects
- Output: Simplified objects with only `text`, `author`, `channel`, `timestamp`

## Request Flow

### SSE Connection
1. Claude connects to `https://your-server.railway.app/mcp/slack/sse`
2. Express route handler creates `SSEServerTransport` instance
3. Slack MCP server connects to transport
4. Persistent SSE connection established

### Tool Invocation
1. Claude sends tool request via SSE (e.g., `search_messages` with parameters)
2. MCP server routes to tool handler
3. Tool handler validates parameters with Zod schema
4. Tool handler calls `slackClient.searchMessages()`
5. Slack client constructs and makes Slack Web API request
6. Slack client transforms response to simplified format
7. Tool handler returns result to Claude via SSE

### Data Flow Example

**Slack API Response:**
```json
{
  "messages": [{
    "text": "Hello world",
    "user": "U123456",
    "channel": "C789012",
    "ts": "1234567890.123456",
    "reactions": [...],
    "thread_ts": "...",
    ...
  }]
}
```

**Service Layer Output:**
```json
{
  "results": [{
    "text": "Hello world",
    "author": "U123456",
    "channel": "C789012",
    "timestamp": "1234567890.123456"
  }],
  "nextCursor": "bmV4dF9jdXJzb3I="
}
```

## Error Handling

### Philosophy
Simple passthrough approach - return Slack API errors directly to Claude. No automatic retries or complex error recovery initially.

### Error Types

**Slack API Errors:**
- **Rate limits (429):** Pass through with `Retry-After` header info
- **Authentication (401):** Invalid/missing bot token
- **Not found (404):** Channel or user doesn't exist
- **Permission (403):** Bot lacks required scopes
- **Network/timeout:** Pass through raw error

**Validation Errors:**
- Zod schema validation failures return clear parameter error messages

**Startup Errors:**
- Missing `SLACK_BOT_TOKEN` fails at startup with clear error

### Error Response Format

```typescript
{
  error: true,
  code: 'slack_api_error' | 'validation_error' | 'auth_error',
  message: 'Human-readable error description',
  details: { /* Original error from Slack */ }
}
```

## Configuration

### Environment Variables

```bash
# Required
SLACK_BOT_TOKEN=xoxb-your-bot-token
PORT=3000  # Railway will override

# Future MCPs
# GITHUB_TOKEN=ghp_...
# JIRA_API_KEY=...
```

### Bot Token Setup

1. Create Slack app at api.slack.com
2. Add required bot token scopes (listed above)
3. Install app to workspace
4. Copy bot token to `SLACK_BOT_TOKEN` environment variable

### Deployment on Railway

- Single deployment serves all MCP endpoints
- Set environment variables in Railway dashboard
- Access at: `https://your-app.railway.app/mcp/slack/sse`

### Adding New MCPs

1. Create folder in `src/mcps/[service]`
2. Implement MCP server with tools and services
3. Register SSE endpoint in `src/server.ts`
4. Add authentication environment variables
5. Deploy (no additional infrastructure needed)

## Testing Strategy

### Unit Tests

- Tool handlers with mocked Slack client
- Zod schema validation (valid and invalid inputs)
- Data transformation logic in service layer
- Use Jest or Vitest

### Service Layer Tests

- Mock Slack Web API responses
- Verify parameter mapping to Slack API
- Test error passthrough behavior
- Test pagination cursor handling

### Integration Tests (Optional)

- Test against Slack API test workspace
- Verify SSE connection handling
- End-to-end tool invocation flow

### Manual Testing

- Configure Claude to connect to local server
- Test search queries with various filters
- Verify pagination across multiple pages
- Test error scenarios (invalid tokens, rate limits)

### Test Structure

```
src/
  └── mcps/
      └── slack/
          ├── __tests__/
          │   ├── tools/
          │   │   ├── search-messages.test.ts
          │   │   └── search-in-channel.test.ts
          │   └── services/
          │       └── slack-client.test.ts
```

### Testing Priority

1. Tool parameter validation (critical)
2. Service layer data transformation (important)
3. Error handling (important)
4. Integration tests (nice to have)

## Dependencies

### Required
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `@slack/web-api` - Slack Web API client
- `express` - HTTP server
- `zod` - Runtime type validation

### Development
- `typescript` - Type checking
- `tsx` or `ts-node` - TypeScript execution
- `jest` or `vitest` - Testing framework
- `@types/*` - TypeScript type definitions

## Implementation Phases

### Phase 1: Core Infrastructure
1. Set up TypeScript configuration
2. Create main Express server with SSE endpoint registration
3. Implement basic Slack MCP server structure
4. Configure environment variable loading

### Phase 2: Slack Service Layer
1. Implement Slack client wrapper
2. Add `searchMessages()` and `searchInChannel()` methods
3. Implement data transformation
4. Add error passthrough

### Phase 3: MCP Tools
1. Implement `search_messages` tool with Zod validation
2. Implement `search_in_channel` tool
3. Add pagination support
4. Add filtering parameters

### Phase 4: Testing & Deployment
1. Write unit tests for tools and service layer
2. Manual testing with Claude
3. Deploy to Railway
4. Document setup and usage

## Future Enhancements

### Potential Additions (YAGNI - don't implement unless needed)
- Caching layer for frequently accessed data
- Automatic retry logic with exponential backoff
- Thread reply fetching
- User display name resolution
- Channel name resolution
- Reaction details
- File/attachment access
- Message posting capabilities (write operations)
- Additional MCP servers (GitHub, Jira, Notion, etc.)

## Success Criteria

- Claude can search across Slack workspace
- Claude can search within specific channels
- Filtering by date, user, reactions, and threads works
- Pagination allows fetching additional results
- Errors are clearly communicated to Claude
- Architecture makes adding new MCP servers straightforward
- Single deployment hosts all MCP endpoints