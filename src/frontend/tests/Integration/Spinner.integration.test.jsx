import { render, screen } from "@testing-library/react";
import Spinner from "../../components/Spinner";

/**
 * Wrapper component to test Spinner in loading context
 * Simulates conditional rendering based on loading state
 */
function LoadingWrapper({ loading }) {
  return <div>{loading ? <Spinner size={30} /> : <p>Data loaded</p>}</div>;
}

/**
 * Integration tests for Spinner component
 * Tests spinner display in realistic loading scenarios
 */
describe("Spinner Component - Integration Test", () => {
  /**
   * Test Case: Display spinner during loading state
   * Verifies that spinner is rendered when loading is true
   */
  it("shows spinner when loading is true", () => {
    render(<LoadingWrapper loading={true} />);
    const spinner = screen.getByRole("status");
    expect(spinner).toBeInTheDocument();
  });

  /**
   * Test Case: Display content after loading completes
   * Verifies that content is rendered when loading is false
   */
  it("shows content when loading is false", () => {
    render(<LoadingWrapper loading={false} />);
    expect(screen.getByText("Data loaded")).toBeInTheDocument();
  });
});
