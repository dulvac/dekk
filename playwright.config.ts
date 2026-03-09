import { defineConfig } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: isCI ? 'npx vite preview --port 5173 --base /dekk/' : 'npm run dev',
      url: isCI ? 'http://localhost:5173/dekk/' : 'http://localhost:5173',
      reuseExistingServer: !isCI,
    },
    {
      command: 'node bin/dekk.js --port 3333 --no-open ./test-fixtures/presentations/',
      url: 'http://127.0.0.1:3333',
      reuseExistingServer: false,
    },
  ],
  projects: [
    {
      name: 'chromium',
      testDir: './e2e',
      testIgnore: '**/cli/**',
      use: {
        browserName: 'chromium',
        baseURL: isCI ? 'http://localhost:5173/dekk/' : 'http://localhost:5173',
      },
    },
    {
      name: 'cli',
      testDir: './e2e/cli',
      use: {
        browserName: 'chromium',
        baseURL: 'http://127.0.0.1:3333',
      },
    },
  ],
})
