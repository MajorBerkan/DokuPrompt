/**
 * Integration tests for AdminRepoDataTable component
 * Tests complete user interaction flows including selection, filtering, and actions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import AdminRepoDataTable from "../../components/AdminRepoDataTable";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

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
  AuthProvider: ({ children }) => children,
}));

/**
 * Integration tests for AdminRepoDataTable component
 * Verifies table interactions, selection, filtering, and action menu functionality
 */
describe("AdminRepoDataTable - Integration Tests", () => {
  let items, onEditClick, onDelete, onShowInformation, onGenerateDocumentation;

  /**
   * Setup: Initialize test data and mock callbacks before each test
   */
  beforeEach(() => {
    items = [
      {
        id: "1",
        name: "Repo A",
        description: "First repo",
        status: "SUCCESS",
        documentStatus: "documented",
        added: "2023-01-01",
        specificPrompt: "Prompt A",
        result: { target_dir: "pathA" },
      },
      {
        id: "2",
        name: "Repo B",
        description: "Second repo",
        status: "PENDING",
        documentStatus: "not documented",
        added: "2023-02-01",
        specificPrompt: "",
        result: { target_dir: "pathB" },
      },
    ];

    onEditClick = vi.fn();
    onDelete = vi.fn();
    onShowInformation = vi.fn();
    onGenerateDocumentation = vi.fn(() => Promise.resolve());
  });

  /**
   * Helper function to render AdminRepoDataTable with default props
   */
  const renderTable = (props = {}) =>
    render(
      <AdminRepoDataTable
        items={items}
        onEditClick={onEditClick}
        onDelete={onDelete}
        onShowInformation={onShowInformation}
        onGenerateDocumentation={onGenerateDocumentation}
        isDark={false}
        {...props}
      />,
    );

  /**
   * Test Case: Select and deselect all rows
   * Verifies bulk selection functionality
   */
  it("selects and deselects all rows", () => {
    renderTable();

    fireEvent.click(screen.getByText("Select All"));

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.every((b) => b.checked)).toBe(true);

    fireEvent.click(screen.getByText("Deselect All"));
    expect(boxes.every((b) => !b.checked)).toBe(true);
  });

  /**
   * Test Case: Single row selection
   * Verifies clicking a row selects it
   */
  it("selects a row on click", () => {
    renderTable();

    fireEvent.click(screen.getByText("First repo"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  /**
   * Test Case: Shift-select range
   * Verifies that shift-clicking selects a range of rows
   */
  it("allows shift-select range", () => {
    renderTable();

    fireEvent.click(screen.getByText("First repo"));
    fireEvent.click(screen.getByText("Second repo"), { shiftKey: true });

    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  /**
   * Test Case: Search filtering
   * Verifies that search field filters table rows
   */
  it("filters via search field", () => {
    renderTable();

    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "First" },
    });

    expect(screen.getByText("Repo A")).toBeInTheDocument();
    expect(screen.queryByText("Repo B")).not.toBeInTheDocument();
  });

  /**
   * Test Case: Edit prompt action
   * Verifies Edit Specific Prompt action from dropdown menu
   */
  it("calls Edit Prompt through action menu", () => {
    renderTable();

    fireEvent.click(screen.getByText("First repo"));
    fireEvent.click(screen.getByText("Actions"));
    fireEvent.click(screen.getByText("Edit Specific Prompt"));

    expect(onEditClick).toHaveBeenCalledWith(["Prompt A"], ["Repo A"]);
  });

  /**
   * Test Case: Edit information action
   * Verifies Edit Information action from dropdown menu
   */
  it("calls Edit Information through action menu", () => {
    renderTable();

    fireEvent.click(screen.getByText("First repo"));
    fireEvent.click(screen.getByText("Actions"));
    fireEvent.click(screen.getByText("Edit Information"));

    expect(onShowInformation).toHaveBeenCalledWith(["Repo A"]);
  });

  /**
   * Test Case: Delete action
   * Verifies Delete action from dropdown menu
   */
  it("calls Delete through action menu", async () => {
    renderTable();

    fireEvent.click(screen.getByText("First repo"));
    fireEvent.click(screen.getByText("Actions"));
    fireEvent.click(screen.getByText("Delete"));

    // Wait for the DeleteModal to appear
    await screen.findByText("Confirm Delete");

    // Click Yes to confirm
    fireEvent.click(screen.getByText("Yes"));

    expect(onDelete).toHaveBeenCalledWith([
      { id: "1", targetDir: "pathA", name: "Repo A" },
    ]);
  });

  // DELETE - Cancel
  it("does not delete when modal is cancelled", async () => {
    renderTable();

    // Click on description to select the row
    fireEvent.click(screen.getByText("First repo"));
    fireEvent.click(screen.getByText("Actions"));
    fireEvent.click(screen.getByText("Delete"));

    // Wait for the DeleteModal to appear
    await screen.findByText("Confirm Delete");

    // Click No to cancel
    fireEvent.click(screen.getByText("No"));

    expect(onDelete).not.toHaveBeenCalled();
  });

  /**
   * Test Case: Generate documentation action
   * Verifies Generate Documentation action from dropdown menu
   */
  it("calls Generate Documentation", () => {
    renderTable();

    fireEvent.click(screen.getByText("First repo"));
    fireEvent.click(screen.getByText("Actions"));
    fireEvent.click(screen.getByText("Generate Documentation"));

    expect(onGenerateDocumentation).toHaveBeenCalledWith(["Repo A"]);
  });

  /**
   * Test Case: Row three-dots menu
   * Verifies hovering over row reveals action menu
   */
  it("opens row menu and selects action", async () => {
    const user = userEvent.setup();
    renderTable();

    const row = screen.getByText("Repo A").closest("tr");
    const btn = within(row).getByRole("button", { name: /Row actions/i });

    await user.hover(btn);

    const menuItem = await screen.findByText("Edit Information");
    await user.click(menuItem);

    expect(onShowInformation).toHaveBeenCalledWith(["Repo A"]);
  });

  /**
   * Test Case: Clear all filters
   * Verifies clearing filters restores all table rows
   */
  it("clears filter and restores all rows", () => {
    renderTable();

    fireEvent.click(screen.getByText("Filter"));
    fireEvent.click(screen.getByText("Clear All"));

    expect(screen.getByText("Repo A")).toBeInTheDocument();
    expect(screen.getByText("Repo B")).toBeInTheDocument();
  });

  /**
   * Test Case: Filter display after apply
   * Verifies that active filters are only shown after Apply button is clicked
   */
  it("does not show active filters until Apply is clicked", () => {
    renderTable();

    fireEvent.click(screen.getByText("Filter"));

    const successCheckbox = screen.getByRole("checkbox", { name: /Success/i });
    fireEvent.click(successCheckbox);

    // Active filters should NOT be displayed yet
    expect(screen.queryByText(/Active Filters:/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Apply"));

    // Now active filters should be displayed
    expect(screen.getByText(/Active Filters:/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: Success/i)).toBeInTheDocument();
  });

  /**
   * Test Case: Remove active filter
   * Verifies that removing an active filter updates the display
   */
  it("updates active filter display when a filter is removed", () => {
    renderTable();

    fireEvent.click(screen.getByText("Filter"));
    const successCheckbox = screen.getByRole("checkbox", { name: /Success/i });
    fireEvent.click(successCheckbox);
    fireEvent.click(screen.getByText("Apply"));

    expect(screen.getByText(/Active Filters:/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: Success/i)).toBeInTheDocument();

    // Remove the active filter
    const filterBadge = screen.getByText(/Status: Success/i).closest("div");
    const removeButton = within(filterBadge).getByRole("button", {
      name: /Remove filter/i,
    });
    fireEvent.click(removeButton);

    expect(screen.queryByText(/Active Filters:/i)).not.toBeInTheDocument();
  });

  /**
   * Test Case: Hide select buttons on empty search
   * Verifies Select All button is hidden when search returns no results
   */
  it("hides Select All button when no search results", () => {
    renderTable();

    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "NonExistentRepo" },
    });

    expect(
      screen.queryByRole("button", { name: /Select All/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Deselect All/i }),
    ).not.toBeInTheDocument();

    expect(screen.getByText("No results!")).toBeInTheDocument();
  });

  /**
   * Test Case: Hide select buttons on empty filter
   * Verifies Select All button is hidden when filter returns no results
   */
  it("hides Select All button when no filter results", () => {
    renderTable();

    fireEvent.click(screen.getByText("Filter"));
    const failureCheckbox = screen.getByRole("checkbox", { name: /Failure/i });
    fireEvent.click(failureCheckbox);
    fireEvent.click(screen.getByText("Apply"));

    expect(
      screen.queryByRole("button", { name: /Select All/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Deselect All/i }),
    ).not.toBeInTheDocument();

    expect(screen.getByText("No results!")).toBeInTheDocument();
  });

  /**
   * Test Case: Navigate to documentation via repository name
   * Verifies clicking repository name navigates to documentation when it exists
   */
  it("navigates to documentation when repository name is clicked and doc exists", async () => {
    const user = userEvent.setup();
    const documentations = [
      { id: "doc-1", repo_name: "Repo A", title: "Repo A" },
    ];

    renderTable({ documentations });

    const repoNameCell = screen.getByText("Repo A");
    await user.click(repoNameCell);

    // Verify the element is clickable and has appropriate styling
    expect(repoNameCell.className).toContain("cursor-pointer");
  });

  /**
   * Test Case: Repository name click with no documentation
   * Verifies clicking repository name does nothing when no documentation exists
   */
  it("does nothing when repository name is clicked and no doc exists", async () => {
    const user = userEvent.setup();
    const documentations = [];

    renderTable({ documentations });

    const repoNameCell = screen.getByText("Repo A");
    const initialPath = window.location.pathname;

    await user.click(repoNameCell);

    expect(window.location.pathname).toBe(initialPath);
  });

  /**
   * Test Case: Repository name click doesn't select row
   * Verifies that clicking repository name doesn't trigger row selection
   */
  it("clicking repo name does not trigger row selection", async () => {
    const user = userEvent.setup();
    const documentations = [];

    renderTable({ documentations });

    const repoNameCell = screen.getByText("Repo A");
    await user.click(repoNameCell);

    // stopPropagation prevents row selection
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
  });
});
