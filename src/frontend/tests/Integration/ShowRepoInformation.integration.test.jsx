import { render } from "@testing-library/react";
import ShowRepoInformation from "../../components/ShowRepoInformation.jsx";

/**
 * Integration tests for ShowRepoInformation component
 * Tests component rendering with repository data
 */
describe("ShowRepoInformation - integration tests", () => {
  /**
   * Test Case: Snapshot test for ShowRepoInformation
   * Ensures the component structure remains consistent with repository information
   */
  it("matches snapshot", () => {
    const items = [
      {
        id: 1,
        name: "Repo1",
        description: "Desc1",
        status: "PENDING",
        documentStatus: "Not Documented",
      },
    ];

    const { container } = render(
      <ShowRepoInformation
        selectedNames={["Repo1"]}
        items={items}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );

    expect(container).toMatchSnapshot();
  });
});
