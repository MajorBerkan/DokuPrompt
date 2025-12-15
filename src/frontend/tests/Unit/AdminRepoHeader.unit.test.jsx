/**
 * Unit tests for AdminRepoHeader Component
 * Tests header rendering, input handling, and add repository functionality
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminRepoHeader from "../../components/AdminRepoHeader";
import "@testing-library/jest-dom/vitest";

/**
 * Mock useAuth hook for authentication context
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

describe("AdminRepoHeader - Unit Tests", () => {
  /**
   * Test: Renders heading text, input field, and add button
   */
  it("renders heading and input/button", () => {
    render(<AdminRepoHeader />);

    expect(screen.getByText("Repository Management")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Enter several public repository URLs.*seperated by whitespace/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
  });

  /**
   * Test: Input field value updates correctly on user input
   */
  it("updates input value on change", () => {
    render(<AdminRepoHeader />);
    const input = screen.getByPlaceholderText(
      /Enter several public repository URLs.*seperated by whitespace/i,
    );

    fireEvent.change(input, { target: { value: "https://github.com/test" } });
    expect(input.value).toBe("https://github.com/test");
  });

  /**
   * Test: onAdd is not called when input is empty or contains only whitespace
   * Validates input before triggering add operation
   */
  it("does not call onAdd if input is empty or whitespace", () => {
    const onAdd = vi.fn();
    render(<AdminRepoHeader onAdd={onAdd} />);

    const input = screen.getByPlaceholderText(
      /Enter several public repository URLs.*seperated by whitespace/i,
    );
    const button = screen.getByText("Add");

    fireEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();
  });

  /**
   * Test: Calls onAdd with correct URL when button is clicked
   */
  it("calls onAdd with URL object when button is clicked", () => {
    const onAdd = vi.fn();
    render(<AdminRepoHeader onAdd={onAdd} />);

    const input = screen.getByPlaceholderText(
      /Enter several public repository URLs.*seperated by whitespace/i,
    );
    const button = screen.getByText("Add");

    fireEvent.change(input, { target: { value: "https://github.com/test/repo" } });
    fireEvent.click(button);

    expect(onAdd).toHaveBeenCalledWith({ url: "https://github.com/test/repo" });
  });

  /**
   * Test: Input is cleared after successful add
   */
  it("clears input after adding repository", () => {
    const onAdd = vi.fn();
    render(<AdminRepoHeader onAdd={onAdd} />);

    const input = screen.getByPlaceholderText(
      /Enter several public repository URLs.*seperated by whitespace/i,
    );
    const button = screen.getByText("Add");

    fireEvent.change(input, { target: { value: "https://github.com/test/repo" } });
    fireEvent.click(button);

    expect(input.value).toBe("");
  });

  /**
   * Test: Handles multiple URLs separated by whitespace
   */
  it("splits and processes multiple URLs", () => {
    const onAdd = vi.fn();
    render(<AdminRepoHeader onAdd={onAdd} />);

    const input = screen.getByPlaceholderText(
      /Enter several public repository URLs.*seperated by whitespace/i,
    );
    const button = screen.getByText("Add");

    fireEvent.change(input, {
      target: {
        value:
          "https://github.com/repo1 https://github.com/repo2 https://github.com/repo3",
      },
    });
    fireEvent.click(button);

    expect(onAdd).toHaveBeenCalledTimes(3);
    expect(onAdd).toHaveBeenNthCalledWith(1, { url: "https://github.com/repo1" });
    expect(onAdd).toHaveBeenNthCalledWith(2, { url: "https://github.com/repo2" });
    expect(onAdd).toHaveBeenNthCalledWith(3, { url: "https://github.com/repo3" });
  });

  /**
   * Test: Settings button is only visible for admin users
   */
  it("displays settings button for admin users", () => {
    render(<AdminRepoHeader onSettingsClick={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /General Prompt/i })
    ).toBeInTheDocument();
  });

  /**
   * Test: Calls onSettingsClick when settings button is clicked
   */
  it("triggers onSettingsClick callback", () => {
    const onSettingsClick = vi.fn();
    render(<AdminRepoHeader onSettingsClick={onSettingsClick} />);

    const settingsButton = screen.getByRole("button", { name: /General Prompt/i });
    fireEvent.click(settingsButton);

    expect(onSettingsClick).toHaveBeenCalled();
  });

  /**
   * Test: Renders SSH button
   */
  it("renders Add repo with SSH button", () => {
    render(<AdminRepoHeader onAdd={vi.fn()} />);
    expect(screen.getByText("Add repo with SSH")).toBeInTheDocument();
  });

  /**
   * Test: SSH popup opens when button is clicked
   */
  it("opens SSH popup on button click", () => {
    render(<AdminRepoHeader onAdd={vi.fn()} />);

    const sshButton = screen.getByText("Add repo with SSH");
    fireEvent.click(sshButton);

    expect(screen.getByText("Add Repository")).toBeInTheDocument();
  });

  /**
   * Test: SSH popup has connection type toggle
   */
  it("displays SSH and HTTPS toggle buttons in popup", () => {
    render(<AdminRepoHeader onAdd={vi.fn()} />);

    fireEvent.click(screen.getByText("Add repo with SSH"));

    expect(screen.getByRole("button", { name: "SSH" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "HTTPS" })).toBeInTheDocument();
  });

  /**
   * Test: SSH popup displays correct input fields
   */
  it("displays repository URL input in SSH popup", () => {
    render(<AdminRepoHeader onAdd={vi.fn()} />);

    fireEvent.click(screen.getByText("Add repo with SSH"));

    expect(screen.getByPlaceholderText("Repository URL")).toBeInTheDocument();
  });

  /**
   * Test: SSH popup can be closed
   */
  it("closes SSH popup when close button is clicked", () => {
    render(<AdminRepoHeader onAdd={vi.fn()} />);

    fireEvent.click(screen.getByText("Add repo with SSH"));
    expect(screen.getByText("Add Repository")).toBeInTheDocument();

    fireEvent.click(screen.getByText("×"));
    expect(screen.queryByText("Add Repository")).not.toBeInTheDocument();
  });

  /**
   * Test: SSH popup Save button calls onAdd
   */
  it("calls onAdd when Save is clicked in SSH popup", () => {
    const onAdd = vi.fn();
    render(<AdminRepoHeader onAdd={onAdd} />);

    fireEvent.click(screen.getByText("Add repo with SSH"));

    const urlInput = screen.getByPlaceholderText("Repository URL");
    fireEvent.change(urlInput, {
      target: { value: "git@github.com:user/repo.git" },
    });

    fireEvent.click(screen.getByText("Save"));

    expect(onAdd).toHaveBeenCalledWith({ url: "git@github.com:user/repo.git" });
  });

  /**
   * Test: Empty URLs are filtered out
   */
  it("filters out empty URLs from multiple inputs", () => {
    const onAdd = vi.fn();
    render(<AdminRepoHeader onAdd={onAdd} />);

    const input = screen.getByPlaceholderText(
      /Enter several public repository URLs.*seperated by whitespace/i,
    );
    const button = screen.getByText("Add");

    fireEvent.change(input, {
      target: { value: "https://github.com/repo1    https://github.com/repo2" },
    });
    fireEvent.click(button);

    expect(onAdd).toHaveBeenCalledTimes(2);
  });
});
