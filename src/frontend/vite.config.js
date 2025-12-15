/**
 * Vite Configuration
 * Configures Vite for development server and build process
 * Includes React plugin and test configuration
 * 
 * @see https://vite.dev/config/
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./setupTests.js",
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov"],
      all: true,
      include: [
        "Unit/**/*.{js,jsx,ts,tsx}",
        "lib/**/*.{js,jsx,ts,tsx}",
        "pages/**/*.{js,jsx,ts,tsx}",
        "*.jsx",
      ],
      exclude: [
        "**/*.test.{js,jsx,ts,tsx}",
        "node_modules/**",
        "vite.config.ts",
      ],
    },
  },
});
