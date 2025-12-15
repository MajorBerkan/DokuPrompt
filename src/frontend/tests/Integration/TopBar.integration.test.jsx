import { render, screen, fireEvent } from "@testing-library/react";
import TopBar from "../../components/TopBar";
import { vi } from "vitest";

/**
 * Integration tests for TopBar component
 * Tests search functionality and user interactions
 */
describe("TopBar Component - Integration Test", () => {
  /**
   * Test Case: Search input triggers callback
   * Verifies that typing in the search field calls the onChange handler with correct value
   */
  it("calls onSearchChange when typing in the search field", () => {
    const handleSearchChange = vi.fn();
    render(
      <TopBar
        showSearchField={true}
        searchTerm=""
        onSearchChange={handleSearchChange}
      />,
    );

    const input = screen.getByPlaceholderText("Search in documentations");
    fireEvent.change(input, { target: { value: "New Search" } });

    expect(handleSearchChange).toHaveBeenCalledTimes(1);
    expect(handleSearchChange).toHaveBeenCalledWith("New Search");
  });
});
