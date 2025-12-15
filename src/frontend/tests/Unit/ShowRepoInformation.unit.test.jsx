/**
 * Unit tests for ShowRepoInformation Component
 * Tests repository information display and editing functionality
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShowRepoInformation from "../../components/ShowRepoInformation.jsx";
import * as api from "../../lib/api.js";
import { vi } from "vitest";

/**
 * Mock updateRepo API function
 */
vi.mock("../../lib/api.js", () => ({
  updateRepo: vi.fn(),
}));

describe("ShowRepoInformation - unit tests", () => {
  const items = [
    {
      id: 1,
      name: "Repo1",
      description: "Desc1",
      status: "PENDING",
      documentStatus: "Not Documented",
    },
    {
      id: 2,
      name: "Repo2",
      description: "Desc2",
      status: "READY",
      documentStatus: "Documented",
    },
  ];

  const onSaveMock = vi.fn();
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Renders repository information fields with correct values
   */
  it("renders repo info fields correctly", () => {
    render(
      <ShowRepoInformation
        selectedNames={["Repo1"]}
        items={items}
        onSave={onSaveMock}
        onClose={onCloseMock}
      />,
    );

    expect(screen.getByDisplayValue("Repo1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Desc1")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("Not Documented")).toBeInTheDocument();
  });

  /**
   * Test: Shows error when attempting to rename repository to duplicate name
   * Validates repository name uniqueness
   */
  it("shows error when trying to rename repo to duplicate name", async () => {
    render(
      <ShowRepoInformation
        selectedNames={["Repo1"]}
        items={items}
        onSave={onSaveMock}
        onClose={onCloseMock}
      />,
    );

    const input = screen.getByDisplayValue("Repo1");
    fireEvent.change(input, { target: { value: "Repo2" } });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.getByText("A repository with this name already exists."),
      ).toBeInTheDocument();
      expect(api.updateRepo).not.toHaveBeenCalled();
    });
  });

  it("calls updateRepo and triggers onSave/onClose on valid save", async () => {
    api.updateRepo.mockResolvedValueOnce({});
    render(
      <ShowRepoInformation
        selectedNames={["Repo1"]}
        items={items}
        onSave={onSaveMock}
        onClose={onCloseMock}
      />,
    );

    const input = screen.getByDisplayValue("Repo1");
    fireEvent.change(input, { target: { value: "Repo1-New" } });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateRepo).toHaveBeenCalledWith(1, "Repo1-New", "Desc1");
      expect(onSaveMock).toHaveBeenCalledWith({
        originalName: "Repo1",
        newName: "Repo1-New",
        originalDescription: "Desc1",
        newDescription: "Desc1",
      });
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
});
