import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:4321/PersonalWeb/', browserName: 'chromium', viewport: { width: 1440, height: 900 } },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1',
    // Keep Astro 7 in the foreground so Playwright owns the server lifecycle.
    env: { ASTRO_PREVIEW_BACKGROUND: '1' },
    url: 'http://127.0.0.1:4321/PersonalWeb/',
    reuseExistingServer: false,
  },
});
