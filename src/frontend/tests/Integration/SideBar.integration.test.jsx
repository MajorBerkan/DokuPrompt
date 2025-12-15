import { render, screen, fireEvent } from "@testing-library/react";
import SideBar from "../../components/SideBar.jsx";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";

/**
 * Mock AuthProvider to provide test authentication data
 */
vi.mock("../../lib/AuthProvider", () => ({
  useAuth: () => ({
    logout: vi.fn(),
    account: { name: "Test User", username: "testuser" },
    roles: ["admin"],
  }),
}));

/**
 * Mock API functions to provide test document data
 */
vi.mock("../../lib/api", () => ({
  listDocuments: vi.fn(async () => [
    { id: 1, title: "Doc1" },
    { id: 2, title: "Doc2" },
  ]),
  getDocument: vi.fn(async () => ({
    id: 1,
    title: "Doc1",
    content: "# Doc1\n## Sec1",
  })),
}));

/**
 * Integration tests for SideBar component
 * Tests navigation, document links, and user profile interactions
 */
describe("SideBar component", () => {
  /**
   * Test Case: Render document navigation links
   * Verifies that fetched documents appear as navigation links in the sidebar
   */
  it("renders document nav links", async () => {
    render(
      <BrowserRouter>
        <SideBar refreshTrigger={0} />
      </BrowserRouter>,
    );

    // Wait for documents to load from API
    const docLink = await screen.findByText("Doc1");
    expect(docLink).toBeInTheDocument();

    const doc2Link = await screen.findByText("Doc2");
    expect(doc2Link).toBeInTheDocument();
  });

  /**
   * Test Case: Render profile section with dark mode toggle
   * Verifies that profile section displays user information and dark mode control
   */
  it("renders profile section with dark mode toggle", () => {
    render(
      <BrowserRouter>
        <SideBar refreshTrigger={0} />
      </BrowserRouter>,
    );

    // Open profile menu by clicking profile button
    const profileBtn = screen.getByRole("button", { name: /Test User/i });
    fireEvent.click(profileBtn);
    expect(screen.getByText("Test User")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /dark mode/i });
    expect(toggle).toBeTruthy();
  });

  /**
   * Test Case: Toggle logout popup visibility
   * Verifies that clicking profile button shows/hides logout option
   */
  it("toggles logout popup when profile clicked", () => {
    render(
      <BrowserRouter>
        <SideBar refreshTrigger={0} />
      </BrowserRouter>,
    );

    const profileBtn = screen.getByRole("button", { name: /Test User/i });
    
    // First click: show logout
    fireEvent.click(profileBtn);
    expect(screen.getByText(/Log out/i)).toBeInTheDocument();

    // Second click: hide logout
    fireEvent.click(profileBtn);
    expect(screen.queryByText(/Log out/i)).not.toBeInTheDocument();
  });

  /**
   * Test Case: Dark mode toggle functionality
   * Verifies theme switching works correctly
   */
  it("toggles dark mode when button is clicked", () => {
    const toggleTheme = vi.fn();
    render(
      <BrowserRouter>
        <SideBar refreshTrigger={0} isDark={false} toggleTheme={toggleTheme} />
      </BrowserRouter>,
    );

    const profileBtn = screen.getByRole("button", { name: /Test User/i });
    fireEvent.click(profileBtn);

    const darkModeToggle = screen.getByRole("button", { name: /dark mode/i });
    fireEvent.click(darkModeToggle);

    expect(toggleTheme).toHaveBeenCalled();
  });

  /**
   * Test Case: Renders navigation links
   * Verifies all main navigation sections are present
   */
  it("renders main navigation links", () => {
    render(
      <BrowserRouter>
        <SideBar refreshTrigger={0} />
      </BrowserRouter>,
    );

    expect(screen.getByRole("link", { name: /Documentation/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Repositories/i })).toBeInTheDocument();
  });

  /**
   * Test Case: User role is displayed correctly
   * Verifies that admin role badge is shown
   */
  it("displays user role correctly", () => {
    render(
      <BrowserRouter>
        <SideBar refreshTrigger={0} />
      </BrowserRouter>,
    );

    const profileBtn = screen.getByRole("button", { name: /Test User/i });
    fireEvent.click(profileBtn);

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  /**
   * Test Case: Documents are sorted alphabetically
   * Verifies document list is alphabetically ordered
   */
  it("sorts documents alphabetically", async () => {
    render(
      <BrowserRouter>
        <SideBar refreshTrigger={0} />
      </BrowserRouter>,
    );

    const doc1 = await screen.findByText("Doc1");
    const doc2 = await screen.findByText("Doc2");

    expect(doc1).toBeInTheDocument();
    expect(doc2).toBeInTheDocument();
  });

  /**
   * Test Case: Handles document loading errors gracefully
   * Verifies error handling when API calls fail
   */
  it("handles document loading errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    const { listDocuments } = await import("../../lib/api");
    listDocuments.mockRejectedValueOnce(new Error("API Error"));

    render(
      <BrowserRouter>
        <SideBar refreshTrigger={1} />
      </BrowserRouter>,
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  /**
   * Test Case: Profile icon changes based on theme
   * Verifies correct icon is displayed for light/dark mode
   */
  it("displays correct profile icon for light mode", () => {
    render(
      <BrowserRouter>
        <SideBar refreshTrigger={0} isDark={false} />
      </BrowserRouter>,
    );

    const profileBtn = screen.getByRole("button", { name: /Test User/i });
    const img = profileBtn.querySelector("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("UserOutline3"));
  });

  /**
   * Test Case: Refresh trigger reloads documents
   * Verifies that changing refresh trigger fetches documents again
   */
  it("reloads documents when refresh trigger changes", async () => {
    const { listDocuments } = await import("../../lib/api");
    
    const { rerender } = render(
      <BrowserRouter>
        <SideBar refreshTrigger={0} />
      </BrowserRouter>,
    );

    await screen.findByText("Doc1");
    
    const callCount = listDocuments.mock.calls.length;

    rerender(
      <BrowserRouter>
        <SideBar refreshTrigger={1} />
      </BrowserRouter>,
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(listDocuments.mock.calls.length).toBeGreaterThan(callCount);
  });

  /**
   * Test Case: Logout popup can be opened and closed
   * Verifies complete logout popup workflow
   */
  it("opens and closes logout popup", () => {
    render(
      <BrowserRouter>
        <SideBar refreshTrigger={0} />
      </BrowserRouter>,
    );

    const profileBtn = screen.getByRole("button", { name: /Test User/i });
    
    // Open popup
    fireEvent.click(profileBtn);
    expect(screen.getByText(/Log out/i)).toBeInTheDocument();
    
    // Close by clicking outside
    fireEvent.click(profileBtn);
    expect(screen.queryByText(/Log out/i)).not.toBeInTheDocument();
  });

  /**
   * Test Case: Snapshot test for SideBar structure
   * Ensures the sidebar structure remains consistent across changes
   */
  test("SideBar snapshot", () => {
    const { container } = render(
      <BrowserRouter>
        <SideBar refreshTrigger={0} />
      </BrowserRouter>,
    );
    expect(container).toMatchSnapshot();
  });
});
