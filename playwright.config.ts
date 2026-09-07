import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:4321/PersonalWeb/', browserName: 'chromium', viewport: { width: 1440, height: 900 } },
  webServer: {
    command: 'node scripts/preview.mjs',
    stdout: 'pipe',
    stderr: 'pipe',
    url: 'http://127.0.0.1:4321/PersonalWeb/',
    reuseExistingServer: false,
  },
});
