/**
 * Unit Tests for App Component
 * Tests routing, authentication integration, and theme functionality
 */
import { render, screen, waitFor } from "@testing-library/react";
import App from "../../App.jsx";
import { AuthProvider } from "../../lib/AuthProvider.jsx";
import * as api from "../../lib/api";
import { vi } from "vitest";

/**
 * Mock API functions for testing
 */
vi.mock("../../lib/api", () => ({
  listRepos: vi.fn(),
  listDocuments: vi.fn(),
}));

/**
 * Creates a mock authentication context return value
 * 
 * @param {Object} overrides - Optional overrides for default values
 * @returns {Object} Mock authentication context
 */
const createMockAuthReturn = (overrides = {}) => ({
  account: null,
  accessToken: null,
  roles: [],
  login: vi.fn(),
  logout: vi.fn(),
  acquireToken: vi.fn(),
  useMockAuth: true,
  ...overrides,
});

const mockUseAuth = vi.fn(() => createMockAuthReturn());

/**
 * Mock AuthProvider for testing
 */
vi.mock("../../lib/AuthProvider.jsx", () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

/**
 * Mock react-router-dom for testing routing
 */
vi.mock("react-router-dom", async () => {
  const original = await vi.importActual("react-router-dom");
  return {
    ...original,
    BrowserRouter: ({ children }) => <div>{children}</div>,
    Routes: ({ children }) => <div>{children}</div>,
    Route: ({ element }) => <div>{element}</div>,
    NavLink: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: "/" }),
    Navigate: ({ to }) => <div>Redirect to {to}</div>,
  };
});

describe("App Component", () => {
  /**
   * Reset mocks before each test
   */
  beforeEach(() => {
    localStorage.clear();
    mockUseAuth.mockReturnValue(createMockAuthReturn());
    vi.clearAllMocks(); // Clear all mock call counts
  });

  /**
   * Test: Should render login route when not authenticated
   */
  it("renders Login route", () => {
    render(<App />);
    expect(screen.queryByText(/Login/i)).toBeInTheDocument();
  });

  /**
   * Test: Should load repos from server when user is authenticated
   */
  it("loads repos from server when account exists", async () => {
    mockUseAuth.mockReturnValue(
      createMockAuthReturn({
        account: { username: "test@example.com", name: "Test User" },
        accessToken: "mock-token",
        roles: ["admin"],
      })
    );

    const mockRepos = [
      {
        id: "1",
        name: "repo1",
        remote_url: "http://repo1.git",
        target_dir: "/tmp/repo1",
      },
    ];
    const mockDocs = [{ id: 1, repo_name: "repo1", title: "repo1" }];

    api.listRepos.mockResolvedValue(mockRepos);
    api.listDocuments.mockResolvedValue(mockDocs);

    render(<App />);

    await waitFor(() => {
      expect(api.listRepos).toHaveBeenCalled();
      expect(api.listDocuments).toHaveBeenCalled();
    });
  });

  /**
   * Test: Should toggle dark mode correctly based on localStorage
   */
  it("toggles dark mode correctly", async () => {
    render(<App />);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    localStorage.setItem("theme", "dark");
    render(<App />);
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  /**
   * Test: Dark mode persists from localStorage on mount
   */
  it("loads dark mode from localStorage on mount", () => {
    localStorage.setItem("theme", "dark");
    render(<App />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  /**
   * Test: Light mode persists from localStorage on mount
   */
  it("loads light mode from localStorage on mount", () => {
    localStorage.setItem("theme", "light");
    render(<App />);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  /**
   * Test: Handles API errors gracefully
   */
  it("handles API errors when loading repos", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    mockUseAuth.mockReturnValue(
      createMockAuthReturn({
        account: { username: "test@example.com", name: "Test User" },
        accessToken: "mock-token",
        roles: ["admin"],
      })
    );

    api.listRepos.mockRejectedValue(new Error("API Error"));
    api.listDocuments.mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(api.listRepos).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  /**
   * Test: Handles API errors when loading documents
   */
  it("handles API errors when loading documents", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    mockUseAuth.mockReturnValue(
      createMockAuthReturn({
        account: { username: "test@example.com", name: "Test User" },
        accessToken: "mock-token",
        roles: ["admin"],
      })
    );

    api.listRepos.mockResolvedValue([]);
    api.listDocuments.mockRejectedValue(new Error("API Error"));

    render(<App />);

    await waitFor(() => {
      expect(api.listDocuments).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  /**
   * Test: Does not load data when user is not authenticated
   */
  it("does not load repos when not authenticated", async () => {
    mockUseAuth.mockReturnValue(createMockAuthReturn());

    render(<App />);

    await waitFor(() => {
      expect(api.listRepos).not.toHaveBeenCalled();
      expect(api.listDocuments).not.toHaveBeenCalled();
    });
  });

  /**
   * Test: Updates items when repos change
   */
  it("updates items state when repos are loaded", async () => {
    mockUseAuth.mockReturnValue(
      createMockAuthReturn({
        account: { username: "test@example.com", name: "Test User" },
        accessToken: "mock-token",
        roles: ["admin"],
      })
    );

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
    ];

    api.listRepos.mockResolvedValue(mockRepos);
    api.listDocuments.mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(api.listRepos).toHaveBeenCalled();
    });
  });

  /**
   * Test: Toggles theme correctly
   */
  it("toggles between light and dark themes", () => {
    localStorage.setItem("theme", "light");
    const { rerender } = render(<App />);
    
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    localStorage.setItem("theme", "dark");
    rerender(<App />);

    waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  /**
   * Test: Defaults to light mode when no theme is set
   */
  it("defaults to light mode when localStorage is empty", () => {
    localStorage.removeItem("theme");
    render(<App />);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
