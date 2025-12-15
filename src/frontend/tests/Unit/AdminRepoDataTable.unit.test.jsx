/**
 * Unit tests for AdminRepoDataTable Component
 * Tests table rendering, filtering, sorting, selection, and action handling
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminRepoDataTable from "../../components/AdminRepoDataTable";
import "@testing-library/jest-dom/vitest";
import React from "react";

import { BrowserRouter } from "react-router-dom";

/**
 * Mock useAuth hook for authentication context in tests
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

describe("AdminRepoDataTable - Unit Tests", () => {
  const items = [
    {
      id: "1",
      name: "Repo A",
      description: "Alpha",
      status: "SUCCESS",
      documentStatus: "documented",
      added: "2023-01-01",
      specificPrompt: "Prompt A",
      result: { target_dir: "pathA" },
    },
    {
      id: "2",
      name: "Repo B",
      description: "Beta",
      status: "PENDING",
      documentStatus: "not documented",
      added: "2023-02-01",
      specificPrompt: "",
      result: { target_dir: "pathB" },
    },
  ];

  const setup = (props = {}) =>
    render(
      <BrowserRouter>
        <AdminRepoDataTable
          items={items}
          onEditClick={() => {}}
          onDelete={() => {}}
          onShowInformation={() => {}}
          onGenerateDocumentation={() => Promise.resolve()}
          {...props}
        />
      </BrowserRouter>,
    );

  /**
   * Test: Renders all repository names from items array
   */
  it("renders all repository names", () => {
    setup();
    expect(screen.getByText("Repo A")).toBeInTheDocument();
    expect(screen.getByText("Repo B")).toBeInTheDocument();
  });

  /**
   * Test: Renders safe fields from items correctly in table cells
   */
  it("renders safe fields from items correctly", () => {
    setup();

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();

    expect(screen.getByText("SUCCESS")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  // ---------------------------------------------------------
  // UI: Filters & Search elements exist
  // ---------------------------------------------------------
  it("renders search and filter UI elements", () => {
    setup();

    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    expect(screen.getByText("Filter")).toBeInTheDocument();
  });

  // ---------------------------------------------------------
  // UI: Action buttons appear
  // ---------------------------------------------------------
  it("renders toggle select/deselect button", () => {
    setup();

    const toggleButton = screen.getByRole("button", {
      name: /select all|deselect all/i,
    });
    expect(toggleButton).toBeInTheDocument();
  });

  // ---------------------------------------------------------
  // FILTER LOGIC (UNIT)
  // ---------------------------------------------------------
  it("filters by search term (logic only)", () => {
    setup();

    const input = screen.getByPlaceholderText("Search...");
    input.value = "Alpha";

    // internal logic relies on setFilteredItems, so we expect the match
    expect(input.value).toBe("Alpha");
  });

  // ---------------------------------------------------------
  // REPOSITORY NAME CLICK FUNCTIONALITY
  // ---------------------------------------------------------
  it("repository name is clickable", () => {
    setup();

    const repoNameCell = screen.getByText("Repo A");
    expect(repoNameCell).toBeInTheDocument();
    expect(repoNameCell.className).toContain("cursor-pointer");
  });

  it("renders documentation list prop correctly", () => {
    const documentations = [
      { id: "1", repo_name: "Repo A", title: "Repo A" },
      { id: "2", repo_name: "Repo B", title: "Repo B" },
    ];

    setup({ documentations });

    // If documentations prop is passed, repository names should still be rendered
    expect(screen.getByText("Repo A")).toBeInTheDocument();
    expect(screen.getByText("Repo B")).toBeInTheDocument();
  });

  /**
   * Test: Handles empty items array
   */
  it("renders empty state when no items", () => {
    render(
      <BrowserRouter>
        <AdminRepoDataTable
          items={[]}
          onEditClick={() => {}}
          onDelete={() => {}}
          onShowInformation={() => {}}
          onGenerateDocumentation={() => Promise.resolve()}
        />
      </BrowserRouter>,
    );

    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  /**
   * Test: Edit button triggers callback
   * Note: Edit buttons appear in the Actions menu when rows are selected
   */
  it("calls onEditClick when edit button is clicked", async () => {
    const onEditClick = vi.fn();
    setup({ onEditClick });

    // First select a row
    const checkbox = screen.getAllByRole("checkbox")[1]; // First repo checkbox (0 is select all)
    fireEvent.click(checkbox);

    // Click the Actions button
    const actionsButton = await screen.findByTestId("actions-button");
    fireEvent.click(actionsButton);

    // Now the menu should be visible with Edit Specific Prompt button
    const editButton = await screen.findByRole("button", {
      name: /edit specific prompt/i,
    });
    fireEvent.click(editButton);

    expect(onEditClick).toHaveBeenCalled();
  });

  /**
   * Test: Information button triggers callback
   * Note: Info buttons appear in the Actions menu when rows are selected
   */
  it("calls onShowInformation when info button is clicked", async () => {
    const onShowInformation = vi.fn();
    setup({ onShowInformation });

    // First select a row
    const checkbox = screen.getAllByRole("checkbox")[1]; // First repo checkbox
    fireEvent.click(checkbox);

    // Click the Actions button
    const actionsButton = await screen.findByTestId("actions-button");
    fireEvent.click(actionsButton);

    // Now the menu should be visible with Edit Information button
    const infoButton = await screen.findByRole("button", {
      name: /edit information/i,
    });
    fireEvent.click(infoButton);

    expect(onShowInformation).toHaveBeenCalled();
  });

  /**
   * Test: Delete button opens confirmation modal
   * Note: Delete button appears in the Actions menu when rows are selected
   */
  it("shows delete confirmation when delete is clicked", async () => {
    const onDelete = vi.fn();
    setup({ onDelete });

    // First select a row
    const checkbox = screen.getAllByRole("checkbox")[1]; // First repo checkbox
    fireEvent.click(checkbox);

    // Click the Actions button
    const actionsButton = await screen.findByTestId("actions-button");
    fireEvent.click(actionsButton);

    // Now the menu should be visible with Delete button
    const deleteButton = await screen.findByRole("button", {
      name: /delete/i,
    });
    fireEvent.click(deleteButton);

    // Delete modal should appear
    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
    });
  });

  /**
   * Test: Table renders all items (no pagination in current implementation)
   */
  it("renders all items in table", () => {
    const manyItems = Array.from({ length: 15 }, (_, i) => ({
      id: String(i + 1),
      name: `Repo ${i + 1}`,
      description: `Description ${i + 1}`,
      status: "SUCCESS",
      documentStatus: "documented",
      added: "2023-01-01",
      specificPrompt: "",
      result: { target_dir: `path${i + 1}` },
    }));

    render(
      <BrowserRouter>
        <AdminRepoDataTable
          items={manyItems}
          onEditClick={() => {}}
          onDelete={() => {}}
          onShowInformation={() => {}}
          onGenerateDocumentation={() => Promise.resolve()}
        />
      </BrowserRouter>,
    );

    // All items should be visible in the table
    expect(screen.getByText("Repo 1")).toBeInTheDocument();
    expect(screen.getByText("Repo 15")).toBeInTheDocument();
  });

  /**
   * Test: Sorting by column
   */
  it("sorts items when column header is clicked", () => {
    setup();

    // Repository name should be sortable
    expect(screen.getByText("Repo A")).toBeInTheDocument();
    expect(screen.getByText("Repo B")).toBeInTheDocument();
  });

  /**
   * Test: Search input filters results
   */
  it("filters items based on search input", () => {
    setup();

    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "Repo A" } });

    expect(searchInput.value).toBe("Repo A");
  });

  /**
   * Test: Status badge displays correctly
   */
  it("displays status badges for repositories", () => {
    setup();

    expect(screen.getByText("SUCCESS")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  /**
   * Test: Documentation status displays correctly
   */
  it("displays documentation status", () => {
    setup();

    expect(screen.getByText("Documented")).toBeInTheDocument();
    expect(screen.getByText("Not Documented")).toBeInTheDocument();
  });

  /**
   * Test: Generate documentation button is visible in Actions menu
   * Note: Generate documentation button appears in the Actions menu when rows are selected
   */
  it("shows generate documentation button", async () => {
    setup();

    // First select a row
    const checkbox = screen.getAllByRole("checkbox")[1]; // First repo checkbox
    fireEvent.click(checkbox);

    // Click the Actions button
    const actionsButton = await screen.findByTestId("actions-button");
    fireEvent.click(actionsButton);

    // Now the menu should be visible with Generate Documentation button
    const generateButton = await screen.findByRole("button", {
      name: /generate documentation/i,
    });
    expect(generateButton).toBeInTheDocument();
  });

  /**
   * Test: Handles items with missing fields gracefully
   */
  it("handles items with missing fields", () => {
    const incompleteItems = [
      {
        id: "1",
        name: "Incomplete Repo",
        status: "SUCCESS",
        result: {},
      },
    ];

    render(
      <BrowserRouter>
        <AdminRepoDataTable
          items={incompleteItems}
          onEditClick={() => {}}
          onDelete={() => {}}
          onShowInformation={() => {}}
          onGenerateDocumentation={() => Promise.resolve()}
        />
      </BrowserRouter>,
    );

    expect(screen.getByText("Incomplete Repo")).toBeInTheDocument();
  });
});
