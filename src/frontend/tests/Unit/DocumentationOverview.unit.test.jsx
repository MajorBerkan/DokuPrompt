/**
 * Unit tests for DocumentationOverview Component
 * Tests document search, highlighting functionality, and component rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import DocumentationOverview, {
  highlightText,
} from "../../components/DocumentationOverview.jsx";
import { searchDocuments, debugSearch } from "../../lib/api.js";

/**
 * Mock useAuth hook for authentication context
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
 * Mock API functions for search operations
 */
vi.mock("../../lib/api.js", () => ({
  searchDocuments: vi.fn(),
  debugSearch: vi.fn(),
}));

/**
 * Unit tests for highlightText utility function
 * Tests text highlighting with mark tags
 */
describe("highlightText", () => {
  /**
   * Test: Returns original text when search term is empty
   */
  it("returns original text if term is empty", () => {
    const result = highlightText("Hello World", "");
    expect(result).toStrictEqual("Hello World");
  });

  /**
   * Test: Wraps matching term in <mark> tags for highlighting
   */
  it("wraps matching term in <mark>", () => {
    const result = highlightText("Hello World", "World");
    const { container } = render(<>{result}</>);
    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark.textContent).toBe("World");
  });

  /**
   * Test: Highlights multiple occurrences with case-insensitive matching
   */
  it("highlights multiple occurrences (case-insensitive)", () => {
    const result = highlightText("Test test TEST", "test");
    const { container } = render(<>{result}</>);
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(3);
    expect(Array.from(marks).map((m) => m.textContent)).toEqual([
      "Test",
      "test",
      "TEST",
    ]);
  });
});

/**
 * Component tests for DocumentationOverview
 */
describe("DocumentationOverview Component", () => {
  const mockDocs = [
    {
      id: 1,
      title: "First Doc",
      content_snippet: "Lorem ipsum",
      added: "2025-01-01",
      latestUpdate: "2025-01-02",
    },
    {
      id: 2,
      title: "Second Doc",
      content_snippet: "Dolor sit amet",
      added: "2025-02-01",
      latestUpdate: "2025-02-02",
    },
  ];

  const mockDelete = vi.fn();
  const mockUpdate = vi.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock debugSearch to return empty array (it's called on mount)
    debugSearch.mockResolvedValue([]);

    // Mock searchDocuments to return filtered results based on search term
    searchDocuments.mockImplementation((query) => {
      if (query === "First") {
        return Promise.resolve([mockDocs[0]]);
      }
      return Promise.resolve(mockDocs);
    });
  });

  it("renders default view if no searchTerm", () => {
    render(
      <DocumentationOverview
        documentations={mockDocs}
        searchTerm=""
        onDelete={mockDelete}
        onUpdate={mockUpdate}
      />,
    );
    expect(screen.getByText("Documentation Overview")).toBeInTheDocument();
    expect(
      screen.getByText("Select a documentation from the sidebar to open it."),
    ).toBeInTheDocument();
  });

  it("shows search results when searchTerm is provided", async () => {
    render(
      <DocumentationOverview
        documentations={mockDocs}
        searchTerm="First"
        onDelete={mockDelete}
        onUpdate={mockUpdate}
      />,
    );

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 400));
    // After debounce, results table header
    expect(screen.getByText("Search Results")).toBeInTheDocument();
  });

  it("selects and deselects rows", async () => {
    render(
      <DocumentationOverview
        documentations={mockDocs}
        searchTerm="First"
        onDelete={mockDelete}
        onUpdate={mockUpdate}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Initially no selection - should show Select All
    const selectAllBtn = screen.getByText("Select All");
    expect(selectAllBtn).toBeInTheDocument();

    // Use a function matcher to find text that may be split by mark elements
    const row = screen
      .getByText((content, element) => {
        return element?.textContent === "First Doc";
      })
      .closest("tr");
    fireEvent.click(row);
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    // After selecting a row, button should change to "Deselect All"
    const deselectAllBtn = screen.getByText("Deselect All");
    fireEvent.click(deselectAllBtn);
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
  });

  it("invokes onDelete when delete action is clicked", async () => {
    render(
      <DocumentationOverview
        documentations={mockDocs}
        searchTerm="First"
        onDelete={mockDelete}
        onUpdate={mockUpdate}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Use a function matcher to find text that may be split by mark elements
    const row = screen
      .getByText((content, element) => {
        return element?.textContent === "First Doc";
      })
      .closest("tr");
    fireEvent.click(row);

    const actionsBtn = screen.getByText("Actions");
    fireEvent.click(actionsBtn);

    const deleteOption = screen.getByText("Delete");
    fireEvent.click(deleteOption);

    // Wait for the DeleteModal to appear
    await screen.findByText("Confirm Delete");

    // Click Yes to confirm
    fireEvent.click(screen.getByText("Yes"));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockDelete).toHaveBeenCalledWith([1]);
  });

  it("invokes onUpdate when update action is clicked", async () => {
    render(
      <DocumentationOverview
        documentations={mockDocs}
        searchTerm="First"
        onDelete={mockDelete}
        onUpdate={mockUpdate}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 400));
    // Use a function matcher to find text that may be split by mark elements
    const row = screen
      .getByText((content, element) => {
        return element?.textContent === "First Doc";
      })
      .closest("tr");
    fireEvent.click(row);

    const actionsBtn = screen.getByText("Actions");
    fireEvent.click(actionsBtn);

    const updateOption = screen.getByText("Update manually");
    fireEvent.click(updateOption);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockUpdate).toHaveBeenCalledWith([1]);
  });
});
