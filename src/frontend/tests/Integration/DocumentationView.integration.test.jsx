import { render, screen, fireEvent } from "@testing-library/react";
import DocumentationView from "../../components/DocumentationView.jsx";
import { vi } from "vitest";

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
 * Integration tests for DocumentationView component
 * Tests markdown rendering and metadata display
 */
describe("DocumentationView component", () => {
  const sampleMarkdown = `
# My Title
This is some sample content.
## Subheading
More content here.
`;

  /**
   * Test Case: Render document metadata
   * Verifies that last update date are displayed
   */
  it("renders update info", () => {
    render(<DocumentationView content={sampleMarkdown} update="2025-01-02" />);

    expect(screen.getByText(/Latest update: 2025-01-02/)).toBeInTheDocument();
  });

  /**
   * Test Case: Remove first H1 heading from markdown
   * Verifies that the first H1 heading is not rendered (to avoid duplication with title)
   */
  it("removes the first H1 from the markdown", () => {
    render(<DocumentationView content={sampleMarkdown} title="Some Title" />);

    // First H1 should be removed
    expect(screen.queryByText("My Title")).not.toBeInTheDocument();

    // Content and subheading should still be rendered
    expect(
      screen.getByText("This is some sample content."),
    ).toBeInTheDocument();
    expect(screen.getByText("Subheading")).toBeInTheDocument();
  });
});
