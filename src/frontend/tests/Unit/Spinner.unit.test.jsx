/**
 * Unit tests for Spinner Component
 * Tests rendering, default styles, and custom size/color props
 */
import { render } from "@testing-library/react";
import Spinner from "../../components/Spinner";

describe("Spinner Component - Unit Test", () => {
  /**
   * Test: Component renders without errors
   */
  it("renders without crashing", () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toBeInTheDocument();
  });

  /**
   * Test: Default size (24px) and color (#3200c8) are applied correctly
   * Border width is size/8 for visual proportion
   */
  it("applies default size and color", () => {
    const { container } = render(<Spinner />);
    const spinner = container.firstChild;
    expect(spinner).toHaveStyle("width: 24px");
    expect(spinner).toHaveStyle("height: 24px");
    expect(spinner).toHaveStyle("borderTop: 3px solid #3200c8");
  });

  /**
   * Test: Custom size (40px) and color (#ff0000) props are applied correctly
   * Border width is size/8 for visual proportion
   */
  it("applies custom size and color", () => {
    const { container } = render(<Spinner size={40} color="#ff0000" />);
    const spinner = container.firstChild;
    expect(spinner).toHaveStyle("width: 40px");
    expect(spinner).toHaveStyle("height: 40px");
    expect(spinner).toHaveStyle("borderTop: 5px solid #ff0000");
  });
});
