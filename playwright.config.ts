import { defineConfig } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: isCI ? 'http://localhost:5173/dekk/' : 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: isCI ? 'npx vite preview --port 5173 --base /dekk/' : 'npm run dev',
    url: isCI ? 'http://localhost:5173/dekk/' : 'http://localhost:5173',
    reuseExistingServer: !isCI,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
