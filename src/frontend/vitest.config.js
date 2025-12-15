/**
 * Vitest Configuration
 * Configures Vitest test runner for unit and integration tests
 * Uses jsdom environment for DOM testing with React
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    exclude: ["**/*.spec.js*", "node_modules/**"],
    environment: "jsdom",
    setupFiles: "./setupTests.js",
    testTimeout: 10000, // Increase timeout for integration tests to handle slower CI environments
    environmentOptions: {
      jsdom: {
        resources: "usable",
      },
    },
    env: {
      VITE_USE_MOCK_AUTH: "true",
    },
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
