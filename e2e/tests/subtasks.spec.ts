import { test, expect } from '@playwright/test'
import { uniqueEmail, registerAndLogin } from '../helpers/auth'

/**
 * E2E tests for subtask management (Story 3.3).
 */

test.describe('Subtasks', () => {
  test('adds a subtask to a parent task', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task via inline input
    await page.getByPlaceholder(/add a task/i).fill('Task with subtasks')
    await page.getByPlaceholder(/add a task/i).press('Enter')
    await expect(page.getByText('Task with subtasks')).toBeVisible()

    // Open the subtask panel
    await page.getByRole('button', { name: /expand subtasks for "task with subtasks"/i }).click()
    await expect(page.getByRole('list', { name: /subtasks/i })).toBeVisible()

    // Add a subtask
    await page.getByRole('textbox', { name: /new subtask title/i }).fill('My first subtask')
    await page.getByRole('textbox', { name: /new subtask title/i }).press('Enter')

    // Verify the subtask appears
    await expect(page.getByText('My first subtask')).toBeVisible()
  })

  test('completes a subtask independently of parent (FR20 — no auto-complete)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task
    await page.getByPlaceholder(/add a task/i).fill('Parent task for FR20')
    await page.getByPlaceholder(/add a task/i).press('Enter')
    await expect(page.getByText('Parent task for FR20')).toBeVisible()

    // Open subtask panel and add a subtask
    await page.getByRole('button', { name: /expand subtasks for "parent task for fr20"/i }).click()
    await page.getByRole('textbox', { name: /new subtask title/i }).fill('Subtask to complete')
    await page.getByRole('textbox', { name: /new subtask title/i }).press('Enter')
    await expect(page.getByText('Subtask to complete')).toBeVisible()

    // Locate parent task checkbox — should be unchecked
    const parentCheckbox = page.getByRole('checkbox', { name: /mark parent task for fr20 as done/i })
    await expect(parentCheckbox).not.toBeChecked()

    // Complete the subtask
    const subtaskCheckbox = page.getByRole('checkbox', {
      name: /mark subtask "subtask to complete" as complete/i,
    })
    await subtaskCheckbox.click()

    // Verify subtask is now checked (checkbox aria-label changes after toggle)
    await expect(
      page.getByRole('checkbox', { name: /mark subtask "subtask to complete" as incomplete/i }),
    ).toBeChecked()

    // Verify parent task checkbox remains unchecked (FR20 hard rule)
    await expect(parentCheckbox).not.toBeChecked()
  })

  test('deletes a subtask', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task
    await page.getByPlaceholder(/add a task/i).fill('Task for delete subtask test')
    await page.getByPlaceholder(/add a task/i).press('Enter')
    await expect(page.getByText('Task for delete subtask test')).toBeVisible()

    // Open subtask panel and add a subtask
    await page.getByRole('button', { name: /expand subtasks for "task for delete subtask test"/i }).click()
    await page.getByRole('textbox', { name: /new subtask title/i }).fill('Subtask to delete')
    await page.getByRole('textbox', { name: /new subtask title/i }).press('Enter')
    await expect(page.getByText('Subtask to delete')).toBeVisible()

    // Delete the subtask
    await page.getByRole('button', { name: /delete subtask "subtask to delete"/i }).click()

    // Verify it's gone and empty state is shown
    await expect(page.getByText('Subtask to delete')).not.toBeVisible()
    await expect(page.getByText(/no subtasks yet/i)).toBeVisible()
  })
})
