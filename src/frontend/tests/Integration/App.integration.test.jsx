import { render, screen, waitFor } from "@testing-library/react";
import App from "../../App.jsx";
import { vi } from "vitest";

import * as api from "../../lib/api";
import { MemoryRouter } from "react-router-dom";

/**
 * Mock API module functions to prevent actual API calls during integration tests
 */
vi.mock("../../lib/api", () => ({
  listRepos: vi.fn(),
  listDocuments: vi.fn(),
}));

/**
 * Create a mock authentication function that can be updated per test case
 * Default state represents an unauthenticated user
 */
const mockUseAuth = vi.fn(() => ({
  account: null,
  accessToken: null,
  roles: [],
  login: vi.fn(),
  logout: vi.fn(),
  acquireToken: vi.fn(),
  useMockAuth: true,
}));

/**
 * Mock the authentication provider to control authentication state in tests
 */
vi.mock("../../lib/AuthProvider.jsx", () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

/**
 * Mock react-router-dom to control routing behavior in tests
 * Allows testing navigation without actual page changes
 */
vi.mock("react-router-dom", async () => {
  const original = await vi.importActual("react-router-dom");
  return {
    ...original,
    BrowserRouter: ({ children }) => <div>{children}</div>,
    Routes: ({ children }) => <div>{children}</div>,
    Route: ({ element, path }) => element,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: "/" }),
    Navigate: ({ to }) => <div>Redirect to {to}</div>,
  };
});

/**
 * Integration tests for App component
 * Tests authentication flow and data fetching behavior
 */
describe("App Integration", () => {
  /**
   * Test Case: Redirect unauthenticated users to login
   * Verifies that users without authentication are redirected to /login
   */
  it("redirects to /login if user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      account: null,
      accessToken: null,
      roles: [],
      login: vi.fn(),
      logout: vi.fn(),
      acquireToken: vi.fn(),
      useMockAuth: true,
    });

    render(<App />);
    expect(screen.getByText(/Redirect to \/login/i)).toBeInTheDocument();
  });

  /**
   * Test Case: Fetch data after successful authentication
   * Verifies that authenticated users trigger repository and document fetching
   */
  it("fetches repos and documents after authentication", async () => {
    // Setup mock data for repositories
    const mockRepos = [
      {
        id: "1",
        name: "repo1",
        remote_url: "http://repo1.git",
        target_dir: "/tmp/repo1",
      },
    ];
    // Setup mock data for documents
    const mockDocs = [
      {
        id: 1,
        repo_name: "repo1",
        title: "Test Document",
      },
    ];

    api.listRepos.mockResolvedValue(mockRepos);
    api.listDocuments.mockResolvedValue(mockDocs);

    // Mock authenticated user state
    mockUseAuth.mockReturnValue({
      account: { username: "test@example.com", name: "Test User" },
      accessToken: "mock-token",
      roles: ["Admin"],
      login: vi.fn(),
      logout: vi.fn(),
      acquireToken: vi.fn(),
      useMockAuth: true,
    });

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    // Verify that data fetching functions are called after authentication
    await waitFor(() => {
      expect(api.listRepos).toHaveBeenCalled();
      expect(api.listDocuments).toHaveBeenCalled();
    });
  });

  /**
   * Test Case: Theme persistence across sessions
   * Verifies dark mode setting is saved and loaded correctly
   */
  it("persists theme setting in localStorage", async () => {
    localStorage.setItem("theme", "dark");

    mockUseAuth.mockReturnValue({
      account: { username: "test@example.com", name: "Test User" },
      accessToken: "mock-token",
      roles: ["Admin"],
      login: vi.fn(),
      logout: vi.fn(),
      acquireToken: vi.fn(),
      useMockAuth: true,
    });

    api.listRepos.mockResolvedValue([]);
    api.listDocuments.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  /**
   * Test Case: Handles simultaneous API failures
   * Verifies app remains stable when both API calls fail
   */
  it("handles both API calls failing gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockUseAuth.mockReturnValue({
      account: { username: "test@example.com", name: "Test User" },
      accessToken: "mock-token",
      roles: ["Admin"],
      login: vi.fn(),
      logout: vi.fn(),
      acquireToken: vi.fn(),
      useMockAuth: true,
    });

    api.listRepos.mockRejectedValue(new Error("Repos API Error"));
    api.listDocuments.mockRejectedValue(new Error("Docs API Error"));

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(api.listRepos).toHaveBeenCalled();
      expect(api.listDocuments).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  /**
   * Test Case: Re-fetches data on authentication change
   * Verifies data reload when user logs in
   */
  it("refetches data when authentication state changes", async () => {
    // Clear any previous calls
    vi.clearAllMocks();
    
    // Start unauthenticated
    mockUseAuth.mockReturnValue({
      account: null,
      accessToken: null,
      roles: [],
      login: vi.fn(),
      logout: vi.fn(),
      acquireToken: vi.fn(),
      useMockAuth: true,
    });

    api.listRepos.mockResolvedValue([]);
    api.listDocuments.mockResolvedValue([]);

    const { rerender } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    // Wait a bit to ensure no calls are made
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Record the call count before authentication
    const callCountBefore = api.listRepos.mock.calls.length;

    // Update to authenticated
    mockUseAuth.mockReturnValue({
      account: { username: "test@example.com", name: "Test User" },
      accessToken: "mock-token",
      roles: ["Admin"],
      login: vi.fn(),
      logout: vi.fn(),
      acquireToken: vi.fn(),
      useMockAuth: true,
    });

    rerender(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    // Verify that after authentication, more calls were made
    await waitFor(() => {
      expect(api.listRepos.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });

  /**
   * Test Case: Loads multiple repositories
   * Verifies handling of multiple repository records
   */
  it("handles multiple repositories correctly", async () => {
    const mockRepos = [
      {
        id: "1",
        name: "repo1",
        remote_url: "http://repo1.git",
        target_dir: "/tmp/repo1",
      },
      {
        id: "2",
        name: "repo2",
        remote_url: "http://repo2.git",
        target_dir: "/tmp/repo2",
      },
      {
        id: "3",
        name: "repo3",
        remote_url: "http://repo3.git",
        target_dir: "/tmp/repo3",
      },
    ];

    mockUseAuth.mockReturnValue({
      account: { username: "test@example.com", name: "Test User" },
      accessToken: "mock-token",
      roles: ["Admin"],
      login: vi.fn(),
      logout: vi.fn(),
      acquireToken: vi.fn(),
      useMockAuth: true,
    });

    api.listRepos.mockResolvedValue(mockRepos);
    api.listDocuments.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(api.listRepos).toHaveBeenCalled();
    });
  });
});
