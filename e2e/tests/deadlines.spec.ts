import { test, expect } from '@playwright/test'
import { uniqueEmail, registerAndLogin } from '../helpers/auth'

/**
 * E2E tests for deadline management (Story 3.2).
 *
 * Covers: set a deadline on a task, remove a deadline from a task.
 */

test.describe('Deadlines', () => {
  test('sets a deadline on a task', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task
    await page.getByPlaceholder(/add a task/i).fill('Task for deadline test')
    await page.getByPlaceholder(/add a task/i).press('Enter')
    await expect(page.getByText('Task for deadline test')).toBeVisible()

    // Click the 📅 button to open the date picker
    await page.getByRole('button', { name: /set deadline for/i }).click()

    // Fill the date input with a specific date
    const dateInput = page.getByLabel(/set deadline for/i)
    await dateInput.fill('2026-03-15')

    // Verify the deadline is now displayed
    await expect(page.getByLabel(/deadline:/i)).toBeVisible()
  })

  test('removes a deadline from a task', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task
    await page.getByPlaceholder(/add a task/i).fill('Task for deadline removal')
    await page.getByPlaceholder(/add a task/i).press('Enter')
    await expect(page.getByText('Task for deadline removal')).toBeVisible()

    // Set a deadline first
    await page.getByRole('button', { name: /set deadline for/i }).click()
    const dateInput = page.getByLabel(/set deadline for/i)
    await dateInput.fill('2026-04-01')
    await expect(page.getByLabel(/deadline:/i)).toBeVisible()

    // Remove the deadline
    await page.getByRole('button', { name: /remove deadline/i }).click()

    // Verify the deadline display is gone
    await expect(page.getByLabel(/deadline:/i)).not.toBeVisible()
  })

  test('deadline persists after page reload', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task
    await page.getByPlaceholder(/add a task/i).fill('Persistent deadline task')
    await page.getByPlaceholder(/add a task/i).press('Enter')
    await expect(page.getByText('Persistent deadline task')).toBeVisible()

    // Set a deadline
    await page.getByRole('button', { name: /set deadline for/i }).click()
    const dateInput = page.getByLabel(/set deadline for/i)
    await dateInput.fill('2026-05-20')
    await expect(page.getByLabel(/deadline:/i)).toBeVisible()

    // Reload the page and verify the deadline is still shown
    await page.reload()
    await expect(page.getByText('Persistent deadline task')).toBeVisible()
    await expect(page.getByLabel(/deadline:/i)).toBeVisible()
  })
})
