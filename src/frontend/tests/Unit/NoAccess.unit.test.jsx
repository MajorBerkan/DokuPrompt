/**
 * Unit tests for NoAccess Component
 * Tests the access denied message display
 */
import { render } from "@testing-library/react";
import NoAccess from "../../components/NoAccess.jsx";

describe("NoAccess - unit tests", () => {
  /**
   * Test: Component displays correct heading and permission denied message
   */
  it("renders the heading and paragraph", () => {
    const { getByText } = render(<NoAccess />);

    const heading = getByText("Access denied");
    const paragraph = getByText(
      "You do not have permission to view this page.",
    );

    expect(heading).toBeInTheDocument();
    expect(paragraph).toBeInTheDocument();
  });
});
