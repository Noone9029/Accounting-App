import type { FullConfig } from "@playwright/test";

const DEFAULT_WEB_URL = "http://localhost:3000";
const DEFAULT_API_URL = "http://localhost:4000";

async function assertReachable(label: string, url: string) {
  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok && response.status >= 500) {
      return `${label} returned HTTP ${response.status} at ${url}`;
    }
    return "";
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return `${label} is not reachable at ${url}: ${message}`;
  }
}

export default async function globalSetup(_config: FullConfig) {
  const webUrl = process.env.LEDGERBYTE_WEB_URL ?? DEFAULT_WEB_URL;
  const apiUrl = process.env.LEDGERBYTE_API_URL ?? DEFAULT_API_URL;
  const email = process.env.LEDGERBYTE_E2E_EMAIL ?? "admin@example.com";
  const password = process.env.LEDGERBYTE_E2E_PASSWORD ?? "Password123!";

  const failures = [
    await assertReachable("API health", `${apiUrl.replace(/\/$/, "")}/health`),
    await assertReachable("Web app", webUrl),
    email ? "" : "LEDGERBYTE_E2E_EMAIL is required.",
    password ? "" : "LEDGERBYTE_E2E_PASSWORD is required.",
  ].filter(Boolean);

  if (failures.length > 0) {
    throw new Error(
      [
        "Start local API/web before running E2E.",
        `Expected API: ${apiUrl}`,
        `Expected web: ${webUrl}`,
        ...failures,
      ].join("\n"),
    );
  }
}
