import { type Page } from '@playwright/test'

/**
 * Generates a unique email address per test run to avoid DB-level collisions
 * (unique constraint on users.email).
 */
export function uniqueEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`
}

/** Password that satisfies the ≥8 character server-side and client-side rule. */
export const TEST_PASSWORD = 'password123'

/**
 * Registers a brand-new user and leaves the page on the authenticated task list.
 * Returns the email so callers can reference it in subsequent steps.
 */
export async function registerAndLogin(page: Page, email: string): Promise<void> {
  await page.goto('/register')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /create account/i }).click()
  // Wait until redirected to the authenticated task list
  await page.waitForURL('/')
}

/**
 * Logs out from the current authenticated session via the header Logout button.
 * Waits for redirect to /login before returning.
 */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /log out/i }).click()
  await page.waitForURL('/login')
}
