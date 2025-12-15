import { expect } from "@playwright/test";

/**
 * Mock user data for testing authentication
 * @constant {Array<Object>}
 */
const MOCK_USERS = [
  {
    email: "admin@caffeinecode.com",
    password: "admin123",
    display_name: "Admin User",
    role: "admin",
  },
  {
    email: "editor@caffeinecode.com",
    password: "editor123",
    display_name: "Editor User",
    role: "editor",
  },
  {
    email: "viewer@caffeinecode.com",
    password: "viewer123",
    display_name: "Viewer User",
    role: "viewer",
  },
];

/**
 * Logs in a user with the specified role
 * @param {import('@playwright/test').Page} page - The Playwright page object
 * @param {'admin'|'editor'|'viewer'} role - The user role to log in as
 */
export async function login(page, role) {
  // Find the user data for the requested role
  const mockUser = MOCK_USERS.find(user => user.role === role);
  
  if (!mockUser) {
    throw new Error(`Unknown role: ${role}`);
  }

  const credentials = {
    email: mockUser.email,
    password: mockUser.password,
  };

  // Mock the /auth/mock-users endpoint that's called when LoginPage loads
  await page.route("**/auth/mock-users", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USERS),
    });
  });

  // Mock the /auth/login endpoint
  await page.route("**/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: `mock-token-${role}-12345`,
        user: mockUser,
      }),
    });
  });

  // Navigate to login page
  await page.goto("http://localhost:5173/login");

  // Fill in email field
  const emailInput = page.getByRole("textbox", { name: "Email" });
  await emailInput.fill(credentials.email);

  // Fill in password field
  const passInput = page.getByRole("textbox", { name: "Password" });
  await passInput.fill(credentials.password);

  // Click sign in button
  const signInButton = page.getByRole("button", { name: "Sign In" });
  await signInButton.click();

  // Wait for successful login by verifying the Documentation Overview page appears
  await expect(
    page.getByRole("heading", { name: /Documentation Overview/i }),
  ).toBeVisible();
}
