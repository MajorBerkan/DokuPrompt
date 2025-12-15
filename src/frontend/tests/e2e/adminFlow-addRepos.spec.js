import { test as baseTest, expect } from "@playwright/test";
import { login } from "./helpers/login.js";

const test = baseTest.extend({
  context: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);
    await context.close();
  },
  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
  },
});

export { test, expect };

// Constants for test configuration
const MOCK_TASK_DELAY_MS = 100;
const TEST_ID_RANDOM_RANGE = 1000;

// Mock repository data for testing (isolated per test run)
// Uses snake_case to match backend API format
const createMockRepos = (testId) => [
  {
    id: testId * 1000 + 1,
    name: "bias-bench",
    description: "",
    repo_url: "https://github.com/McGill-NLP/bias-bench.git",
    date_of_version: new Date().toISOString(),
    specific_prompt: null,
    status: "SUCCESS",
    documentStatus: "Not Documented",
  },
  {
    id: testId * 1000 + 2,
    name: "aci-bench",
    description: "",
    repo_url: "https://github.com/wyim/aci-bench.git",
    date_of_version: new Date().toISOString(),
    specific_prompt: null,
    status: "SUCCESS",
    documentStatus: "Not Documented",
  },
];

/**
 * Setup mock API routes for repository management testing
 * Creates isolated mock data and API handlers for each test run
 * @param {Page} page - Playwright page object
 * @param {number} testId - Unique test identifier for data isolation
 * @returns {Object} Object containing mockRepos and mockTemplates arrays
 */
async function setupMocks(page, testId) {
  let mockRepos = []; // Start with empty repos - they will be added via clone API
  let mockTemplates = [];
  const taskStatuses = new Map();
  const taskRepoMapping = new Map(); // Map task_id to repo_id
  const mockRepoDefinitions = createMockRepos(testId); // Reference definitions for clone operations

  // Mock POST /repos/clone - Enqueue clone tasks
  await page.route("**/repos/clone", async (route) => {
    const postData = route.request().postDataJSON();
    const taskId = `mock-task-${Date.now()}-${Math.random()}`;

    // Find the matching repo definition by URL
    const matchingRepoDefinition = mockRepoDefinitions.find(
      (r) => r.repo_url === postData.repo_url,
    );

    if (matchingRepoDefinition) {
      taskStatuses.set(taskId, "PENDING");
      taskRepoMapping.set(taskId, matchingRepoDefinition.id);

      // Add the repo immediately with PENDING status so it appears in the list
      if (!mockRepos.find((r) => r.id === matchingRepoDefinition.id)) {
        mockRepos.push({
          ...matchingRepoDefinition,
          status: "PENDING", // Start with PENDING status
        });
      }

      // Simulate async processing - update repo status to SUCCESS after a delay
      setTimeout(() => {
        const repoIndex = mockRepos.findIndex(
          (r) => r.id === matchingRepoDefinition.id,
        );
        if (repoIndex >= 0) {
          mockRepos[repoIndex].status = "SUCCESS";
        }
        taskStatuses.set(taskId, "SUCCESS");
      }, MOCK_TASK_DELAY_MS);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ task_id: taskId }),
      });
    } else {
      // Unknown repository URL - return error
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

    // Build result based on state and whether we have a repo_id
    let result = null;
    if (state === "SUCCESS") {
      if (repoId !== undefined) {
        result = { status: "ok", repo_id: repoId };
      } else {
        // Task succeeded but no repo_id mapping found - should not happen in normal flow
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
      // Check for duplicate name (like the real backend does)
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

      if (postData.name) mockRepos[repoIndex].name = postData.name;
      if (postData.description)
        mockRepos[repoIndex].description = postData.description;

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

  // Mock POST /prompts/repo - Save repository-specific prompt
  await page.route("**/prompts/repo", async (route) => {
    const postData = route.request().postDataJSON();
    const repoIndex = mockRepos.findIndex((r) => r.id === postData.repo_id);

    if (repoIndex >= 0) {
      mockRepos[repoIndex].specific_prompt = postData.prompt;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          message: "Prompt saved successfully",
          task_id: `mock-task-${Date.now()}`,
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

  // Mock POST /prompt-templates - Create template
  await page.route("**/prompt-templates", async (route) => {
    if (route.request().method() === "POST") {
      const postData = route.request().postDataJSON();
      const newTemplate = {
        id: testId * 1000 + 100 + mockTemplates.length,
        name: postData.name,
        description: postData.description,
        content: postData.content,
      };
      mockTemplates.push(newTemplate);

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(newTemplate),
      });
    } else if (route.request().method() === "GET") {
      // Mock GET /prompt-templates - List templates
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockTemplates),
      });
    } else {
      await route.continue();
    }
  });

  // Mock DELETE /prompt-templates/{id} - Delete template
  await page.route("**/prompt-templates/**", async (route) => {
    if (route.request().method() === "DELETE") {
      const url = new URL(route.request().url());
      const templateId = parseInt(url.pathname.split("/prompt-templates/")[1]);
      const templateIndex = mockTemplates.findIndex((t) => t.id === templateId);

      if (templateIndex >= 0) {
        const deletedTemplate = mockTemplates.splice(templateIndex, 1)[0];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "ok",
            message: `Template '${deletedTemplate.name}' deleted successfully`,
          }),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Template not found" }),
        });
      }
    } else {
      await route.continue();
    }
  });

  // Mock POST /repos/delete - Delete repository
  await page.route("**/repos/delete", async (route) => {
    const postData = route.request().postDataJSON();
    const repoIndex = mockRepos.findIndex((r) => r.id === postData.repo_id);

    if (repoIndex >= 0) {
      mockRepos.splice(repoIndex, 1);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          message: "Repository and associated prompts deleted",
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

  return { mockRepos, mockTemplates };
}

/**
 * Test: Admin repository and prompt workflow
 * Comprehensive end-to-end test verifying the complete admin workflow including:
 * - Adding repositories via clone
 * - Editing repository information
 * - Managing repository-specific prompts
 * - Creating and using prompt templates
 * - Searching and filtering repositories
 * - Deleting repositories
 */
test("admin repository + prompt workflow", async ({ page, context }) => {
  // Clear all storage and cookies before test to ensure clean state between runs
  await context.clearCookies();

  // Navigate to the app first to have a valid origin, then clear storage
  await page.goto("http://localhost:5173");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Generate unique test ID for parallel execution isolation
  const testId = Date.now() + Math.floor(Math.random() * TEST_ID_RANDOM_RANGE);

  // Setup mocks before navigating to prevent real API calls
  await setupMocks(page, testId);

  await login(page, "admin");
  await page.getByRole("link", { name: /Repositories/i }).click();
  await expect(
    page.getByRole("heading", { name: /Repository Management/i }),
  ).toBeVisible();

  // Step 1: Add multiple repositories by entering their URLs
  await page
    .getByRole("textbox", { name: "Enter several public" })
    .fill(
      "https://github.com/McGill-NLP/bias-bench.git https://github.com/wyim/aci-bench.git",
    );
  await page.getByRole("button", { name: "Add", exact: true }).click();

  const biasBenchRow = page.getByRole("row", { name: /bias-bench/i });
  await expect(biasBenchRow.getByText("SUCCESS")).toBeVisible({
    timeout: 10000,
  });

  const aciRow = page.getByRole("row", { name: /aci-bench/i });
  await expect(aciRow.getByText("SUCCESS")).toBeVisible({ timeout: 10000 });

  // Step 2: Edit repository "bias-bench" information
  await page
    .getByRole("row", { name: /bias-bench/i })
    .getByRole("checkbox")
    .check();
  await page.getByTestId("actions-button").click();
  await page.getByRole("button", { name: "Edit Information" }).click();

  // Select inputs and set values with focus/blur to ensure React onChange events fire
  const input = page.getByRole("main").locator("input");
  await expect(input).toHaveValue("bias-bench"); // Wait for initial value to be set

  await input.fill("Bias");
  await input.blur();

  const textarea = page.locator("textarea");
  await expect(textarea).toHaveValue(""); // Wait for initial empty value
  await textarea.fill("Bias");
  await textarea.blur();

  // Click Save Button
  await page.getByRole("button", { name: "Save Changes" }).click();

  // Wait for the dialog to close (the heading "Repository Information" should disappear)
  await expect(
    page.getByRole("heading", { name: "Repository Information" }),
  ).not.toBeVisible();

  // Verify: the changed repository shows new name/description
  // Wait for the updated name to appear in the table
  await expect(page.getByRole("row", { name: /Bias/i })).toBeVisible({
    timeout: 10000,
  });

  // 2.1 Test tooltip for description column
  const biasRow = page.getByRole("row", { name: /Bias/i });
  // Column index 2 corresponds to Description (0=checkbox, 1=name, 2=description)
  const descriptionCell = biasRow.locator("td").nth(2);

  // Move mouse to trigger hover on the description cell using direct mouse movement
  // This is more reliable than .hover() for elements with complex event handlers
  const descriptionCellBox = await descriptionCell.boundingBox();
  if (descriptionCellBox) {
    await page.mouse.move(
      descriptionCellBox.x + descriptionCellBox.width / 2,
      descriptionCellBox.y + descriptionCellBox.height / 2,
    );
  }
  
  // Give time for React to update state and render the tooltip
  await page.waitForTimeout(500);

  // Wait for tooltip to appear and verify it contains the description text
  const tooltip = page.locator('span[role="tooltip"]');
  await expect(tooltip).toBeVisible({ timeout: 5000 });
  await expect(tooltip).toContainText("Bias");

  // Move mouse away to hide tooltip
  await page.mouse.move(0, 0);
  await expect(tooltip).not.toBeVisible();

  // Step 3: Edit repository "aci-bench" information
  await page
    .getByRole("row", { name: /aci-bench/i })
    .getByTestId("row-actions-button")
    .click();
  await page.getByRole("button", { name: "Edit Information" }).click();
  await page.getByRole("main").locator("input").fill("Aci");
  await page.getByRole("button", { name: "Save Changes" }).click();

  // Wait for the dialog to close
  await expect(
    page.getByRole("heading", { name: "Repository Information" }),
  ).not.toBeVisible();

  // Verify: the changed repository shows new name
  await expect(page.getByRole("row", { name: /Aci/i })).toBeVisible({
    timeout: 10000,
  });

  // Step 4: Select all repositories and edit specific prompt
  await page.getByRole("button", { name: "Select All" }).click();
  await page.getByTestId("actions-button").click();
  await page.getByRole("button", { name: "Edit Specific Prompt" }).click();

  // Step 5: Change the prompt text
  const promptTextarea = page.locator("textarea");
  await promptTextarea.fill("Neuer Prompt");
  await expect(promptTextarea).toHaveValue("Neuer Prompt");

  await page.getByRole("button", { name: "Save Prompt as Template" }).click();

  // Set up a listener for potential alert dialogs (in case save fails)
  page.on("dialog", async (dialog) => {
    console.log(`Dialog message: ${dialog.message()}`);
    await dialog.accept();
  });

  // Save prompt as a template
  const templateNameInput = page.getByRole("textbox", {
    name: "template name",
  });
  await templateNameInput.fill("Neu2");
  await expect(templateNameInput).toHaveValue("Neu2");

  const templateDescInput = page.getByRole("textbox", {
    name: "template description",
  });
  await templateDescInput.fill("Prompt");
  await expect(templateDescInput).toHaveValue("Prompt");

  // Wait for the API request to complete and capture the response
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/prompt-templates") &&
      response.request().method() === "POST",
    { timeout: 10000 },
  );

  await page.getByRole("button", { name: "Save Template" }).click();

  // Wait for the API response and capture the template ID
  try {
    const response = await responsePromise;
    console.log(`API response status: ${response.status()}`);
    if (response.ok()) {
      const responseData = await response.json();
      console.log(`Created template with ID: ${responseData.id}`);
    } else {
      console.error(`API call failed with status ${response.status()}`);
      const text = await response.text();
      console.error(`Response body: ${text}`);
    }
  } catch (err) {
    console.error(`Failed to wait for API response: ${err.message}`);
  }

  // Wait for the modal to close after saving the template
  await expect(
    page.getByRole("heading", { name: "Save Prompt as Template" }),
  ).not.toBeVisible({ timeout: 10000 });

  // Verify: Template exists in the dropdown
  // Open the dropdown to verify the template was saved
  await page.getByRole("button", { name: "dropdown" }).click();

  // Wait for template to appear in dropdown with proper timeout
  await expect(page.getByText("Neu2")).toBeVisible({ timeout: 10000 });

  // Wait a moment to ensure dropdown is fully rendered
  await page.waitForTimeout(500);

  // Close dialog and apply changes
  await page.getByRole("button", { name: "dropdown" }).click();
  await page.getByRole("button", { name: "Save Changes" }).click();

  // Wait for the prompt dialog to close
  await expect(
    page.getByRole("heading", { name: "Edit Specific Prompt" }),
  ).not.toBeVisible({ timeout: 10000 });

  // 5.1 Test tooltip for specific prompt column
  const biasRowForPrompt = page.getByRole("row", { name: /Bias/i });
  // Column index 6 corresponds to Specific Prompt (0=checkbox, 1=name, 2=description, 3=status, 4=added, 5=doc status, 6=prompt)
  const promptCell = biasRowForPrompt.locator("td").nth(6);

  // Wait for the prompt text to appear in the cell after the save operation completes
  await expect(promptCell).toContainText("Neuer Prompt", { timeout: 10000 });

  // Move mouse to trigger hover on the prompt cell using direct mouse movement
  // This is more reliable than .hover() for elements with complex event handlers
  const promptCellBox = await promptCell.boundingBox();
  if (promptCellBox) {
    await page.mouse.move(
      promptCellBox.x + promptCellBox.width / 2,
      promptCellBox.y + promptCellBox.height / 2,
    );
  }
  
  // Give time for React to update state and render the tooltip
  await page.waitForTimeout(500);

  // Find tooltip by text content since it's rendered dynamically
  const promptTooltip = page.locator('span[role="tooltip"]');
  
  // Wait for tooltip to become visible and contain the expected text
  await expect(promptTooltip).toBeVisible({ timeout: 5000 });
  await expect(promptTooltip).toContainText("Neuer Prompt");

  // Move mouse away to hide tooltip
  await page.mouse.move(0, 0);
  await expect(promptTooltip).not.toBeVisible();

  // Step 6: Test search functionality
  const search = page.getByRole("textbox", { name: "Search..." });
  await search.fill("Aci");

  // Filters results to only "Aci"
  await expect(page.getByText(/aci/i)).toBeVisible();
  await expect(page.getByText(/bias/i)).not.toBeVisible();

  await search.fill("");

  // Test filter functionality - only filters when apply is clicked
  const filter = page.getByLabel("filterButton");
  await filter.click();
  await page.getByRole("checkbox", { name: "Not Documented" }).click();
  const apply = page.getByRole("button", { name: "Apply" });
  await apply.click();
  await expect(
    page.getByRole("heading", { name: /Filters/i }),
  ).not.toBeVisible(); // Modal closes
  await expect(page.getByText(/aci/i)).toBeVisible();
  const cell = page.getByRole("cell", { name: "repository-name-bias" });
  await expect(cell).toBeVisible();
  const activefilter = page.getByLabel(`active-filter`);
  await expect(activefilter).toContainText("Not Documented");

  // Clear filters
  await filter.click();
  const clear = page.getByRole("button", { name: "Clear All" });
  await clear.click();
  await expect(
    page.getByRole("heading", { name: /Filters/i }),
  ).not.toBeVisible(); // Modal closes
  await expect(page.getByLabel("active-filter")).toHaveCount(0);

  // Test clicking outside closes modal
  await filter.click();
  await page.getByRole("checkbox", { name: "Documented", exact: true }).click();
  await page.mouse.click(0, 0);
  await expect(
    page.getByRole("heading", { name: /Filters/i }),
  ).not.toBeVisible();
  await expect(page.getByText(/aci/i)).toBeVisible();
  await expect(cell).toBeVisible();

  await expect(page.getByLabel("active-filter")).toHaveCount(0);

  // Test "No results" is displayed correctly when filter matches nothing
  await filter.click();
  await page.getByRole("checkbox", { name: "Documented", exact: true }).click();
  await apply.click();
  await expect(page.getByText(/No results/i)).toBeVisible();
  await expect(activefilter).toContainText("Documented");
  await expect(
    page.getByRole("button", { name: "Select All" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Deselect All" }),
  ).not.toBeVisible();

  // Test clearing filter with tag/badge
  await page.getByRole("button", { name: "Remove filter" }).click();
  await expect(page.getByLabel("active-filter")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Select All" })).toBeVisible();

  // Delete all repositories
  await page.getByRole("button", { name: "Select All" }).click();
  await page.getByTestId("actions-button").click();
  await page.getByRole("button", { name: "Delete" }).click();

  //Wait for deletion modal
  await expect(page.getByText(/Confirm Delete/i)).toBeVisible();
  await page.getByRole("button", { name: "Yes" }).click();

  // Wait for deletion to complete and verify repos are removed from the table
  await expect(page.getByRole("row", { name: /Bias/i })).not.toBeVisible();
  await expect(page.getByRole("row", { name: /Aci/i })).not.toBeVisible();

  // Note: All operations are mocked, so no database cleanup is needed
});
