/**
 * Integration tests for DeleteModal Component
 * Tests modal behavior in realistic usage scenarios
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import DeleteModal from "../../components/DeleteModal";
import "@testing-library/jest-dom/vitest";

describe("DeleteModal Component - Integration Test", () => {
  /**
   * Test: Complete deletion workflow
   */
  it("completes full deletion workflow", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const itemName = "Test Repository";

    const { rerender } = render(
      <DeleteModal
        isOpen={false}
        onClose={onClose}
        onConfirm={onConfirm}
        itemType="repository"
        itemName={itemName}
      />
    );

    // Modal should not be visible initially
    expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument();

    // Open the modal
    rerender(
      <DeleteModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        itemType="repository"
        itemName={itemName}
      />
    );

    // Modal should now be visible
    await waitFor(() => {
      expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
    });

    // Verify all content is displayed
    expect(
      screen.getByText(/Are you sure you want to delete the following repository\?/)
    ).toBeInTheDocument();
    expect(screen.getByText(itemName)).toBeInTheDocument();

    // Click "Yes" button
    const yesButton = screen.getByRole("button", { name: /yes/i });
    fireEvent.click(yesButton);

    // Verify onConfirm was called
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Test: Cancellation workflow
   */
  it("cancels deletion when No button is clicked", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        itemType="document"
        itemName="Test Document"
      />
    );

    // Click "No" button
    const noButton = screen.getByRole("button", { name: /no/i });
    fireEvent.click(noButton);

    // Verify onClose was called but not onConfirm
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  /**
   * Test: Displays content instead of name when provided
   */
  it("displays content correctly in deletion preview", () => {
    const testContent = "This is a long content that should be displayed in a scrollable box";

    render(
      <DeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemType="template"
        itemName="Should not appear"
        itemContent={testContent}
      />
    );

    // Content should be visible
    expect(screen.getByText(testContent)).toBeInTheDocument();
    // Name should not be visible when content is provided
    expect(screen.queryByText("Should not appear")).not.toBeInTheDocument();
  });

  /**
   * Test: Modal state transition
   */
  it("transitions between open and closed states correctly", async () => {
    const { rerender } = render(
      <DeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemType="item"
        itemName="Test Item"
      />
    );

    // Modal is open
    expect(screen.getByText("Confirm Delete")).toBeInTheDocument();

    // Close the modal
    rerender(
      <DeleteModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemType="item"
        itemName="Test Item"
      />
    );

    // Modal should be gone
    await waitFor(() => {
      expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Multiple deletion types
   */
  it("handles different item types correctly", () => {
    const itemTypes = [
      { type: "repository", name: "My Repo" },
      { type: "document", name: "My Doc" },
      { type: "template", name: "My Template" },
    ];

    itemTypes.forEach(({ type, name }) => {
      const { unmount } = render(
        <DeleteModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          itemType={type}
          itemName={name}
        />
      );

      // Check that the correct message is displayed
      const regex = new RegExp(
        `Are you sure you want to delete the following ${type}\\?`,
        "i"
      );
      expect(screen.getByText(regex)).toBeInTheDocument();
      expect(screen.getByText(name)).toBeInTheDocument();

      unmount();
    });
  });

  /**
   * Test: Keyboard accessibility
   */
  it("maintains proper modal overlay structure", () => {
    const { container } = render(
      <DeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemType="repository"
        itemName="Test Repo"
      />
    );

    // Check that modal overlay exists with proper z-index
    const overlay = container.querySelector('[class*="z-[60]"]');
    expect(overlay).toBeInTheDocument();

    // Check that modal content is within overlay
    const modalContent = screen.getByText("Confirm Delete");
    expect(overlay).toContainElement(modalContent);
  });

  /**
   * Test: Long content handling
   */
  it("handles long content with scrolling", () => {
    const longContent = "Line 1\n".repeat(100); // Very long content

    const { container } = render(
      <DeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemType="template"
        itemContent={longContent}
      />
    );

    // Content should be visible - look for a portion of it
    expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    
    // Check that the scrollable container exists with proper class
    const contentBox = container.querySelector('.overflow-y-auto');
    expect(contentBox).toBeInTheDocument();
    expect(contentBox).toHaveClass("h-48"); // Fixed height for scrolling
  });

  /**
   * Test: Default values
   */
  it("uses default values when props are not provided", () => {
    render(
      <DeleteModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />
    );

    // Should use default itemType "item"
    expect(
      screen.getByText(/Are you sure you want to delete the following item\?/)
    ).toBeInTheDocument();
  });

  /**
   * Test: Button functionality under different states
   */
  it("calls callbacks with correct timing", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        itemType="repository"
        itemName="Test Repo"
      />
    );

    // Both buttons should be present
    const yesButton = screen.getByRole("button", { name: /yes/i });
    const noButton = screen.getByRole("button", { name: /no/i });

    expect(yesButton).toBeInTheDocument();
    expect(noButton).toBeInTheDocument();

    // Click No first
    fireEvent.click(noButton);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    // Reset and click Yes
    onClose.mockClear();
    fireEvent.click(yesButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  /**
   * Test: Visual regression - component structure
   */
  it("renders with correct visual structure", () => {
    const { container } = render(
      <DeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemType="repository"
        itemName="Test Repository"
      />
    );

    // Check for key visual elements
    expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /yes/i })).toHaveClass(
      "bg-[#3200c8]"
    );
    expect(screen.getByRole("button", { name: /no/i })).toHaveClass(
      "bg-gray-300"
    );

    // Snapshot would be good here but we'll just check structure
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });
});
