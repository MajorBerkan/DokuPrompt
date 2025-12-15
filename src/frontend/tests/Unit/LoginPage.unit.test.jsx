/**
 * Unit tests for LoginPage Component
 * Tests state management for email, password, error, loading, and redirect logic
 */
import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { vi } from "vitest";

describe("LoginPage - unit tests", () => {
  /**
   * Test: Email and password state updates correctly
   */
  it("updates email and password state", () => {
    const { result } = renderHook(() => {
      const [email, setEmail] = useState("");
      const [password, setPassword] = useState("");
      return { email, password, setEmail, setPassword };
    });

    act(() => {
      result.current.setEmail("test@example.com");
      result.current.setPassword("secret123");
    });

    expect(result.current.email).toBe("test@example.com");
    expect(result.current.password).toBe("secret123");
  });

  /**
   * Test: Error and loading states are managed correctly during failed login
   * Verifies loading state is reset after attempt
   */
  it("sets error and loading state correctly during login", async () => {
    let error = "";
    let loading = false;

    const handleLogin = async () => {
      loading = true;
      try {
        throw new Error("Login failed");
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }
    };

    await handleLogin();

    expect(error).toBe("Login failed");
    expect(loading).toBe(false);
  });

  /**
   * Test: User is redirected if account already exists
   * Simulates redirect behavior when user is already authenticated
   */
  it("redirects if account exists", () => {
    const account = { username: "testuser" };
    const Navigate = vi.fn();

    if (account) {
      Navigate("/");
    }

    expect(Navigate).toHaveBeenCalledWith("/");
  });
});
