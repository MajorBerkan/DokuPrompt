import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditSpecificPromptMenu from "../../components/EditSpecificPromptMenu.jsx";
import { vi } from "vitest";
import * as api from "../../lib/api.js";

/**
 * Mock API module for prompt template management
 */
vi.mock("../../lib/api.js", () => ({
  getPromptTemplates: vi.fn(),
  savePromptTemplate: vi.fn(),
  updatePromptTemplate: vi.fn(),
  deletePromptTemplate: vi.fn(),
}));

/**
 * Integration tests for EditSpecificPromptMenu component
 * Tests complete workflows for template management and prompt editing
 */
describe("EditSpecificPromptMenu - integration tests", () => {
  const onSave = vi.fn();
  const onClose = vi.fn();

  /**
   * Mock template data for testing
   */
  const mockTemplates = [
    {
      id: 1,
      name: "Template Testing",
      description: "This template is used for testing",
      content: "Test content for template",
    },
    {
      id: 2,
      name: "Another Template",
      description: "Another test template",
      content: "Another test content",
    },
  ];

  /**
   * Setup: Reset mocks and configure API responses before each test
   */
  beforeEach(() => {
    vi.clearAllMocks();

    // Configure default mock implementations
    api.getPromptTemplates.mockResolvedValue(mockTemplates);
    api.savePromptTemplate.mockImplementation((template) =>
      Promise.resolve({ id: 3, ...template }),
    );
    api.updatePromptTemplate.mockImplementation((id, template) =>
      Promise.resolve({ id, ...template }),
    );
    api.deletePromptTemplate.mockResolvedValue({});
  });

  /**
   * Test Case: Render main UI components
   * Verifies that the editor renders with textarea and loads templates
   */
  it("renders the main UI and textarea", async () => {
    render(<EditSpecificPromptMenu onSave={onSave} onClose={onClose} />);
    expect(screen.getByText(/edit specific prompt/i)).toBeInTheDocument();

    // Wait for templates to finish loading
    await waitFor(() => {
      expect(api.getPromptTemplates).toHaveBeenCalled();
    });

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  /**
   * Test Case: Save Template modal lifecycle
   * Verifies opening and closing of the Save Template modal
   */
  it("opens and closes Save Template modal", async () => {
    render(<EditSpecificPromptMenu onSave={onSave} onClose={onClose} />);

    // Wait for initial load
    await waitFor(() => {
      expect(api.getPromptTemplates).toHaveBeenCalled();
    });

    // Open the modal
    const saveButton = screen.getByText(/save prompt as template/i);
    fireEvent.click(saveButton);

    // Verify modal is open (has both button and modal heading)
    await waitFor(() => {
      const modalHeadings = screen.getAllByText(/save prompt as template/i);
      expect(modalHeadings.length).toBeGreaterThan(1);
    });

    // Close the modal
    fireEvent.click(screen.getByText(/cancel/i));

    // Verify modal is closed (only button remains)
    await waitFor(() => {
      const remainingTexts = screen.queryAllByText(/save prompt as template/i);
      expect(remainingTexts.length).toBe(1);
    });
  });

  /**
   * Test Case: Delete template workflow
   * Verifies template deletion from Manage Templates modal
   */
  it("opens Manage Templates modal and deletes a template", async () => {
    render(<EditSpecificPromptMenu onSave={onSave} onClose={onClose} />);

    // Wait for templates to load
    await waitFor(() => {
      expect(api.getPromptTemplates).toHaveBeenCalled();
    });

    // Open Manage Templates modal
    fireEvent.click(screen.getByText(/edit templates/i));

    // Wait for templates to appear in modal
    expect(await screen.findByText(/template testing/i)).toBeInTheDocument();

    // Delete the first template
    const deleteButtons = screen.getAllByText(/delete/i);
    fireEvent.click(deleteButtons[0]);

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText(/^yes$/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/^yes$/i));

    // Verify API was called and template is removed
    await waitFor(() => {
      expect(api.deletePromptTemplate).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.queryByText(/template testing/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/another template/i)).toBeInTheDocument();
  });

  /**
   * Test Case: Edit template workflow
   * Verifies template editing including name, description, and content updates
   */
  it("edits a template", async () => {
    const user = userEvent.setup();
    render(<EditSpecificPromptMenu onSave={onSave} onClose={onClose} />);

    // Wait for templates to load
    await waitFor(() => {
      expect(api.getPromptTemplates).toHaveBeenCalled();
    });

    // Open Manage Templates modal
    await user.click(screen.getByText(/edit templates/i));

    // Wait for templates to appear
    await screen.findByText(/template testing/i);

    // Click edit on first template
    const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
    await user.click(editButtons[0]);

    // Wait for Edit Template modal to open with template data
    // Use findByDisplayValue which is async and waits automatically
    const nameInput = await screen.findByDisplayValue(/template testing/i);
    expect(nameInput).toBeInTheDocument();

    // Update template name
    await user.clear(nameInput);
    await user.type(nameInput, "Edited Template");

    // Update template description
    const descriptionInput = screen.getByDisplayValue(
      /this template is used for testing/i,
    );
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Edited description");

    // Save the changes
    const saveButtons = screen.getAllByRole("button", { name: /^save$/i });
    await user.click(saveButtons[0]);

    // Confirm changes
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^yes$/i }),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /^yes$/i }));

    // Verify API was called with updated data
    await waitFor(() => {
      expect(api.updatePromptTemplate).toHaveBeenCalledWith(1, {
        name: "Edited Template",
        description: "Edited description",
        content: "Test content for template",
      });
    });

    // Verify updated template appears in the list
    await waitFor(() => {
      expect(screen.getByText(/edited template/i)).toBeInTheDocument();
      expect(screen.getByText(/edited description/i)).toBeInTheDocument();
    });
  });

  /**
   * Test Case: Save prompt changes
   * Verifies that edited prompt content is saved via onSave callback
   */
  it("saves the prompt using onSave", async () => {
    const user = userEvent.setup();
    // Render with initial content
    render(
      <EditSpecificPromptMenu
        onSave={onSave}
        onClose={onClose}
        selectedPrompts={["Initial content"]}
      />,
    );

    // Wait for templates to load
    await waitFor(() => {
      expect(api.getPromptTemplates).toHaveBeenCalled();
    });

    const textarea = screen.getByRole("textbox");

    // Edit the prompt content
    await user.clear(textarea);
    await user.type(textarea, "New Prompt Content");

    // Save changes
    await user.click(screen.getByText(/save changes/i));

    // Verify onSave callback was called with new content
    expect(onSave).toHaveBeenCalledWith("New Prompt Content", []);
    expect(onClose).toHaveBeenCalled();
  });
});
