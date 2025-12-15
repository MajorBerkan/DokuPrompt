/**
 * Unit tests for TopBar Component
 * Tests rendering, search field visibility, and search term display
 */
import { render, screen } from "@testing-library/react";
import TopBar from "../../components/TopBar";

describe("TopBar Component - Unit Test", () => {
  /**
   * Test: Component renders without errors and displays app name
   */
  it("renders without crashing", () => {
    render(<TopBar />);
    expect(screen.getByText("DokuPrompt")).toBeInTheDocument();
  });

  /**
   * Test: Search input is rendered when showSearchField is true
   */
  it("renders search input when showSearchField is true", () => {
    render(
      <TopBar showSearchField={true} searchTerm="" onSearchChange={() => {}} />,
    );
    expect(
      screen.getByPlaceholderText("Search in documentations"),
    ).toBeInTheDocument();
  });

  /**
   * Test: Search input is not rendered when showSearchField is false
   */
  it("does not render search input when showSearchField is false", () => {
    render(<TopBar showSearchField={false} />);
    const input = screen.queryByPlaceholderText("Search in documentations");
    expect(input).toBeNull();
  });

  /**
   * Test: Search input displays the correct searchTerm value
   */
  it("displays the correct searchTerm value", () => {
    render(
      <TopBar
        showSearchField={true}
        searchTerm="Test Term"
        onSearchChange={() => {}}
      />,
    );
    const input = screen.getByPlaceholderText("Search in documentations");
    expect(input.value).toBe("Test Term");
  });
});
