import { test, expect } from '@playwright/test'
import { uniqueEmail, registerAndLogin } from '../helpers/auth'

/**
 * E2E tests for Story 5.1 — Inline Error Feedback & Retry
 *
 * Tests inline error feedback and retry affordance on failed task mutations.
 * Uses Playwright's `page.route()` to intercept API calls and simulate server errors.
 *
 * AC1 — Inline error with role="alert" when task mutation fails
 * AC2 — Retry button has aria-label="Retry saving [task title]"
 * AC3 — Error dismisses and task row returns to normal after successful retry
 * AC4 — React Error Boundary (unit-tested only — no meaningful E2E scenario without crash injection)
 */

test.describe('Story 5.1 — Inline Error Feedback & Retry', () => {
  /**
   * AC1 + AC2: When the toggle (complete/uncomplete) mutation fails, the task row
   * shows an inline alert and a retry button with the spec-compliant aria-label.
   */
  test('toggle failure shows role=alert and retry button with correct aria-label (AC1, AC2)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task first (real API — needs to succeed)
    const input = page.getByLabel('New task title')
    await input.fill('Error test task')
    await input.press('Enter')

    const taskList = page.getByRole('list', { name: 'Task list' })
    await expect(taskList).toContainText('Error test task')

    // Intercept the toggle mutation to simulate a server error
    await page.route('**/api/tasks/*/complete', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) }),
    )
    await page.route('**/api/tasks/*/uncomplete', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) }),
    )

    // Click the checkbox to trigger the toggle
    await taskList.getByRole('checkbox').click()

    // AC1: Inline error container appears with role="alert"
    await expect(page.getByRole('alert')).toBeVisible()

    // AC2: Retry button has the spec-compliant aria-label
    await expect(
      page.getByRole('button', { name: 'Retry saving Error test task' }),
    ).toBeVisible()
  })

  /**
   * AC1 + AC2: When the edit title mutation fails, an inline alert renders with the
   * correct retry aria-label using the task title.
   */
  test('edit title failure shows role=alert and retry button with correct aria-label (AC1, AC2)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    const input = page.getByLabel('New task title')
    await input.fill('Task to edit')
    await input.press('Enter')

    const taskList = page.getByRole('list', { name: 'Task list' })
    await expect(taskList).toContainText('Task to edit')

    // Edit button is opacity-0 until CSS group-hover — hover and dispatch to reveal
    const taskRow = taskList.locator('li').filter({ hasText: 'Task to edit' })
    await taskRow.hover()
    const editBtn = taskRow.locator('[aria-label="Edit task title"]')
    await editBtn.waitFor({ state: 'attached' })
    await editBtn.dispatchEvent('click')

    const editInput = page.getByRole('textbox', { name: /edit task title/i })
    await expect(editInput).toBeVisible()

    // Clear and type a new title
    await editInput.clear()
    await editInput.fill('New title attempt')

    // Intercept the PATCH /api/tasks/:id call to simulate failure
    await page.route('**/api/tasks/*', (route) => {
      if (route.request().method() === 'PATCH') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) })
      }
      return route.continue()
    })

    await editInput.press('Enter')

    // AC1: Inline error with role="alert"
    await expect(page.getByRole('alert')).toBeVisible()

    // AC2: Retry button uses the task's title in the aria-label
    // Note: "Task to edit" is the *original* title (before the failed update)
    await expect(
      page.getByRole('button', { name: 'Retry saving Task to edit' }),
    ).toBeVisible()
  })

  /**
   * AC3: After a successful retry, the inline error is dismissed and the task row
   * returns to its normal state.
   */
  test('successful retry dismisses error and task row returns to normal state (AC3)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    const input = page.getByLabel('New task title')
    await input.fill('Retry success task')
    await input.press('Enter')

    const taskList = page.getByRole('list', { name: 'Task list' })
    await expect(taskList).toContainText('Retry success task')

    // First toggle call → fail; second toggle call (retry) → succeed
    let callCount = 0
    await page.route('**/api/tasks/*/complete', (route) => {
      callCount++
      if (callCount === 1) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'fail' }) })
      }
      // Retry succeeds — let it through to the real server
      return route.continue()
    })
    await page.route('**/api/tasks/*/uncomplete', (route) => route.continue())

    // Trigger toggle — will fail
    await taskList.getByRole('checkbox').click()
    await expect(page.getByRole('alert')).toBeVisible()

    const retryBtn = page.getByRole('button', { name: 'Retry saving Retry success task' })
    await expect(retryBtn).toBeVisible()

    // Click retry — second call succeeds
    await retryBtn.click()

    // AC3: Error alert is dismissed (not visible)
    await expect(page.getByRole('alert')).not.toBeVisible({ timeout: 5000 })
  })

  /**
   * AC2: Inline delete error uses "Retry delete" (not "Retry saving")
   * because deleting is not a "save" action — spec intentionally differentiates.
   */
  test('delete failure shows "Retry delete" aria-label (not "Retry saving") (AC2 spec edge case)', async ({
    page,
  }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    const input = page.getByLabel('New task title')
    await input.fill('Task to delete')
    await input.press('Enter')

    const taskList = page.getByRole('list', { name: 'Task list' })
    await expect(taskList).toContainText('Task to delete')

    // Intercept only DELETE calls to fail
    await page.route('**/api/tasks/*', (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'fail' }) })
      }
      return route.continue()
    })

    // Trigger delete — delete button is opacity-0 until CSS group-hover, so hover first then dispatch
    const taskRow = taskList.locator('li').filter({ hasText: 'Task to delete' })
    await taskRow.hover()
    const deleteBtn = taskRow.locator('[aria-label="Delete task"]')
    await deleteBtn.waitFor({ state: 'attached' })
    await deleteBtn.dispatchEvent('click')

    // Confirm delete
    await page.getByRole('button', { name: /confirm delete/i }).click()

    // AC2 edge case: delete retry uses "Retry delete", not "Retry saving [title]"
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry delete' })).toBeVisible()
  })

  /**
   * AC4 NOTE — React Error Boundary:
   * Playwright E2E testing of the React Error Boundary is not practical
   * without injecting a deliberate render crash (test-only code).
   * Full coverage of AC4 is provided by unit tests in:
   *   frontend/test/components/ErrorBoundary.test.tsx (6 tests)
   * This is a documented known limitation for E2E coverage.
   */
})
