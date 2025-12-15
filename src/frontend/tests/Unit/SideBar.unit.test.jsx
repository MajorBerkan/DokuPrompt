/**
 * Unit tests for SideBar utility functions
 * Tests markdown heading extraction and slug generation
 */
import {
  extractHeadings,
  extractFirstH1,
  generateSlug,
} from "../../components/SideBar.jsx";

describe("SideBar functions", () => {
  describe("generateSlug", () => {
    /**
     * Test: Converts heading text to URL-friendly slug
     * Removes special characters, converts to lowercase, replaces spaces with hyphens
     */
    it("generates slug correctly", () => {
      expect(generateSlug("Hello World!")).toBe("hello-world");
      expect(generateSlug("Duplicate  Slug")).toBe("duplicate-slug");
      expect(generateSlug("Special & Chars!")).toBe("special-chars");
    });
  });

  describe("extractHeadings", () => {
    const markdown = `
# Title
## Section 1
### Subsection 1.1
## Section 2
    `;
    /**
     * Test: Extracts H1-H2 headings from markdown, skipping first H1
     * First H1 is excluded as it's typically used as the page title
     */
    it("extracts headings H1-H2, skipping first H1", () => {
      const headings = extractHeadings(markdown);
      expect(headings).toEqual([
        { level: 2, text: "Section 1", slug: "section-1" },
        { level: 2, text: "Section 2", slug: "section-2" },
      ]);
    });
  });

  describe("extractFirstH1", () => {
    /**
     * Test: Returns text of first H1 heading found in markdown
     */
    it("returns first H1 heading", () => {
      const md = "# My Title\n## Subtitle";
      expect(extractFirstH1(md)).toBe("My Title");
    });

    /**
     * Test: Returns null when no H1 heading exists
     */
    it("returns null if no H1", () => {
      const md = "## Section";
      expect(extractFirstH1(md)).toBeNull();
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
     * Test: Trims whitespace from H1 heading
     */
    it("trims whitespace from heading text", () => {
      const md = "#   Spaced Title   ";
      expect(extractFirstH1(md)).toBe("Spaced Title");
    });
  });

  describe("extractHeadings - additional tests", () => {
    /**
     * Test: Handles empty content
     */
    it("returns empty array for empty content", () => {
      expect(extractHeadings("")).toEqual([]);
      expect(extractHeadings(null)).toEqual([]);
      expect(extractHeadings(undefined)).toEqual([]);
    });

    /**
     * Test: Ignores headings in code blocks
     */
    it("ignores headings in code blocks", () => {
      const markdown = `
# Title
## Real Section
\`\`\`
## Fake Section
\`\`\`
## Another Real Section
      `;
      const headings = extractHeadings(markdown);
      expect(headings).toHaveLength(2);
      expect(headings[0].text).toBe("Real Section");
      expect(headings[1].text).toBe("Another Real Section");
    });

    /**
     * Test: Handles duplicate headings with unique slugs
     */
    it("creates unique slugs for duplicate headings", () => {
      const markdown = `
# Title
## Section
## Section
## Section
      `;
      const headings = extractHeadings(markdown);
      expect(headings).toHaveLength(3);
      expect(headings[0].slug).toBe("section");
      expect(headings[1].slug).toBe("section-1");
      expect(headings[2].slug).toBe("section-2");
    });

    /**
     * Test: Extracts only H1 and H2, ignores H3+
     */
    it("extracts only H1 and H2 headings", () => {
      const markdown = `
# Title
## H2 Section
### H3 Section
#### H4 Section
      `;
      const headings = extractHeadings(markdown);
      expect(headings).toHaveLength(1);
      expect(headings[0].text).toBe("H2 Section");
    });

    /**
     * Test: Handles headings with special characters
     */
    it("handles headings with special characters", () => {
      const markdown = `
# Title
## Section with Special! Chars@
## Another & Section
      `;
      const headings = extractHeadings(markdown);
      expect(headings[0].slug).toBe("section-with-special-chars");
      expect(headings[1].slug).toBe("another-section");
    });

    /**
     * Test: Excludes only first H1
     */
    it("includes subsequent H1 headings after first", () => {
      const markdown = `
# First H1 (excluded)
## H2 Section
# Second H1 (included)
## Another H2
      `;
      const headings = extractHeadings(markdown);
      expect(headings).toHaveLength(3);
      expect(headings.find(h => h.text === "Second H1 (included)")).toBeDefined();
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
     * Test: Removes multiple consecutive hyphens
     */
    it("removes consecutive hyphens", () => {
      expect(generateSlug("Multiple---Hyphens")).toBe("multiple-hyphens");
    });

    /**
     * Test: Handles strings with only special characters
     */
    it("handles strings with only special characters", () => {
      expect(generateSlug("!!!@@@###")).toBe("");
    });

    /**
     * Test: Preserves existing hyphens
     */
    it("preserves single hyphens", () => {
      expect(generateSlug("Already-Hyphenated")).toBe("already-hyphenated");
    });

    /**
     * Test: Handles unicode characters
     */
    it("handles unicode characters", () => {
      expect(generateSlug("Café")).toBe("caf");
    });

    /**
     * Test: Handles leading and trailing special characters
     */
    it("handles leading and trailing special characters", () => {
      // The function doesn't trim hyphens from special chars, only from whitespace
      expect(generateSlug("-Leading and Trailing-")).toBe("-leading-and-trailing-");
    });
  });
});
