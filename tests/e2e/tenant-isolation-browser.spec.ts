import type { Page } from "@playwright/test";
import { e2eConfig, expect, loginByBrowserApi, test } from "./utils/e2e-helpers";
import {
  cleanupBrowserTenantFixture,
  createBrowserTenantPrisma,
  resolveBrowserTenantE2eSettings,
  seedBrowserTenantFixture,
  type BrowserTenantFixtureSet,
} from "./utils/tenant-isolation-browser-fixture";

interface BrowserFetchResult {
  status: number;
  ok: boolean;
  contentType: string | null;
  body: unknown;
  text: string;
}

const settings = resolveBrowserTenantE2eSettings(process.env);

test.describe("tenant isolation: browser E2E organization switching", () => {
  test.skip(!settings.enabled, "Set LEDGERBYTE_BROWSER_TENANT_E2E=1 and LEDGERBYTE_TEST_DATABASE_URL to run this local-only browser tenant proof.");

  const dateRangeQuery = "from=2026-01-01&to=2026-12-31";
  let prisma: ReturnType<typeof createBrowserTenantPrisma> | undefined;
  let fixture: BrowserTenantFixtureSet | undefined;

  test.beforeAll(async () => {
    prisma = createBrowserTenantPrisma(settings);
    await prisma.$connect();
    fixture = await seedBrowserTenantFixture(prisma);
  });

  test.afterAll(async () => {
    if (!prisma) {
      return;
    }
    await cleanupBrowserTenantFixture(prisma, fixture);
    await prisma?.$disconnect();
  });

  test("corrects an invalid stored organization and does not expose the foreign org in the switcher", async ({ page }) => {
    const fixtureSet = requireFixture(fixture);
    await loginAsTenantA(page, fixtureSet);
    await expectNoBrowserTokenStorage(page);

    await page.evaluate((foreignOrganizationId) => {
      window.localStorage.setItem("ledgerbyte.activeOrganizationId", foreignOrganizationId);
    }, fixtureSet.tenantB.organizationId);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();

    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("ledgerbyte.activeOrganizationId")))
      .toBe(fixtureSet.tenantA.organizationId);

    await page.getByRole("button", { name: "Account menu" }).click();
    const accountDialog = page.getByRole("dialog", { name: "Account menu" });
    await expect(accountDialog.locator("select")).toHaveValue(fixtureSet.tenantA.organizationId);
    await expect(accountDialog.locator("select")).toContainText(fixtureSet.tenantA.organizationName);
    await expect(accountDialog.getByText(fixtureSet.tenantB.organizationName)).toHaveCount(0);
    await expect(accountDialog.locator("select option")).toHaveCount(1);

    const foreignDashboard = await browserContextFetch(page, "/dashboard/summary", fixtureSet.tenantB.organizationId);
    expect(foreignDashboard.status).toBe(403);
    expect(JSON.stringify(foreignDashboard.body)).not.toContain(fixtureSet.tenantB.customerName);
  });

  test("keeps customer lists, dashboard totals, search, settings, and customer detail URLs scoped to tenant A", async ({ page }) => {
    const fixtureSet = requireFixture(fixture);
    await loginAsTenantA(page, fixtureSet);

    const dashboard = await browserFetch(page, "/dashboard/summary", fixtureSet.tenantA.organizationId);
    expectOk(dashboard, "/dashboard/summary");
    const dashboardBody = asRecord(dashboard.body);
    expect(asRecord(dashboardBody.sales).unpaidInvoiceBalance).toBe(fixtureSet.tenantA.reportAmount);
    expect(JSON.stringify(dashboardBody)).not.toContain(fixtureSet.tenantB.reportAmount);
    expect(JSON.stringify(dashboardBody)).not.toContain(fixtureSet.tenantB.customerName);

    await page.goto("/customers");
    await expect(page.getByRole("heading", { name: "Customers", exact: true })).toBeVisible();
    await expect(page.getByText(fixtureSet.tenantA.customerName)).toBeVisible();
    await expect(page.locator("main")).not.toContainText(fixtureSet.tenantB.customerName);

    const foreignSearch = await browserFetch(
      page,
      `/search?query=${encodeURIComponent(fixtureSet.tenantB.customerName)}`,
      fixtureSet.tenantA.organizationId,
    );
    expectOk(foreignSearch, "/search");
    expect(asArray(asRecord(foreignSearch.body).results)).toHaveLength(0);

    const searchInput = page.getByPlaceholder("Search transactions, contacts, reports, and pages");
    const foreignSearchResponse = page.waitForResponse((response) => response.url().includes("/search?") && response.status() === 200);
    await searchInput.fill(fixtureSet.tenantB.customerName);
    await foreignSearchResponse;
    const listbox = page.getByRole("listbox", { name: "Global search results" });
    await expect(listbox.getByRole("option").filter({ hasText: fixtureSet.tenantB.customerName })).toHaveCount(0);

    const tenantSearchResponse = page.waitForResponse((response) => response.url().includes("/search?") && response.status() === 200);
    await searchInput.fill(fixtureSet.tenantA.customerName);
    await tenantSearchResponse;
    await expect(listbox.getByRole("option").filter({ hasText: fixtureSet.tenantA.customerName }).first()).toBeVisible();
    await expect(listbox.getByText(fixtureSet.tenantB.customerName)).toHaveCount(0);

    await page.goto("/settings/team");
    await expect(page.getByRole("heading", { name: "Team members" })).toBeVisible();
    await expect(page.getByText(fixtureSet.tenantA.userEmail)).toBeVisible();
    await expect(page.locator("main")).not.toContainText(fixtureSet.tenantB.userEmail);

    await page.goto(`/customers/${fixtureSet.tenantA.customerId}`);
    await expect(page.getByRole("heading", { name: fixtureSet.tenantA.customerName }).first()).toBeVisible();
    await expect(page.locator("main")).not.toContainText(fixtureSet.tenantB.customerName);

    const foreignCustomerDetail = await browserContextFetch(page, `/contacts/customers/${fixtureSet.tenantB.customerId}`, fixtureSet.tenantA.organizationId);
    expect(foreignCustomerDetail.status).toBe(404);
    expect(JSON.stringify(foreignCustomerDetail.body)).not.toContain(fixtureSet.tenantB.customerName);
  });

  test("keeps reports, exports, and downloads scoped to tenant A", async ({ page }) => {
    const fixtureSet = requireFixture(fixture);
    await loginAsTenantA(page, fixtureSet);

    const report = await browserFetch(page, `/reports/profit-and-loss?${dateRangeQuery}`, fixtureSet.tenantA.organizationId);
    expectOk(report, "/reports/profit-and-loss");
    expect(JSON.stringify(report.body)).toContain(fixtureSet.tenantA.revenueAccountName);
    expect(JSON.stringify(report.body)).toContain(fixtureSet.tenantA.reportAmount);
    expect(JSON.stringify(report.body)).not.toContain(fixtureSet.tenantB.revenueAccountName);
    expect(JSON.stringify(report.body)).not.toContain(fixtureSet.tenantB.reportAmount);

    const csv = await browserFetch(page, `/reports/profit-and-loss?${dateRangeQuery}&format=csv`, fixtureSet.tenantA.organizationId);
    expectOk(csv, "/reports/profit-and-loss?format=csv");
    expect(csv.contentType).toContain("text/csv");
    expect(csv.text).toContain(fixtureSet.tenantA.revenueAccountName);
    expect(csv.text).not.toContain(fixtureSet.tenantB.revenueAccountName);
    expect(csv.text).not.toContain(fixtureSet.tenantB.reportAmount);

    const pdf = await browserFetch(page, `/reports/profit-and-loss/pdf?${dateRangeQuery}`, fixtureSet.tenantA.organizationId);
    expectOk(pdf, "/reports/profit-and-loss/pdf");
    expect(pdf.contentType).toContain("application/pdf");

    const foreignReport = await browserContextFetch(page, `/reports/profit-and-loss?${dateRangeQuery}`, fixtureSet.tenantB.organizationId);
    expect(foreignReport.status).toBe(403);

    const generatedDocuments = await browserFetch(page, "/generated-documents", fixtureSet.tenantA.organizationId);
    expectOk(generatedDocuments, "/generated-documents");
    expect(JSON.stringify(generatedDocuments.body)).toContain(fixtureSet.tenantA.generatedDocumentId);
    expect(JSON.stringify(generatedDocuments.body)).not.toContain(fixtureSet.tenantB.generatedDocumentId);

    const foreignGeneratedDocument = await browserContextFetch(
      page,
      `/generated-documents/${fixtureSet.tenantB.generatedDocumentId}/download`,
      fixtureSet.tenantA.organizationId,
    );
    expect(foreignGeneratedDocument.status).toBe(404);

    const foreignAttachment = await browserContextFetch(page, `/attachments/${fixtureSet.tenantB.attachmentId}/download`, fixtureSet.tenantA.organizationId);
    expect(foreignAttachment.status).toBe(404);
  });
});

function requireFixture(fixture: BrowserTenantFixtureSet | undefined): BrowserTenantFixtureSet {
  if (!fixture) {
    throw new Error("Browser tenant fixture was not initialized.");
  }
  return fixture;
}

async function loginAsTenantA(page: Page, fixture: BrowserTenantFixtureSet) {
  const session = await loginByBrowserApi(page, {
    email: fixture.tenantA.userEmail,
    password: fixture.password,
    organizationId: fixture.tenantA.organizationId,
  });
  expect(session.organizationId).toBe(fixture.tenantA.organizationId);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(fixture.tenantB.customerName);
  return session;
}

async function expectNoBrowserTokenStorage(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        current: window.localStorage.getItem("ledgerbyte.accessToken"),
        legacy: window.localStorage.getItem("accessToken"),
      })),
    )
    .toEqual({ current: null, legacy: null });
}

async function browserFetch(page: Page, path: string, organizationId: string | null): Promise<BrowserFetchResult> {
  return page.evaluate(
    async ({ apiUrl, organizationId, path }) => {
      const headers: Record<string, string> = {
        "cache-control": "no-store",
        pragma: "no-cache",
      };
      if (organizationId) {
        headers["x-organization-id"] = organizationId;
      }

      const response = await fetch(`${apiUrl}${path}`, {
        credentials: "include",
        headers,
      });
      const text = await response.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }

      return {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
        body,
        text,
      };
    },
    { apiUrl: e2eConfig.apiUrl, organizationId, path },
  );
}

async function browserContextFetch(page: Page, path: string, organizationId: string | null): Promise<BrowserFetchResult> {
  const response = await page.context().request.get(`${e2eConfig.apiUrl}${path}`, {
    headers: organizationId ? { "x-organization-id": organizationId } : undefined,
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  return {
    status: response.status(),
    ok: response.ok(),
    contentType: response.headers()["content-type"] ?? null,
    body,
    text,
  };
}

function expectOk(result: BrowserFetchResult, label: string) {
  expect(result.ok, `${label} returned HTTP ${result.status}: ${result.text.slice(0, 300)}`).toBe(true);
}

function asRecord(value: unknown): Record<string, unknown> {
  expect(typeof value).toBe("object");
  expect(value).not.toBeNull();
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  expect(Array.isArray(value)).toBe(true);
  return value as unknown[];
}
