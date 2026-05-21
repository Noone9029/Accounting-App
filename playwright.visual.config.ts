import { defineConfig, devices } from "@playwright/test";

const webUrl = process.env.LEDGERBYTE_VISUAL_WEB_URL ?? "http://127.0.0.1:3030";
const visualApiUrl = process.env.LEDGERBYTE_VISUAL_API_URL ?? "http://127.0.0.1:4999";

process.env.NEXT_PUBLIC_API_URL = visualApiUrl;

export default defineConfig({
  testDir: "./tests/visual",
  timeout: 120000,
  expect: {
    timeout: 30000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    },
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: webUrl,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "corepack pnpm --filter @ledgerbyte/web exec next dev --hostname 127.0.0.1 --port 3030",
    url: webUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
