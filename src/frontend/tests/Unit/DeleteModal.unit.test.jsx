import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import DeleteModal from "../../components/DeleteModal";

describe("DeleteModal Component - Unit Test", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <DeleteModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemType="item"
        itemName="Test Item"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders when isOpen is true", () => {
    render(
      <DeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemType="item"
        itemName="Test Item"
      />
    );
    expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
  });

  it("displays the correct item type in the confirmation message", () => {
    render(
      <DeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemType="repository"
        itemName="Test Repository"
      />
    );
    expect(
      screen.getByText(/Are you sure you want to delete the following repository\?/)
    ).toBeInTheDocument();
  });

  it("displays item name when provided without content", () => {
    render(
      <DeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemType="documentation"
        itemName="Test Documentation"
      />
    );
    expect(screen.getByText("Test Documentation")).toBeInTheDocument();
  });

  it("displays item content when provided", () => {
    const testContent = "This is test content for deletion";
    render(
      <DeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemType="template"
        itemName="Test Template"
        itemContent={testContent}
      />
    );
    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it("calls onClose when No button is clicked", () => {
    const onCloseMock = vi.fn();
    render(
      <DeleteModal
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={vi.fn()}
        itemType="item"
        itemName="Test Item"
      />
    );

    const noButton = screen.getByRole("button", { name: /no/i });
    fireEvent.click(noButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when Yes button is clicked", () => {
    const onConfirmMock = vi.fn();
    render(
      <DeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirmMock}
        itemType="item"
        itemName="Test Item"
      />
    );

    const yesButton = screen.getByRole("button", { name: /yes/i });
    fireEvent.click(yesButton);

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it("renders with default itemType when not provided", () => {
    render(
      <DeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemName="Test Item"
      />
    );
    expect(
      screen.getByText(/Are you sure you want to delete the following item\?/)
    ).toBeInTheDocument();
  });

  it("prefers itemContent over itemName when both are provided", () => {
    const testContent = "This is the content";
    const testName = "This is the name";
    render(
      <DeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemType="item"
        itemName={testName}
        itemContent={testContent}
      />
    );

    expect(screen.getByText(testContent)).toBeInTheDocument();
    expect(screen.queryByText(testName)).not.toBeInTheDocument();
  });

  it("applies correct z-index for modal overlay", () => {
    const { container } = render(
      <DeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemType="item"
        itemName="Test Item"
      />
    );

    const overlay = container.firstChild;
    expect(overlay).toHaveClass("z-[60]");
  });
});
