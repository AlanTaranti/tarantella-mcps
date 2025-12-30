# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server implementation named "tarantella-mcps". The project uses the `@modelcontextprotocol/sdk` to build custom MCP servers that can extend Claude's capabilities.

## Technology Stack

- **Runtime**: Node.js v22 (see .nvmrc)
- **MCP SDK**: @modelcontextprotocol/sdk v1.25.1
- **Web Framework**: Express v5.2.1
- **Validation**: Zod v4.2.1

## Development Commands

Currently no build, test, or lint commands are configured in package.json. When adding development scripts, follow these conventions:
- `npm run dev` - Start development server
- `npm run build` - Build/compile if needed
- `npm test` - Run tests
- `npm run lint` - Run linter

## MCP Server Architecture

MCP servers can provide three types of capabilities:

1. **Tools** - Functions that Claude can invoke to perform actions
2. **Resources** - Data sources that Claude can read from
3. **Prompts** - Pre-configured prompt templates

When implementing MCP servers in this project:
- Use Zod schemas for input validation on all tool parameters
- Handle errors gracefully and return meaningful error messages to Claude
- Follow the MCP protocol specification for request/response formats
- Consider using Express for HTTP-based MCP servers or stdio transport for local integration

## Key Dependencies

- **@modelcontextprotocol/sdk**: Provides the core MCP protocol implementation including `Server`, `StdioServerTransport`, and schema definitions
- **Zod**: Use for runtime type validation of tool inputs and outputs
- **Express**: Can be used if implementing HTTP-based MCP endpoints (though MCP typically uses stdio or SSE transport)