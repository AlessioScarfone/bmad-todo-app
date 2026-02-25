import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration.
 *
 * Prerequisites: `docker-compose up` must be running before executing tests.
 * The stack exposes the frontend at http://localhost:3000 and the API at
 * http://localhost:3001 (proxied through nginx at /api/*).
 *
 * Architecture ref: ADR-005 — Testing Stack
 */
export default defineConfig({
  testDir: './tests',

  // Run all test files serially so DB state is predictable across suites.
  // Each test uses a unique email to avoid cross-test collisions.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    // All tests target the nginx-served frontend (port 3000 per docker-compose.yml)
    baseURL: 'http://localhost:3000',

    // Capture trace on first retry to help debug CI failures
    trace: 'on-first-retry',

    // Short action timeout — the app targets sub-1s UI feedback (NFR)
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
