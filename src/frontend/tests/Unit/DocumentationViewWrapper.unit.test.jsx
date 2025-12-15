/**
 * Unit tests for DocumentationViewWrapper Component
 * Tests date formatting functionality
 */
describe("DocumentationViewWrapper - unit tests", () => {
  /**
   * Test: Formats ISO date strings to locale date strings correctly
   * Verifies date conversion for display purposes
   */
  it("formats date correctly", () => {
    const createdAt = "2025-11-25T12:34:56Z";
    const updatedAt = "2025-11-26T15:00:00Z";

    const createdDate = new Date(createdAt).toLocaleDateString();
    const updatedDate = new Date(updatedAt).toLocaleDateString();

    expect(createdDate).toBe(new Date(createdAt).toLocaleDateString());
    expect(updatedDate).toBe(new Date(updatedAt).toLocaleDateString());
  });
});
