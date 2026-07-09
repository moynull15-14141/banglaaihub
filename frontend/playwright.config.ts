import { defineConfig, devices } from '@playwright/test';

// Phase 3A.1 — first real config for the pre-existing (but previously
// unconfigured) `test:e2e` script. Targets the real dev server, not a mock —
// `webServer` is intentionally omitted so this always runs against whatever
// backend + frontend the developer already has running (matches how this
// project's live verification has been done throughout Phase 3A/3A.1).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3002',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
