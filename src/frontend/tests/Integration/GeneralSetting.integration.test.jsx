import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GeneralSetting from "../../components/GeneralSetting.jsx";
import * as api from "../../lib/api.js";
import { vi } from "vitest";

/**
 * Mock API functions for testing general settings operations
 */
vi.mock("../../lib/api.js", () => ({
  saveGeneralSettings: vi.fn(),
  getGeneralSettings: vi.fn(),
}));

/**
 * Integration tests for GeneralSetting component
 * Tests complete settings management workflow including load, edit, and save
 */
describe("GeneralSetting - integration tests", () => {
  const onClose = vi.fn();

  /**
   * Setup: Mock API to return default settings before each test
   */
  beforeEach(() => {
    api.getGeneralSettings.mockResolvedValue({
      prompt: "Initial prompt",
      checkInterval: 60,
      disabled: false,
    });
  });

  /**
   * Test Case: Load and display initial settings
   * Verifies that settings are fetched from API and displayed in the textarea
   */
  it("renders textarea with initial value from API", async () => {
    render(<GeneralSetting onClose={onClose} />);
    const textarea = await screen.findByRole("textbox");
    expect(textarea.value).toBe("Initial prompt");
  });

  /**
   * Test Case: Update textarea value
   * Verifies that user input updates the textarea content
   */
  it("updates textarea value on change", async () => {
    render(<GeneralSetting onClose={onClose} />);
    const textarea = await screen.findByRole("textbox");

    fireEvent.change(textarea, { target: { value: "Updated prompt" } });
    expect(textarea.value).toBe("Updated prompt");
  });

  /**
   * Test Case: Save settings and close dialog
   * Verifies that clicking save button persists changes and closes the dialog
   */
  it("saves general settings and calls onClose", async () => {
    api.saveGeneralSettings.mockResolvedValue({});
    render(<GeneralSetting onClose={onClose} />);

    fireEvent.click(await screen.findByText(/save changes/i));

    await waitFor(() => {
      expect(api.saveGeneralSettings).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  /**
   * Test Case: Toggle automatic updates on/off
   * Verifies that users can enable and disable automatic update functionality
   */
  it("toggles update time enable/disable", async () => {
    render(<GeneralSetting onClose={onClose} />);

    // Disable automatic updates
    fireEvent.click(await screen.findByText(/deactivate/i));
    expect(
      await screen.findByText(/Automatic updates are deactivated./i),
    ).toBeInTheDocument();

    // Re-enable automatic updates
    fireEvent.click(await screen.findByRole("button", { name: /Activate/i }));
    expect(
      await screen.findByText(/Automatic Update Interval:/i),
    ).toBeInTheDocument();
  });

  // TODO: Add test for changed interval value
});
