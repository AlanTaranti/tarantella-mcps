# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server implementation named "tarantella-mcps". The project uses the `@modelcontextprotocol/sdk` to build custom MCP servers that can extend Claude's capabilities.

## Technology Stack

### Core Dependencies
- **Runtime**: Node.js v22 (see .nvmrc)
- **Language**: TypeScript 5.6+ with ESM modules
- **MCP SDK**: @modelcontextprotocol/sdk v1.25.1
- **Web Framework**: Express v5.2.1
- **Validation**: Zod v4.2.1

### Development Tools
- **TypeScript Execution**: tsx (fast esbuild-based runner)
- **Linter/Formatter**: Biome 2.x (all-in-one tool)
- **Test Framework**: Vitest 2.x (modern, fast, ESM-native)
- **Mutation Testing**: Stryker 8.x (tests the quality of tests)

## Development Commands

### Daily Development
- `npm run dev` - Start development server with hot reload (tsx watch mode)
- `npm test` - Run tests in watch mode
- `npm run test:ui` - Run tests with interactive UI
- `npm run check` - Format and lint code (one command for both)

### Code Quality
- `npm run typecheck` - Verify TypeScript types without building
- `npm run lint` - Run Biome linter
- `npm run format` - Auto-format code with Biome

### Testing
- `npm run test:coverage` - Run tests with coverage report (80% threshold)
- `npm run test:mutation` - Run mutation testing (75% mutation score threshold)

### Production
- `npm run build` - Compile TypeScript to JavaScript (outputs to `dist/`)
- `npm start` - Run compiled server from `dist/`

### Continuous Integration
- `npm run ci` - Full validation pipeline (typecheck + lint + test)

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

## TypeScript Configuration

This project uses **maximum strictness** for type safety:

### Compiler Strictness (tsconfig.json)
- All strict flags enabled (`strict: true`)
- `noUncheckedIndexedAccess` - Index signatures return `T | undefined`
- `noPropertyAccessFromIndexSignature` - Enforce bracket notation for index signatures
- `exactOptionalPropertyTypes` - Distinguish `undefined` vs property absence
- `allowUnreachableCode: false` - Error on dead code
- `noUnusedLocals` and `noUnusedParameters` - No unused variables/parameters

### Code Style (biome.json)
- `noExplicitAny` - No `any` types allowed (forces proper typing)
- `noNonNullAssertion` - No `!` operator (forces null checks)
- `noDefaultExport` - Named exports only (better refactoring)
- `noForEach` - Prefer `for...of` loops
- `noAwaitInLoops` - Must use `Promise.all` for parallel execution
- `noExcessiveCognitiveComplexity` - Keep functions simple and testable

### Important Notes
- **Index Signatures**: Use bracket notation for `process.env` and other index signatures: `process.env['PORT']` (not `process.env.PORT`)
- **Magic Numbers**: Extract constants with meaningful names: `const DEFAULT_PORT = 3000`
- **Named Exports**: Always use `export const foo` (never `export default`)
- **Error Handling**: No non-null assertions - handle `null`/`undefined` explicitly

## Testing Standards

### Coverage Requirements
- **Line Coverage**: 80% minimum
- **Function Coverage**: 80% minimum
- **Branch Coverage**: 80% minimum
- **Statement Coverage**: 80% minimum

### Mutation Testing
- **Mutation Score**: 75% minimum (Stryker)
- Mutation testing validates that tests actually catch bugs, not just execute code
- Run `npm run test:mutation` periodically (it's slower than regular tests)

### Test Organization
```
src/
  └── mcps/
      └── slack/
          ├── __tests__/
          │   ├── tools/
          │   │   └── search-messages.test.ts
          │   └── services/
          │       └── slack-client.test.ts
          ├── tools/
          └── services/
```

## Key Dependencies

- **@modelcontextprotocol/sdk**: Provides the core MCP protocol implementation including `Server`, `StdioServerTransport`, and schema definitions
- **Zod**: Use for runtime type validation of tool inputs and outputs
- **Express**: Can be used if implementing HTTP-based MCP endpoints (though MCP typically uses stdio or SSE transport)