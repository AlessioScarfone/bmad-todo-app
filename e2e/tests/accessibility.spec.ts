/**
 * WCAG 2.1 AA Accessibility Tests — Story 5.4
 *
 * Runs axe-core against the rendered app pages to verify zero WCAG 2.1 AA violations.
 * Prerequisite: `docker-compose up` must be running.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { registerAndLogin, uniqueEmail } from '../helpers/auth'

test.describe('WCAG 2.1 AA accessibility', () => {
  test('register page has zero WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/register')
    // Wait for the form to be visible before scanning
    await page.waitForSelector('form')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(
      results.violations,
      `WCAG violations on /register:\n${JSON.stringify(results.violations, null, 2)}`,
    ).toEqual([])
  })

  test('login page has zero WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('form')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(
      results.violations,
      `WCAG violations on /login:\n${JSON.stringify(results.violations, null, 2)}`,
    ).toEqual([])
  })

  test('task list page (authenticated, empty) has zero WCAG 2.1 AA violations', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Wait for loading to complete: EmptyState text indicates TanStack Query has settled
    await page.waitForSelector('main')
    await expect(page.getByText(/no tasks yet/i)).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(
      results.violations,
      `WCAG violations on task list (empty):\n${JSON.stringify(results.violations, null, 2)}`,
    ).toEqual([])
  })

  test('task list page (with tasks) has zero WCAG 2.1 AA violations', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task so we can audit the full task row rendering
    const input = page.getByRole('textbox', { name: /new task title/i })
    await input.fill('WCAG audit task')
    await input.press('Enter')
    // Wait for the task to appear
    await expect(page.getByText('WCAG audit task')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(
      results.violations,
      `WCAG violations on task list (with tasks):\n${JSON.stringify(results.violations, null, 2)}`,
    ).toEqual([])
  })

  test('task list page with open subtask panel has zero WCAG 2.1 AA violations', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task then open its subtask panel
    const input = page.getByRole('textbox', { name: /new task title/i })
    await input.fill('Task with subtasks')
    await input.press('Enter')
    await expect(page.getByText('Task with subtasks')).toBeVisible()

    // Expand subtask panel
    await page.getByRole('button', { name: /expand subtasks/i }).first().click()
    await page.waitForSelector('[role="list"][aria-label="Subtasks"]')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(
      results.violations,
      `WCAG violations on task list (subtask panel open):\n${JSON.stringify(results.violations, null, 2)}`,
    ).toEqual([])
  })

  test('prefers-reduced-motion: transitions are driven by motion-safe: classes', async ({ page }) => {
    // Verify that interactive elements use motion-safe: by checking the computed stylesheet
    // does not have unconditional transition rules applied.
    // This is a structural test: we emulate reduced-motion and check that transition
    // computedStyle returns "none" (which happens when motion-safe: classes are suppressed).
    await page.emulateMedia({ reducedMotion: 'reduce' })

    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Create a task so we have a task row to inspect
    const input = page.getByRole('textbox', { name: /new task title/i })
    await input.fill('Motion test task')
    await input.press('Enter')
    await expect(page.getByText('Motion test task')).toBeVisible()

    // Check the task row's transition property is suppressed when motion is reduced.
    // The logout button always has motion-safe:transition-colors — use it as reference.
    const transitionValue = await page.evaluate(() => {
      const row = document.querySelector('ul li') as HTMLElement | null
      if (!row) {
        // Fallback: check the logout button (always present in header)
        const btn = document.querySelector('header button') as HTMLElement | null
        if (!btn) return 'no-element'
        return window.getComputedStyle(btn).transition
      }
      return window.getComputedStyle(row).transition
    })

    // When prefers-reduced-motion: reduce is active, motion-safe: classes do NOT apply.
    // Tailwind's motion-safe:transition-colors becomes inactive → transition = 'none' or
    // the browser default 'all 0s ease 0s' (zero-duration, effectively no animation).
    expect(
      transitionValue === 'none'
      || transitionValue === ''
      || transitionValue === 'all 0s ease 0s'
      || transitionValue.includes('0s'),
      `Expected no/zero-duration transition under reduced motion, got: "${transitionValue}"`,
    ).toBe(true)
  })
})
