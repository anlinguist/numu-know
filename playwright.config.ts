import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    // Serves the production build; run `npm run build` first.
    command: `npx next start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
