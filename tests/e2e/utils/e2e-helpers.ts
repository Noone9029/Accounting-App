import { expect, test as base, type Page } from "@playwright/test";

export const e2eConfig = {
  webUrl: process.env.LEDGERBYTE_WEB_URL ?? "http://localhost:3000",
  apiUrl: (process.env.LEDGERBYTE_API_URL ?? "http://localhost:4000").replace(/\/$/, ""),
  email: process.env.LEDGERBYTE_E2E_EMAIL ?? "admin@example.com",
  password: process.env.LEDGERBYTE_E2E_PASSWORD ?? "Password123!",
};

export interface E2eSession {
  token: string;
  organizationId: string;
}

export const test = base.extend<{ criticalPageErrors: string[] }>({
  criticalPageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() !== "error") {
          return;
        }
        const text = message.text();
        if (isKnownNonCriticalConsoleError(text)) {
          return;
        }
        errors.push(text);
      });
      await use(errors);
      expect(errors, "No uncaught browser errors should occur during the smoke test.").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

function isKnownNonCriticalConsoleError(message: string) {
  return (
    message.includes("favicon.ico") ||
    message.includes("Failed to load resource: the server responded with a status of 404")
  );
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, session?: E2eSession): Promise<T> {
  const response = await fetch(`${e2eConfig.apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(session?.organizationId ? { "x-organization-id": session.organizationId } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const payload = text ? safeJson(text) : undefined;
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "message" in payload ? String(payload.message) : text;
    throw new Error(`${options.method ?? "GET"} ${path} failed with HTTP ${response.status}: ${message}`);
  }
  return payload as T;
}

export async function loginByApi(page: Page): Promise<E2eSession> {
  const login = await apiRequest<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: e2eConfig.email, password: e2eConfig.password }),
  });
  const me = await apiRequest<{
    memberships: Array<{ organizationId?: string; organization?: { id?: string }; status: string }>;
  }>("/auth/me", {}, { token: login.accessToken, organizationId: "" });
  const membership = me.memberships.find((item) => item.status === "ACTIVE") ?? me.memberships[0];
  if (!membership) {
    throw new Error("Seeded E2E user has no organization membership.");
  }
  const organizationId = membership.organizationId ?? membership.organization?.id;
  if (!organizationId) {
    throw new Error("Seeded E2E user membership does not include an organization id.");
  }
  const session = { token: login.accessToken, organizationId };
  await page.addInitScript(({ token, organizationId }) => {
    window.localStorage.setItem("ledgerbyte.accessToken", token);
    window.localStorage.setItem("ledgerbyte.activeOrganizationId", organizationId);
  }, session);
  return session;
}

export async function loginByUi(page: Page) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await page.getByLabel("Email").fill(e2eConfig.email);
  await page.getByLabel("Password").fill(e2eConfig.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function gotoApp(page: Page, path: string, heading?: string | RegExp) {
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("main")).toBeVisible();
  if (heading) {
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  } else {
    await expect(page.locator("main").getByRole("heading").first()).toBeVisible();
  }
}

export async function expectAppShell(page: Page) {
  await expect(page.getByText("LedgerByte").first()).toBeVisible();
  await expect(page.getByText("Organization").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reports", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sales", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Purchases", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Inventory", exact: true })).toBeVisible();
}

export function uniqueName(prefix: string) {
  return `${prefix} ${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
