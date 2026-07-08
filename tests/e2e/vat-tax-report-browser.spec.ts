import type { Page, Response } from "@playwright/test";
import { AccountType, ContactType, JournalEntryStatus, MembershipStatus, PrismaClient, PurchaseBillStatus, SalesInvoiceStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { PERMISSIONS } from "../../packages/shared/src/permissions";
import { e2eConfig, expect, loginByBrowserApi, test } from "./utils/e2e-helpers";

type VatBrowserE2eSettings =
  | { enabled: false; databaseUrl?: undefined; proofRunId?: undefined }
  | { enabled: true; databaseUrl: string; proofRunId: string };

interface BrowserFetchResult {
  status: number;
  ok: boolean;
  contentType: string | null;
  body: unknown;
  text: string;
}

interface VatBrowserFixtureSet {
  marker: string;
  fixtureCredential: string;
  tenantA: VatBrowserTenantFixture;
  tenantB: VatBrowserTenantFixture;
}

interface VatBrowserTenantFixture {
  organizationId: string;
  organizationName: string;
  userId: string;
  userEmail: string;
  userName: string;
  roleId: string;
  memberId: string;
  customerId: string;
  supplierId: string;
  customerName: string;
  supplierName: string;
  accounts: {
    cash: string;
    vatPayable: string;
    vatReceivable: string;
    revenue: string;
    expense: string;
  };
  invoiceStartNumber: string;
  invoiceEndNumber: string;
  outsideInvoiceNumber: string;
  draftInvoiceNumber: string;
  billNumber: string;
  outsideBillNumber: string;
  voidBillNumber: string;
  expected: {
    salesTaxable: string;
    outputVat: string;
    salesGross: string;
    purchaseTaxable: string;
    inputVat: string;
    purchaseGross: string;
    netVat: string;
    netVatPayable: string;
    netVatRefundable: string;
  };
}

const settings = resolveVatTaxReportBrowserE2eSettings(process.env);
const PROOF_PREFIX = "LB-VAT-BROWSER-PROOF";
const PROOF_FROM = "2026-04-01";
const PROOF_TO = "2026-04-30";
const PROOF_TO_BEFORE_PERIOD_END = "2026-04-29";

test.describe("VAT/tax report browser E2E local guard", () => {
  test("skips safely when the opt-in environment variable is not set", () => {
    expect(resolveVatTaxReportBrowserE2eSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
  });

  test("requires an explicit local test database URL when enabled", () => {
    expect(() =>
      resolveVatTaxReportBrowserE2eSettings({
        LEDGERBYTE_VAT_TAX_REPORT_BROWSER_E2E: "1",
        LEDGERBYTE_VAT_TAX_REPORT_BROWSER_PROOF_ID: "vat-browser-local-1",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_VAT_TAX_REPORT_BROWSER_E2E=1");
  });

  test("requires an explicit synthetic proof-run id when enabled", () => {
    expect(() =>
      resolveVatTaxReportBrowserE2eSettings({
        LEDGERBYTE_VAT_TAX_REPORT_BROWSER_E2E: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_VAT_TAX_REPORT_BROWSER_PROOF_ID is required");
  });

  test("rejects hosted or production-looking targets", () => {
    expect(() =>
      resolveVatTaxReportBrowserE2eSettings({
        LEDGERBYTE_VAT_TAX_REPORT_BROWSER_E2E: "1",
        LEDGERBYTE_VAT_TAX_REPORT_BROWSER_PROOF_ID: "vat-browser-local-1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@db.example.com/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("local-only");

    expect(() =>
      resolveVatTaxReportBrowserE2eSettings({
        LEDGERBYTE_VAT_TAX_REPORT_BROWSER_E2E: "1",
        LEDGERBYTE_VAT_TAX_REPORT_BROWSER_PROOF_ID: "vat-browser-local-1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting_prod?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("disposable local database name");

    expect(() =>
      resolveVatTaxReportBrowserE2eSettings({
        LEDGERBYTE_VAT_TAX_REPORT_BROWSER_E2E: "1",
        LEDGERBYTE_VAT_TAX_REPORT_BROWSER_PROOF_ID: "vat-browser-local-1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
        LEDGERBYTE_WEB_URL: "https://staging.example.com",
      } as NodeJS.ProcessEnv),
    ).toThrow("refuses non-local web/API URLs");
  });

  test("accepts explicit local URLs, local test DB, and proof-run id", () => {
    const databaseUrl = "postgresql://accounting:accounting@localhost:5432/accounting?schema=public";

    expect(
      resolveVatTaxReportBrowserE2eSettings({
        LEDGERBYTE_VAT_TAX_REPORT_BROWSER_E2E: "1",
        LEDGERBYTE_VAT_TAX_REPORT_BROWSER_PROOF_ID: "vat-browser-local-1",
        LEDGERBYTE_TEST_DATABASE_URL: databaseUrl,
        LEDGERBYTE_WEB_URL: "http://localhost:3000",
        LEDGERBYTE_API_URL: "http://localhost:4000",
      } as NodeJS.ProcessEnv),
    ).toEqual({ enabled: true, databaseUrl, proofRunId: "vat-browser-local-1" });
  });
});

test.describe("VAT/tax report browser E2E proof", () => {
  test.skip(
    !settings.enabled,
    "Set LEDGERBYTE_VAT_TAX_REPORT_BROWSER_E2E=1, LEDGERBYTE_TEST_DATABASE_URL, and LEDGERBYTE_VAT_TAX_REPORT_BROWSER_PROOF_ID to run this local-only browser proof.",
  );
  test.describe.configure({ timeout: 180_000 });

  let prisma: PrismaClient | undefined;
  let fixture: VatBrowserFixtureSet | undefined;

  test.beforeAll(async () => {
    if (!settings.enabled) {
      return;
    }

    prisma = createVatBrowserPrisma(settings);
    await prisma.$connect();
    await cleanupVatBrowserFixtureByPrefix(prisma);
    fixture = await seedVatBrowserFixture(prisma, settings.proofRunId);
  });

  test.afterAll(async () => {
    if (!prisma) {
      return;
    }
    await cleanupVatBrowserFixture(prisma, fixture);
    await prisma.$disconnect();
  });

  test("proves VAT Summary, VAT Return, internal-review CSV, date filters, and tenant isolation from the browser", async ({ page }) => {
    const fixtureSet = requireFixture(fixture);
    await loginAsTenantA(page, fixtureSet);
    await assertVatSummaryUi(page, fixtureSet);
    await assertVatReturnUiAndCsv(page, fixtureSet);
    await assertCrossTenantVatApiDenied(page, fixtureSet);
  });
});

function resolveVatTaxReportBrowserE2eSettings(env: NodeJS.ProcessEnv): VatBrowserE2eSettings {
  if (env.LEDGERBYTE_VAT_TAX_REPORT_BROWSER_E2E !== "1") {
    return { enabled: false };
  }

  requireLocalHttpUrl(env.LEDGERBYTE_WEB_URL ?? "http://localhost:3000", "web");
  requireLocalHttpUrl(env.LEDGERBYTE_API_URL ?? "http://localhost:4000", "API");

  return {
    enabled: true,
    databaseUrl: requireLocalPostgresUrl(env.LEDGERBYTE_TEST_DATABASE_URL),
    proofRunId: requireProofRunId(env.LEDGERBYTE_VAT_TAX_REPORT_BROWSER_PROOF_ID),
  };
}

function createVatBrowserPrisma(currentSettings: VatBrowserE2eSettings): PrismaClient {
  if (!currentSettings.enabled) {
    throw new Error("VAT/tax report browser E2E is not enabled.");
  }

  return new PrismaClient({
    datasources: { db: { url: currentSettings.databaseUrl } },
    transactionOptions: { maxWait: 10_000, timeout: 25_000 },
  });
}

function requireLocalPostgresUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error(
      "LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_VAT_TAX_REPORT_BROWSER_E2E=1. Point it at disposable local Postgres.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be a valid Postgres URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("VAT/tax report browser E2E requires a Postgres URL.");
  }

  if (!isLocalHost(url.hostname)) {
    throw new Error("VAT/tax report browser E2E is local-only and refuses non-local database hosts.");
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, "")).toLowerCase();
  if (!databaseName || /(prod|production|live|hosted|staging)/.test(databaseName) || !/(accounting|ledgerbyte|test|local)/.test(databaseName)) {
    throw new Error("VAT/tax report browser E2E requires a disposable local database name.");
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
    throw new Error(`VAT/tax report browser E2E refuses non-local web/API URLs. Check LEDGERBYTE_${label.toUpperCase()}_URL.`);
  }

  return rawUrl;
}

function requireProofRunId(rawValue: string | undefined): string {
  const value = rawValue?.trim();
  if (!value) {
    throw new Error("LEDGERBYTE_VAT_TAX_REPORT_BROWSER_PROOF_ID is required when VAT/tax browser proof is enabled.");
  }
  if (!/^[A-Za-z0-9._-]{3,80}$/.test(value)) {
    throw new Error("LEDGERBYTE_VAT_TAX_REPORT_BROWSER_PROOF_ID must be 3-80 characters using letters, numbers, dot, underscore, or dash.");
  }
  return value;
}

function isLocalHost(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(hostname.toLowerCase());
}

function requireFixture(currentFixture: VatBrowserFixtureSet | undefined): VatBrowserFixtureSet {
  if (!currentFixture) {
    throw new Error("VAT/tax report browser fixture was not initialized.");
  }
  return currentFixture;
}

async function loginAsTenantA(page: Page, fixture: VatBrowserFixtureSet) {
  const session = await loginByBrowserApi(page, {
    email: fixture.tenantA.userEmail,
    password: fixture.fixtureCredential,
    organizationId: fixture.tenantA.organizationId,
  });
  expect(session.organizationId).toBe(fixture.tenantA.organizationId);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(fixture.tenantB.organizationName);
  await expectNoBrowserTokenStorage(page);
}

async function assertVatSummaryUi(page: Page, fixture: VatBrowserFixtureSet) {
  await page.goto("/reports/vat-summary");
  await expect(page.getByRole("heading", { name: "VAT Summary", exact: true })).toBeVisible();

  await submitDateRange(page, PROOF_FROM, PROOF_TO_BEFORE_PERIOD_END);
  await expect(page.locator("main")).toContainText(moneyPattern("105.0000"));
  await expect(page.locator("main")).not.toContainText(moneyPattern(fixture.tenantA.expected.outputVat));
  await expectTenantBAbsentFromMain(page, fixture);

  await submitDateRange(page, PROOF_FROM, PROOF_TO);
  const main = page.locator("main");
  await expect(main).toContainText("Account-basis VAT review from posted VAT accounts");
  await expect(main).toContainText("not an official filing workflow");
  await expect(main).toContainText("VAT Payable 220");
  await expect(main).toContainText("VAT Receivable 230");
  await expect(main).toContainText(moneyPattern(fixture.tenantA.expected.outputVat));
  await expect(main).toContainText(moneyPattern(fixture.tenantA.expected.inputVat));
  await expect(main).toContainText(moneyPattern(fixture.tenantA.expected.netVatPayable));
  await expect(page.getByRole("button", { name: /download csv/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /download pdf/i }).first()).toBeVisible();
  await assertNoOfficialSubmissionClaim(main);
  await expectTenantBAbsentFromMain(page, fixture);

  const summary = await browserFetch(page, `/reports/vat-summary?${dateRangeQuery()}`, fixture.tenantA.organizationId);
  expectOk(summary, "/reports/vat-summary");
  expect(summary.text).toContain(fixture.tenantA.expected.outputVat);
  expect(summary.text).toContain(fixture.tenantA.expected.inputVat);
  assertNoTenantBLeak(summary.text, fixture);
}

async function assertVatReturnUiAndCsv(page: Page, fixture: VatBrowserFixtureSet) {
  await page.goto("/reports/vat-return");
  await expect(page.getByRole("heading", { name: "VAT Return", exact: true })).toBeVisible();

  await submitDateRange(page, PROOF_FROM, PROOF_TO_BEFORE_PERIOD_END);
  await expect(page.locator("main")).toContainText(moneyPattern("105.0000"));
  await expect(page.locator("main")).not.toContainText(moneyPattern(fixture.tenantA.expected.outputVat));
  await expectTenantBAbsentFromMain(page, fixture);

  await submitDateRange(page, PROOF_FROM, PROOF_TO);
  const main = page.locator("main");
  await expect(main).toContainText("Draft VAT return review from finalized sales invoices and finalized purchase bills");
  await expect(main).toContainText("Internal review only");
  await expect(main).toContainText("does not submit to a tax authority");
  await expect(main).toContainText("Official filing format, submission workflow, authority exchange, and compliance approval are not implemented here.");
  await expect(main).toContainText(moneyPattern(fixture.tenantA.expected.outputVat));
  await expect(main).toContainText(moneyPattern(fixture.tenantA.expected.inputVat));
  await expect(main).toContainText(moneyPattern(fixture.tenantA.expected.netVatPayable));
  await expect(main).toContainText(moneyPattern(fixture.tenantA.expected.salesTaxable));
  await expect(main).toContainText(moneyPattern(fixture.tenantA.expected.salesGross));
  await expect(main).toContainText(moneyPattern(fixture.tenantA.expected.purchaseTaxable));
  await expect(main).toContainText(moneyPattern(fixture.tenantA.expected.purchaseGross));
  await expect(page.getByRole("button", { name: /download draft review csv/i })).toBeVisible();
  await assertNoOfficialSubmissionClaim(main);
  await expectTenantBAbsentFromMain(page, fixture);

  const json = await browserFetch(page, `/reports/vat-return?${dateRangeQuery()}`, fixture.tenantA.organizationId);
  expectOk(json, "/reports/vat-return");
  const report = expectVatReturnBody(json.body);
  expect(report.outputVat).toBe(fixture.tenantA.expected.outputVat);
  expect(report.inputVat).toBe(fixture.tenantA.expected.inputVat);
  expect(report.netVat).toBe(fixture.tenantA.expected.netVat);
  expect(report.sales.documentCount).toBe(2);
  expect(report.purchases.documentCount).toBe(1);

  const csv = await browserFetch(page, `/reports/vat-return?${dateRangeQuery()}&format=csv`, fixture.tenantA.organizationId);
  expectOk(csv, "/reports/vat-return CSV");
  expect(csv.contentType).toContain("text/csv");
  expect(csv.text).toContain("Draft VAT Return Review Export");
  expect(csv.text).toContain("Review Status,Internal review only");
  expect(csv.text).toContain("Official Filing Format,Not implemented");
  expect(csv.text).toContain("Authority Submission,Not implemented");
  expect(csv.text).toContain(`Output VAT (sales),${report.outputVat}`);
  expect(csv.text).toContain(`Input VAT (purchases),${report.inputVat}`);
  expect(csv.text).toContain(`Net VAT,${report.netVat}`);
  expect(csv.text).toContain(`${fixture.tenantA.invoiceStartNumber},2026-04-01,700.0000,105.0000,805.0000`);
  expect(csv.text).toContain(`${fixture.tenantA.invoiceEndNumber},2026-04-30,300.0000,45.0000,345.0000`);
  expect(csv.text).toContain(`${fixture.tenantA.billNumber},2026-04-30,400.0000,60.0000,460.0000`);
  expect(csv.text).not.toContain(fixture.tenantA.outsideInvoiceNumber);
  expect(csv.text).not.toContain(fixture.tenantA.outsideBillNumber);
  expect(csv.text).not.toContain(fixture.tenantA.draftInvoiceNumber);
  expect(csv.text).not.toContain(fixture.tenantA.voidBillNumber);
  assertNoTenantBLeak(csv.text, fixture);
  assertInternalReviewWording(csv.text);

  const csvResponsePromise = waitForApiResponse(page, "/reports/vat-return", "format=csv");
  await page.getByRole("button", { name: /download draft review csv/i }).click();
  const csvResponse = await csvResponsePromise;
  expect(csvResponse.status()).toBe(200);
  expect(csvResponse.headers()["content-type"]).toContain("text/csv");
}

async function assertCrossTenantVatApiDenied(page: Page, fixture: VatBrowserFixtureSet) {
  const foreignSummary = await browserContextFetch(page, `/reports/vat-summary?${dateRangeQuery()}`, fixture.tenantB.organizationId);
  expect(foreignSummary.status).toBe(403);
  assertNoTenantBLeak(foreignSummary.text, fixture);

  const foreignReturn = await browserContextFetch(page, `/reports/vat-return?${dateRangeQuery()}`, fixture.tenantB.organizationId);
  expect(foreignReturn.status).toBe(403);
  assertNoTenantBLeak(foreignReturn.text, fixture);

  const tenantARecheck = await browserFetch(page, `/reports/vat-return?${dateRangeQuery()}`, fixture.tenantA.organizationId);
  expectOk(tenantARecheck, "/reports/vat-return tenant A recheck");
  expect(tenantARecheck.text).toContain(fixture.tenantA.expected.outputVat);
  assertNoTenantBLeak(tenantARecheck.text, fixture);
}

async function submitDateRange(page: Page, from: string, to: string) {
  await page.getByLabel("From", { exact: true }).fill(from);
  await page.getByLabel("To", { exact: true }).fill(to);
  await page.getByRole("button", { name: /run report/i }).click();
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

function expectVatReturnBody(body: unknown): {
  outputVat: string;
  inputVat: string;
  netVat: string;
  sales: { documentCount: number };
  purchases: { documentCount: number };
} {
  expect(body).toEqual(
    expect.objectContaining({
      outputVat: expect.any(String),
      inputVat: expect.any(String),
      netVat: expect.any(String),
      sales: expect.objectContaining({ documentCount: expect.any(Number) }),
      purchases: expect.objectContaining({ documentCount: expect.any(Number) }),
    }),
  );
  return body as {
    outputVat: string;
    inputVat: string;
    netVat: string;
    sales: { documentCount: number };
    purchases: { documentCount: number };
  };
}

async function assertNoOfficialSubmissionClaim(locator: ReturnType<Page["locator"]>) {
  await expect(locator).not.toContainText(/submitted to tax authority/i);
  await expect(locator).not.toContainText(/approved by ZATCA/i);
  await expect(locator).not.toContainText(/certified VAT return/i);
  await expect(locator).not.toContainText(/filing accepted/i);
}

async function expectTenantBAbsentFromMain(page: Page, fixture: VatBrowserFixtureSet) {
  const main = page.locator("main");
  await expect(main).not.toContainText(fixture.tenantB.organizationName);
  await expect(main).not.toContainText(fixture.tenantB.customerName);
  await expect(main).not.toContainText(fixture.tenantB.supplierName);
  await expect(main).not.toContainText(fixture.tenantB.invoiceStartNumber);
  await expect(main).not.toContainText(fixture.tenantB.invoiceEndNumber);
  await expect(main).not.toContainText(fixture.tenantB.billNumber);
  await expect(main).not.toContainText(moneyPattern(fixture.tenantB.expected.outputVat));
  await expect(main).not.toContainText(moneyPattern(fixture.tenantB.expected.inputVat));
  await expect(main).not.toContainText(moneyPattern(fixture.tenantB.expected.netVatPayable));
  await expect(main).not.toContainText(moneyPattern(fixture.tenantB.expected.salesGross));
  await expect(main).not.toContainText(moneyPattern(fixture.tenantB.expected.purchaseGross));
}

function assertNoTenantBLeak(subject: unknown, fixture: VatBrowserFixtureSet): void {
  const text = typeof subject === "string" ? subject : JSON.stringify(subject);
  expect(text).not.toContain(fixture.tenantB.organizationId);
  expect(text).not.toContain(fixture.tenantB.organizationName);
  expect(text).not.toContain(fixture.tenantB.customerName);
  expect(text).not.toContain(fixture.tenantB.supplierName);
  expect(text).not.toContain(fixture.tenantB.invoiceStartNumber);
  expect(text).not.toContain(fixture.tenantB.invoiceEndNumber);
  expect(text).not.toContain(fixture.tenantB.billNumber);
  expect(text).not.toContain(fixture.tenantB.expected.salesGross);
  expect(text).not.toContain(fixture.tenantB.expected.purchaseGross);
}

function assertInternalReviewWording(text: string): void {
  expect(text).toContain("Internal");
  expect(text).toMatch(/does not submit a tax return|Authority Submission,Not implemented|not an official tax authority submission format/);
  expect(text).not.toMatch(/submitted to tax authority/i);
  expect(text).not.toMatch(/approved by ZATCA/i);
  expect(text).not.toMatch(/certified VAT return/i);
}

function moneyPattern(amount: string): RegExp {
  const formattedAmount = Number.parseFloat(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`SAR[\\s\\u00a0]*${formattedAmount}`);
}

function dateRangeQuery(): string {
  return `from=${PROOF_FROM}&to=${PROOF_TO}`;
}

async function seedVatBrowserFixture(prisma: PrismaClient, proofRunId: string): Promise<VatBrowserFixtureSet> {
  const marker = `${PROOF_PREFIX}-${proofRunId.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 40)}-${randomUUID().slice(0, 8)}`;
  const uniqueSuffix = marker.replace(/[^A-Za-z0-9]/g, "").slice(-12);
  const fixtureCredential = ["vat", "browser", uniqueSuffix.toLowerCase(), "local"].join("-");
  const passwordHash = await bcrypt.hash(fixtureCredential, 12);
  const tenantA = vatBrowserTenantFixture(marker, "A", uniqueSuffix, {
    salesTaxable: "1000.0000",
    outputVat: "150.0000",
    salesGross: "1150.0000",
    purchaseTaxable: "400.0000",
    inputVat: "60.0000",
    purchaseGross: "460.0000",
    netVat: "90.0000",
    netVatPayable: "90.0000",
    netVatRefundable: "0.0000",
  });
  const tenantB = vatBrowserTenantFixture(marker, "B", uniqueSuffix, {
    salesTaxable: "4000.0000",
    outputVat: "777.0000",
    salesGross: "4777.0000",
    purchaseTaxable: "900.0000",
    inputVat: "111.0000",
    purchaseGross: "1011.0000",
    netVat: "666.0000",
    netVatPayable: "666.0000",
    netVatRefundable: "0.0000",
  });

  await prisma.user.createMany({
    data: [
      {
        id: tenantA.userId,
        email: tenantA.userEmail,
        name: tenantA.userName,
        passwordHash,
      },
      {
        id: tenantB.userId,
        email: tenantB.userEmail,
        name: tenantB.userName,
        passwordHash,
      },
    ],
  });

  await prisma.organization.createMany({
    data: [
      {
        id: tenantA.organizationId,
        name: tenantA.organizationName,
        legalName: `${tenantA.organizationName} Legal`,
        countryCode: "SA",
        baseCurrency: "SAR",
        timezone: "Asia/Riyadh",
      },
      {
        id: tenantB.organizationId,
        name: tenantB.organizationName,
        legalName: `${tenantB.organizationName} Legal`,
        countryCode: "SA",
        baseCurrency: "SAR",
        timezone: "Asia/Riyadh",
      },
    ],
  });

  await prisma.role.createMany({
    data: [
      {
        id: tenantA.roleId,
        organizationId: tenantA.organizationId,
        name: `${marker} Owner A`,
        permissions: [PERMISSIONS.admin.fullAccess],
        isSystem: true,
      },
      {
        id: tenantB.roleId,
        organizationId: tenantB.organizationId,
        name: `${marker} Owner B`,
        permissions: [PERMISSIONS.admin.fullAccess],
        isSystem: true,
      },
    ],
  });

  await prisma.organizationMember.createMany({
    data: [
      {
        id: tenantA.memberId,
        organizationId: tenantA.organizationId,
        userId: tenantA.userId,
        roleId: tenantA.roleId,
        status: MembershipStatus.ACTIVE,
      },
      {
        id: tenantB.memberId,
        organizationId: tenantB.organizationId,
        userId: tenantB.userId,
        roleId: tenantB.roleId,
        status: MembershipStatus.ACTIVE,
      },
    ],
  });

  await seedVatTenant(prisma, tenantA);
  await seedVatTenant(prisma, tenantB);

  return { marker, fixtureCredential, tenantA, tenantB };
}

function vatBrowserTenantFixture(
  marker: string,
  label: "A" | "B",
  uniqueSuffix: string,
  expected: VatBrowserTenantFixture["expected"],
): VatBrowserTenantFixture {
  return {
    organizationId: randomUUID(),
    organizationName: `${marker} Organization ${label}`,
    userId: randomUUID(),
    userEmail: `vat-browser-${uniqueSuffix.toLowerCase()}-${label.toLowerCase()}@example.test`,
    userName: `${marker} User ${label}`,
    roleId: randomUUID(),
    memberId: randomUUID(),
    customerId: randomUUID(),
    supplierId: randomUUID(),
    customerName: `${marker} Customer ${label}`,
    supplierName: `${marker} Supplier ${label}`,
    accounts: {
      cash: randomUUID(),
      vatPayable: randomUUID(),
      vatReceivable: randomUUID(),
      revenue: randomUUID(),
      expense: randomUUID(),
    },
    invoiceStartNumber: `${marker}-INV-START-${label}`,
    invoiceEndNumber: `${marker}-INV-END-${label}`,
    outsideInvoiceNumber: `${marker}-INV-OUTSIDE-${label}`,
    draftInvoiceNumber: `${marker}-INV-DRAFT-${label}`,
    billNumber: `${marker}-BILL-${label}`,
    outsideBillNumber: `${marker}-BILL-OUTSIDE-${label}`,
    voidBillNumber: `${marker}-BILL-VOID-${label}`,
    expected,
  };
}

async function seedVatTenant(prisma: PrismaClient, tenant: VatBrowserTenantFixture): Promise<void> {
  await prisma.account.createMany({
    data: [
      { id: tenant.accounts.cash, organizationId: tenant.organizationId, code: "111", name: `${tenant.customerName} Cash`, type: AccountType.ASSET },
      {
        id: tenant.accounts.vatPayable,
        organizationId: tenant.organizationId,
        code: "220",
        name: `${tenant.customerName} VAT Payable`,
        type: AccountType.LIABILITY,
      },
      {
        id: tenant.accounts.vatReceivable,
        organizationId: tenant.organizationId,
        code: "230",
        name: `${tenant.supplierName} VAT Receivable`,
        type: AccountType.ASSET,
      },
      { id: tenant.accounts.revenue, organizationId: tenant.organizationId, code: "411", name: `${tenant.customerName} Revenue`, type: AccountType.REVENUE },
      { id: tenant.accounts.expense, organizationId: tenant.organizationId, code: "511", name: `${tenant.supplierName} Expense`, type: AccountType.EXPENSE },
    ],
  });

  await prisma.contact.createMany({
    data: [
      {
        id: tenant.customerId,
        organizationId: tenant.organizationId,
        type: ContactType.CUSTOMER,
        name: tenant.customerName,
        displayName: tenant.customerName,
        email: `customer-${tenant.invoiceStartNumber.toLowerCase()}@example.test`,
      },
      {
        id: tenant.supplierId,
        organizationId: tenant.organizationId,
        type: ContactType.SUPPLIER,
        name: tenant.supplierName,
        displayName: tenant.supplierName,
        email: `supplier-${tenant.billNumber.toLowerCase()}@example.test`,
      },
    ],
  });

  await createPostedVatJournal(prisma, tenant, `${tenant.invoiceStartNumber}-VAT-JE`, "2026-04-01", tenant.expected.outputVat === "777.0000" ? "777.0000" : "105.0000", "OUTPUT");
  if (tenant.expected.outputVat !== "777.0000") {
    await createPostedVatJournal(prisma, tenant, `${tenant.invoiceEndNumber}-VAT-JE`, "2026-04-30", "45.0000", "OUTPUT");
  }
  await createPostedVatJournal(prisma, tenant, `${tenant.billNumber}-VAT-JE`, "2026-04-30", tenant.expected.inputVat, "INPUT");
  await createPostedVatJournal(prisma, tenant, `${tenant.outsideInvoiceNumber}-VAT-JE`, "2026-05-01", "9999.0000", "OUTPUT");

  if (tenant.expected.outputVat === "777.0000") {
    await createSalesInvoice(prisma, tenant, tenant.invoiceStartNumber, "2026-04-15", "4000.0000", "777.0000", "4777.0000", SalesInvoiceStatus.FINALIZED);
    await createPurchaseBill(prisma, tenant, tenant.billNumber, "2026-04-16", "900.0000", "111.0000", "1011.0000", PurchaseBillStatus.FINALIZED);
    return;
  }

  await createSalesInvoice(prisma, tenant, tenant.invoiceStartNumber, "2026-04-01", "700.0000", "105.0000", "805.0000", SalesInvoiceStatus.FINALIZED);
  await createSalesInvoice(prisma, tenant, tenant.invoiceEndNumber, "2026-04-30", "300.0000", "45.0000", "345.0000", SalesInvoiceStatus.FINALIZED);
  await createSalesInvoice(prisma, tenant, tenant.outsideInvoiceNumber, "2026-05-01", "9999.0000", "999.0000", "10998.0000", SalesInvoiceStatus.FINALIZED);
  await createSalesInvoice(prisma, tenant, tenant.draftInvoiceNumber, "2026-04-15", "500.0000", "75.0000", "575.0000", SalesInvoiceStatus.DRAFT);
  await createPurchaseBill(prisma, tenant, tenant.billNumber, "2026-04-30", "400.0000", "60.0000", "460.0000", PurchaseBillStatus.FINALIZED);
  await createPurchaseBill(prisma, tenant, tenant.outsideBillNumber, "2026-05-01", "900.0000", "135.0000", "1035.0000", PurchaseBillStatus.FINALIZED);
  await createPurchaseBill(prisma, tenant, tenant.voidBillNumber, "2026-04-20", "700.0000", "105.0000", "805.0000", PurchaseBillStatus.VOIDED);
}

async function createPostedVatJournal(
  prisma: PrismaClient,
  tenant: VatBrowserTenantFixture,
  entryNumber: string,
  date: string,
  amount: string,
  kind: "OUTPUT" | "INPUT",
): Promise<void> {
  const journalEntryId = randomUUID();
  const entryDate = new Date(`${date}T00:00:00.000Z`);
  const vatAccountId = kind === "OUTPUT" ? tenant.accounts.vatPayable : tenant.accounts.vatReceivable;
  const balancingAccountId = tenant.accounts.cash;
  const vatLine = kind === "OUTPUT"
    ? { accountId: vatAccountId, debit: "0.0000", credit: amount, description: `${entryNumber} output VAT` }
    : { accountId: vatAccountId, debit: amount, credit: "0.0000", description: `${entryNumber} input VAT` };
  const balancingLine = kind === "OUTPUT"
    ? { accountId: balancingAccountId, debit: amount, credit: "0.0000", description: `${entryNumber} cash balance` }
    : { accountId: balancingAccountId, debit: "0.0000", credit: amount, description: `${entryNumber} cash balance` };

  await prisma.journalEntry.create({
    data: {
      id: journalEntryId,
      organizationId: tenant.organizationId,
      entryNumber,
      status: JournalEntryStatus.POSTED,
      entryDate,
      description: `${entryNumber} posted VAT browser proof entry`,
      reference: entryNumber,
      currency: "SAR",
      totalDebit: amount,
      totalCredit: amount,
      postedAt: entryDate,
      postedById: tenant.userId,
      createdById: tenant.userId,
      lines: {
        create: [balancingLine, vatLine].map((line, index) => ({
          organizationId: tenant.organizationId,
          accountId: line.accountId,
          lineNumber: index + 1,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          currency: "SAR",
        })),
      },
    },
  });
}

async function createSalesInvoice(
  prisma: PrismaClient,
  tenant: VatBrowserTenantFixture,
  invoiceNumber: string,
  date: string,
  taxableTotal: string,
  taxTotal: string,
  total: string,
  status: SalesInvoiceStatus,
): Promise<void> {
  await prisma.salesInvoice.create({
    data: {
      organizationId: tenant.organizationId,
      invoiceNumber,
      customerId: tenant.customerId,
      issueDate: new Date(`${date}T00:00:00.000Z`),
      dueDate: new Date(`${date}T00:00:00.000Z`),
      currency: "SAR",
      status,
      subtotal: taxableTotal,
      taxableTotal,
      taxTotal,
      total,
      balanceDue: total,
      finalizedAt: status === SalesInvoiceStatus.FINALIZED ? new Date(`${date}T00:00:00.000Z`) : null,
      createdById: tenant.userId,
      lines: {
        create: [
          {
            organizationId: tenant.organizationId,
            description: `${invoiceNumber} synthetic browser VAT proof line`,
            accountId: tenant.accounts.revenue,
            quantity: "1.0000",
            unitPrice: taxableTotal,
            lineGrossAmount: taxableTotal,
            taxableAmount: taxableTotal,
            taxAmount: taxTotal,
            lineSubtotal: taxableTotal,
            lineTotal: total,
          },
        ],
      },
    },
  });
}

async function createPurchaseBill(
  prisma: PrismaClient,
  tenant: VatBrowserTenantFixture,
  billNumber: string,
  date: string,
  taxableTotal: string,
  taxTotal: string,
  total: string,
  status: PurchaseBillStatus,
): Promise<void> {
  await prisma.purchaseBill.create({
    data: {
      organizationId: tenant.organizationId,
      billNumber,
      supplierId: tenant.supplierId,
      billDate: new Date(`${date}T00:00:00.000Z`),
      dueDate: new Date(`${date}T00:00:00.000Z`),
      currency: "SAR",
      status,
      subtotal: taxableTotal,
      taxableTotal,
      taxTotal,
      total,
      balanceDue: total,
      finalizedAt: status === PurchaseBillStatus.FINALIZED ? new Date(`${date}T00:00:00.000Z`) : null,
      createdById: tenant.userId,
      lines: {
        create: [
          {
            organizationId: tenant.organizationId,
            description: `${billNumber} synthetic browser VAT proof line`,
            accountId: tenant.accounts.expense,
            quantity: "1.0000",
            unitPrice: taxableTotal,
            lineGrossAmount: taxableTotal,
            taxableAmount: taxableTotal,
            taxAmount: taxTotal,
            lineTotal: total,
          },
        ],
      },
    },
  });
}

async function cleanupVatBrowserFixture(prisma: PrismaClient, fixture?: VatBrowserFixtureSet): Promise<void> {
  if (fixture) {
    await prisma.organization.deleteMany({
      where: { id: { in: [fixture.tenantA.organizationId, fixture.tenantB.organizationId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [fixture.tenantA.userId, fixture.tenantB.userId] } },
    });
    return;
  }

  await cleanupVatBrowserFixtureByPrefix(prisma);
}

async function cleanupVatBrowserFixtureByPrefix(prisma: PrismaClient): Promise<void> {
  await prisma.organization.deleteMany({
    where: { name: { startsWith: PROOF_PREFIX } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: "vat-browser-" } },
  });
}
