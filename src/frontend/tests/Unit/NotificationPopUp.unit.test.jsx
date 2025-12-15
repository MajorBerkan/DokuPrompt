/**
 * Unit tests for NotificationPopUp Component
 * Tests rendering with different types, auto-close behavior, and error logging
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NotificationPopUp from "../../components/NotificationPopUp.jsx";

describe("NotificationPopUp", () => {
  /**
   * Test: Component renders correctly with success type styling and content
   * Verifies title, message, icon, and green background color
   */
  it("renders correctly with success type", () => {
    const onClose = vi.fn();

    render(
      <NotificationPopUp
        title="Success!"
        message="This is a success message."
        onClose={onClose}
        type="success"
        duration={5000}
      />,
    );

    expect(screen.getByText("Success!")).toBeDefined();
    expect(screen.getByText("This is a success message.")).toBeDefined();
    expect(screen.getByAltText("Success")).toBeDefined();

    const titleEl = screen.getByText("Success!");
    const colorContainer = titleEl.closest(".rounded-lg");

    expect(colorContainer.className).toContain("bg-green-50");
  });

  /**
   * Test: Notification auto-closes after specified duration
   * Uses fake timers to verify onClose callback is triggered
   */
  it("calls onClose after duration", async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(
      <NotificationPopUp
        title="Auto close"
        message="Should disappear"
        onClose={onClose}
        type="info"
        duration={1000}
      />,
    );

    vi.advanceTimersByTime(1000);

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  /**
   * Test: Error notifications log to console
   * Verifies console.error is called with formatted error message
   */
  it("logs errors to console for type=error", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <NotificationPopUp
        title="Error"
        message="Something went wrong"
        onClose={() => {}}
        type="error"
      />,
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "[Notification Error] Error: Something went wrong",
    );

    consoleSpy.mockRestore();
  });
});
