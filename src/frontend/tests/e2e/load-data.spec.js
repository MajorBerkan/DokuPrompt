import { test, expect } from "@playwright/test";
import { login } from "./helpers/login.js";

/**
 * Test: Load repository and documentation data with mocked API calls
 * Verifies that the application correctly displays mocked data from both
 * the repositories and documentations endpoints
 */
test("load data with mocked API calls", async ({ page }) => {
  // Mock GET /docs/list - Returns list of documentation items
  // Note: IDs are strings per API specification in routes_docs.py
  await page.route("**/docs/list", async (route) => {
    // Simulate network delay for realistic testing
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "101",
          title: "Test Documentation 1",
          repo_id: "1",
          repo_name: "test-repo-1",
          status: "ready",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "102",
          title: "Test Documentation 2",
          repo_id: "2",
          repo_name: "test-repo-2",
          status: "ready",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]),
    });
  });

  // Mock GET /repos/list - Returns list of repository items
  // Note: IDs are numeric per API specification in routes_repo.py
  await page.route("**/repos/list", async (route) => {
    // Simulate network delay for realistic testing
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: 1,
          name: "test-repo-1",
          description: "Test Repository 1 Description",
          repo_url: "https://github.com/test/repo1.git",
          date_of_version: new Date().toISOString(),
          specific_prompt: null,
        },
        {
          id: 2,
          name: "test-repo-2",
          description: "Test Repository 2 Description",
          repo_url: "https://github.com/test/repo2.git",
          date_of_version: new Date().toISOString(),
          specific_prompt: "Custom prompt for repo 2",
        },
      ]),
    });
  });

  // Step 1: Login with admin role using the login helper function
  await login(page, "admin");

  // Step 2: Click on Repositories nav link
  await page.getByRole("link", { name: /Repositories/i }).click();

  // Step 3: Verify Repository Management heading is visible
  await expect(
    page.getByRole("heading", { name: /Repository Management/i }),
  ).toBeVisible();

  // Step 4: Wait for repositories to load and verify they are displayed
  // Wait for the API call to complete
  await page.waitForResponse((response) => 
    response.url().includes('/repos/list') && response.status() === 200
  );

  // Verify that the mocked repositories are displayed in the table
  await expect(page.getByText("test-repo-1")).toBeVisible();
  await expect(page.getByText("test-repo-2")).toBeVisible();

  // Optional: Verify that the repository descriptions are also visible
  await expect(page.getByText("Test Repository 1 Description")).toBeVisible();
  await expect(page.getByText("Test Repository 2 Description")).toBeVisible();
});
