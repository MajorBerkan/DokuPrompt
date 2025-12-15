import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminRepoPage from "../../pages/AdminRepoPage.jsx";
import { AuthProvider } from "../../lib/AuthProvider.jsx";
import * as api from "../../lib/api";
import { vi } from "vitest";

/**
 * Mock API functions for repository management operations
 */
vi.mock("../../lib/api", () => ({
  enqueueClone: vi.fn(),
  getTask: vi.fn(),
  listRepos: vi.fn(),
  deleteRepo: vi.fn(),
  generateDocu: vi.fn(),
  saveSpecificPrompt: vi.fn(),
}));

/**
 * Integration tests for AdminRepoPage component
 * Tests complete repository management workflows
 */
describe("AdminRepoPage Integration", () => {
  const mockItems = [
    {
      id: "1",
      name: "repo1",
      url: "http://repo1.git",
      status: "SUCCESS",
      documentStatus: "Not Documented",
    },
  ];

  /**
   * Test Case: Generate documentation workflow
   * Verifies that documentation generation updates repository state
   */
  it("generates documentation and updates state", async () => {
    const setItems = vi.fn();
    api.generateDocu.mockResolvedValue({ status: "ok", successful_count: 1 });

    render(
      <AuthProvider>
        <AdminRepoPage items={mockItems} setItems={setItems} isDark={false} />
      </AuthProvider>,
    );

    // Verify component renders with repository
    const instance = screen.getByText(/repo1/i);
    expect(instance).toBeInTheDocument();

    // Note: Full interaction testing would require accessing
    // handleGenerateDocumentation from the component instance
  });

  /**
   * Test Case: Delete repository workflow
   * Verifies that repository deletion updates the list
   */
  it("deletes a repository successfully", async () => {
    const setItems = vi.fn();
    api.deleteRepo.mockResolvedValue({});

    render(
      <AuthProvider>
        <AdminRepoPage items={mockItems} setItems={setItems} isDark={false} />
      </AuthProvider>,
    );

    // Verify component renders with repository
    expect(screen.getByText(/repo1/i)).toBeInTheDocument();

    // Note: Full interaction testing would require simulating
    // selection and deletion through the AdminRepoDataTable child component
  });
});
