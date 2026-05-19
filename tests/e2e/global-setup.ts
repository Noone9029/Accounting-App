import type { FullConfig } from "@playwright/test";
import { seedDemoWorkflows } from "../../apps/api/scripts/seed-demo-workflows";
import { e2eConfig, isLocalApiUrl } from "./utils/e2e-config";

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
  const webUrl = e2eConfig.webUrl;
  const apiUrl = e2eConfig.apiUrl;
  const email = e2eConfig.email;
  const password = e2eConfig.password;
  const seedWorkflows =
    process.env.LEDGERBYTE_E2E_SEED_WORKFLOWS === undefined
      ? isLocalApiUrl(apiUrl)
      : process.env.LEDGERBYTE_E2E_SEED_WORKFLOWS !== "false";

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

  if (seedWorkflows) {
    await seedDemoWorkflows({ apiUrl, email, password });
  }
}
