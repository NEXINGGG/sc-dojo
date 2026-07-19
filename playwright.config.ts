import { defineConfig, devices } from '@playwright/test';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const host = '127.0.0.1';
const port = 4174;
const viteCliPath = fileURLToPath(new URL('./node_modules/vite/bin/vite.js', import.meta.url));
const usesExternalPreview = process.env.PLAYWRIGHT_EXTERNAL_PREVIEW === '1';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: `http://${host}:${port}`,
    launchOptions: {
      args: ['--enable-logging=stderr'],
      env: {
        ...process.env,
        CHROME_LOG_FILE: resolve(tmpdir(), 'nw-a1-dojo-chromium.log'),
      },
    },
    trace: 'retain-on-failure',
  },
  webServer: usesExternalPreview
    ? undefined
    : {
        command: `"${process.execPath}" "${viteCliPath}" preview --host ${host} --port ${port}`,
        url: `http://${host}:${port}`,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'iphone-13',
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
    {
      name: 'android-small',
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices['Galaxy S5'], browserName: 'chromium' },
    },
  ],
});
