import { test } from '@playwright/test'

/**
 * E2E tests for task filtering and sorting.
 *
 * All tests are skipped: filtering and sorting have not been implemented yet.
 * Enable as each story ships:
 *   4.1 — Filter by label, status, and deadline (status: backlog)
 *   4.2 — Sort task list (status: backlog)
 *
 * Architecture note: filters are session-only and non-persistent (PRD requirement).
 */

test.describe('Filters', () => {
  test.skip('filters task list by label (Story 4.1 — backlog)', async ({ page: _page }) => {
    // Will be enabled when Story 4.1 is implemented
  })

  test.skip('filters task list by completion status (Story 4.1 — backlog)', async ({
    page: _page,
  }) => {
    // Will be enabled when Story 4.1 is implemented
  })

  test.skip('filters task list by deadline (Story 4.1 — backlog)', async ({ page: _page }) => {
    // Will be enabled when Story 4.1 is implemented
  })

  test.skip('filters reset on page reload (session-only, not persisted) (Story 4.1 — backlog)', async ({
    page: _page,
  }) => {
    // Architecture rule: filters are session-only, non-persistent (PRD requirement)
  })
})

test.describe('Sorting', () => {
  test.skip('sorts task list by label (Story 4.2 — backlog)', async ({ page: _page }) => {
    // Will be enabled when Story 4.2 is implemented
  })

  test.skip('sorts task list by deadline (Story 4.2 — backlog)', async ({ page: _page }) => {
    // Will be enabled when Story 4.2 is implemented
  })

  test.skip('sorts task list by completion status (Story 4.2 — backlog)', async ({
    page: _page,
  }) => {
    // Will be enabled when Story 4.2 is implemented
  })
})
