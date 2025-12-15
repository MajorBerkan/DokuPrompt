import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DocumentationOverview from "../../components/DocumentationOverview";
import * as api from "../../lib/api.js";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/vitest";

/**
 * Mock API module to prevent actual API calls
 */
vi.mock("../../lib/api.js");

/**
 * Mock authentication provider to simulate admin user
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
 * Helper function to find a table row by document title
 */
const getRowByTitle = (title) =>
  screen
    .getByText((content, element) => element?.textContent === title)
    .closest("tr");

/**
 * Integration tests for DocumentationOverview component
 * Tests search results display, row selection, and actions menu
 */
describe("DocumentationOverview - Integration Tests", () => {
  const mockDocs = [
    {
      id: 1,
      title: "Doc One",
      content_snippet: "Content 1",
      added: "2023-01-01",
      latestUpdate: "2023-01-02",
    },
    {
      id: 2,
      title: "Doc Two",
      content_snippet: "Content 2",
      added: "2023-01-03",
      latestUpdate: "2023-01-04",
    },
  ];

  /**
   * Setup: Mock API responses before each test
   */
  beforeEach(() => {
    api.searchDocuments.mockResolvedValue(mockDocs);
    api.debugSearch.mockResolvedValue(mockDocs);
  });

  /**
   * Test Case: Display search results
   * Verifies that documents are rendered when search term is provided
   */
  it("renders search results when searchTerm is provided", async () => {
    render(
      <MemoryRouter>
        <DocumentationOverview
          searchTerm="Doc"
          documentations={mockDocs}
          onDelete={vi.fn()}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          (content, element) => element?.textContent === "Doc One",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          (content, element) => element?.textContent === "Doc Two",
        ),
      ).toBeInTheDocument();
    });
  });

  /**
   * Test Case: Select row and show actions
   * Verifies that clicking a row selects it and displays Actions button
   */
  it("selects a row on click and shows Actions button", async () => {
    render(
      <MemoryRouter>
        <DocumentationOverview
          searchTerm="Doc"
          documentations={mockDocs}
          onDelete={vi.fn()}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Wait for the row to be rendered
    await waitFor(() => {
      expect(screen.getByText((content, element) => element?.textContent === "Doc One")).toBeInTheDocument();
    });

    // Click the row
    fireEvent.click(getRowByTitle("Doc One"));

    // Wait for Actions button to appear
    await waitFor(() => {
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });
  });

  /**
   * Test Case: Delete action workflow
   * Verifies that Delete action from menu calls onDelete callback
   */
  it("performs delete action when Actions -> Delete clicked", async () => {
    const onDelete = vi.fn().mockResolvedValue();

    render(
      <MemoryRouter>
        <DocumentationOverview
          searchTerm="Doc"
          documentations={mockDocs}
          onDelete={onDelete}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Wait for the row to be rendered
    await waitFor(() => {
      expect(screen.getByText((content, element) => element?.textContent === "Doc One")).toBeInTheDocument();
    });

    // Click the row
    fireEvent.click(getRowByTitle("Doc One"));

    // Wait for Actions button to appear
    await waitFor(() => {
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    // Click Actions button
    fireEvent.click(screen.getByText("Actions"));

    // Wait for Delete option to appear
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    // Click Delete
    fireEvent.click(screen.getByText("Delete"));

    // Wait for the DeleteModal to appear
    await screen.findByText("Confirm Delete");

    // Click Yes to confirm
    fireEvent.click(screen.getByText("Yes"));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith([1]);
    });
  });

  it("does not delete when modal is cancelled", async () => {
    const onDelete = vi.fn().mockResolvedValue();

    render(
      <MemoryRouter>
        <DocumentationOverview
          searchTerm="Doc"
          documentations={mockDocs}
          onDelete={onDelete}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Wait for the row to be rendered
    await waitFor(() => {
      expect(screen.getByText((content, element) => element?.textContent === "Doc One")).toBeInTheDocument();
    });

    // Click the row
    fireEvent.click(getRowByTitle("Doc One"));

    // Wait for Actions button to appear
    await waitFor(() => {
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    // Click Actions button
    fireEvent.click(screen.getByText("Actions"));

    // Wait for Delete option to appear
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    // Click Delete
    fireEvent.click(screen.getByText("Delete"));

    // Wait for the DeleteModal to appear
    await screen.findByText("Confirm Delete");

    // Click No to cancel
    fireEvent.click(screen.getByText("No"));

    expect(onDelete).not.toHaveBeenCalled();
  });

  /**
   * Test Case: Manual update action workflow
   * Verifies that Update manually action calls onUpdate callback
   */
  it("performs update action when Actions -> Update manually clicked", async () => {
    const onUpdate = vi.fn().mockResolvedValue();

    render(
      <MemoryRouter>
        <DocumentationOverview
          searchTerm="Doc"
          documentations={mockDocs}
          onDelete={vi.fn()}
          onUpdate={onUpdate}
        />
      </MemoryRouter>,
    );

    // Wait for the row to be rendered
    await waitFor(() => {
      expect(screen.getByText((content, element) => element?.textContent === "Doc One")).toBeInTheDocument();
    });

    // Click the row
    fireEvent.click(getRowByTitle("Doc One"));

    // Wait for Actions button to appear
    await waitFor(() => {
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    // Click Actions button
    fireEvent.click(screen.getByText("Actions"));

    // Wait for Update manually option to appear
    await waitFor(() => {
      expect(screen.getByText("Update manually")).toBeInTheDocument();
    });

    // Click Update manually
    fireEvent.click(screen.getByText("Update manually"));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith([1]);
    });
  });

  /**
   * Test Case: Empty search results
   * Verifies that "No results!" message is displayed when search returns nothing
   */
  it("renders 'No results!' when searchDocuments returns empty", async () => {
    api.searchDocuments.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <DocumentationOverview
          searchTerm="Nothing"
          documentations={[]}
          onDelete={vi.fn()}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("No results!")).toBeInTheDocument();
    });
  });
});
