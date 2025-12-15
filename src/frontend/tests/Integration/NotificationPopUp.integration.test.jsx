import { render } from "@testing-library/react";
import NotificationPopup from "../../components/NotificationPopup.jsx";
import { describe, it, expect } from "vitest";

/**
 * Integration tests for NotificationPopup component
 * Tests the popup rendering with different props
 */
describe("NotificationPopup - integration tests", () => {
  /**
   * Test Case: Snapshot test for NotificationPopup
   * Ensures the popup structure remains consistent with title, message, and close handler
   */
  it("matches snapshot", () => {
    const { container } = render(
      <NotificationPopup
        title="Alert"
        message="Something happened"
        onClose={() => {}}
      />,
    );
    expect(container).toMatchSnapshot();
  });
});
