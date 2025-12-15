import { test, expect } from "@playwright/test";
import { login } from "./helpers/login.js";

/**
 * Test: General Settings workflow
 * Verifies that users can view, modify, and save general repository settings
 * including the general prompt text and automatic update time configuration
 */
test("General Settings workflow", async ({ page }) => {
  // Step 1: Login as admin using the login helper function
  await login(page, "admin");

  // Step 2: Click on Repositories nav link and verify Repository Management heading
  await page.getByRole("link", { name: /Repositories/i }).click();
  await expect(
    page.getByRole("heading", { name: /Repository Management/i }),
  ).toBeVisible();

  // Step 4: Setup API mock to verify General settings data is correctly fetched
  // Mock GET /settings/general to return initial settings
  let getRequestCalled = false;
  await page.route("**/settings/general", async (route) => {
    if (route.request().method() === "GET") {
      getRequestCalled = true;
      console.log("✓ GET request intercepted:", route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          prompt: "Initial general prompt",
          updateTime: "18:00",
          disabled: false,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Step 3: Click on General Prompt Button
  await page
    .getByRole("button", { name: /General Prompt.*Update Time Settings/i })
    .click();

  // Wait a bit for the API call to complete
  await page.waitForTimeout(500);

  // Verify the GET request was called
  expect(getRequestCalled).toBe(true);
  console.log("✓ GET request was successfully mocked and called");

  // Verify that the General Repository Settings heading is visible
  await expect(
    page.getByRole("heading", { name: /General Repository Settings/i }),
  ).toBeVisible();

  // Verify initial data is loaded
  const generalPromptTextarea = page.locator("textarea").first();
  await expect(generalPromptTextarea).toBeVisible();
  await expect(generalPromptTextarea).toHaveValue("Initial general prompt");

  // Step 5: Change General Prompt to placeholder text
  await generalPromptTextarea.clear();
  await generalPromptTextarea.fill("This is a placeholder text for testing");

  // Verify the text was filled
  await expect(generalPromptTextarea).toHaveValue(
    "This is a placeholder text for testing",
  );

  // Step 6: Modify update time (e.g., disable it)
  // Click the "Disable update time" button
  await expect(page.getByText(/Automatic update interval/i)).toBeVisible();
  await expect(page.locator('input[type="number"]')).toBeVisible();

  await page.getByRole("button", { name: /Deactivate/i }).click();

  // Verify that "Updates are disabled" text appears
  await expect(
    page.getByText(/Automatic updates are deactivated./i),
  ).toBeVisible();

  // Step 8: Setup API mock to verify settings are saved successfully
  // Mock PUT /settings/general to accept the updated settings
  let putRequestCalled = false;
  let putRequestBody = null;

  await page.route("**/settings/general", async (route) => {
    if (route.request().method() === "PUT") {
      putRequestCalled = true;
      putRequestBody = route.request().postDataJSON();
      console.log("✓ PUT request intercepted:", route.request().url());
      console.log("✓ PUT request body:", putRequestBody);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else if (route.request().method() === "GET") {
      // After save, return the updated data
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          prompt: putRequestBody
            ? putRequestBody.prompt
            : "This is a placeholder text for testing",
          updateTime: "18:00",
          disabled: putRequestBody ? putRequestBody.disabled : true,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Step 7: Click Save Changes button
  await page.getByRole("button", { name: /Save Changes/i }).click();

  // Wait a bit for the API call to complete
  await page.waitForTimeout(500);

  // Verify the PUT request was called
  expect(putRequestCalled).toBe(true);
  console.log("✓ PUT request was successfully mocked and called");

  // Verify the request body contains the expected data
  expect(putRequestBody).not.toBeNull();
  expect(putRequestBody.prompt).toBe("This is a placeholder text for testing");
  expect(putRequestBody.disabled).toBe(true);
  console.log("✓ PUT request body verified:", putRequestBody);

  // Verify that we're back at the Repository Management page after save
  await expect(
    page.getByRole("heading", { name: /Repository Management/i }),
  ).toBeVisible({ timeout: 5000 });

  // Optional: Reopen settings to verify the changes persisted
  // Click on General Prompt Button again
  await page
    .getByRole("button", { name: /General Prompt.*Update Time Settings/i })
    .click();

  // Wait for the dialog to open
  await page.waitForTimeout(500);

  // Verify the saved data is displayed
  await expect(
    page.getByRole("heading", { name: /General Repository Settings/i }),
  ).toBeVisible();

  // Verify the prompt text is still there
  await expect(generalPromptTextarea).toHaveValue(
    "This is a placeholder text for testing",
  );

  // Verify updates are still disabled
  await expect(
    page.getByText(/Automatic updates are deactivated./i),
  ).toBeVisible();
});
