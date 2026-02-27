/**
 * Screenshot capture script.
 *
 * Not part of the regular test suite — run explicitly with:
 *   npx playwright test --config playwright.screenshots.config.ts
 *
 * Saves PNG files to ../screenshots/ (project root).
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import { uniqueEmail, registerAndLogin } from '../helpers/auth'

const OUT = path.resolve(__dirname, '../../screenshots')

// Helper: full‑page screenshot with a consistent viewport
async function shot(page: import('@playwright/test').Page, filename: string) {
  await page.screenshot({ path: path.join(OUT, filename), fullPage: true })
}

test('capture — login page', async ({ page }) => {
  await page.goto('/login')
  // Wait for the heading to be visible
  await page.waitForSelector('h1')
  await shot(page, '01-login.png')
})

test('capture — register page', async ({ page }) => {
  await page.goto('/register')
  await page.waitForSelector('h1')
  await shot(page, '02-register.png')
})

test('capture — task list empty state', async ({ page }) => {
  const email = uniqueEmail()
  await registerAndLogin(page, email)
  await page.waitForSelector('[aria-label="New task title"]')
  await shot(page, '03-task-list-empty.png')
})

test('capture — task list with tasks', async ({ page }) => {
  const email = uniqueEmail()
  await registerAndLogin(page, email)

  const input = page.getByLabel('New task title')

  // Create several tasks
  for (const title of [
    'Set up the project',
    'Write unit tests',
    'Review pull request',
    'Deploy to staging',
    'Update documentation',
  ]) {
    await input.fill(title)
    await input.press('Enter')
    await page.waitForTimeout(300)
  }

  // Wait for tasks to appear
  await page.getByRole('list', { name: 'Task list' }).waitFor()
  await shot(page, '04-task-list-with-tasks.png')
})

test('capture — mixed task list (completed + active with label and deadline)', async ({ page }) => {
  const email = uniqueEmail()
  await registerAndLogin(page, email)

  const input = page.getByPlaceholder(/add a task/i)

  // Create 4 tasks
  for (const title of [
    'Set up CI pipeline',
    'Write release notes',
    'Fix login bug',
    'Improve dashboard layout',
  ]) {
    await input.fill(title)
    await input.press('Enter')
    await page.waitForTimeout(300)
  }

  const taskList = page.getByRole('list', { name: 'Task list' })
  await taskList.waitFor()
  const checkboxes = taskList.getByRole('checkbox')

  // Mark the first two tasks as complete
  await checkboxes.nth(0).click()
  await page.waitForTimeout(300)
  await checkboxes.nth(1).click()
  await page.waitForTimeout(300)

  // Add a label to the third task
  await page.getByRole('button', { name: /add label/i }).first().click()
  await page.getByRole('combobox', { name: 'Add label' }).fill('Bug')
  await page.getByRole('combobox', { name: 'Add label' }).press('Enter')
  await expect(page.getByLabel('Label: Bug', { exact: true })).toBeVisible()

  // Set a deadline on the third task ("Fix login bug")
  await page.getByRole('button', { name: 'Set deadline for Fix login bug' }).click()
  await page.getByRole('textbox', { name: 'Set deadline for Fix login bug' }).fill('2026-03-20')
  await page.waitForTimeout(300)

  // Add a label to the fourth task ("Improve dashboard layout")
  await page.getByRole('button', { name: /add label/i }).last().click()
  await page.getByRole('combobox', { name: 'Add label' }).fill('Feature')
  await page.getByRole('combobox', { name: 'Add label' }).press('Enter')
  await expect(page.getByLabel('Label: Feature', { exact: true })).toBeVisible()

  // Set a deadline on the fourth task
  await page.getByRole('button', { name: 'Set deadline for Improve dashboard layout' }).click()
  await page.getByRole('textbox', { name: 'Set deadline for Improve dashboard layout' }).fill('2026-04-01')
  await page.waitForTimeout(300)

  await page.waitForTimeout(400)
  await shot(page, '05-mixed-task-list.png')
})
