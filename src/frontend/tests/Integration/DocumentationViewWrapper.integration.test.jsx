import { act, render, screen, waitFor } from "@testing-library/react";
import DocumentationViewWrapper from "../../components/DocumentationViewWrapper.jsx";
import * as api from "../../lib/api.js";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

/**
 * Mock API module to control document fetching
 */
vi.mock("../../lib/api.js");

/**
 * Mock authentication provider to simulate admin user
 */
vi.mock("../../lib/AuthProvider.jsx", () => ({
  useAuth: vi.fn(() => ({
    account: { username: "test@example.com", name: "Test User" },
    accessToken: "mock-token",
    roles: ["Admin"],
    login: vi.fn(),
    logout: vi.fn(),
    acquireToken: vi.fn(),
    useMockAuth: false,
  })),
}));

/**
 * Integration tests for DocumentationViewWrapper component
 * Tests document loading states and error handling
 */
describe("DocumentationViewWrapper - integration tests", () => {
  const mockDoc = {
    id: "123",
    title: "Test Doc",
    table_of_contents: ["Intro", "Chapter 1"],
    created_at: "2025-11-25T12:00:00Z",
    updated_at: "2025-11-25T14:00:00Z",
    content: "# Test Content\n\nThis is a test.",
  };

  /**
   * Test Case: Display loading state initially
   * Verifies that loading message is shown while document is being fetched
   */
  it("renders loading state initially", () => {
    api.getDocument.mockResolvedValueOnce(mockDoc);

    render(
      <MemoryRouter initialEntries={["/documentations/123"]}>
        <Routes>
          <Route
            path="/documentations/:id"
            element={<DocumentationViewWrapper />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/loading documentation/i)).toBeInTheDocument();
  });

  /**
   * Test Case: Display document after successful load
   * Verifies that document content and metadata are rendered after API call completes
   */
  it("renders DocumentationView after loading", async () => {
    api.getDocument.mockResolvedValueOnce(mockDoc);

    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/documentations/123"]}>
          <Routes>
            <Route
              path="/documentations/:id"
              element={<DocumentationViewWrapper />}
            />
          </Routes>
        </MemoryRouter>,
      );
    });

    await waitFor(() =>
      expect(screen.getByText("Test Doc")).toBeInTheDocument(),
    );
    expect(screen.getByText(/latest update/i)).toBeInTheDocument();
  });

  /**
   * Test Case: Display error message on API failure
   * Verifies that error message is shown when document fetch fails
   */
  it("renders error message if API fails", async () => {
    api.getDocument.mockRejectedValueOnce(new Error("Failed to fetch"));

    render(
      <MemoryRouter initialEntries={["/documentations/123"]}>
        <Routes>
          <Route
            path="/documentations/:id"
            element={<DocumentationViewWrapper />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        screen.getByText(/error loading documentation/i),
      ).toBeInTheDocument(),
    );
  });

  /**
   * Test Case: Display not found message for null document
   * Verifies that "not found" message is shown when API returns null
   */
  it("renders not found message if doc is null", async () => {
    api.getDocument.mockResolvedValueOnce(null);

    render(
      <MemoryRouter initialEntries={["/documentations/123"]}>
        <Routes>
          <Route
            path="/documentations/:id"
            element={<DocumentationViewWrapper />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText(/documentation not found/i)).toBeInTheDocument(),
    );
  });
});
