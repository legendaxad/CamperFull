import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // One in-memory replica set per test file; files run in parallel workers.
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
