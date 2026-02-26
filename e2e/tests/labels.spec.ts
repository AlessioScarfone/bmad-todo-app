import { test, expect } from '@playwright/test'
import { uniqueEmail, registerAndLogin } from '../helpers/auth'

/**
 * E2E tests for label management (Story 3.1).
 *
 * Covers: attach a label to a task, remove a label from a task.
 */

test.describe('Labels', () => {
  test('attaches a label to a task', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task
    await page.getByPlaceholder(/add a task/i).fill('Task for label test')
    await page.getByPlaceholder(/add a task/i).press('Enter')
    await expect(page.getByText('Task for label test')).toBeVisible()

    // Open the label input
    await page.getByRole('button', { name: /add label/i }).click()

    // Type a label name and submit
    await page.getByLabel('Add label').fill('Bug')
    await page.getByLabel('Add label').press('Enter')

    // Verify the label badge appears
    await expect(page.getByLabel('Label: Bug')).toBeVisible()
  })

  test('removes a label from a task', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task
    await page.getByPlaceholder(/add a task/i).fill('Task for label removal')
    await page.getByPlaceholder(/add a task/i).press('Enter')
    await expect(page.getByText('Task for label removal')).toBeVisible()

    // Attach a label
    await page.getByRole('button', { name: /add label/i }).click()
    await page.getByLabel('Add label').fill('Feature')
    await page.getByLabel('Add label').press('Enter')
    await expect(page.getByLabel('Label: Feature')).toBeVisible()

    // Remove the label
    await page.getByRole('button', { name: 'Remove label Feature' }).click()

    // Verify the label badge is gone
    await expect(page.getByLabel('Label: Feature')).not.toBeVisible()
  })

  test('attaches multiple labels to a task', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task
    await page.getByPlaceholder(/add a task/i).fill('Task for multiple labels')
    await page.getByPlaceholder(/add a task/i).press('Enter')
    await expect(page.getByText('Task for multiple labels')).toBeVisible()

    // Attach first label
    await page.getByRole('button', { name: /add label/i }).click()
    await page.getByLabel('Add label').fill('Backend')
    await page.getByLabel('Add label').press('Enter')
    await expect(page.getByLabel('Label: Backend')).toBeVisible()

    // Attach second label
    await page.getByRole('button', { name: /add label/i }).click()
    await page.getByLabel('Add label').fill('Frontend')
    await page.getByLabel('Add label').press('Enter')
    await expect(page.getByLabel('Label: Frontend')).toBeVisible()

    // Both labels should be visible simultaneously
    await expect(page.getByLabel('Label: Backend')).toBeVisible()
    await expect(page.getByLabel('Label: Frontend')).toBeVisible()
  })
})
