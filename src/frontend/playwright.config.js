/**
 * Playwright Configuration
 * Configures Playwright for end-to-end testing
 * Includes browser configurations and test settings
 *
 * @see https://playwright.dev/docs/test-configuration
 */
import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    headless: process.env.CI ? true : false,
    viewport: null,
    slowMo: 600,
    actionTimeout: 0,
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    env: {
      VITE_USE_MOCK_AUTH: "true",
    },
    launchOptions: {
      args: ["--start-maximized"],
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],

  /**
   * Start dev server before running tests
   */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    cwd: path.resolve(__dirname),
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
