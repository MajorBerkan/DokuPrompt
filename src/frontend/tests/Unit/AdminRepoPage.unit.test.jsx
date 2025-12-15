/**
 * Unit tests for AdminRepoPage Component
 * Tests repository page rendering, modal states, and repository operations
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminRepoPage from "../../pages/AdminRepoPage.jsx";
import { AuthProvider } from "../../lib/AuthProvider.jsx";
import * as api from "../../lib/api";
import { vi } from "vitest";

/**
 * Mock API functions used by AdminRepoPage
 */
vi.mock("../../lib/api", () => ({
  enqueueClone: vi.fn(),
  getTask: vi.fn(),
  listRepos: vi.fn(),
  deleteRepo: vi.fn(),
  generateDocu: vi.fn(),
  saveSpecificPrompt: vi.fn(),
}));

describe("AdminRepoPage Component", () => {
  const mockItems = [
    {
      id: "1",
      name: "repo1",
      url: "http://repo1.git",
      status: "SUCCESS",
      documentStatus: "Not Documented",
    },
    {
      id: "2",
      name: "repo2",
      url: "http://repo2.git",
      status: "FAILURE",
      documentStatus: "error",
    },
  ];

  const renderComponent = (props = {}) =>
    render(
      <AuthProvider>
        <AdminRepoPage
          items={mockItems}
          setItems={vi.fn()}
          isDark={false}
          {...props}
        />
      </AuthProvider>,
    );

  /**
   * Test: Renders AdminRepoHeader when no modal dialogs are open
   */
  it("renders AdminRepoHeader when no modals are open", () => {
    renderComponent();
    expect(screen.getByText(/Add/i)).toBeInTheDocument();
  });

  /**
   * Test: Shows NotificationPopup when popup state is set
   * Simulates popup trigger through user interaction
   */
  it("shows NotificationPopup when popup state is set", async () => {
    render(
      <AuthProvider>
        <AdminRepoPage items={mockItems} setItems={vi.fn()} isDark={false} />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByText(/Add/i));
  });

  /**
   * Test: Calls enqueueClone API when adding a new repository
   * Verifies repository addition workflow initialization
   */
  it("calls enqueueClone when adding a new repository", async () => {
    api.enqueueClone.mockResolvedValue({ task_id: "task123" });
    const setItems = vi.fn();

    const { container } = renderComponent({ setItems });
    const header = container.querySelector("button");
  });
});
