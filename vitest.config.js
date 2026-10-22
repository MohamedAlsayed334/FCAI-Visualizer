import { defineConfig } from 'vitest/config';

// Vitest runs the pure layers (domain / application / algorithms) in Node.
// React components and the imperative canvas visualizers are deliberately out
// of scope — the logic they render lives in the pure layers and is covered
// there. See AGENTS.md → "Architecture".
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    // No globals: every test file imports { describe, it, expect } from 'vitest'.
    globals: false,
  },
});
