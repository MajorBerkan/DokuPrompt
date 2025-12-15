import * as api from "../../lib/api";
import { vi } from "vitest";

/**
 * Integration tests for api.js module
 * Tests complete request-response flows for API functions
 */
describe("api.js - Integration Tests", () => {
  /**
   * Setup: Mock global fetch for all tests
   */
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  /**
   * Cleanup: Clear all mocks after each test
   */
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test Case: Save and retrieve general settings flow
   * Verifies the complete workflow of saving settings and then retrieving them
   */
  it("saveGeneralSettings and getGeneralSettings flow", async () => {
    const mockSettings = {
      prompt: "hello",
      checkInterval: 50,
      disabled: false,
    };

    // Mock successful save operation
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await api.saveGeneralSettings(mockSettings);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/settings/general",
      expect.objectContaining({
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockSettings),
      }),
    );

    // Mock successful retrieval operation
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSettings,
    });

    const result = await api.getGeneralSettings();
    expect(result).toEqual(mockSettings);
  });

  /**
   * Test Case: Search documents returns parsed JSON
   * Verifies that document search returns properly formatted results
   */
  it("searchDocuments returns parsed JSON", async () => {
    const mockResult = [{ id: 1, title: "Doc1" }];
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResult,
    });

    const res = await api.searchDocuments("Doc");
    expect(res).toEqual(mockResult);
  });
});
