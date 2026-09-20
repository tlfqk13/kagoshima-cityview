import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3117',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3117',
    url: 'http://127.0.0.1:3117',
    reuseExistingServer: !process.env.CI,
    env: { AUTH_SECRET: 'local-regression-test-only-not-a-production-secret', AUTH_URL: 'http://127.0.0.1:3117', NEXTAUTH_URL: 'http://127.0.0.1:3117' },
  },
})
