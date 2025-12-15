/**
 * Unit tests for DocumentationView helper functions
 * Tests slug generation and H1 heading extraction from markdown
 */
import {
  generateSlug,
  extractFirstH1,
} from "../../components/DocumentationView.jsx";

describe("DocumentationView helper functions", () => {
  describe("generateSlug", () => {
    /**
     * Test: Converts text to lowercase URL-friendly slug
     */
    it("generates lowercase slug", () => {
      expect(generateSlug("Hello World")).toBe("hello-world");
    });

    /**
     * Test: Removes special characters from slug
     */
    it("removes special characters", () => {
      expect(generateSlug("Hello @World!")).toBe("hello-world");
    });

    /**
     * Test: Replaces multiple spaces with single dash
     */
    it("replaces multiple spaces with single dash", () => {
      expect(generateSlug("Hello   World")).toBe("hello-world");
    });

    /**
     * Test: Trims extra dashes from beginning and end
     */
    it("trims extra dashes", () => {
      expect(generateSlug("  Hello  World  ")).toBe("hello-world");
    });
  });

  describe("extractFirstH1", () => {
    /**
     * Test: Extracts text from first H1 heading in markdown
     */
    it("returns first H1 from markdown", () => {
      const markdown = "# Title\nSome content\n# Another";
      expect(extractFirstH1(markdown)).toBe("Title");
    });

    /**
     * Test: Returns null when no H1 heading exists
     */
    it("returns null if no H1", () => {
      const markdown = "No headings here";
      expect(extractFirstH1(markdown)).toBeNull();
    });

    /**
     * Test: Trims whitespace from extracted H1 text
     */
    it("trims whitespace from H1", () => {
      const markdown = "#    Spaced Title   ";
      expect(extractFirstH1(markdown)).toBe("Spaced Title");
    });

    /**
     * Test: Returns null for empty content
     */
    it("returns null for empty content", () => {
      expect(extractFirstH1("")).toBeNull();
      expect(extractFirstH1(null)).toBeNull();
      expect(extractFirstH1(undefined)).toBeNull();
    });

    /**
     * Test: Handles H1 with special characters
     */
    it("extracts H1 with special characters", () => {
      const markdown = "# Title with Special! @Chars";
      expect(extractFirstH1(markdown)).toBe("Title with Special! @Chars");
    });
  });

  describe("generateSlug - additional tests", () => {
    /**
     * Test: Handles empty strings
     */
    it("handles empty strings", () => {
      expect(generateSlug("")).toBe("");
    });

    /**
     * Test: Handles strings with only special characters
     */
    it("handles strings with only special characters", () => {
      expect(generateSlug("!!!@@@###")).toBe("");
    });

    /**
     * Test: Preserves hyphens in original text
     */
    it("preserves hyphens from original text", () => {
      expect(generateSlug("Already-Hyphenated-Text")).toBe(
        "already-hyphenated-text"
      );
    });

    /**
     * Test: Removes multiple consecutive hyphens
     */
    it("removes consecutive hyphens", () => {
      expect(generateSlug("Multiple---Hyphens")).toBe("multiple-hyphens");
    });

    /**
     * Test: Handles numbers in text
     */
    it("preserves numbers in slug", () => {
      expect(generateSlug("Section 123")).toBe("section-123");
    });

    /**
     * Test: Handles underscores
     */
    it("preserves underscores", () => {
      expect(generateSlug("snake_case_text")).toBe("snake_case_text");
    });

    /**
     * Test: Trims leading and trailing whitespace
     */
    it("trims leading and trailing whitespace", () => {
      expect(generateSlug("  Trimmed Text  ")).toBe("trimmed-text");
    });

    /**
     * Test: Handles very long strings
     */
    it("handles long strings", () => {
      const longText = "This is a very long heading with many words that should be converted";
      const slug = generateSlug(longText);
      expect(slug).toBe(
        "this-is-a-very-long-heading-with-many-words-that-should-be-converted"
      );
    });
  });
});
