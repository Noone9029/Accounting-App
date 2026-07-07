import type { Page, Response } from "@playwright/test";
import { e2eConfig, expect, loginByBrowserApi, test } from "./utils/e2e-helpers";
import {
  cleanupBrowserTenantFixture,
  createBrowserTenantPrisma,
  seedBrowserTenantFixture,
  type BrowserTenantFixtureSet,
} from "./utils/tenant-isolation-browser-fixture";

type AccountantReportExportBrowserE2eSettings =
  | { enabled: false; databaseUrl?: undefined; proofRunId?: undefined }
  | { enabled: true; databaseUrl: string; proofRunId: string };

interface BrowserFetchResult {
  status: number;
  ok: boolean;
  contentType: string | null;
  body: unknown;
  text: string;
}

const settings = resolveAccountantReportExportBrowserE2eSettings(process.env);
const todayDate = new Date().toISOString().slice(0, 10);
const reportYear = new Date().getUTCFullYear();
const reportFrom = `${reportYear}-01-01`;
const reportTo = todayDate;
const dateRangeQuery = `from=${reportFrom}&to=${reportTo}`;
const asOfQuery = `asOf=${todayDate}`;

test.describe("accountant report/export browser E2E local guard", () => {
  test("skips safely when the opt-in environment variable is not set", () => {
    expect(resolveAccountantReportExportBrowserE2eSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
  });

  test("requires an explicit local test database URL when enabled", () => {
    expect(() =>
      resolveAccountantReportExportBrowserE2eSettings({
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E: "1",
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_PROOF_ID: "report-export-local-1",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E=1");
  });

  test("requires an explicit synthetic proof-run id when enabled", () => {
    expect(() =>
      resolveAccountantReportExportBrowserE2eSettings({
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_PROOF_ID is required");
  });

  test("rejects hosted or production-looking targets", () => {
    expect(() =>
      resolveAccountantReportExportBrowserE2eSettings({
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E: "1",
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_PROOF_ID: "report-export-local-1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@db.example.com/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("local-only");

    expect(() =>
      resolveAccountantReportExportBrowserE2eSettings({
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E: "1",
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_PROOF_ID: "report-export-local-1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting_prod?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("disposable local database name");

    expect(() =>
      resolveAccountantReportExportBrowserE2eSettings({
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E: "1",
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_PROOF_ID: "report-export-local-1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
        LEDGERBYTE_WEB_URL: "https://staging.example.com",
      } as NodeJS.ProcessEnv),
    ).toThrow("refuses non-local web/API URLs");
  });

  test("accepts explicit local URLs, local test DB, and proof-run id", () => {
    const databaseUrl = "postgresql://accounting:accounting@localhost:5432/accounting?schema=public";

    expect(
      resolveAccountantReportExportBrowserE2eSettings({
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E: "1",
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_PROOF_ID: "report-export-local-1",
        LEDGERBYTE_TEST_DATABASE_URL: databaseUrl,
        LEDGERBYTE_WEB_URL: "http://localhost:3000",
        LEDGERBYTE_API_URL: "http://localhost:4000",
      } as NodeJS.ProcessEnv),
    ).toEqual({ enabled: true, databaseUrl, proofRunId: "report-export-local-1" });
  });
});

test.describe("accountant report/export browser E2E proof", () => {
  test.skip(
    !settings.enabled,
    "Set LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E=1, LEDGERBYTE_TEST_DATABASE_URL, and LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_PROOF_ID to run this local-only browser proof.",
  );
  test.describe.configure({ timeout: 180_000 });

  let prisma: ReturnType<typeof createBrowserTenantPrisma> | undefined;
  let fixture: BrowserTenantFixtureSet | undefined;

  test.beforeAll(async () => {
    if (!settings.enabled) {
      return;
    }

    prisma = createBrowserTenantPrisma(settings);
    await prisma.$connect();
    fixture = await seedBrowserTenantFixture(prisma, `ARE-BROWSER-${settings.proofRunId}`);
  });

  test.afterAll(async () => {
    if (!prisma) {
      return;
    }
    await cleanupBrowserTenantFixture(prisma, fixture);
    await prisma.$disconnect();
  });

  test("proves accountant report/export/download browser paths are tenant-scoped", async ({ page, criticalPageErrors }) => {
    const fixtureSet = requireFixture(fixture);
    await loginAsTenantA(page, fixtureSet);
    await assertOrganizationContext(page, fixtureSet);

    await assertDashboardReportSummary(page, fixtureSet);
    await assertFinancialReportPages(page, fixtureSet);
    await assertPartyStatementPages(page, fixtureSet);
    await assertReportExportButtons(page, fixtureSet);
    await assertGeneratedDocumentBrowserDownload(page, fixtureSet);
    await assertDirectForeignUrlProbes(page, criticalPageErrors, fixtureSet);
  });
});

function resolveAccountantReportExportBrowserE2eSettings(env: NodeJS.ProcessEnv): AccountantReportExportBrowserE2eSettings {
  if (env.LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E !== "1") {
    return { enabled: false };
  }

  requireLocalHttpUrl(env.LEDGERBYTE_WEB_URL ?? "http://localhost:3000", "web");
  requireLocalHttpUrl(env.LEDGERBYTE_API_URL ?? "http://localhost:4000", "API");

  return {
    enabled: true,
    databaseUrl: requireLocalPostgresUrl(env.LEDGERBYTE_TEST_DATABASE_URL),
    proofRunId: requireProofRunId(env.LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_PROOF_ID),
  };
}

function requireLocalPostgresUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error(
      "LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E=1. Point it at disposable local Postgres.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be a valid Postgres URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Accountant report/export browser E2E requires a Postgres URL.");
  }

  if (!isLocalHost(url.hostname)) {
    throw new Error("Accountant report/export browser E2E is local-only and refuses non-local database hosts.");
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, "")).toLowerCase();
  if (!databaseName || /(prod|production|live|hosted|staging)/.test(databaseName) || !/(accounting|ledgerbyte|test|local)/.test(databaseName)) {
    throw new Error("Accountant report/export browser E2E requires a disposable local database name.");
  }

  return rawUrl;
}

function requireLocalHttpUrl(rawUrl: string, label: "web" | "API"): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`LEDGERBYTE_${label.toUpperCase()}_URL must be a valid URL.`);
  }

  if (!["http:", "https:"].includes(url.protocol) || !isLocalHost(url.hostname)) {
    throw new Error(`Accountant report/export browser E2E refuses non-local web/API URLs. Check LEDGERBYTE_${label.toUpperCase()}_URL.`);
  }

  return rawUrl;
}

function requireProofRunId(rawValue: string | undefined): string {
  const value = rawValue?.trim();
  if (!value) {
    throw new Error("LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_PROOF_ID is required when browser accountant report/export proof is enabled.");
  }
  if (!/^[A-Za-z0-9._-]{3,80}$/.test(value)) {
    throw new Error("LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_PROOF_ID must be 3-80 characters using letters, numbers, dot, underscore, or dash.");
  }
  return value;
}

function isLocalHost(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(hostname.toLowerCase());
}

function requireFixture(fixture: BrowserTenantFixtureSet | undefined): BrowserTenantFixtureSet {
  if (!fixture) {
    throw new Error("Accountant report/export browser fixture was not initialized.");
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
  await expectNoBrowserTokenStorage(page);
  return session;
}

async function assertOrganizationContext(page: Page, fixture: BrowserTenantFixtureSet) {
  await page.getByRole("button", { name: "Account menu" }).click();
  const accountDialog = page.getByRole("dialog", { name: "Account menu" });
  await expect(accountDialog.locator("select")).toHaveValue(fixture.tenantA.organizationId);
  await expect(accountDialog.locator("select")).toContainText(fixture.tenantA.organizationName);
  await expect(accountDialog.getByText(fixture.tenantB.organizationName)).toHaveCount(0);
  await expect(accountDialog.locator("select option")).toHaveCount(1);
  await page.keyboard.press("Escape");
}

async function assertDashboardReportSummary(page: Page, fixture: BrowserTenantFixtureSet) {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText(dashboardMoneyPattern(fixture.tenantA.reportAmount));
  await expect(page.locator("main")).not.toContainText(dashboardMoneyPattern(fixture.tenantB.reportAmount));
  await expectTenantBAbsentFromMain(page, fixture);
}

async function assertFinancialReportPages(page: Page, fixture: BrowserTenantFixtureSet) {
  await assertReportPage(page, "/reports/profit-and-loss", "Profit & Loss", fixture.tenantA.revenueAccountName, fixture);
  await assertReportPage(page, "/reports/trial-balance", "Trial Balance", fixture.tenantA.revenueAccountName, fixture);
  await assertReportPage(page, "/reports/general-ledger", "General Ledger", fixture.tenantA.journalNumber, fixture);
  await assertReportPage(page, "/reports/balance-sheet", "Balance Sheet", fixture.tenantA.organizationName, fixture, {
    expectedText: "Balanced",
  });
  await assertReportPage(page, "/reports/aged-receivables", "Aged Receivables", fixture.tenantA.invoiceNumber, fixture);
  await assertReportPage(page, "/reports/aged-payables", "Aged Payables", fixture.tenantA.billNumber, fixture);
}

async function assertReportPage(
  page: Page,
  path: string,
  heading: string,
  tenantMarker: string,
  fixture: BrowserTenantFixtureSet,
  options: { expectedText?: string } = {},
) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  await submitReportFilters(page, path);
  await expect(page.locator("main")).toContainText(tenantMarker);
  if (options.expectedText) {
    await expect(page.locator("main")).toContainText(options.expectedText);
  }
  await expect(page.getByRole("button", { name: /download csv/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /download pdf/i }).first()).toBeVisible();
  await expectTenantBAbsentFromMain(page, fixture);
}

async function assertPartyStatementPages(page: Page, fixture: BrowserTenantFixtureSet) {
  await page.goto(`/customers/${fixture.tenantA.customerId}`);
  await expect(page.getByRole("heading", { name: fixture.tenantA.customerName }).first()).toBeVisible();
  await expect(page.locator("main")).toContainText("Customer ledger visibility");
  await expectTenantBAbsentFromMain(page, fixture);

  await page.goto(`/customers/${fixture.tenantA.customerId}/statement`);
  await expect(page.getByRole("heading", { name: "Customer statement activity", exact: true })).toBeVisible();
  await page.getByLabel("From", { exact: true }).fill(reportFrom);
  await page.getByLabel("To", { exact: true }).fill(reportTo);
  await page.getByRole("button", { name: "Load customer statement", exact: true }).click();
  await expect(page.locator("main")).toContainText(fixture.tenantA.customerName);
  await expectTenantBAbsentFromMain(page, fixture);

  await page.goto(`/suppliers/${fixture.tenantA.supplierId}`);
  await expect(page.getByRole("heading", { name: fixture.tenantA.supplierName }).first()).toBeVisible();
  await expect(page.locator("main")).toContainText("Supplier ledger visibility");
  await expectTenantBAbsentFromMain(page, fixture);

  await page.goto(`/suppliers/${fixture.tenantA.supplierId}/statement`);
  await expect(page.getByRole("heading", { name: "Supplier statement activity", exact: true })).toBeVisible();
  await page.getByLabel("From", { exact: true }).fill(reportFrom);
  await page.getByLabel("To", { exact: true }).fill(reportTo);
  await page.getByRole("button", { name: "Load supplier statement", exact: true }).click();
  await expect(page.locator("main")).toContainText(fixture.tenantA.supplierName);
  await expectTenantBAbsentFromMain(page, fixture);
}

async function assertReportExportButtons(page: Page, fixture: BrowserTenantFixtureSet) {
  await page.goto("/reports/profit-and-loss");
  await expect(page.getByRole("heading", { name: "Profit & Loss", exact: true })).toBeVisible();
  await submitReportFilters(page, "/reports/profit-and-loss");
  await expect(page.locator("main")).toContainText(fixture.tenantA.revenueAccountName);

  const directCsv = await browserFetch(page, `/reports/profit-and-loss?${dateRangeQuery}&format=csv`, fixture.tenantA.organizationId);
  expectOk(directCsv, "/reports/profit-and-loss CSV tenant A direct fetch");
  expect(directCsv.contentType).toContain("text/csv");
  expect(directCsv.text).toContain(fixture.tenantA.revenueAccountName);
  expect(directCsv.text).not.toContain(fixture.tenantB.revenueAccountName);
  expect(directCsv.text).not.toContain(fixture.tenantB.reportAmount);

  const csvResponsePromise = waitForApiResponse(page, "/reports/profit-and-loss", "format=csv");
  await page.getByRole("button", { name: /download csv/i }).click();
  const csvResponse = await csvResponsePromise;
  expect(csvResponse.status()).toBe(200);
  expect(csvResponse.headers()["content-type"]).toContain("text/csv");

  const pdfResponsePromise = waitForApiResponse(page, "/reports/profit-and-loss/pdf");
  await page.getByRole("button", { name: /download pdf/i }).click();
  const pdfResponse = await pdfResponsePromise;
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
}

async function submitReportFilters(page: Page, path: string) {
  if (path.includes("balance-sheet") || path.includes("aged-")) {
    await page.getByLabel("As of", { exact: true }).fill(reportTo);
  } else {
    await page.getByLabel("From", { exact: true }).fill(reportFrom);
    await page.getByLabel("To", { exact: true }).fill(reportTo);
  }

  await page.getByRole("button", { name: /run report/i }).click();
}

async function assertGeneratedDocumentBrowserDownload(page: Page, fixture: BrowserTenantFixtureSet) {
  await page.goto("/documents");
  await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText(fixture.tenantA.invoiceNumber);
  await expectTenantBAbsentFromMain(page, fixture);

  const documentRow = page.locator("tr").filter({ hasText: fixture.tenantA.invoiceNumber });
  await expect(documentRow).toBeVisible();
  const downloadResponsePromise = waitForApiResponse(page, `/generated-documents/${fixture.tenantA.generatedDocumentId}/download`);
  await documentRow.getByRole("button", { name: /download archived pdf/i }).click();
  const downloadResponse = await downloadResponsePromise;
  expect(downloadResponse.status()).toBe(200);
  expect(downloadResponse.headers()["content-type"]).toContain("application/pdf");
}

async function assertDirectForeignUrlProbes(page: Page, criticalPageErrors: string[], fixture: BrowserTenantFixtureSet) {
  const expectedErrorsFromForeignInvoiceUrl = criticalPageErrors.length;
  await page.goto(`/sales/invoices/${fixture.tenantB.invoiceId}`);
  await expect(page.locator("main")).toContainText(/not found|HTTP 404|Unable to load/i);
  await expectTenantBAbsentFromMain(page, fixture);
  expect(criticalPageErrors.splice(expectedErrorsFromForeignInvoiceUrl)).toEqual([]);

  const expectedErrorsFromForeignBillUrl = criticalPageErrors.length;
  await page.goto(`/purchases/bills/${fixture.tenantB.billId}`);
  await expect(page.locator("main")).toContainText(/not found|HTTP 404|Unable to load/i);
  await expectTenantBAbsentFromMain(page, fixture);
  expect(criticalPageErrors.splice(expectedErrorsFromForeignBillUrl)).toEqual([]);

  const foreignReport = await browserContextFetch(page, `/reports/profit-and-loss?${dateRangeQuery}`, fixture.tenantB.organizationId);
  expect(foreignReport.status).toBe(403);
  expect(foreignReport.text).not.toContain(fixture.tenantB.revenueAccountName);

  for (const [label, path, forbiddenMarker] of [
    ["foreign sales invoice PDF data", `/sales-invoices/${fixture.tenantB.invoiceId}/pdf-data`, fixture.tenantB.invoiceNumber],
    ["foreign sales invoice PDF", `/sales-invoices/${fixture.tenantB.invoiceId}/pdf`, fixture.tenantB.invoiceNumber],
    ["foreign purchase bill PDF data", `/purchase-bills/${fixture.tenantB.billId}/pdf-data`, fixture.tenantB.billNumber],
    ["foreign purchase bill PDF", `/purchase-bills/${fixture.tenantB.billId}/pdf`, fixture.tenantB.billNumber],
    ["foreign generated document", `/generated-documents/${fixture.tenantB.generatedDocumentId}/download`, fixture.tenantB.invoiceNumber],
    ["foreign attachment", `/attachments/${fixture.tenantB.attachmentId}/download`, fixture.tenantB.invoiceNumber],
    ["foreign customer statement", `/contacts/${fixture.tenantB.customerId}/statement?${dateRangeQuery}`, fixture.tenantB.customerName],
    ["foreign supplier statement", `/contacts/${fixture.tenantB.supplierId}/supplier-statement?${dateRangeQuery}`, fixture.tenantB.supplierName],
  ] as const) {
    const response = await browserContextFetch(page, path, fixture.tenantA.organizationId);
    expect(response.status, `${label} should be hidden from tenant A context`).toBe(404);
    expect(response.text).not.toContain(forbiddenMarker);
  }

  const tenantAProfitAndLoss = await browserFetch(page, `/reports/profit-and-loss?${dateRangeQuery}`, fixture.tenantA.organizationId);
  expectOk(tenantAProfitAndLoss, "/reports/profit-and-loss tenant A recheck");
  expect(tenantAProfitAndLoss.text).toContain(fixture.tenantA.revenueAccountName);
  expect(tenantAProfitAndLoss.text).not.toContain(fixture.tenantB.revenueAccountName);

  const tenantAAging = await browserFetch(page, `/reports/aged-receivables?${asOfQuery}`, fixture.tenantA.organizationId);
  expectOk(tenantAAging, "/reports/aged-receivables tenant A recheck");
  expect(tenantAAging.text).toContain(fixture.tenantA.invoiceNumber);
  expect(tenantAAging.text).not.toContain(fixture.tenantB.invoiceNumber);
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

function waitForApiResponse(page: Page, pathFragment: string, queryFragment?: string): Promise<Response> {
  return page.waitForResponse((response) => {
    const url = response.url();
    return url.startsWith(e2eConfig.apiUrl) && url.includes(pathFragment) && (!queryFragment || url.includes(queryFragment));
  });
}

function expectOk(result: BrowserFetchResult, label: string) {
  expect(result.ok, `${label} returned HTTP ${result.status}: ${result.text.slice(0, 300)}`).toBe(true);
}

async function expectTenantBAbsentFromMain(page: Page, fixture: BrowserTenantFixtureSet) {
  const main = page.locator("main");
  await expect(main).not.toContainText(fixture.tenantB.organizationName);
  await expect(main).not.toContainText(fixture.tenantB.customerName);
  await expect(main).not.toContainText(fixture.tenantB.supplierName);
  await expect(main).not.toContainText(fixture.tenantB.invoiceNumber);
  await expect(main).not.toContainText(fixture.tenantB.billNumber);
  await expect(main).not.toContainText(fixture.tenantB.journalNumber);
  await expect(main).not.toContainText(fixture.tenantB.revenueAccountName);
  await expect(main).not.toContainText(fixture.tenantB.expenseAccountName);
  await expect(main).not.toContainText(fixture.tenantB.reportAmount);
}

function dashboardMoneyPattern(amount: string): RegExp {
  const formattedAmount = Number.parseFloat(amount).toFixed(2).replace(".", "\\.");
  return new RegExp(`SAR[\\s\\u00a0]*${formattedAmount}`);
}
