import { test, expect } from "@playwright/test";
import { login } from "./helpers/login.js";

// Constants for test configuration
const MOCK_TASK_DELAY_MS = 100;
const MOCK_DOC_GENERATION_DELAY_MS = 500;
const TEST_ID_RANDOM_RANGE = 1000;

// Mock repository data for testing (isolated per test run)
const createMockRepos = (testId) => [
  {
    id: testId * 1000 + 1,
    name: "repo-alpha",
    description: "Repository Alpha for testing",
    repo_url: "https://github.com/test/repo-alpha.git",
    date_of_version: new Date().toISOString(),
    specific_prompt: null,
    status: "SUCCESS",
    documentStatus: "Not Documented",
  },
  {
    id: testId * 1000 + 2,
    name: "repo-beta",
    description: "Repository Beta for testing",
    repo_url: "https://github.com/test/repo-beta.git",
    date_of_version: new Date().toISOString(),
    specific_prompt: null,
    status: "SUCCESS",
    documentStatus: "Not Documented",
  },
  {
    id: testId * 1000 + 3,
    name: "repo-gamma",
    description: "Repository Gamma for testing",
    repo_url: "https://github.com/test/repo-gamma.git",
    date_of_version: new Date().toISOString(),
    specific_prompt: null,
    status: "SUCCESS",
    documentStatus: "Not Documented",
  },
];

/**
 * Setup mock API routes for documentation generation testing
 * Creates isolated mock data and API handlers for testing documentation workflows
 * @param {Page} page - Playwright page object
 * @param {number} testId - Unique test identifier for data isolation
 * @returns {Object} Object containing mockRepos and mockDocs arrays
 */
async function setupMocks(page, testId) {
  let mockRepos = createMockRepos(testId);
  let mockDocs = []; // Will store generated documentations
  const taskStatuses = new Map();
  const taskRepoMapping = new Map();

  // Mock POST /repos/clone - Enqueue clone tasks
  await page.route("**/repos/clone", async (route) => {
    const postData = route.request().postDataJSON();
    const taskId = `mock-task-${Date.now()}-${Math.random()}`;

    const matchingRepo = mockRepos.find(
      (r) => r.repo_url === postData.repo_url,
    );

    if (matchingRepo) {
      taskStatuses.set(taskId, "PENDING");
      taskRepoMapping.set(taskId, matchingRepo.id);

      setTimeout(() => {
        taskStatuses.set(taskId, "SUCCESS");
      }, MOCK_TASK_DELAY_MS);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ task_id: taskId }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          detail: `Unknown repository URL: ${postData.repo_url}`,
        }),
      });
    }
  });

  // Mock GET /repos/tasks/{task_id} - Task status
  await page.route("**/repos/tasks/**", async (route) => {
    const url = new URL(route.request().url());
    const taskId = url.pathname.split("/tasks/")[1];
    const state = taskStatuses.get(taskId) || "PENDING";
    const repoId = taskRepoMapping.get(taskId);

    let result = null;
    if (state === "SUCCESS") {
      if (repoId !== undefined) {
        result = { status: "ok", repo_id: repoId };
      } else {
        result = { status: "ok" };
      }
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        task_id: taskId,
        state: state,
        result: result,
      }),
    });
  });

  // Mock GET /repos/list - List repositories
  await page.route("**/repos/list", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockRepos),
    });
  });

  // Mock POST /repos/update - Update repository
  await page.route("**/repos/update", async (route) => {
    const postData = route.request().postDataJSON();
    const repoIndex = mockRepos.findIndex((r) => r.id === postData.repo_id);

    if (repoIndex >= 0) {
      // Check for duplicate name
      if (postData.name && postData.name !== mockRepos[repoIndex].name) {
        const duplicateRepo = mockRepos.find(
          (r) => r.name === postData.name && r.id !== postData.repo_id,
        );
        if (duplicateRepo) {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              detail: `Repository with name '${postData.name}' already exists`,
            }),
          });
          return;
        }
      }

      const oldName = mockRepos[repoIndex].name;
      if (postData.name) mockRepos[repoIndex].name = postData.name;
      if (postData.description)
        mockRepos[repoIndex].description = postData.description;

      // Update documentation title if it exists
      if (postData.name && oldName !== postData.name) {
        const docIndex = mockDocs.findIndex(
          (doc) => doc.repo_id === postData.repo_id,
        );
        if (docIndex >= 0) {
          mockDocs[docIndex].title = postData.name;
          mockDocs[docIndex].repo_name = postData.name;
        }
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          message: "Repository updated successfully",
        }),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Repository not found" }),
      });
    }
  });

  // Mock POST /ai/generate - Generate documentation
  await page.route("**/ai/generate", async (route) => {
    const postData = route.request().postDataJSON();
    const repoIds = postData.repo_ids || [];

    console.log("[MOCK] /ai/generate called with repo_ids:", repoIds);

    const results = [];
    let successfulCount = 0;
    const errors = [];

    for (const repoId of repoIds) {
      const repo = mockRepos.find((r) => r.id === repoId);
      if (repo) {
        // Create new documentation
        const newDoc = {
          id: `${testId * 1000 + 100 + mockDocs.length}`,
          title: repo.name,
          repo_id: repoId,
          repo_name: repo.name,
          repo_url: repo.repo_url,
          status: "ready",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          content: `# ${repo.name}\n\nGenerated documentation content for ${repo.name}`,
        };
        mockDocs.push(newDoc);
        console.log("[MOCK] Created doc:", newDoc);
        console.log("[MOCK] mockDocs now contains:", mockDocs.length, "docs");

        // Update repository documentStatus
        const repoIndex = mockRepos.findIndex((r) => r.id === repoId);
        if (repoIndex >= 0) {
          mockRepos[repoIndex].documentStatus = "documented";
        }

        results.push({
          repository: repo.name,
          status: "documented",
          message: `Documentation generated successfully for ${repo.name}`,
        });
        successfulCount++;
      } else {
        errors.push({
          repository: `Unknown repo ${repoId}`,
          error: "Repository not found",
        });
      }
    }

    // Simulate processing delay
    await new Promise((resolve) =>
      setTimeout(resolve, MOCK_DOC_GENERATION_DELAY_MS),
    );

    if (successfulCount === repoIds.length) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          message: `Documentation generated successfully for ${successfulCount} repositories.`,
          successful_count: successfulCount,
          results: results,
        }),
      });
    } else if (successfulCount > 0) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "partial_success",
          message: `Documentation generated for ${successfulCount}/${repoIds.length} repositories.`,
          successful_count: successfulCount,
          results: results,
          errors: errors,
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          message: `Failed to generate documentation for all ${repoIds.length} repositories.`,
          successful_count: 0,
          results: results,
          errors: errors,
        }),
      });
    }
  });

  // Mock GET /docs/list - List documentations
  await page.route("**/docs/list", async (route) => {
    // Sort alphabetically by repo_name
    const sortedDocs = [...mockDocs].sort((a, b) =>
      a.repo_name.toLowerCase().localeCompare(b.repo_name.toLowerCase()),
    );

    console.log("[MOCK] /docs/list called, returning:", sortedDocs);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sortedDocs),
    });
  });

  // Mock GET /docs/{id} - Get specific documentation
  // This route should match /docs/{id} but NOT /docs/list or /docs/delete
  await page.route("**/docs/**", async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    const pathParts = url.pathname.split("/docs/");
    const docId = pathParts[1];

    // Skip if this is /docs/list or /docs/delete - let other handlers deal with them
    if (docId === "list" || docId === "delete") {
      await route.fallback();
      return;
    }

    if (method === "GET") {
      const doc = mockDocs.find((d) => d.id === docId);

      if (doc) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(doc),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Documentation not found" }),
        });
      }
    } else {
      await route.fallback();
    }
  });

  // Mock POST /docs/delete - Delete documentations
  await page.route("**/docs/delete", async (route) => {
    const postData = route.request().postDataJSON();
    const docIds = postData.doc_ids || [];

    for (const docId of docIds) {
      const docIndex = mockDocs.findIndex((d) => d.id === docId);
      if (docIndex >= 0) {
        const doc = mockDocs[docIndex];
        // Update repository documentStatus to "Not Documented"
        const repoIndex = mockRepos.findIndex((r) => r.id === doc.repo_id);
        if (repoIndex >= 0) {
          mockRepos[repoIndex].documentStatus = "Not Documented";
        }
        mockDocs.splice(docIndex, 1);
      }
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "ok",
        message: "Documentation(s) deleted successfully",
      }),
    });
  });

  // Mock GET /docs/search/debug - Debug search endpoint
  await page.route("**/docs/search/debug", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "ok",
        message: "Debug info",
        total_docs: mockDocs.length,
      }),
    });
  });

  // Mock POST /repos/delete - Delete repository
  await page.route("**/repos/delete", async (route) => {
    const postData = route.request().postDataJSON();
    const repoId = postData.repo_id;

    const repoIndex = mockRepos.findIndex((r) => r.id === repoId);
    if (repoIndex >= 0) {
      // Delete associated documentation
      const docIndex = mockDocs.findIndex((d) => d.repo_id === repoId);
      if (docIndex >= 0) {
        mockDocs.splice(docIndex, 1);
      }

      mockRepos.splice(repoIndex, 1);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          message: "Repository and associated documentation deleted",
          target_dir: null,
        }),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Repository not found" }),
      });
    }
  });

  return { mockRepos, mockDocs };
}

/**
 * Test: Generate Documentation workflow (end-to-end)
 * Comprehensive test verifying the complete documentation generation workflow including:
 * - Generating documentation for single repository via row menu
 * - Generating documentation for multiple repositories via Actions button
 * - Verifying documentation appears in sidebar
 * - Editing repository names and verifying documentation names update
 * - Deleting documentation and verifying status changes
 * - Deleting repositories and verifying documentation removal
 */
test("e2e: Generate Documentation workflow", async ({ page }) => {
  // Generate unique test ID for parallel execution isolation
  const testId = Date.now() + Math.floor(Math.random() * TEST_ID_RANDOM_RANGE);

  // Setup mocks before navigating to prevent real API calls
  await setupMocks(page, testId);

  // Step 1: Login as admin using the login helper function
  await login(page, "admin");

  // Step 2: Click on Repositories nav link
  await page.getByRole("link", { name: /Repositories/i }).click();

  // Step 3: Verify Repository Management heading is visible
  await expect(
    page.getByRole("heading", { name: /Repository Management/i }),
  ).toBeVisible();

  // Step 4: Wait for repositories to load and verify they are displayed
  await expect(page.getByText("repo-alpha")).toBeVisible();
  await expect(page.getByText("repo-beta")).toBeVisible();
  await expect(page.getByText("repo-gamma")).toBeVisible();

  // Step 5: Generate documentation for 1 repository via row menu (3-dot menu)

  // Find the row for repo-alpha and click on the 3-dot menu
  const alphaRow = page.getByRole("row", { name: /repo-alpha/i });
  await expect(alphaRow).toBeVisible();

  // Hover over the row to reveal the 3-dot menu
  await alphaRow.hover();

  // Click on the row actions button (3-dot menu)
  await alphaRow.getByTestId("row-actions-button").click();

  // Wait for the menu to appear by waiting for the "Generate Documentation" button
  const generateDocButton = page.getByRole("button", {
    name: "Generate Documentation",
  });
  await expect(generateDocButton).toBeVisible({ timeout: 2000 });

  // Click on "Generate Documentation" in the menu
  await generateDocButton.click();

  // Set up promise to wait for sidebar refresh (docs/list call) BEFORE waiting for completion
  const docsListPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/docs/list") && response.status() === 200,
    { timeout: 10000 },
  );

  // Step 6: Verify generating spinner appears
  await expect(
    page.getByText(/Generating documentation for 1 repository/i),
  ).toBeVisible({ timeout: 2000 });

  // Wait for the generating process to complete
  await expect(
    page.getByText(/Generating documentation for 1 repository/i),
  ).not.toBeVisible({ timeout: 5000 });

  // Verify status changes to "documented" in the table
  await expect(alphaRow.getByText("documented", { exact: false })).toBeVisible({
    timeout: 2000,
  });

  // Verify notification popup informs about success
  await expect(page.getByText(/Generation completed./i)).toBeVisible({
    timeout: 2000,
  });

  // Wait for the sidebar to reload documents
  await docsListPromise;

  // Step 8: Verify documentation appears in sidebar with the same name as the repo
  await expect(page.getByRole("link", { name: "repo-alpha" })).toBeVisible({
    timeout: 15000,
  });

  // Step 9: Generate documentation for 2 repositories via Actions button

  // Select repo-beta
  const betaRow = page.getByRole("row", { name: /repo-beta/i });
  await betaRow.getByRole("checkbox").check();

  // Select repo-gamma
  const gammaRow = page.getByRole("row", { name: /repo-gamma/i });
  await gammaRow.getByRole("checkbox").check();

  // Click on Actions button
  await page.getByTestId("actions-button").click();

  // Wait for the actions menu to appear by waiting for the "Generate Documentation" button
  const generateDocButtonActions = page.getByRole("button", {
    name: "Generate Documentation",
  });
  await expect(generateDocButtonActions).toBeVisible({ timeout: 2000 });

  // Click on "Generate Documentation" in the actions menu
  await generateDocButtonActions.click();

  // Set up promise to wait for sidebar refresh BEFORE waiting for completion
  const docsListPromise2 = page.waitForResponse(
    (response) =>
      response.url().includes("/docs/list") && response.status() === 200,
    { timeout: 10000 },
  );

  // Step 10: Verify generating spinner appears for 2 repositories
  await expect(
    page.getByText(/Generating documentation for 2 repositories/i),
  ).toBeVisible({ timeout: 2000 });

  // Wait for the generating process to complete
  await expect(
    page.getByText(/Generating documentation for 2 repositories/i),
  ).not.toBeVisible({ timeout: 5000 });

  // Step 11: Verify status changes to "documented" for both repos
  await expect(betaRow.getByText("documented", { exact: false })).toBeVisible({
    timeout: 2000,
  });
  await expect(gammaRow.getByText("documented", { exact: false })).toBeVisible({
    timeout: 2000,
  });

  // Wait for the sidebar to reload documents
  await docsListPromise2;

  // Step 12: Verify both documentations appear in sidebar
  await expect(page.getByRole("link", { name: "repo-beta" })).toBeVisible({
    timeout: 3000,
  });
  await expect(page.getByRole("link", { name: "repo-gamma" })).toBeVisible({
    timeout: 3000,
  });

  // Step 13: Change the name of repo-alpha and verify documentation name changes

  // Click on the 3-dot menu for repo-alpha
  await alphaRow.hover();
  await alphaRow.getByTestId("row-actions-button").click();

  // Wait for the menu to appear by waiting for the "Edit Information" button
  const editInfoButton = page.getByRole("button", { name: "Edit Information" });
  await expect(editInfoButton).toBeVisible({ timeout: 2000 });

  // Click on "Edit Information"
  await editInfoButton.click();

  // Wait for the edit dialog to appear
  await expect(
    page.getByRole("heading", { name: "Repository Information" }),
  ).toBeVisible();

  // Change the name
  const nameInput = page.getByRole("main").locator("input");
  await expect(nameInput).toHaveValue("repo-alpha");
  await nameInput.fill("repo-alpha-renamed");
  await nameInput.blur();

  // Save changes
  await page.getByRole("button", { name: "Save Changes" }).click();

  // Set up promise to wait for sidebar refresh BEFORE verifying changes
  const docsListPromise3 = page.waitForResponse(
    (response) =>
      response.url().includes("/docs/list") && response.status() === 200,
    { timeout: 10000 },
  );

  // Wait for the dialog to close
  await expect(
    page.getByRole("heading", { name: "Repository Information" }),
  ).not.toBeVisible({ timeout: 2000 });

  // Step 14: Verify the new name appears in the table
  await expect(
    page.getByRole("row", { name: /repo-alpha-renamed/i }),
  ).toBeVisible({ timeout: 3000 });

  // Wait for the sidebar to reload documents
  await docsListPromise3;

  // Step 15: Verify the documentation name in sidebar also changes
  await expect(
    page.getByRole("link", { name: "repo-alpha-renamed", exact: true }),
  ).toBeVisible({ timeout: 3000 });
  await expect(
    page.getByRole("link", { name: "repo-alpha", exact: true }),
  ).not.toBeVisible({
    timeout: 2000,
  });

  // Step 16: Delete documentation and verify status changes to "Not documented"

  // Click on repo-beta documentation in sidebar
  await page.getByRole("link", { name: "repo-beta" }).click();

  // Wait for the documentation view to load by waiting for the delete button
  await expect(page.getByAltText("Delete Documentation")).toBeVisible({
    timeout: 3000,
  });

  // Click on the delete button (image only, no text)
  // The delete button should have alt text "Delete Documentation"
  await page.getByAltText("Delete Documentation").click();

  // Wait for the delete confirmation modal
  await expect(page.getByText("Confirm Delete")).toBeVisible({
    timeout: 2000,
  });

  // Confirm deletion
  await page.getByRole("button", { name: "Yes" }).click();

  // Wait for deletion to complete and modal to close
  await expect(page.getByText("Confirm Delete")).not.toBeVisible({
    timeout: 2000,
  });

  // Step 17: Navigate back to Repositories
  await page.getByRole("link", { name: /Repositories/i }).click();

  // Wait for the page to load
  await expect(
    page.getByRole("heading", { name: /Repository Management/i }),
  ).toBeVisible();

  // Step 18: Verify status tag changes to "Not documented"
  const betaRowAfterDelete = page.getByRole("row", { name: /repo-beta/i });
  await expect(
    betaRowAfterDelete.getByText("Not documented", { exact: false }),
  ).toBeVisible({ timeout: 2000 });

  // Step 19: Delete repo-gamma and verify documentation is removed from sidebar

  // Before deletion, verify the documentation exists in sidebar
  await expect(page.getByRole("link", { name: "repo-gamma" })).toBeVisible();

  // Click on the 3-dot menu for repo-gamma
  const gammaRowForDelete = page.getByRole("row", { name: /repo-gamma/i });
  await gammaRowForDelete.hover();
  await gammaRowForDelete.getByTestId("row-actions-button").click();

  // Wait for the menu to appear by waiting for the "Delete" button
  const deleteButton = page.getByRole("button", { name: "Delete" });
  await expect(deleteButton).toBeVisible({ timeout: 2000 });

  // Click on "Delete"
  await deleteButton.click();
  await expect(page.getByText("Confirm Delete")).toBeVisible({ timeout: 2000 });

  // Confirm deletion
  await page.getByRole("button", { name: "Yes" }).click();

  // Step 20: Verify repo is removed from table
  await expect(gammaRowForDelete).not.toBeVisible({ timeout: 3000 });

  // Step 21: Verify documentation is removed from sidebar
  await expect(page.getByRole("link", { name: "repo-gamma" })).not.toBeVisible({
    timeout: 2000,
  });
});
