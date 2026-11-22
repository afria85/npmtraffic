import { defineConfig, devices } from "@playwright/test";

// Intentionally fixture-only. An environment URL must never redirect this suite to production.
export default defineConfig({
  testDir: "./qa",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  forbidOnly: Boolean(process.env.CI),
  outputDir: "./test-results/cloud-qa",
  reporter: [["line"], ["json", { outputFile: "./test-results/cloud-qa/report.json" }]],
  use: {
    baseURL: "https://localhost:3641",
    // The isolated loopback fixture generates its own temporary certificate.
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "webkit-iphone-emulated",
      testMatch: "mobile-functional.spec.ts",
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
    {
      name: "chromium-android-emulated",
      testMatch: "mobile-functional.spec.ts",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
    },
    {
      name: "macos-webkit-diagnostic",
      testMatch: "macos-webkit-diagnostic.spec.ts",
      use: { ...devices["Desktop Safari"], browserName: "webkit" },
    },
  ],
  webServer: {
    command: "node qa/fixture-server.mjs",
    url: "https://localhost:3641/status",
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
