/**
 * Unit tests for api.js module
 * Tests API client functions, authentication headers, and error handling
 */
import * as api from "../../lib/api";
import { vi } from "vitest";
import { describe, it, expect } from "vitest";
import { setAccessToken, getAccessToken } from "../../lib/api.js";

describe("api.js - Unit Tests", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    api.setAccessToken(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Access token can be set and retrieved correctly
   * Verifies token management for authentication
   */
  it("sets the access token correctly", () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken("123");
    expect(getAccessToken()).toBe("123");
  });

  /**
   * Test: fetchWithAuth adds Authorization header when token is set
   * Verifies authenticated API requests include Bearer token
   */
  it("fetchWithAuth adds Authorization header when token is set", async () => {
    api.setAccessToken("test-token");

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 404,
      json: async () => ({ success: true }),
    });

    const res = await api.listRepos();
    expect(globalThis.fetch).toHaveBeenCalled();
    const headers = globalThis.fetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe("Bearer test-token");
    expect(res).toEqual({ success: true });
  });

  /**
   * Test: fetchWithAuth throws error on non-ok response
   * Verifies error handling for failed HTTP requests
   */
  it("fetchWithAuth throws error on non-ok response", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "Not Found",
    });

    await expect(api.listRepos()).rejects.toThrow("404 Not Found");
  });

  /**
   * Test: saveGeneralSettings calls correct API endpoint with proper payload
   * Verifies settings update request format
   */
  it("saveGeneralSettings calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await api.saveGeneralSettings({
      prompt: "test",
      checkInterval: 50,
      disabled: false,
    });

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/settings/general");
    expect(callArgs[1].method).toBe("PUT");
  });

  /**
   * Test: enqueueClone sends correct payload
   * Verifies repository clone request
   */
  it("enqueueClone calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ task_id: "123" }),
    });

    await api.enqueueClone({
      repo_url: "https://github.com/test/repo",
      depth: 1,
      branch: "main",
    });

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/repos/clone");
    expect(callArgs[1].method).toBe("POST");
  });

  /**
   * Test: getTask retrieves task status
   * Verifies task status check
   */
  it("getTask calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "completed" }),
    });

    await api.getTask("task-123");

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/repos/tasks/task-123");
  });

  /**
   * Test: deleteRepo sends correct payload
   * Verifies repository deletion
   */
  it("deleteRepo calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await api.deleteRepo("repo-123");

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/repos/delete");
    expect(callArgs[1].method).toBe("POST");
  });

  /**
   * Test: updateRepo sends correct payload
   * Verifies repository metadata update
   */
  it("updateRepo calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await api.updateRepo("repo-123", "New Name", "New Description");

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/repos/update");
    expect(callArgs[1].method).toBe("POST");
  });

  /**
   * Test: callApi handles authentication
   * Verifies legacy auth function
   */
  it("callApi adds Bearer token", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('{"data": "test"}'),
    });

    await api.callApi("/test", "my-token");

    expect(globalThis.fetch).toHaveBeenCalled();
    const headers = globalThis.fetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe("Bearer my-token");
  });

  /**
   * Test: callApi handles non-JSON responses
   * Verifies text response handling
   */
  it("callApi returns text when JSON parsing fails", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("plain text response"),
    });

    const result = await api.callApi("/test", "token");
    expect(result).toBe("plain text response");
  });

  /**
   * Test: callApi throws on error response
   * Verifies error handling
   */
  it("callApi throws error on non-ok response", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('{"error": "Internal Server Error"}'),
    });

    await expect(api.callApi("/test", "token")).rejects.toThrow();
  });

  /**
   * Test: regenerateDoc sends correct payload
   * Verifies documentation regeneration
   */
  it("regenerateDoc calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await api.regenerateDoc("repo-123");

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/repos/regenerate-doc");
    expect(callArgs[1].method).toBe("POST");
  });

  /**
   * Test: saveSpecificPrompt sends correct payload
   * Verifies repo-specific prompt save
   */
  it("saveSpecificPrompt calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await api.saveSpecificPrompt("repo-123", "Custom prompt");

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/prompts/repo");
    expect(callArgs[1].method).toBe("POST");
  });

  /**
   * Test: getSpecificPrompt retrieves repo prompt
   * Verifies repo-specific prompt retrieval
   */
  it("getSpecificPrompt calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ prompt: "Test prompt" }),
    });

    await api.getSpecificPrompt("repo-123");

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/prompts/repo/repo-123");
  });

  /**
   * Test: saveGeneralPrompt sends correct payload
   * Verifies general prompt save
   */
  it("saveGeneralPrompt calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await api.saveGeneralPrompt("General prompt");

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/prompts/general");
    expect(callArgs[1].method).toBe("POST");
  });

  /**
   * Test: getGeneralSettings retrieves settings
   * Verifies settings retrieval
   */
  it("getGeneralSettings calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ prompt: "test", checkInterval: 60, disabled: false }),
    });

    const result = await api.getGeneralSettings();

    expect(globalThis.fetch).toHaveBeenCalled();
    expect(result).toHaveProperty("prompt");
  });

  /**
   * Test: getGeneralPrompt retrieves prompt
   * Verifies general prompt retrieval
   */
  it("getGeneralPrompt calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ prompt: "Default prompt" }),
    });

    await api.getGeneralPrompt();

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/prompts/general");
  });

  /**
   * Test: savePromptTemplate sends correct payload
   * Verifies template save
   */
  it("savePromptTemplate calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "template-1" }),
    });

    await api.savePromptTemplate({
      name: "Template 1",
      description: "Test",
      prompt: "Test prompt",
    });

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/prompt-templates");
    expect(callArgs[1].method).toBe("POST");
  });

  /**
   * Test: getPromptTemplates retrieves all templates
   * Verifies template list retrieval
   */
  it("getPromptTemplates calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: "1", name: "Template 1" }]),
    });

    await api.getPromptTemplates();

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/prompt-templates");
  });

  /**
   * Test: updatePromptTemplate sends correct payload
   * Verifies template update
   */
  it("updatePromptTemplate calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await api.updatePromptTemplate("template-1", { name: "Updated" });

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/prompt-templates/template-1");
    expect(callArgs[1].method).toBe("PUT");
  });

  /**
   * Test: deletePromptTemplate sends correct request
   * Verifies template deletion
   */
  it("deletePromptTemplate calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await api.deletePromptTemplate("template-1");

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/prompt-templates/template-1");
    expect(callArgs[1].method).toBe("DELETE");
  });

  /**
   * Test: generateDocu sends correct payload
   * Verifies documentation generation
   */
  it("generateDocu calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ task_id: "gen-123" }),
    });

    await api.generateDocu(["repo-1", "repo-2"]);

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/ai/generate");
    expect(callArgs[1].method).toBe("POST");
  });

  /**
   * Test: listDocuments retrieves all docs
   * Verifies document list retrieval
   */
  it("listDocuments calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: "doc-1" }]),
    });

    await api.listDocuments();

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/docs/list");
  });

  /**
   * Test: getDocument retrieves specific doc
   * Verifies document retrieval
   */
  it("getDocument calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "doc-1", content: "Test" }),
    });

    await api.getDocument("doc-1");

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/docs/doc-1");
  });

  /**
   * Test: deleteDocuments sends correct payload
   * Verifies document deletion
   */
  it("deleteDocuments calls correct endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await api.deleteDocuments(["doc-1", "doc-2"]);

    expect(globalThis.fetch).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[0]).toContain("/docs/delete");
    expect(callArgs[1].method).toBe("POST");
  });

  /**
   * Test: Error handling in saveGeneralSettings
   * Verifies error propagation
   */
  it("saveGeneralSettings handles errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });

    await expect(
      api.saveGeneralSettings({
        prompt: "test",
        checkInterval: 50,
        disabled: false,
      })
    ).rejects.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  /**
   * Test: Error handling in getGeneralSettings
   * Verifies error propagation
   */
  it("getGeneralSettings handles errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not Found"),
    });

    await expect(api.getGeneralSettings()).rejects.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
