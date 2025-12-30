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
        statements: 80,
      },
    },

    // Global test utilities
    globals: true,

    // Test file patterns
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});