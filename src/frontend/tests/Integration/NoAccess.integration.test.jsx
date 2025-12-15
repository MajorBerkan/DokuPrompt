import { render } from "@testing-library/react";
import NoAccess from "../../components/NoAccess.jsx";
import { describe, it, expect } from "vitest";

/**
 * Integration tests for NoAccess component
 * Tests the component rendering in isolation
 */
describe("NoAccess - integration tests", () => {
  /**
   * Test Case: Snapshot test for NoAccess component
   * Ensures the component structure remains consistent across changes
   */
  it("matches snapshot", () => {
    const { container } = render(<NoAccess />);
    expect(container).toMatchSnapshot();
  });
});
