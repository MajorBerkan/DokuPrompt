/**
 * Unit tests for main.jsx rendering
 * Tests React application initialization and basic rendering
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import ReactDOM from "react-dom/client";
import App from "../../App.jsx";
import { AuthProvider } from "../../lib/AuthProvider.jsx";
import { vi } from "vitest";

import * as ActualAuthProvider from "../../lib/AuthProvider.jsx";

/**
 * Mock AuthProvider for testing without authentication
 */
vi.mock("../../lib/AuthProvider.jsx", async () => {
  const original = await vi.importActual("../../lib/AuthProvider.jsx");

  return {
    ...original,
    useAuth: vi.fn(() => ({
      account: null,
      accessToken: null,
      roles: [],
      login: vi.fn(),
      logout: vi.fn(),
      acquireToken: vi.fn(),
    })),

    AuthProvider: ({ children }) => <div>{children}</div>,
  };
});

/**
 * Setup DOM root element before all tests
 */
beforeAll(() => {
  const rootDiv = document.createElement("div");
  rootDiv.setAttribute("id", "root");
  document.body.appendChild(rootDiv);
});

describe("ReactDOM render", () => {
  /**
   * Test: App renders inside AuthProvider without throwing errors
   * Verifies basic application initialization
   */
  it("renders App inside AuthProvider without crashing", () => {
    const root = document.getElementById("root");
    const createRoot = ReactDOM.createRoot(root);

    expect(() => {
      createRoot.render(
        <React.StrictMode>
          <AuthProvider>
            <App />
          </AuthProvider>
        </React.StrictMode>,
      );
    }).not.toThrow();
  });

  /**
   * Test: App renders basic content (login button)
   * Verifies initial route renders correctly for unauthenticated user
   */
  it("renders basic App content", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });
});
