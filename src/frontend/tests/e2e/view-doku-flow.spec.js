import { test, expect } from "@playwright/test";
import { login } from "./helpers/login.js";

/**
 * Test: View Documentation Flow
 * End-to-end test that verifies the complete documentation viewing workflow including:
 * - Viewing documentation content
 * - Navigating through documentation sections
 * - Editing project goals
 * - Updating documentation
 * - Deleting documentation
 */
test("View Documentation Flow", async ({ page, context }) => {
  // Mock documentation list with test data
  const mockDocs = [
    {
      id: "doc-101",
      title: "TestRepo1",
      repo_id: "1",
      repo_name: "TestRepo1",
      repo_url: "https://github.com/test/repo1",
      status: "ready",
      updated_at: "2024-01-20T14:30:00Z",
      goal: "This is the initial project goal",
      content: `# TestRepo1

## Introduction
This is the introduction section of the documentation.

## Features
List of amazing features.

## Installation
Installation instructions here.`,
    },
    {
      id: "doc-102",
      title: "TestRepo2",
      repo_id: "2",
      repo_name: "TestRepo2",
      repo_url: "https://github.com/test/repo2",
      status: "ready",
      updated_at: "2024-01-18T11:20:00Z",
      goal: "Another project goal",
      content: `# TestRepo2

## Overview
Overview content here.`,
    },
  ];

  // Track the current state of docs for updates
  let currentDocs = JSON.parse(JSON.stringify(mockDocs));
  let updatedTimestamps = {};

  // Mock authentication endpoint
  await page.route("http://localhost:8000/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: "mock-token-12345",
        user: {
          email: "admin@caffeinecode.com",
          display_name: "Admin User",
          role: "admin",
        },
      }),
    });
  });

  // Mock repos/list endpoint
  await page.route("http://localhost:8000/repos/list", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // Mock GET /docs/list - List all documentations
  await page.route("http://localhost:8000/docs/list", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentDocs),
    });
  });

  // Mock GET /docs/{id} - Get specific documentation
  await page.route("http://localhost:8000/docs/doc-101", async (route) => {
    const doc = currentDocs.find((d) => d.id === "doc-101");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(doc),
    });
  });

  await page.route("http://localhost:8000/docs/doc-102", async (route) => {
    const doc = currentDocs.find((d) => d.id === "doc-102");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(doc),
    });
  });

  // Mock /docs/search/debug
  await page.route("http://localhost:8000/docs/search/debug", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ documents: currentDocs }),
    });
  });

  // Mock DELETE /docs/delete
  await page.route("http://localhost:8000/docs/delete", async (route) => {
    const postData = route.request().postDataJSON();
    const idsToDelete = postData.doc_ids || [];
    currentDocs = currentDocs.filter((d) => !idsToDelete.includes(d.id));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  // Mock POST /docs/update
  await page.route("http://localhost:8000/docs/update", async (route) => {
    const postData = route.request().postDataJSON();
    const idsToUpdate = postData.doc_ids || [];
    const newTimestamp = new Date().toISOString();

    currentDocs = currentDocs.map((d) => {
      if (idsToUpdate.includes(d.id)) {
        updatedTimestamps[d.id] = newTimestamp;
        return { ...d, updated_at: newTimestamp };
      }
      return d;
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  // Mock PUT /docs/{id}/goal - Match any doc ID
  await page.route(
    /http:\/\/localhost:8000\/docs\/[^\/]+\/goal/,
    async (route) => {
      const url = route.request().url();
      const docId = url.split("/docs/")[1].split("/goal")[0];
      const postData = route.request().postDataJSON();

      currentDocs = currentDocs.map((d) => {
        if (d.id === docId) {
          return { ...d, goal: postData.goal };
        }
        return d;
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    },
  );

  // Step 1: Login as admin
  await login(page, "admin");

  // Step 2: Navigate to first documentation by clicking on it in the sidebar
  await page.getByRole("link", { name: "TestRepo1" }).click();

  // Wait for documentation to load
  await expect(
    page.getByRole("heading", { level: 2, name: "TestRepo1" }),
  ).toBeVisible();

  // Test 1: Documentation name in sidebar matches h2 heading in DocumentView
  const h2Heading = await page.getByRole("heading", {
    level: 2,
    name: "TestRepo1",
  });
  await expect(h2Heading).toBeVisible();

  // Test 2: Verify latest update timestamp and repository link are visible
  await expect(page.getByText(/Latest update:/i)).toBeVisible();
  await expect(page.getByText(/Repository:/i)).toBeVisible();

  // Verify the repository link is present and correct
  const repoLink = page.locator('a[href="https://github.com/test/repo1"]');
  await expect(repoLink).toBeVisible();

  // Test 3: Delete and update buttons are visible (images, not text)
  const deleteButton = page.locator('button img[alt="Delete Documentation"]');
  const updateButton = page.locator('button img[alt="Update Documentation"]');
  await expect(deleteButton).toBeVisible();
  await expect(updateButton).toBeVisible();

  // Test 4: Click on repository link opens in new window
  const [newPage] = await Promise.all([
    context.waitForEvent("page"),
    repoLink.click(),
  ]);
  expect(newPage.url()).toBe("https://github.com/test/repo1");
  await newPage.close();

  // Test 5: Click on link tree item in sidebar scrolls to corresponding heading
  const linkTreeItem = page.locator('a[href*="#introduction"]');
  await expect(linkTreeItem).toBeVisible();
  await linkTreeItem.click();

  const introductionHeading = page.locator("h2#introduction");
  await expect(introductionHeading).toBeInViewport();

  // Test 6: Change project goal UI interaction
  const editGoalButton = page.getByRole("button", { name: /Edit/i });
  await editGoalButton.click();

  const goalDiv = page.locator('div[contenteditable="true"]');
  await goalDiv.clear();
  await goalDiv.fill("Updated project goal for testing");

  const saveGoalButton = page.getByRole("button", { name: /Save/i });
  await saveGoalButton.click();

  // Verify goal changed in UI
  await expect(
    page.locator('text="Updated project goal for testing"'),
  ).toBeVisible();

  // Test 7: Click update button

  await updateButton.click();
  await page.waitForSelector("text=Documentation is updating", {
    state: "attached",
  });

  await expect(page.getByText(/Update completed/i)).toBeVisible();
  await page.getByRole("link", { name: /Repositories/i }).click();
  await page.getByRole("link", { name: "TestRepo1" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "TestRepo1" }),
  ).toBeVisible();

  // Test 8: Click delete button removes documentation and returns to overview
  await deleteButton.click();

  const confirmDeleteButton = page.getByRole("button", { name: /Yes/i });
  await expect(confirmDeleteButton).toBeVisible();
  await confirmDeleteButton.click();

  await expect(
    page.getByRole("heading", { name: /Documentation Overview/i }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "TestRepo1", exact: true }),
  ).not.toBeVisible();
});
