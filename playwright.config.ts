import { defineConfig, devices } from "@playwright/test";

const webUrl = process.env.LEDGERBYTE_WEB_URL ?? "http://localhost:3000";
const workers = Number.parseInt(process.env.LEDGERBYTE_E2E_WORKERS ?? "1", 10);
const expectTimeout = Number.parseInt(process.env.LEDGERBYTE_E2E_EXPECT_TIMEOUT_MS ?? "30000", 10);
const testTimeout = Number.parseInt(process.env.LEDGERBYTE_E2E_TEST_TIMEOUT_MS ?? "90000", 10);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: Number.isFinite(testTimeout) && testTimeout > 0 ? testTimeout : 90000,
  expect: {
    timeout: Number.isFinite(expectTimeout) && expectTimeout > 0 ? expectTimeout : 30000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: Number.isFinite(workers) && workers > 0 ? workers : 1,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: webUrl,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
