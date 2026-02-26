import { test, expect } from '@playwright/test'
import { uniqueEmail, registerAndLogin } from '../helpers/auth'

/**
 * E2E tests for task filtering (Story 4.1).
 *
 * Architecture rule: filters are session-only and applied client-side on the
 * TanStack Query cache — no API call is made when a filter is activated.
 *
 * Sorting tests (Story 4.2) remain skipped below.
 */

test.describe('Filters', () => {
  test('filters task list by label - AC2', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    const input = page.getByLabel('New task title')
    // Create the unlabeled task FIRST so it appears at the bottom (tasks sorted newest-first)
    await input.fill('Task without label')
    await input.press('Enter')
    await expect(page.getByText('Task without label')).toBeVisible()
    // Create the labeled task SECOND so it appears at the top — .first() will target it correctly
    await input.fill('Task with label')
    await input.press('Enter')
    await expect(input).toHaveValue('')
    await page.getByRole('button', { name: /add label/i }).first().click()
    await page.getByLabel('Add label').fill('Backend')
    await page.getByLabel('Add label').press('Enter')
    await expect(page.getByLabel('Label: Backend')).toBeVisible()
    await page.getByRole('button', { name: 'Filter by label: Backend' }).click()
    const taskList = page.getByRole('list', { name: 'Task list' })
    await expect(taskList).toContainText('Task with label')
    await expect(taskList).not.toContainText('Task without label')
    await expect(page.getByRole('button', { name: 'Filter by label: Backend' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Filter by label: Backend' }).click()
    await expect(taskList).toContainText('Task with label')
    await expect(taskList).toContainText('Task without label')
  })

  test('filters task list by completion status - AC3', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    const input = page.getByLabel('New task title')
    await input.fill('Completed task')
    await input.press('Enter')
    await expect(page.getByText('Completed task')).toBeVisible()
    await input.fill('Incomplete task')
    await input.press('Enter')
    await expect(input).toHaveValue('')
    const checkbox = page.getByRole('checkbox', { name: 'Mark Completed task as done' })
    await expect(checkbox).toBeVisible()
    await checkbox.click()
    await expect(checkbox).toBeChecked()
    await page.getByRole('button', { name: 'Filter by status: done' }).click()
    const taskList = page.getByRole('list', { name: 'Task list' })
    await expect(taskList).toContainText('Completed task')
    await expect(taskList).not.toContainText('Incomplete task')
    await page.getByRole('button', { name: 'Filter by status: active' }).click()
    await expect(taskList).toContainText('Incomplete task')
    await expect(taskList).not.toContainText('Completed task')
    await page.getByRole('button', { name: 'Filter by status: all' }).click()
    await expect(taskList).toContainText('Completed task')
    await expect(taskList).toContainText('Incomplete task')
  })

  test('filters task list by deadline - AC4', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    const input = page.getByLabel('New task title')
    // Create the task without deadline FIRST so it appears at the bottom (tasks sorted newest-first)
    await input.fill('Task without deadline')
    await input.press('Enter')
    await expect(page.getByText('Task without deadline')).toBeVisible()
    // Create the task with deadline SECOND so it appears at the top — .first() will target it correctly
    await input.fill('Task with deadline')
    await input.press('Enter')
    await expect(input).toHaveValue('')
    await page.getByRole('button', { name: /set deadline for/i }).first().click()
    const dateInput = page.getByLabel(/set deadline for/i).first()
    await dateInput.fill('2026-12-31')
    await expect(page.getByLabel(/deadline:/i)).toBeVisible()
    await page.getByRole('button', { name: 'Filter: has deadline' }).click()
    const taskList = page.getByRole('list', { name: 'Task list' })
    await expect(taskList).toContainText('Task with deadline')
    await expect(taskList).not.toContainText('Task without deadline')
    await expect(page.getByRole('button', { name: 'Filter: has deadline' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Filter: has deadline' }).click()
    await expect(taskList).toContainText('Task with deadline')
    await expect(taskList).toContainText('Task without deadline')
  })

  test('filters reset on page reload - session-only, not persisted - AC6', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    const input = page.getByLabel('New task title')
    await input.fill('Reload filter test')
    await input.press('Enter')
    await expect(page.getByText('Reload filter test')).toBeVisible()
    await page.getByRole('button', { name: /add label/i }).click()
    await page.getByLabel('Add label').fill('TestLabel')
    await page.getByLabel('Add label').press('Enter')
    await expect(page.getByLabel('Label: TestLabel')).toBeVisible()
    await page.getByRole('button', { name: 'Filter by label: TestLabel' }).click()
    await expect(page.getByRole('button', { name: 'Filter by label: TestLabel' })).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Filter by status: all' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('list', { name: 'Task list' })).toContainText('Reload filter test')
  })
})

test.describe('Sorting', () => {
  test.skip('sorts task list by label (Story 4.2)', async ({ page: _page }) => {
    // Will be enabled when Story 4.2 is implemented
  })

  test.skip('sorts task list by deadline (Story 4.2)', async ({ page: _page }) => {
    // Will be enabled when Story 4.2 is implemented
  })

  test.skip('sorts task list by completion status (Story 4.2)', async ({ page: _page }) => {
    // Will be enabled when Story 4.2 is implemented
  })
})
