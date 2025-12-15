/**
 * Tests for frontend URL normalization to ensure duplicate detection works correctly.
 * This tests the normalizeRepoUrl function in AdminRepoPage.jsx
 */
import { describe, it, expect } from "vitest";

// Extract the normalizeRepoUrl function for testing
// Since it's defined in AdminRepoPage component, we'll test it by copy
const normalizeRepoUrl = (url) => {
  // Handle non-string inputs (e.g., numeric IDs)
  if (typeof url !== 'string') {
    return '';
  }
  
  let normalized = url.trim();

  // Convert SSH URLs to HTTPS
  // git@github.com:user/repo.git -> https://github.com/user/repo.git
  if (normalized.startsWith("git@")) {
    const withoutPrefix = normalized.substring(4); // Remove 'git@'
    // Replace only the first colon with a slash
    const colonIndex = withoutPrefix.indexOf(":");
    if (colonIndex !== -1) {
      normalized = "https://" + withoutPrefix.substring(0, colonIndex) + "/" + withoutPrefix.substring(colonIndex + 1);
    }
  }
  // ssh://git@github.com/user/repo.git -> https://github.com/user/repo.git
  else if (normalized.startsWith("ssh://git@")) {
    normalized = normalized.replace("ssh://git@", "https://");
  }

  // Normalize http to https
  if (normalized.startsWith("http://")) {
    normalized = normalized.replace("http://", "https://");
  }

  // Ensure .git suffix for consistency
  if (!normalized.endsWith(".git")) {
    normalized = normalized + ".git";
  }

  // Remove any trailing slashes before .git
  normalized = normalized.replace("/.git", ".git");

  return normalized.toLowerCase(); // Lowercase for case-insensitive comparison
};

describe("Frontend URL Normalization", () => {
  it("should normalize HTTPS URLs correctly", () => {
    const url = "https://github.com/user/repo.git";
    const expected = "https://github.com/user/repo.git";
    expect(normalizeRepoUrl(url)).toBe(expected);
  });

  it("should convert HTTP URLs to HTTPS", () => {
    const url = "http://github.com/user/repo.git";
    const expected = "https://github.com/user/repo.git";
    expect(normalizeRepoUrl(url)).toBe(expected);
  });

  it("should convert SSH URLs with colon format to HTTPS", () => {
    const url = "git@github.com:user/repo.git";
    const expected = "https://github.com/user/repo.git";
    expect(normalizeRepoUrl(url)).toBe(expected);
  });

  it("should convert SSH URLs with ssh:// prefix to HTTPS", () => {
    const url = "ssh://git@github.com/user/repo.git";
    const expected = "https://github.com/user/repo.git";
    expect(normalizeRepoUrl(url)).toBe(expected);
  });

  it("should add .git suffix to URLs without it", () => {
    const url = "https://github.com/user/repo";
    const expected = "https://github.com/user/repo.git";
    expect(normalizeRepoUrl(url)).toBe(expected);
  });

  it("should lowercase URLs for case-insensitive comparison", () => {
    const url = "https://GitHub.com/User/Repo.git";
    const expected = "https://github.com/user/repo.git";
    expect(normalizeRepoUrl(url)).toBe(expected);
  });

  it("should normalize different URL formats to the same value", () => {
    const urls = [
      "https://github.com/user/repo.git",
      "http://github.com/user/repo.git",
      "git@github.com:user/repo.git",
      "ssh://git@github.com/user/repo.git",
      "https://github.com/user/repo",
      "HTTPS://GitHub.com/User/Repo.git",
    ];

    const normalized = urls.map(normalizeRepoUrl);

    // All should normalize to the same value
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe("https://github.com/user/repo.git");
  });

  it("should normalize GitLab SSH URLs correctly", () => {
    const url = "git@gitlab.com:group/project.git";
    const expected = "https://gitlab.com/group/project.git";
    expect(normalizeRepoUrl(url)).toBe(expected);
  });

  it("should trim whitespace from URLs", () => {
    const url = "  https://github.com/user/repo.git  ";
    const expected = "https://github.com/user/repo.git";
    expect(normalizeRepoUrl(url)).toBe(expected);
  });

  it("should handle URLs from the same repository after rename", () => {
    // Scenario from the bug report:
    // 1. Add repo with URL https://github.com/user/repo.git (name: repo)
    // 2. Rename to "MyApp"
    // 3. Try to add https://github.com/user/repo.git again
    // Both should normalize to the same value and be detected as duplicates

    const originalUrl = "https://github.com/user/repo.git";
    const attemptedDuplicate = "https://github.com/user/repo.git";

    expect(normalizeRepoUrl(originalUrl)).toBe(
      normalizeRepoUrl(attemptedDuplicate),
    );
  });

  it("should detect SSH and HTTPS variations as duplicates", () => {
    // After renaming a repo from "repo" to "MyApp", 
    // adding the SSH version should be detected as a duplicate
    const httpsUrl = "https://github.com/user/repo.git";
    const sshUrl = "git@github.com:user/repo.git";

    expect(normalizeRepoUrl(httpsUrl)).toBe(normalizeRepoUrl(sshUrl));
  });

  it("should handle non-string inputs gracefully", () => {
    // When item.id is a number (after backend assigns repo_id), it should not cause errors
    expect(normalizeRepoUrl(123)).toBe("");
    expect(normalizeRepoUrl(null)).toBe("");
    expect(normalizeRepoUrl(undefined)).toBe("");
    expect(normalizeRepoUrl({})).toBe("");
  });
});
