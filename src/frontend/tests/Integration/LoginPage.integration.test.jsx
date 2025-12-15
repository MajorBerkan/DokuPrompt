import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "../../components/LoginPage.jsx";
import { useAuth } from "../../lib/AuthProvider";
import { vi } from "vitest";

/**
 * Mock authentication provider to control login behavior in tests
 */
vi.mock("../../lib/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

/**
 * Integration tests for LoginPage component
 * Tests complete user authentication workflows
 */
describe("LoginPage - integration tests", () => {
  const mockLogin = vi.fn();
  const mockUseAuth = {
    login: mockLogin,
    account: null,
    useMockAuth: true,
  };

  /**
   * Setup: Configure mock authentication and fetch before each test
   */
  beforeEach(() => {
    useAuth.mockReturnValue(mockUseAuth);
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: vi
        .fn()
        .mockResolvedValue([{ email: "admin@test.com", password: "admin123" }]),
    });
  });

  /**
   * Test Case: Render login form
   * Verifies that email and password inputs are displayed for mock authentication
   */
  it("renders login form for mock auth", async () => {
    render(<LoginPage />);
    expect(await screen.findByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  /**
   * Test Case: Update input field values
   * Verifies that user input is correctly captured in form fields
   */
  it("updates input values", async () => {
    render(<LoginPage />);
    const emailInput = await screen.findByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    fireEvent.change(emailInput, { target: { value: "user@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "secret" } });

    expect(emailInput.value).toBe("user@test.com");
    expect(passwordInput.value).toBe("secret");
  });

  /**
   * Test Case: Submit login form
   * Verifies that login function is called with correct credentials on form submission
   */
  it("calls login function on submit", async () => {
    render(<LoginPage />);
    const emailInput = await screen.findByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "user@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "secret" } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: "user@test.com",
        password: "secret",
      });
    });
  });

  /**
   * Test Case: Display error on failed login
   * Verifies that error messages are shown when login fails
   */
  it("shows error message on failed login", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Invalid credentials"));
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "wrong@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
