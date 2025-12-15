/**
 * Integration tests for AdminRepoHeader component
 * Tests user interactions for adding repositories and accessing settings
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminRepoHeader from "../../components/AdminRepoHeader";
import "@testing-library/jest-dom/vitest";

/**
 * Mock authentication provider to simulate admin user
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
}));

/**
 * Integration tests for AdminRepoHeader component
 * Verifies repository addition and settings access functionality
 */
describe("AdminRepoHeader - Integration Tests", () => {
  let onAdd, onSettingsClick;

  /**
   * Setup: Initialize mock callbacks before each test
   */
  beforeEach(() => {
    onAdd = vi.fn();
    onSettingsClick = vi.fn();
  });

  /**
   * Test Case: Add repository via button click
   * Verifies that clicking Add button with valid URL calls onAdd callback
   */
  it("calls onAdd when Add button is clicked with valid input", () => {
    render(<AdminRepoHeader onAdd={onAdd} />);

    const input = screen.getByPlaceholderText(
      /Enter several public repository URLs.*seperated by whitespace/i,
    );
    const button = screen.getByText("Add");

    fireEvent.change(input, { target: { value: "https://github.com/repo1" } });
    fireEvent.click(button);

    expect(onAdd).toHaveBeenCalledWith({ url: "https://github.com/repo1" });
    expect(input.value).toBe(""); // Input should be cleared after adding
  });

  /**
   * Test Case: Add repository via Enter key
   * Verifies that pressing Enter with valid URL calls onAdd callback
   */
  it("calls onAdd when Enter key is pressed with valid input", () => {
    render(<AdminRepoHeader onAdd={onAdd} />);

    const input = screen.getByPlaceholderText(
      /Enter several public repository URLs.*seperated by whitespace/i,
    );

    fireEvent.change(input, { target: { value: "https://github.com/repo2" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(onAdd).toHaveBeenCalledWith({ url: "https://github.com/repo2" });
    expect(input.value).toBe(""); // Input should be cleared after adding
  });

  /**
   * Test Case: Open settings dialog
   * Verifies that clicking settings button triggers onSettingsClick callback
   */
  it("calls onSettingsClick when settings button is clicked", () => {
    render(<AdminRepoHeader onSettingsClick={onSettingsClick} />);
    const btn = screen.getByRole("button", {
      name: /General Prompt & Update Time/i,
    });
    fireEvent.click(btn);

    expect(onSettingsClick).toHaveBeenCalled();
  });

  /**
   * Test Case: Add multiple repositories separated by whitespace
   * Verifies that multiple URLs can be added at once
   */
  it("handles multiple repository URLs separated by whitespace", () => {
    render(<AdminRepoHeader onAdd={onAdd} />);

    const input = screen.getByPlaceholderText(
      /Enter several public repository URLs.*seperated by whitespace/i,
    );
    const button = screen.getByText("Add");

    fireEvent.change(input, {
      target: { value: "https://github.com/repo1 https://github.com/repo2" },
    });
    fireEvent.click(button);

    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(onAdd).toHaveBeenNthCalledWith(1, { url: "https://github.com/repo1" });
    expect(onAdd).toHaveBeenNthCalledWith(2, { url: "https://github.com/repo2" });
  });

  /**
   * Test Case: Open SSH popup
   * Verifies that clicking "Add repo with SSH" button opens the popup
   */
  it("opens SSH popup when Add repo with SSH button is clicked", () => {
    render(<AdminRepoHeader onAdd={onAdd} />);

    const sshButton = screen.getByText("Add repo with SSH");
    fireEvent.click(sshButton);

    expect(screen.getByText("Add Repository")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Repository URL")).toBeInTheDocument();
  });

  /**
   * Test Case: Close SSH popup with close button
   * Verifies that the SSH popup can be closed
   */
  it("closes SSH popup when close button is clicked", () => {
    render(<AdminRepoHeader onAdd={onAdd} />);

    // Open popup
    const sshButton = screen.getByText("Add repo with SSH");
    fireEvent.click(sshButton);

    expect(screen.getByText("Add Repository")).toBeInTheDocument();

    // Close popup
    const closeButton = screen.getByText("×");
    fireEvent.click(closeButton);

    expect(screen.queryByText("Add Repository")).not.toBeInTheDocument();
  });

  /**
   * Test Case: Close SSH popup with Cancel button
   * Verifies that the SSH popup can be closed with Cancel
   */
  it("closes SSH popup when Cancel button is clicked", () => {
    render(<AdminRepoHeader onAdd={onAdd} />);

    // Open popup
    fireEvent.click(screen.getByText("Add repo with SSH"));

    expect(screen.getByText("Add Repository")).toBeInTheDocument();

    // Close with Cancel
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(screen.queryByText("Add Repository")).not.toBeInTheDocument();
  });

  /**
   * Test Case: Switch connection type in SSH popup
   * Verifies SSH/HTTPS toggle functionality
   */
  it("toggles between SSH and HTTPS connection types", () => {
    render(<AdminRepoHeader onAdd={onAdd} />);

    // Open popup
    fireEvent.click(screen.getByText("Add repo with SSH"));

    const sshTab = screen.getByRole("button", { name: "SSH" });
    const httpsTab = screen.getByRole("button", { name: "HTTPS" });

    // Initially SSH is active
    expect(sshTab).toHaveClass("bg-[#3200c8]");

    // Switch to HTTPS
    fireEvent.click(httpsTab);
    expect(httpsTab).toHaveClass("bg-[#3200c8]");

    // Switch back to SSH
    fireEvent.click(sshTab);
    expect(sshTab).toHaveClass("bg-[#3200c8]");
  });

  /**
   * Test Case: Add repository from SSH popup with Save button
   * Verifies that repository can be added via SSH popup
   */
  it("adds repository from SSH popup when Save is clicked", () => {
    render(<AdminRepoHeader onAdd={onAdd} />);

    // Open popup
    fireEvent.click(screen.getByText("Add repo with SSH"));

    // Enter URL
    const urlInput = screen.getByPlaceholderText("Repository URL");
    fireEvent.change(urlInput, {
      target: { value: "git@github.com:user/repo.git" },
    });

    // Save
    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    expect(onAdd).toHaveBeenCalledWith({ url: "git@github.com:user/repo.git" });
    expect(screen.queryByText("Add Repository")).not.toBeInTheDocument();
  });

  /**
   * Test Case: SSH popup shows alert when URL is empty
   * Verifies validation for empty URL in SSH popup
   */
  it("shows alert when trying to save SSH popup with empty URL", () => {
    // Mock window.alert
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<AdminRepoHeader onAdd={onAdd} />);

    // Open popup
    fireEvent.click(screen.getByText("Add repo with SSH"));

    // Try to save without entering URL
    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    expect(alertMock).toHaveBeenCalledWith("Please enter a repository URL.");
    expect(onAdd).not.toHaveBeenCalled();

    alertMock.mockRestore();
  });

  /**
   * Test Case: Close SSH popup by clicking outside
   * Verifies that clicking on backdrop closes the popup
   */
  it("closes SSH popup when clicking on backdrop", () => {
    render(<AdminRepoHeader onAdd={onAdd} />);

    // Open popup
    fireEvent.click(screen.getByText("Add repo with SSH"));

    expect(screen.getByText("Add Repository")).toBeInTheDocument();

    // Click on backdrop (the outer div with inset-0 class)
    const backdrop = screen.getByText("Add Repository").closest(".fixed");
    fireEvent.click(backdrop);

    expect(screen.queryByText("Add Repository")).not.toBeInTheDocument();
  });

  /**
   * Test Case: SSH popup shows passphrase field in SSH mode
   * Verifies that SSH-specific fields are shown in SSH mode
   */
  it("displays passphrase field when in SSH mode", () => {
    render(<AdminRepoHeader onAdd={onAdd} />);

    // Open popup
    fireEvent.click(screen.getByText("Add repo with SSH"));

    // Should show passphrase field by default (SSH mode)
    expect(screen.getByPlaceholderText("Passphrase (optional)")).toBeInTheDocument();
  });

  /**
   * Test Case: SSH popup shows username and token fields in HTTPS mode
   * Verifies that HTTPS-specific fields are shown in HTTPS mode
   */
  it("displays username and token fields when in HTTPS mode", () => {
    render(<AdminRepoHeader onAdd={onAdd} />);

    // Open popup
    fireEvent.click(screen.getByText("Add repo with SSH"));

    // Switch to HTTPS
    const httpsTab = screen.getByRole("button", { name: "HTTPS" });
    fireEvent.click(httpsTab);

    // Should show HTTPS fields
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Personal Access Token")).toBeInTheDocument();
  });
});
