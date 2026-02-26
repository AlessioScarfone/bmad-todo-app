import { test, expect } from '@playwright/test'
import { uniqueEmail, registerAndLogin } from '../helpers/auth'

/**
 * E2E tests for task filtering (Story 4.1) and sorting (Story 4.2).
 *
 * Architecture rule: filters and sorts are session-only and applied client-side on the
 * TanStack Query cache — no API call is made when a filter or sort is activated.
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
    await page.getByRole('combobox', { name: 'Add label' }).fill('Backend')
    await page.getByRole('combobox', { name: 'Add label' }).press('Enter')
    await expect(page.getByLabel('Label: Backend', { exact: true })).toBeVisible()
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

    // Create a task (it will be incomplete / active by default)
    await input.fill('Active task')
    await input.press('Enter')
    await expect(page.getByText('Active task')).toBeVisible()

    const taskList = page.getByRole('list', { name: 'Task list' })

    // "Active" filter should show our task (it is incomplete)
    await page.getByRole('button', { name: 'Filter by status: active' }).click()
    await expect(taskList).toContainText('Active task')
    await expect(page.getByRole('button', { name: 'Filter by status: active' })).toHaveAttribute('aria-pressed', 'true')

    // "Done" filter should show the empty filtered state (no completed tasks)
    await page.getByRole('button', { name: 'Filter by status: done' }).click()
    await expect(page.getByText('No tasks match this filter.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Filter by status: done' })).toHaveAttribute('aria-pressed', 'true')

    // "All" filter restores the full list
    await page.getByRole('button', { name: 'Filter by status: all' }).click()
    await expect(taskList).toContainText('Active task')
    await expect(page.getByRole('button', { name: 'Filter by status: all' })).toHaveAttribute('aria-pressed', 'true')
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
    await page.getByRole('combobox', { name: 'Add label' }).fill('TestLabel')
    await page.getByRole('combobox', { name: 'Add label' }).press('Enter')
    await expect(page.getByLabel('Label: TestLabel', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Filter by label: TestLabel' }).click()
    await expect(page.getByRole('button', { name: 'Filter by label: TestLabel' })).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Filter by status: all' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('list', { name: 'Task list' })).toContainText('Reload filter test')
  })
})

test.describe('Sorting', () => {
  test('sorts task list by label A→Z (Story 4.2 AC2)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    const input = page.getByLabel('New task title')

    // Create "Apple task" FIRST (older → bottom by default, newest-first order)
    await input.fill('Apple task')
    await input.press('Enter')
    await expect(page.getByText('Apple task')).toBeVisible()

    // Create "Banana task" SECOND (newest → top by default)
    await input.fill('Banana task')
    await input.press('Enter')
    await expect(page.getByText('Banana task')).toBeVisible()

    // Attach label "Banana" to "Banana task" — it is first in the DOM (.first())
    await page.getByRole('button', { name: /add label/i }).first().click()
    await page.getByRole('combobox', { name: 'Add label' }).fill('Banana')
    await page.getByRole('combobox', { name: 'Add label' }).press('Enter')
    await expect(page.getByLabel('Label: Banana', { exact: true })).toBeVisible()

    // Attach label "Apple" to "Apple task" — it is second in the DOM (.last())
    await page.getByRole('button', { name: /add label/i }).last().click()
    await page.getByRole('combobox', { name: 'Add label' }).fill('Apple')
    await page.getByRole('combobox', { name: 'Add label' }).press('Enter')
    await expect(page.getByLabel('Label: Apple', { exact: true })).toBeVisible()

    // Default order: Banana task (0), Apple task (1)
    const taskItems = page.getByRole('list', { name: 'Task list' }).getByRole('listitem')
    await expect(taskItems.nth(0)).toContainText('Banana task')
    await expect(taskItems.nth(1)).toContainText('Apple task')

    // Apply sort by label A→Z
    await page.getByLabel('Sort tasks').selectOption('label-asc')

    // After sort: Apple task (0, label "Apple" < "Banana"), Banana task (1)
    await expect(taskItems.nth(0)).toContainText('Apple task')
    await expect(taskItems.nth(1)).toContainText('Banana task')
  })

  test('sorts task list by deadline earliest first (Story 4.2 AC3)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    const input = page.getByLabel('New task title')

    // Create "Near deadline" FIRST (older → bottom by default)
    await input.fill('Near deadline')
    await input.press('Enter')
    await expect(page.getByText('Near deadline')).toBeVisible()

    // Create "Far deadline" SECOND (newest → top by default)
    await input.fill('Far deadline')
    await input.press('Enter')
    await expect(page.getByText('Far deadline')).toBeVisible()

    // Set deadline 2026-12-31 on "Far deadline" — first in DOM (.first())
    await page.getByRole('button', { name: /set deadline for/i }).first().click()
    const farDateInput = page.getByLabel(/set deadline for/i).first()
    await farDateInput.fill('2026-12-31')
    await expect(page.getByLabel(/deadline:/i).first()).toBeVisible()

    // Set deadline 2026-03-01 on "Near deadline" — second in DOM (.last())
    await page.getByRole('button', { name: /set deadline for/i }).last().click()
    const nearDateInput = page.getByLabel(/set deadline for/i).last()
    await nearDateInput.fill('2026-03-01')
    await expect(page.getByLabel(/deadline:/i).nth(1)).toBeVisible()

    // Default order: Far deadline (0, newest), Near deadline (1, older)
    const taskItems = page.getByRole('list', { name: 'Task list' }).getByRole('listitem')
    await expect(taskItems.nth(0)).toContainText('Far deadline')
    await expect(taskItems.nth(1)).toContainText('Near deadline')

    // Apply sort by deadline earliest first
    await page.getByLabel('Sort tasks').selectOption('deadline-asc')

    // After sort: Near deadline (0, 2026-03-01 < 2026-12-31), Far deadline (1)
    await expect(taskItems.nth(0)).toContainText('Near deadline')
    await expect(taskItems.nth(1)).toContainText('Far deadline')
  })

  test('sorts task list by completion status — incomplete first (Story 4.2 AC4)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    const input = page.getByLabel('New task title')

    // Create "Task Incomplete" FIRST (older → bottom by default, newest-first order)
    await input.fill('Task Incomplete')
    await input.press('Enter')
    await expect(page.getByText('Task Incomplete')).toBeVisible()

    // Create "Task Complete" SECOND (newest → top by default)
    await input.fill('Task Complete')
    await input.press('Enter')
    await expect(page.getByText('Task Complete')).toBeVisible()

    // Identify "Task Complete"'s ID via API (newest task = index 0 in API response)
    const tasksResponse = await page.request.get('/api/tasks')
    const tasksList = await tasksResponse.json()
    const taskCompleteId = tasksList[0].id

    // Complete "Task Complete" via API — bypasses the known UI checkbox limitation
    // (React controlled checkbox + Playwright .click() doesn't toggle reliably in this project)
    await page.request.patch(`/api/tasks/${taskCompleteId}/complete`)

    // Reload to invalidate the TanStack Query cache and reflect the API change
    await page.reload()
    await expect(page.getByText('Task Incomplete')).toBeVisible()
    await expect(page.getByText('Task Complete')).toBeVisible()

    // Default order (created_at DESC): Task Complete (top, newest), Task Incomplete (bottom, older)
    const taskItems = page.getByRole('list', { name: 'Task list' }).getByRole('listitem')
    await expect(taskItems.nth(0)).toContainText('Task Complete')
    await expect(taskItems.nth(1)).toContainText('Task Incomplete')

    // Apply sort by status — incomplete first
    await page.getByLabel('Sort tasks').selectOption('status-incomplete-first')

    // After sort: Task Incomplete (index 0, incomplete=false) before Task Complete (index 1, complete=true)
    await expect(taskItems.nth(0)).toContainText('Task Incomplete')
    await expect(taskItems.nth(1)).toContainText('Task Complete')
  })

  test('sort and filter work together — combined sort+filter (Story 4.2 AC6)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    const input = page.getByLabel('New task title')

    // Create "Task Alpha" FIRST (older → bottom by default) with label "Combo" and near deadline
    await input.fill('Task Alpha')
    await input.press('Enter')
    await expect(page.getByText('Task Alpha')).toBeVisible()

    // Set a near deadline (2026-03-01) on Task Alpha — it is last in DOM, target with .last()
    await page.getByRole('button', { name: /set deadline for/i }).last().click()
    await page.getByLabel(/set deadline for/i).last().fill('2026-03-01')
    await expect(page.getByLabel(/deadline:/i).last()).toBeVisible()

    // Attach label "Combo" to Task Alpha (last in DOM)
    await page.getByRole('button', { name: /add label/i }).last().click()
    await page.getByRole('combobox', { name: 'Add label' }).fill('Combo')
    await page.getByRole('combobox', { name: 'Add label' }).press('Enter')
    await expect(page.getByLabel('Label: Combo', { exact: true }).last()).toBeVisible()

    // Create "Task Beta" SECOND (newer → top by default) with label "Combo" and far deadline
    await input.fill('Task Beta')
    await input.press('Enter')
    await expect(page.getByText('Task Beta')).toBeVisible()

    // Set a far deadline (2026-12-31) on Task Beta — it is now first in DOM, target with .first()
    await page.getByRole('button', { name: /set deadline for/i }).first().click()
    await page.getByLabel(/set deadline for/i).first().fill('2026-12-31')
    await expect(page.getByLabel(/deadline:/i).first()).toBeVisible()

    // Attach label "Combo" to Task Beta (first in DOM)
    await page.getByRole('button', { name: /add label/i }).first().click()
    await page.getByRole('combobox', { name: 'Add label' }).fill('Combo')
    await page.getByRole('combobox', { name: 'Add label' }).press('Enter')
    await expect(page.getByLabel('Label: Combo', { exact: true }).first()).toBeVisible()

    // Create "Task Gamma" THIRD (newest → top) with a different label — will be filtered out
    await input.fill('Task Gamma')
    await input.press('Enter')
    await expect(page.getByText('Task Gamma')).toBeVisible()
    await page.getByRole('button', { name: /add label/i }).first().click()
    await page.getByRole('combobox', { name: 'Add label' }).fill('Other')
    await page.getByRole('combobox', { name: 'Add label' }).press('Enter')
    await expect(page.getByLabel('Label: Other', { exact: true })).toBeVisible()

    // Apply label filter "Combo" — Task Gamma (label "Other") should disappear
    await page.getByRole('button', { name: 'Filter by label: Combo' }).click()
    const taskList = page.getByRole('list', { name: 'Task list' })
    await expect(taskList).toContainText('Task Beta')
    await expect(taskList).toContainText('Task Alpha')
    await expect(taskList).not.toContainText('Task Gamma')

    // Default filtered order (newest-first): Task Beta (top, 2026-12-31), Task Alpha (bottom, 2026-03-01)
    const taskItems = taskList.getByRole('listitem')
    await expect(taskItems.nth(0)).toContainText('Task Beta')
    await expect(taskItems.nth(1)).toContainText('Task Alpha')

    // Apply sort by deadline (earliest first) — with filter still active
    await page.getByLabel('Sort tasks').selectOption('deadline-asc')

    // After combined filter+sort: Task Alpha (top, 2026-03-01 < 2026-12-31), Task Beta (bottom)
    await expect(taskItems.nth(0)).toContainText('Task Alpha')
    await expect(taskItems.nth(1)).toContainText('Task Beta')
    // Task Gamma remains excluded by the filter
    await expect(taskList).not.toContainText('Task Gamma')
  })
})
