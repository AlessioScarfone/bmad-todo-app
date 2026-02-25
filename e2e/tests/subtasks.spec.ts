import { test } from '@playwright/test'

/**
 * E2E tests for subtask management.
 *
 * All tests are skipped: subtasks have not been implemented yet.
 * Enable as each story ships:
 *   3.3 — Subtasks: add, complete, delete (status: backlog)
 */

test.describe('Subtasks', () => {
  test.skip('adds a subtask to a parent task (Story 3.3 — backlog)', async ({ page: _page }) => {
    // Will be enabled when Story 3.3 is implemented
  })

  test.skip('completes a subtask independently of parent (Story 3.3 — backlog)', async ({
    page: _page,
  }) => {
    // Completing a subtask does NOT auto-complete the parent (architecture rule)
  })

  test.skip('deletes a subtask (Story 3.3 — backlog)', async ({ page: _page }) => {
    // Will be enabled when Story 3.3 is implemented
  })
})
