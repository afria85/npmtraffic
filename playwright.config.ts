import { defineConfig } from '@playwright/test';

const previewUrl = process.env.PLAYWRIGHT_BASE_URL;
const localUrl = 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './smoke',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: previewUrl ?? localUrl, browserName: 'chromium', launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : undefined },
  webServer: previewUrl ? undefined : { command: 'node --import ./smoke/upstream-fixture.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1', url: localUrl, env: { NEXT_PUBLIC_PROJECT_GITHUB: 'https://github.com/afria85/npmtraffic.git' }, reuseExistingServer: !process.env.CI, timeout: 60000 },
});
