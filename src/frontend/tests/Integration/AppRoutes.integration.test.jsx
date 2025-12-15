/**
 * Integration tests for AppRoutes component
 * Tests routing behavior and component rendering for different paths
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppRoutes from "../../components/AppRoutes";
import * as api from "../../lib/api";
import "@testing-library/jest-dom/vitest";

/**
 * Mock API module to prevent actual API calls during routing tests
 */
vi.mock("../../lib/api");

/**
 * Mock authentication provider to simulate authenticated user
 */
vi.mock("../../lib/AuthProvider.jsx", () => ({
  useAuth: vi.fn(() => ({
    account: { username: "test@example.com", name: "Test User" },
    accessToken: "mock-token",
    roles: ["admin"],
    login: vi.fn(),
    logout: vi.fn(),
    acquireToken: vi.fn(),
    useMockAuth: false,
  })),
}));

/**
 * Mock NotificationPopUp component to simplify test assertions
 */
vi.mock("../../components/NotificationPopUp.jsx", () => ({
  default: ({ title, message }) => (
    <div data-testid="popup">
      {title}: {message}
    </div>
  ),
}));

/**
 * Mock DocumentationOverview component to test document rendering
 */
vi.mock("../../components/DocumentationOverview.jsx", () => ({
  default: ({ documentations }) => (
    <div>
      {documentations.map((d) => (
        <div key={d.id}>{d.title}</div>
      ))}
    </div>
  ),
}));

/**
 * Mock AdminRepoPage component for repository management route
 */
vi.mock("../../pages/AdminRepoPage.jsx", () => ({
  default: () => (
    <div>
      <div>Repository Management</div>
    </div>
  ),
}));

/**
 * Mock DocumentationViewWrapper for individual documentation view route
 */
vi.mock("../../components/DocumentationViewWrapper.jsx", () => ({
  default: () => <div>DocumentationViewWrapper</div>,
}));

/**
 * Integration tests for AppRoutes component
 * Verifies proper routing and data loading for different application paths
 */
describe("AppRoutes - Integration Tests", () => {
  /**
   * Setup: Mock API responses before each test
   */
  beforeEach(() => {
    api.listDocuments.mockResolvedValue([
      {
        id: 1,
        title: "Doc1",
        created_at: "2023-01-01",
        updated_at: "2023-01-02",
      },
      {
        id: 2,
        title: "Doc2",
        created_at: "2023-01-03",
        updated_at: "2023-01-04",
      },
    ]);

    api.deleteDocuments.mockResolvedValue({ deleted_count: 2 });
  });

  /**
   * Test Case: Render documentation overview on root path
   * Verifies that root path loads and displays list of documents
   */
  it("renders DocumentationOverview on root path and loads documents", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes
          items={[]}
          setItems={vi.fn()}
          setDocsRefreshTrigger={vi.fn()}
          setReposRefreshTrigger={vi.fn()}
          searchTerm=""
          setSearchTerm={vi.fn()}
          isDark={false}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Doc1")).toBeInTheDocument();
      expect(screen.getByText("Doc2")).toBeInTheDocument();
    });
  });

  /**
   * Test Case: Render repository management page
   * Verifies that /repositories path displays admin repository page
   */
  it("renders AdminRepoPage on /repositories path", () => {
    render(
      <MemoryRouter initialEntries={["/repositories"]}>
        <AppRoutes
          items={[]}
          setItems={vi.fn()}
          setDocsRefreshTrigger={vi.fn()}
          setReposRefreshTrigger={vi.fn()}
          searchTerm=""
          setSearchTerm={vi.fn()}
          isDark={false}
          showGeneralSettings={false}
          setShowGeneralSettings={vi.fn()}
          showEditSpecificPrompt={false}
          setShowEditSpecificPrompt={vi.fn()}
          showInformation={false}
          setShowInformation={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Repository Management")).toBeInTheDocument();
  });

  /**
   * Test Case: Render individual documentation view
   * Verifies that /documentations/:id path displays specific documentation
   */
  it("renders DocumentationViewWrapper on /documentations/:id path", () => {
    render(
      <MemoryRouter initialEntries={["/documentations/1"]}>
        <AppRoutes
          items={[]}
          setItems={vi.fn()}
          setDocsRefreshTrigger={vi.fn()}
          setReposRefreshTrigger={vi.fn()}
          searchTerm=""
          setSearchTerm={vi.fn()}
          isDark={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("DocumentationViewWrapper")).toBeInTheDocument();
  });
});
