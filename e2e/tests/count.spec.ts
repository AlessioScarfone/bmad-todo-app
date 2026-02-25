import { test, expect } from '@playwright/test'
import { uniqueEmail, registerAndLogin } from '../helpers/auth'

/**
 * E2E tests for FR21 — Persistent task count display (completed/total).
 *
 * Architecture rule: count is derived client-side from the task list cache —
 * no separate API endpoint.
 *
 * Stories covered:
 *   2.1 — Task list view (count display baseline, status: done)
 *   2.2 — Create task (count increments on creation, status: done)
 *
 * Future stories (skipped until implemented):
 *   2.3 — Mark complete (completed count increments, Story 2.3 — ready-for-dev)
 */

/**
 * Returns the text content of the TaskCountDisplay component.
 * Selector targets the aria-label set in TaskCountDisplay.tsx:
 *   aria-label={`Tasks completed: ${completed} of ${total}`}
 */
async function getTaskCountText(page: import('@playwright/test').Page): Promise<string> {
  // The count is always rendered in the header as "X/Y"
  const countEl = page.locator('header span[aria-live="polite"]')
  return (await countEl.textContent()) ?? ''
}

test.describe('Task count display', () => {
  test('shows 0/0 when a new user has no tasks', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    const count = await getTaskCountText(page)
    expect(count).toBe('0/0')
  })

  test('count increments total when a task is created', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    const input = page.getByLabel('New task title')

    await input.fill('First task')
    await input.press('Enter')
    await expect(input).toHaveValue('') // wait for the optimistic update to apply

    // Total goes from 0/0 → 0/1 (completed stays 0)
    const count = await getTaskCountText(page)
    expect(count).toBe('0/1')
  })

  test('count reflects multiple created tasks', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    const input = page.getByLabel('New task title')

    await input.fill('Task one')
    await input.press('Enter')
    await expect(input).toHaveValue('')

    await input.fill('Task two')
    await input.press('Enter')
    await expect(input).toHaveValue('')

    await input.fill('Task three')
    await input.press('Enter')
    await expect(input).toHaveValue('')

    const count = await getTaskCountText(page)
    expect(count).toBe('0/3')
  })

  test('count is visible in the header on every page state', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Header with count must be present immediately after login
    const header = page.getByRole('banner')
    await expect(header).toBeVisible()

    const countEl = header.locator('span[aria-live="polite"]')
    await expect(countEl).toBeVisible()
    await expect(countEl).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Tasks completed:'),
    )
  })

  test('count updates without triggering an extra API call (client-side derivation)', async ({
    page,
  }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Collect all network requests to /api (excluding the initial task fetch)
    const apiCalls: string[] = []
    page.on('request', req => {
      if (req.url().includes('/api/')) {
        apiCalls.push(`${req.method()} ${new URL(req.url()).pathname}`)
      }
    })

    const input = page.getByLabel('New task title')
    await input.fill('Count test task')
    await input.press('Enter')
    await expect(input).toHaveValue('')

    // The count should have updated
    const count = await getTaskCountText(page)
    expect(count).toBe('0/1')

    // Only POST /api/tasks should have been called — no separate count endpoint
    const countEndpointCalls = apiCalls.filter(c => c.includes('count') || c.includes('score'))
    expect(countEndpointCalls).toHaveLength(0)
  })

  test.skip('completed count increments when task is marked complete (Story 2.3 — ready-for-dev)', async ({
    page: _page,
  }) => {
    // Will be enabled when Story 2.3 is implemented
    // Expected: create task → mark complete → count goes from 0/1 to 1/1
  })

  test.skip('completed count decrements when task is un-completed (Story 2.3 — ready-for-dev)', async ({
    page: _page,
  }) => {
    // Will be enabled when Story 2.3 is implemented
    // Expected: 1/1 → un-complete → 0/1
  })
})
