/**
 * Unit tests for statusTags utility functions
 * Tests CSS class generation for repository and documentation status badges
 */
import {
  getRepoStatusClasses,
  getDocumentStatusClasses,
} from "../../lib/statusTags";

describe("getRepoStatusClasses", () => {
  /**
   * Test: Returns yellow styling for PENDING status
   */
  it("returns correct class for PENDING", () => {
    expect(getRepoStatusClasses("PENDING")).toBe(
      "bg-yellow-100 dark:bg-yellow-900 text-black dark:text-yellow-100",
    );
  });

  /**
   * Test: Returns blue styling for RECEIVED status
   */
  it("returns correct class for RECEIVED", () => {
    expect(getRepoStatusClasses("RECEIVED")).toBe(
      "bg-blue-100 dark:bg-blue-900 text-black dark:text-blue-100",
    );
  });

  /**
   * Test: Returns green styling for SUCCESS status
   */
  it("returns correct class for SUCCESS", () => {
    expect(getRepoStatusClasses("SUCCESS")).toBe(
      "bg-green-100/75 dark:bg-green-800 text-black dark:text-green-100",
    );
  });

  /**
   * Test: Returns red styling for FAILURE status
   */
  it("returns correct class for FAILURE", () => {
    expect(getRepoStatusClasses("FAILURE")).toBe(
      "bg-red-100 dark:bg-red-900 text-black dark:text-black",
    );
  });

  /**
   * Test: Returns gray default styling for unknown status
   */
  it("returns default class for unknown status", () => {
    expect(getRepoStatusClasses("UNKNOWN")).toBe(
      "bg-gray-200 dark:bg-gray-600 text-black dark:text-white",
    );
  });
});

describe("getDocumentStatusClasses", () => {
  /**
   * Test: Returns green styling for 'documented' status
   */
  it("returns correct class for 'documented'", () => {
    expect(getDocumentStatusClasses("documented")).toBe(
      "bg-green-100/75 dark:bg-green-800 text-black dark:text-green-100",
    );
  });

  /**
   * Test: Returns yellow styling for 'not documented' status
   */
  it("returns correct class for 'not documented'", () => {
    expect(getDocumentStatusClasses("not documented")).toBe(
      "bg-yellow-100 dark:bg-yellow-500/75 text-black dark:text-gray-100",
    );
  });

  /**
   * Test: Returns red styling for 'error' status
   */
  it("returns correct class for 'error'", () => {
    expect(getDocumentStatusClasses("error")).toBe(
      "bg-red-100 dark:bg-red-900 text-black dark:text-black",
    );
  });

  /**
   * Test: Handles case-insensitive input for status strings
   */
  it("handles case-insensitive input", () => {
    expect(getDocumentStatusClasses("DOCUMENTED")).toBe(
      "bg-green-100/75 dark:bg-green-800 text-black dark:text-green-100",
    );
  });

  /**
   * Test: Returns gray default styling for unknown, null, or undefined status
   */
  it("returns default class for unknown or empty status", () => {
    expect(getDocumentStatusClasses("unknown")).toBe(
      "bg-gray-200 dark:bg-gray-600 text-black dark:text-white",
    );
    expect(getDocumentStatusClasses(null)).toBe(
      "bg-gray-200 dark:bg-gray-600 text-black dark:text-white",
    );
    expect(getDocumentStatusClasses(undefined)).toBe(
      "bg-gray-200 dark:bg-gray-600 text-black dark:text-white",
    );
  });
});
