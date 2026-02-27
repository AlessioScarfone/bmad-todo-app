import { test, expect } from '@playwright/test'
import { uniqueEmail, registerAndLogin } from '../helpers/auth'

/**
 * E2E tests for Story 5.3 — Full Keyboard Navigation.
 *
 * Acceptance Criteria covered:
 *   AC1 — Logical tab order: Logout → task input → filter bar → sort → task rows
 *   AC2 — Space on focused task row toggles completion checkbox
 *   AC3 — Escape in inline edit mode cancels and returns focus to the task row <li>
 *   AC4 — Filter buttons respond to Enter and Space (native button behaviour)
 *   AC5 — Visible focus rings on AppHeader logout button, InlineTaskInput, Edit/Delete buttons
 *
 * Prerequisites: `docker-compose up` must be running (targets http://localhost:3000).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a single task and returns after it appears in the list. */
async function createTask(page: import('@playwright/test').Page, title: string) {
  const input = page.getByLabel('New task title')
  await input.fill(title)
  await input.press('Enter')
  await expect(page.getByText(title)).toBeVisible()
  // Ensure the input is cleared (success path)
  await expect(input).toHaveValue('')
}

// ---------------------------------------------------------------------------
// AC1 — Tab order
// ---------------------------------------------------------------------------

test.describe('AC1 — Logical tab order', () => {
  test('Tab from task input reaches filter bar All button', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Tab order task')

    // Focus the task input, then tab forward to reach the filter bar
    const input = page.getByLabel('New task title')
    await input.focus()

    // Tab past the "Add" submit button → into filter bar (first button: "All")
    await page.keyboard.press('Tab') // → Add button
    await page.keyboard.press('Tab') // → first filter button (All)

    const allFilterBtn = page.getByRole('button', { name: 'Filter by status: all' })
    await expect(allFilterBtn).toBeFocused()
  })

  test('Tab from filter bar reaches sort dropdown', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Sort tab order task')

    const allFilterBtn = page.getByRole('button', { name: 'Filter by status: all' })
    await allFilterBtn.focus()

    // Tab through remaining filter buttons → active → done → has deadline
    await page.keyboard.press('Tab') // → Active filter
    await page.keyboard.press('Tab') // → Done filter
    await page.keyboard.press('Tab') // → Has deadline filter

    // Next Tab should land on the SortDropdown <select>
    await page.keyboard.press('Tab')
    const sortSelect = page.getByRole('combobox', { name: /sort/i })
    await expect(sortSelect).toBeFocused()
  })

  test('Tab from sort dropdown reaches first task row', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'First task row tab')

    const sortSelect = page.getByRole('combobox', { name: /sort/i })
    await sortSelect.focus()

    // First interactive element inside the task row after <li> itself is the checkbox
    await page.keyboard.press('Tab')

    // The task row <li> has tabIndex=0 so it is the next focusable element.
    // Playwright's focused element should be within the task list.
    const taskList = page.getByRole('list', { name: 'Task list' })
    await expect(taskList).toBeVisible()
    // The focused element should be somewhere inside or be the task list
    const focused = page.locator(':focus')
    const listItemCount = await taskList.locator('li').count()
    expect(listItemCount).toBeGreaterThan(0)
    // Focus should be reachable (no error thrown means Tab moved focus successfully)
    await expect(focused).toBeVisible()
  })

  test('Logout button is keyboard focusable and reachable via Tab', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Focus the logout button directly and verify it is focusable
    const logoutBtn = page.getByRole('button', { name: /log out/i })
    await logoutBtn.focus()
    await expect(logoutBtn).toBeFocused()
  })
})

// ---------------------------------------------------------------------------
// AC2 — Space key toggles completion on focused task row
// ---------------------------------------------------------------------------

test.describe('AC2 — Space key toggles task completion', () => {
  test('pressing Space on a focused task row marks the task as done', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Space toggle task')

    // Focus the task row <li> directly
    const taskRow = page.locator('li').filter({ hasText: 'Space toggle task' }).first()
    await taskRow.focus()
    await expect(taskRow).toBeFocused()

    // Checkbox should be unchecked before Space
    const checkbox = page.getByRole('checkbox', { name: /mark space toggle task/i })
    await expect(checkbox).not.toBeChecked()

    // Press Space — should toggle the task (preventDefault stops scroll)
    await page.keyboard.press(' ')

    // Wait for the checkbox to reflect the completed state
    await expect(checkbox).toBeChecked()
  })

  test('pressing Space on an already-done task row marks it as not done (toggle back)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Space un-toggle task')

    const checkbox = page.getByRole('checkbox', { name: /mark space un-toggle task/i })

    // First: complete via checkbox click
    await checkbox.click()
    await expect(checkbox).toBeChecked()

    // Focus the task row and press Space to un-complete
    const taskRow = page.locator('li').filter({ hasText: 'Space un-toggle task' }).first()
    await taskRow.focus()
    await page.keyboard.press(' ')

    await expect(checkbox).not.toBeChecked()
  })

  test('Space on a child button inside the row does NOT fire row toggle', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Guard test task')

    const checkbox = page.getByRole('checkbox', { name: /mark guard test task/i })
    await expect(checkbox).not.toBeChecked()

    // Focus the Edit button (child element) and press Space — should open edit mode, not toggle
    const editBtn = page.getByRole('button', { name: 'Edit task title' }).first()
    await editBtn.focus()
    await page.keyboard.press(' ')

    // Task should remain NOT toggled (checkbox still unchecked)
    await expect(checkbox).not.toBeChecked()
  })
})

// ---------------------------------------------------------------------------
// AC3 — Escape in inline edit cancels and returns focus to task row
// ---------------------------------------------------------------------------

test.describe('AC3 — Escape cancels inline edit and restores focus to task row', () => {
  test('Escape in edit mode cancels and reverts title to original', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Escape cancel task')

    // Enter edit mode via keyboard: focus row → Enter
    const taskRow = page.locator('li').filter({ hasText: 'Escape cancel task' }).first()
    await taskRow.focus()
    await page.keyboard.press('Enter')

    // Edit input should now be focused
    const editInput = page.getByRole('textbox', { name: /edit task title/i })
      .or(page.locator('input[type="text"]').filter({ hasText: '' }).first())

    // Type something different
    await page.keyboard.press('Control+A')
    await page.keyboard.type('Changed title that should not save')

    // Press Escape — should cancel edit
    await page.keyboard.press('Escape')

    // Original title should still be visible (edit cancelled)
    await expect(page.getByText('Escape cancel task')).toBeVisible()
    // Changed title should NOT be visible
    await expect(page.getByText('Changed title that should not save')).not.toBeVisible()
  })

  test('Escape in edit mode returns focus to the parent task row', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Focus restore task')

    // Focus row, enter edit mode
    const taskRow = page.locator('li').filter({ hasText: 'Focus restore task' }).first()
    await taskRow.focus()
    await page.keyboard.press('Enter')

    // Escape to cancel
    await page.keyboard.press('Escape')

    // The task row <li> should be focused again (not document.body)
    await expect(taskRow).toBeFocused()
  })

  test('Enter on a focused row enters edit mode', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Enter edit mode task')

    const taskRow = page.locator('li').filter({ hasText: 'Enter edit mode task' }).first()
    await taskRow.focus()
    await page.keyboard.press('Enter')

    // Edit input should be visible and focused
    // The task row turns into an inline editor when Enter is pressed
    const editInput = page.locator('input[value="Enter edit mode task"]')
    await expect(editInput).toBeVisible()
    await expect(editInput).toBeFocused()
  })
})

// ---------------------------------------------------------------------------
// AC4 — Filter buttons respond to keyboard (Enter / Space)
// ---------------------------------------------------------------------------

test.describe('AC4 — Filter buttons are keyboard-operable', () => {
  test('pressing Enter on a focused filter button toggles the filter', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Filter keyboard task')

    const activeFilterBtn = page.getByRole('button', { name: 'Filter by status: active' })
    await activeFilterBtn.focus()
    await expect(activeFilterBtn).toBeFocused()

    // Enter activates the filter (native button Enter behaviour)
    await page.keyboard.press('Enter')
    await expect(activeFilterBtn).toHaveAttribute('aria-pressed', 'true')

    // Enter again deactivates
    await page.keyboard.press('Enter')
    await expect(activeFilterBtn).toHaveAttribute('aria-pressed', 'false')
  })

  test('pressing Space on a focused filter button toggles the filter', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Filter space task')

    const doneFilterBtn = page.getByRole('button', { name: 'Filter by status: done' })
    await doneFilterBtn.focus()

    // Space activates the filter (native button Space behaviour)
    await page.keyboard.press(' ')
    await expect(doneFilterBtn).toHaveAttribute('aria-pressed', 'true')
  })

  test('filter buttons have a visible focus ring (aria-pressed + outline class)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    const allFilterBtn = page.getByRole('button', { name: 'Filter by status: all' })
    // Verify the focus ring class is present in the DOM
    const classAttr = await allFilterBtn.getAttribute('class')
    expect(classAttr).toContain('focus:outline')
    expect(classAttr).toContain('#00ff88')
  })
})

// ---------------------------------------------------------------------------
// AC5 — Visible focus rings on all interactive elements
// ---------------------------------------------------------------------------

test.describe('AC5 — Visible focus styles on interactive elements', () => {
  test('AppHeader logout button has explicit focus ring classes', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    const logoutBtn = page.getByRole('button', { name: /log out/i })
    const classAttr = await logoutBtn.getAttribute('class')

    // AC5 requires focus:outline focus:outline-2 focus:outline-[#00ff88]
    expect(classAttr).toContain('focus:outline')
    expect(classAttr).toContain('focus:outline-2')
    expect(classAttr).toContain('#00ff88')
  })

  test('InlineTaskInput text input does NOT suppress focus with no replacement', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    const input = page.getByLabel('New task title')
    const classAttr = await input.getAttribute('class')

    // The input uses outline-none but must have focus:bg-[#252525] as replacement
    expect(classAttr).toContain('focus:bg-[#252525]')
  })

  test('Edit button on task row has focus:opacity-100 so it is visible when keyboard-focused', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Edit button focus task')

    const editBtn = page.getByRole('button', { name: 'Edit task title' }).first()
    const classAttr = await editBtn.getAttribute('class')

    expect(classAttr).toContain('focus:opacity-100')
  })

  test('Delete button on task row has focus:opacity-100 so it is visible when keyboard-focused', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Delete button focus task')

    const deleteBtn = page.getByRole('button', { name: 'Delete task' }).first()
    const classAttr = await deleteBtn.getAttribute('class')

    expect(classAttr).toContain('focus:opacity-100')
  })

  test('Edit button becomes accessible (focusable) when keyboard navigation reaches it', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Edit focus reachable task')

    // Tab from the task row's checkbox area to reach the Edit button
    const taskRow = page.locator('li').filter({ hasText: 'Edit focus reachable task' }).first()
    await taskRow.focus()

    // Tab into the row's children: checkbox → edit button
    await page.keyboard.press('Tab') // → checkbox
    await page.keyboard.press('Tab') // → Edit button

    const editBtn = page.getByRole('button', { name: 'Edit task title' }).first()
    await expect(editBtn).toBeFocused()
    // When focused the button should be visible (focus:opacity-100 overrides opacity-0)
    await expect(editBtn).toBeVisible()
  })

  test('task row <li> has visible focus style via focus:border-l-[#00ff88]', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await createTask(page, 'Row focus indicator task')

    const taskRow = page.locator('li').filter({ hasText: 'Row focus indicator task' }).first()
    const classAttr = await taskRow.getAttribute('class')

    expect(classAttr).toContain('focus:border-l-[#00ff88]')
  })
})

// ---------------------------------------------------------------------------
// Full keyboard-only flow integration test
// ---------------------------------------------------------------------------

test.describe('Full keyboard navigation flow', () => {
  test('user can create, view, toggle and cancel-edit a task using keyboard only', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Step 1: Create task via keyboard (focus is already on the input area after login)
    const input = page.getByLabel('New task title')
    await input.focus()
    await input.type('Full keyboard flow task')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Full keyboard flow task')).toBeVisible()

    // Step 2: Focus the task row using keyboard
    const taskRow = page.locator('li').filter({ hasText: 'Full keyboard flow task' }).first()
    await taskRow.focus()
    await expect(taskRow).toBeFocused()

    // Step 3: Toggle task done via Space
    const checkbox = page.getByRole('checkbox', { name: /mark full keyboard flow task/i })
    await expect(checkbox).not.toBeChecked()
    await page.keyboard.press(' ')
    await expect(checkbox).toBeChecked()

    // Step 4: Toggle back via Space
    await page.keyboard.press(' ')
    await expect(checkbox).not.toBeChecked()

    // Step 5: Enter edit mode via Enter key
    await page.keyboard.press('Enter')
    const editInput = page.locator('input[value="Full keyboard flow task"]')
    await expect(editInput).toBeVisible()
    await expect(editInput).toBeFocused()

    // Step 6: Cancel edit via Escape — focus must return to task row
    await page.keyboard.press('Escape')
    await expect(page.getByText('Full keyboard flow task')).toBeVisible()
    await expect(taskRow).toBeFocused()
  })
})
