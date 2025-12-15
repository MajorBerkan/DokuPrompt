/**
 * Unit tests for AuthProvider JWT parsing
 * Tests parseJwt utility function for valid and invalid tokens
 */
import { parseJwt } from "../../lib/AuthProvider";

describe("AuthProvider - Unit Tests", () => {
  /**
   * Test: Correctly parses a valid JWT token
   * Extracts payload from base64-encoded middle section
   */
  it("parseJwt correctly parses a valid JWT", () => {
    const payload = { roles: ["Admin"], name: "Test User" };
    const base64 = btoa(JSON.stringify(payload));
    const token = `header.${base64}.signature`;

    const result = parseJwt(token);
    expect(result).toEqual(payload);
  });

  /**
   * Test: Returns empty object for invalid token format
   * Handles malformed tokens gracefully without throwing errors
   */
  it("parseJwt returns empty object for invalid token", () => {
    const invalidToken = "invalid.token";
    const result = parseJwt(invalidToken);
    expect(result).toEqual({});
  });
});
