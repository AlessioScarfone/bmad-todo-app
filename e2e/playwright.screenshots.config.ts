import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for the screenshot capture script only.
 *
 * Usage:
 *   npx playwright test --config playwright.screenshots.config.ts
 */
export default defineConfig({
  testDir: './scripts',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],

  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
