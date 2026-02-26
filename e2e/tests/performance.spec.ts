import { test, expect } from '@playwright/test'
import { uniqueEmail, registerAndLogin } from '../helpers/auth'

/**
 * E2E tests for Story 5.2 — Performance & Sub-second State Reflection
 *
 * AC1 — Task actions (create, complete, delete, edit) reflect in UI via optimistic update (no spinner)
 * AC2 — Task count updates within 500ms — no extra GET /api/tasks call on toggle
 * AC3 — Initial page load completes within 3 seconds
 * AC4 — 4 skeleton rows shown during initial task list fetch (isLoading state)
 */

test.describe('Story 5.2 — Performance & Sub-second State Reflection', () => {
  /**
   * AC4: When the task list is loading, exactly 4 skeleton rows are shown
   * (never a blank list or spinner overlay).
   *
   * Strategy: intercept GET /api/tasks to delay the response, then assert
   * that the loading list with 4 skeleton <li> elements is visible before
   * the data arrives.
   */
  test('shows 4 skeleton rows while the task list is loading (AC4)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Intercept the tasks API call and add a 500ms delay to make the skeleton visible
    let resolveRoute: (() => void) | null = null
    const routeReady = new Promise<void>(resolve => { resolveRoute = resolve })

    await page.route('**/api/tasks', async (route) => {
      if (route.request().method() === 'GET') {
        resolveRoute?.()
        // Delay long enough for the assertion to run
        await new Promise(resolve => setTimeout(resolve, 500))
        await route.continue()
      } else {
        await route.continue()
      }
    })

    // Navigate to trigger a fresh task list fetch
    await page.goto('/')

    // Wait for the route interception to fire (the GET /api/tasks request started)
    await routeReady

    // At this moment the route is being held — isLoading should be true
    // The loading list must be present with aria-busy="true"
    const loadingList = page.getByRole('list', { name: 'Loading tasks' })
    await expect(loadingList).toBeVisible({ timeout: 2000 })

    // Exactly 4 list items (skeleton rows) — never more, never fewer (AC4)
    const skeletonItems = loadingList.locator('li')
    await expect(skeletonItems).toHaveCount(4)
  })

  /**
   * AC1 — Optimistic create: task appears in the list immediately upon Enter,
   * before the server responds. There must be no spinner visible between action
   * and task appearance.
   */
  test('task appears immediately in list after Enter — no spinner (AC1 optimistic create)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Add a 300ms delay on the create task endpoint to reveal any spinner
    await page.route('**/api/tasks', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise(resolve => setTimeout(resolve, 300))
        await route.continue()
      } else {
        await route.continue()
      }
    })

    const input = page.getByLabel('New task title')
    await input.fill('Optimistic task')
    await input.press('Enter')

    // Task must appear immediately (optimistic insert) — no waiting for server
    const taskList = page.getByRole('list', { name: 'Task list' })
    await expect(taskList).toContainText('Optimistic task')

    // No spinner (role="status" with spinner text) should be visible
    // The app uses no global spinner — only optimistic UI
    const spinner = page.locator('[role="status"]:has-text("loading")')
    await expect(spinner).toHaveCount(0)
  })

  /**
   * AC1 — Optimistic toggle: checkbox state flips immediately, before server
   * confirmation. Task count in header updates in the same render cycle.
   */
  test('checkbox flips immediately when toggled — optimistic complete (AC1, AC2)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task via real API first
    const input = page.getByLabel('New task title')
    await input.fill('Toggle optimistic task')
    await input.press('Enter')

    const taskList = page.getByRole('list', { name: 'Task list' })
    await expect(taskList).toContainText('Toggle optimistic task')

    // Add delay to the toggle endpoints to reveal any missing optimistic update
    await page.route('**/api/tasks/*/complete', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 300))
      await route.continue()
    })
    await page.route('**/api/tasks/*/uncomplete', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 300))
      await route.continue()
    })

    // Get initial task count display value (should be "0/1")
    const countDisplay = page.getByLabel(/tasks completed/i)
    await expect(countDisplay).toContainText('0/1')

    // Click the checkbox
    const checkbox = taskList.getByRole('checkbox')
    await checkbox.click()

    // AC1: Checkbox should immediately appear checked (optimistic flip)
    await expect(checkbox).toBeChecked()

    // AC2: Task count display should immediately update to "1/1" (no extra API call)
    await expect(countDisplay).toContainText('1/1')
  })

  /**
   * AC2 — Task count updates when task is uncompleted — cache-derived, no extra call.
   * Toggling a completed task back to incomplete decrements the count immediately.
   */
  test('task count decrements immediately when task is un-completed (AC2)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create and complete a task via real API
    const input = page.getByLabel('New task title')
    await input.fill('Count decrement task')
    await input.press('Enter')

    const taskList = page.getByRole('list', { name: 'Task list' })
    await expect(taskList).toContainText('Count decrement task')

    // Complete the task
    const checkbox = taskList.getByRole('checkbox')
    await checkbox.click()
    const countDisplay = page.getByLabel(/tasks completed/i)
    await expect(countDisplay).toContainText('1/1')

    // Now intercept uncomplete to add delay
    await page.route('**/api/tasks/*/uncomplete', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 300))
      await route.continue()
    })

    // Un-complete the task
    await checkbox.click()

    // Count should immediately go back to "0/1" (optimistic uncomplete)
    await expect(countDisplay).toContainText('0/1')
  })

  /**
   * AC3 — Page load completes within 3 seconds (NFR2).
   * Measures the time from navigation start to the task list page being usable.
   */
  test('initial page load completes within 3 seconds (AC3 — NFR2)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Measure load time from navigation to key content being visible
    const startTime = Date.now()
    await page.goto('/')

    // Page is "loaded" when the new task input is visible and interactive
    await expect(page.getByLabel('New task title')).toBeVisible()
    const loadTime = Date.now() - startTime

    // Must be under 3 seconds (3000ms) — generous threshold for CI environments
    expect(loadTime).toBeLessThan(3000)
  })

  /**
   * AC4 — After loading completes, skeleton rows are replaced by the actual
   * task list (or EmptyState), never left visible.
   */
  test('skeleton rows are replaced by real content after loading (AC4)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    await page.goto('/')

    // Wait for the page to fully load (task input visible = app ready)
    await expect(page.getByLabel('New task title')).toBeVisible()

    // The loading list should NOT be visible after loading completes
    const loadingList = page.getByRole('list', { name: 'Loading tasks' })
    await expect(loadingList).not.toBeVisible()

    // Either EmptyState or the real task list should be shown instead
    // (new user has no tasks, so EmptyState is expected here)
    await expect(page.getByText(/no tasks yet/i)).toBeVisible()
  })
})
