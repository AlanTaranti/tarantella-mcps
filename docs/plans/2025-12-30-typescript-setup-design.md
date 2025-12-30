# TypeScript Setup with Maximum Strictness

**Date:** 2025-12-30
**Status:** Approved

## Overview

Comprehensive TypeScript development environment for the tarantella-mcps project with maximum type safety, code quality, and test robustness. This configuration enforces strictness at compile time (TypeScript), lint time (Biome), test time (Vitest), and mutation time (Stryker).

## Goals

- Maximum type safety with all TypeScript strict flags enabled
- Modern ESM module system
- Fast development workflow with tsx
- Comprehensive linting and formatting with Biome
- Robust testing with Vitest and mutation testing with Stryker
- Enforce best practices and catch bugs early

## Technology Stack

- **TypeScript 5.6+** - Type checking with maximum strictness
- **tsx 4.19+** - Fast TypeScript execution (esbuild-based)
- **Biome 1.9+** - All-in-one linter and formatter
- **Vitest 2.1+** - Modern test framework with native ESM support
- **Stryker 8.0+** - Mutation testing framework
- **Node.js 22** - Runtime (ESM module system)

## Configuration Files

### tsconfig.json

TypeScript compiler configuration with 16+ strict flags enabled:

```json
{
  "compilerOptions": {
    // Module system
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",

    // Output
    "outDir": "./dist",
    "rootDir": "./src",

    // Strict type checking (maximum)
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,

    // ESM and interop
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,

    // Other
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Key strictness features:**
- `strict: true` - Enables all base strict flags
- `noUncheckedIndexedAccess` - Index signatures return `T | undefined`
- `exactOptionalPropertyTypes` - Distinguishes `undefined` vs property absence
- `allowUnreachableCode: false` - Errors on dead code
- `noUnusedLocals/Parameters` - Prevents unused variables

### biome.json

Biome configuration with 20+ strict rules enabled:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error",
        "noConfusingVoidType": "error",
        "noVoid": "error",
        "noMagicNumbers": "warn"
      },
      "complexity": {
        "noExcessiveCognitiveComplexity": "error",
        "noForEach": "error",
        "useLiteralKeys": "error",
        "noNestedTernary": "error",
        "noBarrelFile": "warn"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "style": {
        "noNonNullAssertion": "error",
        "useConst": "error",
        "useTemplate": "error",
        "noUselessStringConcat": "error",
        "noNegationElse": "error",
        "noInferrableTypes": "error",
        "noDefaultExport": "error",
        "noNamespaceImport": "error"
      },
      "performance": {
        "noAwaitInLoop": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "es5",
      "semicolons": "always"
    }
  }
}
```

**Key strictness features:**
- `noExplicitAny` - Forces proper typing (no `any`)
- `noNonNullAssertion` - Forces null checks (no `!` operator)
- `noDefaultExport` - Named exports only (better refactoring)
- `noForEach` - Prefer `for...of` (more functional)
- `noAwaitInLoop` - Forces `Promise.all` for parallel execution
- `noExcessiveCognitiveComplexity` - Keeps functions simple
- `noBarrelFile: "warn"` - Warns on barrel files (allows strategic use)

### vitest.config.ts

Vitest configuration with 80% coverage thresholds:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/__tests__/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },

    // Global test utilities
    globals: true,

    // Test file patterns
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
```

### stryker.config.json

Stryker mutation testing with comprehensive operators:

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "testRunner": "vitest",
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/__tests__/**"
  ],
  "mutator": {
    "plugins": [
      "@stryker-mutator/typescript-checker"
    ],
    "excludedMutations": []
  },
  "checkers": ["typescript"],
  "thresholds": {
    "high": 90,
    "low": 80,
    "break": 75
  },
  "timeoutMS": 60000,
  "timeoutFactor": 1.5,
  "maxConcurrentTestRunners": 4,
  "ignoreStatic": true,
  "incrementalFile": ".stryker-tmp/incremental.json"
}
```

**Mutation operators enabled:**
- Arithmetic operators (`+` → `-`, `*` → `/`)
- Logical operators (`&&` → `||`, `>` → `<`)
- Conditional expressions
- String literals
- Array declarations
- Optional chaining
- All other default mutators

**Thresholds:**
- 90%+ mutation score: High quality
- 80-90%: Acceptable
- <75%: Build fails

## Package.json Updates

### Module System
Add `"type": "module"` for ESM support.

### Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:mutation": "stryker run",
    "test:mutation:watch": "stryker run --watch",
    "typecheck": "tsc --noEmit",
    "lint": "biome lint ./src",
    "format": "biome format --write ./src",
    "check": "biome check --write ./src",
    "ci": "npm run typecheck && npm run lint && npm test"
  }
}
```

### Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.25.1",
    "express": "^5.2.1",
    "zod": "^4.2.1"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@stryker-mutator/core": "^8.0.0",
    "@stryker-mutator/vitest-runner": "^8.0.0",
    "@stryker-mutator/typescript-checker": "^8.0.0",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@vitest/ui": "^2.1.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

## Project Structure

```
tarantella-mcps/
├── src/                    # TypeScript source files
│   ├── server.ts          # Main Express app
│   ├── mcps/              # MCP implementations
│   │   └── slack/
│   │       ├── index.ts
│   │       ├── tools/
│   │       ├── services/
│   │       └── __tests__/
│   └── shared/            # Shared utilities
├── dist/                  # Compiled JavaScript (gitignored)
├── coverage/              # Coverage reports (gitignored)
├── .stryker-tmp/          # Stryker cache (gitignored)
├── tsconfig.json
├── biome.json
├── vitest.config.ts
├── stryker.config.json
└── package.json
```

## Development Workflow

### Daily Development

1. **Start development server:**
   ```bash
   npm run dev
   ```
   tsx runs in watch mode, automatically restarting on file changes.

2. **Run tests in watch mode:**
   ```bash
   npm test
   ```
   Vitest reruns affected tests on changes.

3. **Format and lint:**
   ```bash
   npm run check
   ```
   Biome formats, lints, and organizes imports in one command.

### Pre-Commit

```bash
npm run ci
```
Runs typecheck, lint, and tests. All must pass.

### Periodic Quality Checks

```bash
npm run test:coverage      # Check code coverage
npm run test:mutation      # Run mutation testing
```

Run mutation tests periodically (weekly or before major releases) as they're slower.

## Git Configuration

### .gitignore Updates

Add to `.gitignore`:
```
dist/
coverage/
.stryker-tmp/
*.tsbuildinfo
.DS_Store
```

## VSCode Configuration (Optional)

Create `.vscode/settings.json` for team consistency:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

Install VSCode extension: `biomejs.biome`

## Quality Enforcement Layers

This configuration enforces quality at four levels:

### 1. Compile Time (TypeScript)
- Type errors prevent compilation
- 16+ strict flags catch type issues
- No implicit `any`, unchecked indexes, or unreachable code

### 2. Lint Time (Biome)
- 20+ strict rules enforce code quality
- No `any`, no non-null assertions, no default exports
- Complexity limits keep functions simple
- Auto-formatting ensures consistency

### 3. Test Time (Vitest)
- 80% coverage minimum across all metrics
- Fast feedback with watch mode
- UI mode for debugging test failures

### 4. Mutation Time (Stryker)
- Tests the quality of tests
- 75% mutation score minimum
- Catches weak tests that coverage metrics miss

## Benefits

### Type Safety
- Catch bugs at compile time, not runtime
- Refactoring confidence with strict type checking
- No implicit behaviors or edge cases

### Code Quality
- Consistent formatting (no bikeshedding)
- Simple, testable functions
- Modern patterns (ESM, for...of, template literals)

### Test Confidence
- High coverage ensures code is tested
- Mutation testing ensures tests are effective
- Fast feedback loop with watch modes

### Developer Experience
- Instant startup with tsx (no build step)
- One command to check everything (`npm run check`)
- Clear error messages from TypeScript and Biome

## Implementation Checklist

- [ ] Create `tsconfig.json` with maximum strictness
- [ ] Create `biome.json` with strict rules
- [ ] Create `vitest.config.ts` with coverage thresholds
- [ ] Create `stryker.config.json` with mutation testing
- [ ] Update `package.json` with `"type": "module"`, scripts, and dependencies
- [ ] Update `.gitignore` with build artifacts
- [ ] Create `.vscode/settings.json` (optional)
- [ ] Install dependencies: `npm install`
- [ ] Create initial `src/` directory structure
- [ ] Verify setup with sample file and test
- [ ] Run full CI check: `npm run ci`

## Success Criteria

- ✅ `npm run typecheck` passes with zero errors
- ✅ `npm run lint` passes with zero errors
- ✅ `npm test` passes with 80%+ coverage
- ✅ `npm run test:mutation` achieves 75%+ mutation score
- ✅ `npm run ci` completes successfully
- ✅ `npm run dev` starts server with hot reload
- ✅ All strictness flags enforced at compile and lint time

## Future Enhancements (YAGNI)

Don't implement unless needed:
- Pre-commit hooks with Husky
- GitHub Actions CI workflow
- Code review automation
- Additional Biome plugins
- Custom ESLint rules (only if Biome lacks specific rules)
