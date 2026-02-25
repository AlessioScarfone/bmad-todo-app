import { test, expect } from '@playwright/test'
import { uniqueEmail, TEST_PASSWORD, registerAndLogin, logout } from '../helpers/auth'

/**
 * E2E tests for Epic 1 — Authentication flows.
 *
 * Covers: registration, login, session continuity, email pre-fill, logout.
 *
 * Stories implemented: 1.2, 1.3, 1.4 (all status: done)
 */

test.describe('Registration', () => {
  test('new user registers and lands on the task list', async ({ page }) => {
    const email = uniqueEmail()

    await page.goto('/register')

    // The register page heading is rendered as pixel font text "CREATE ACCOUNT"
    await expect(page.getByRole('heading')).toContainText('CREATE ACCOUNT')

    await page.locator('#email').fill(email)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /create account/i }).click()

    // After registration the user is redirected directly to the task list (AC1)
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('banner')).toContainText('BMAD:TODO')
  })

  test('shows inline error when email is empty', async ({ page }) => {
    await page.goto('/register')

    await page.getByRole('button', { name: /create account/i }).click()

    // No API call should fire — client-side validation shows inline errors (AC3)
    await expect(page.locator('#email-error')).toContainText('Email is required')
  })

  test('shows inline error when password is too short', async ({ page }) => {
    await page.goto('/register')

    await page.locator('#email').fill('valid@example.com')
    await page.locator('#password').fill('short')
    await page.getByRole('button', { name: /create account/i }).click()

    await expect(page.locator('#password-error')).toContainText('at least 8 characters')
  })

  test('shows server error for duplicate email', async ({ page }) => {
    const email = uniqueEmail()

    // First registration
    await registerAndLogin(page, email)
    await logout(page)

    // Attempt second registration with the same email
    await page.goto('/register')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /create account/i }).click()

    // Server returns 409 — inline error shown, user stays on /register (AC2)
    await expect(page.getByText(/already exists/i)).toBeVisible()
    await expect(page).toHaveURL('/register')
  })

  test('unauthenticated user navigating to / is redirected to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Login', () => {
  test('user logs in with valid credentials', async ({ page }) => {
    const email = uniqueEmail()

    // Create account first, then explicitly logout to test login flow
    await registerAndLogin(page, email)
    await logout(page)

    // Login
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /log in/i }).click()

    await expect(page).toHaveURL('/')
    // Header shows user email (aria-label = "Logged in as <email>")
    await expect(page.getByLabel(`Logged in as ${email}`)).toBeVisible()
  })

  test('shows validation errors when both fields are empty', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('button', { name: /log in/i }).click()

    await expect(page.locator('#email-error')).toContainText('Email is required')
    await expect(page.locator('#password-error')).toContainText('Password is required')
  })

  test('shows server error for wrong credentials', async ({ page }) => {
    await page.goto('/login')

    await page.locator('#email').fill('nobody@example.com')
    await page.locator('#password').fill('wrongpassword')
    await page.getByRole('button', { name: /log in/i }).click()

    // Same message regardless of which field is wrong (security requirement)
    await expect(page.getByRole('alert')).toContainText('Invalid email or password')
    await expect(page).toHaveURL('/login')
  })

  test('already-authenticated user visiting /login is redirected to /', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Manually navigate to /login while authenticated
    await page.goto('/login')

    // LoginPage has: if (user) return <Navigate to="/" replace />
    await expect(page).toHaveURL('/')
  })
})

test.describe('Session continuity', () => {
  test('session persists after page reload (long-lived JWT cookie)', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    // Reload — JWT cookie carries the session; user stays authenticated (Story 1.3)
    await page.reload()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('banner')).toContainText('BMAD:TODO')
  })
})

test.describe('Email pre-fill', () => {
  test('login page pre-fills email from localStorage after manual set', async ({ page }) => {
    const email = uniqueEmail()

    // Navigate to login page first (unauthenticated context)
    await page.goto('/login')

    // Simulate what happens after a successful login: saveEmail() writes the key
    await page.evaluate(
      ([key, val]) => localStorage.setItem(key, val),
      ['bmad_todo_email', email],
    )

    // Reload the login page — LoginPage reads localStorage on mount (AC2)
    await page.reload()

    // Email field should be pre-filled (Story 1.4 AC2)
    await expect(page.locator('#email')).toHaveValue(email)
    // Password field must still be empty
    await expect(page.locator('#password')).toHaveValue('')
  })

  test('email is saved to localStorage after successful login', async ({ page }) => {
    const email = uniqueEmail()

    // Create account first
    await registerAndLogin(page, email)
    await logout(page)

    // Perform login
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /log in/i }).click()
    await expect(page).toHaveURL('/')

    // Verify localStorage mutation happened (Story 1.4 AC1)
    const stored = await page.evaluate(() => localStorage.getItem('bmad_todo_email'))
    expect(stored).toBe(email)
  })
})

test.describe('Logout', () => {
  test('logout redirects to /login', async ({ page }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)

    await page.getByRole('button', { name: /log out/i }).click()

    await expect(page).toHaveURL('/login')
  })

  test('logout clears email from localStorage', async ({ page }) => {
    const email = uniqueEmail()

    // Manually set the email in localStorage (simulates post-login state)
    await page.goto('/login')
    await page.evaluate(
      ([key, val]) => localStorage.setItem(key, val),
      ['bmad_todo_email', email],
    )

    // Register and login so we have an authenticated session to log out from
    await registerAndLogin(page, email)

    // Set the email again since registerAndLogin navigates through /register
    // which doesn't call saveEmail() — we simulate post-login localStorage state
    await page.evaluate(
      ([key, val]) => localStorage.setItem(key, val),
      ['bmad_todo_email', email],
    )

    await page.getByRole('button', { name: /log out/i }).click()
    await expect(page).toHaveURL('/login')

    // AC3: clearSavedEmail() must have removed the localStorage key
    const stored = await page.evaluate(() => localStorage.getItem('bmad_todo_email'))
    expect(stored).toBeNull()
  })

  test('after logout the user cannot access the task list without re-authenticating', async ({
    page,
  }) => {
    const email = uniqueEmail()
    await registerAndLogin(page, email)
    await logout(page)

    // Attempt to navigate to the protected route
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })
})
