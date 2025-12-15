/**
 * Test Setup Configuration
 * Configures the test environment for Vitest with React Testing Library
 * Provides mocks for browser APIs and common imports used in tests
 */

import { vi } from "vitest";
import "@testing-library/jest-dom";

if (typeof document === "undefined") {
  throw new Error(
    "document is not defined. Make sure vitest.config.js has environment: 'jsdom' configured."
  );
}

/**
 * Mock global fetch API
 */
globalThis.fetch =
  globalThis.fetch ||
  vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({}),
    }),
  );

/**
 * Mock localStorage API
 */
globalThis.localStorage = globalThis.localStorage || {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

/**
 * Mock matchMedia API for media query tests
 */
globalThis.matchMedia =
  globalThis.matchMedia ||
  vi.fn((query) => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

/**
 * Mock react-router-dom for routing tests
 */
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({ children }) => children,
  };
});

/**
 * Mock image imports
 */
vi.mock("../../img/logo3.png", () => "");
vi.mock("../../img/NFONLogoWhite.png", () => "");
vi.mock("../../img/magnifier.png", () => "");
vi.mock("../../img/magnifier-white.png", () => "");
