import { vi, beforeEach, describe, it, expect } from "vitest";

/**
 * Set environment variable before importing modules to enable mock authentication
 */
vi.stubEnv("VITE_USE_MOCK_AUTH", "true");

/**
 * Mock the MSAL module before importing AuthProvider
 * Provides stub implementations for Microsoft Authentication Library functions
 */
vi.mock("../../lib/msal", () => {
  return {
    msalInstance: {
      getAllAccounts: vi.fn(() => []),
      logoutPopup: vi.fn(() => Promise.resolve()),
      loginPopup: vi.fn(() => Promise.resolve({ account: { name: "Tester" } })),
      acquireTokenSilent: vi.fn(() =>
        Promise.resolve({ accessToken: "fake-token" }),
      ),
      handleRedirectPromise: vi.fn(() => Promise.resolve(null)),
      initialize: vi.fn(() => Promise.resolve()),
    },
    msalReady: Promise.resolve(),
  };
});

import React from "react";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../lib/AuthProvider";

/**
 * Test component to access and display authentication context values
 */
function TestComponent() {
  const { account, roles, accessToken, useMockAuth } = useAuth();
  return (
    <div>
      <span data-testid="account">{account ? account.name : "no-account"}</span>
      <span data-testid="roles">{roles.join(",")}</span>
      <span data-testid="token">{accessToken || "no-token"}</span>
      <span data-testid="mock">{useMockAuth ? "mock" : "real"}</span>
    </div>
  );
}

/**
 * Integration tests for AuthProvider component
 * Tests complete authentication workflows including login and logout
 */
describe("AuthProvider - Integration Tests", () => {
  /**
   * Setup: Clear session storage and mock fetch before each test
   */
  beforeEach(() => {
    sessionStorage.clear();
    globalThis.fetch = vi.fn();
  });

  /**
   * Test Case: Default authentication state
   * Verifies that AuthProvider provides correct default values when no user is logged in
   */
  it("provides default values without login", () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByTestId("account").textContent).toBe("no-account");
    expect(screen.getByTestId("roles").textContent).toBe("");
    expect(screen.getByTestId("token").textContent).toBe("no-token");
    expect(screen.getByTestId("mock").textContent).toBe("mock");
  });

  /**
   * Test Case: Mock login updates authentication state
   * Verifies that login successfully sets account, token, and roles
   */
  it("mock login sets account, token and roles", async () => {
    const mockResponse = {
      token: "mock-token",
      user: { email: "test@test.com", display_name: "Tester", role: "Admin" },
    };

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    let authContext;
    function LoginTest() {
      authContext = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <LoginTest />
      </AuthProvider>,
    );

    await act(async () => {
      await authContext.login({ username: "test", password: "123" });
    });

    expect(authContext.account.name).toBe("Tester");
    expect(authContext.roles).toEqual(["Admin"]);
    expect(authContext.accessToken).toBe("mock-token");
  });

  /**
   * Test Case: Mock logout clears authentication state
   * Verifies that logout removes account, token, and roles from state and storage
   */
  it("mock logout clears account, token and roles", async () => {
    sessionStorage.setItem("mock_session_token", "token123");
    sessionStorage.setItem(
      "mock_user",
      JSON.stringify({ email: "a", display_name: "B", role: "Admin" }),
    );

    let authContext;
    function LogoutTest() {
      authContext = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <LogoutTest />
      </AuthProvider>,
    );

    await act(async () => {
      await authContext.logout();
    });

    expect(authContext.account).toBeNull();
    expect(authContext.roles).toEqual([]);
    expect(authContext.accessToken).toBeNull();
    expect(sessionStorage.getItem("mock_session_token")).toBeNull();
    expect(sessionStorage.getItem("mock_user")).toBeNull();
  });
});
