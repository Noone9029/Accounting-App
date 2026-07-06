import type { Page } from "@playwright/test";
import {
  AccountType,
  ContactType,
  JournalEntryStatus,
  MembershipStatus,
  PrismaClient,
  PurchaseBillStatus,
  SalesInvoiceStatus,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { e2eConfig, expect, loginByBrowserApi, test } from "./utils/e2e-helpers";
import { PERMISSIONS } from "../../packages/shared/src/permissions";

type AccountantBrowserE2eSettings =
  | { enabled: false; databaseUrl?: undefined; proofRunId?: undefined }
  | { enabled: true; databaseUrl: string; proofRunId: string };

interface AccountantBrowserFixtureSet {
  marker: string;
  password: string;
  tenantA: AccountantBrowserTenantFixture;
  tenantB: AccountantBrowserTenantFixture;
}

interface AccountantBrowserTenantFixture {
  organizationId: string;
  organizationName: string;
  userId: string;
  userEmail: string;
  userName: string;
  roleId: string;
  memberId: string;
  customerId: string;
  customerName: string;
  supplierId: string;
  supplierName: string;
  accounts: {
    cash: string;
    accountsReceivable: string;
    accountsPayable: string;
    vatPayable: string;
    vatReceivable: string;
    revenue: string;
    expense: string;
  };
  foreignInvoiceId: string;
  foreignInvoiceNumber: string;
  foreignBillId: string;
  foreignBillNumber: string;
  foreignJournalId: string;
  foreignJournalNumber: string;
}

interface BrowserFetchResult {
  status: number;
  ok: boolean;
  contentType: string | null;
  body: unknown;
  text: string;
}

const settings = resolveAccountantBrowserE2eSettings(process.env);
const today = new Date();
const todayDate = today.toISOString().slice(0, 10);
const dueDate = addUtcDays(today, 15).toISOString().slice(0, 10);

test.describe("accountant workflow browser E2E local guard", () => {
  test("skips safely when the opt-in environment variable is not set", () => {
    expect(resolveAccountantBrowserE2eSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
  });

  test("requires an explicit local test database URL when enabled", () => {
    expect(() =>
      resolveAccountantBrowserE2eSettings({
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E: "1",
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_PROOF_ID: "local-proof-1",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E=1");
  });

  test("requires an explicit synthetic proof-run id when enabled", () => {
    expect(() =>
      resolveAccountantBrowserE2eSettings({
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_PROOF_ID is required");
  });

  test("rejects hosted or production-looking targets", () => {
    expect(() =>
      resolveAccountantBrowserE2eSettings({
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E: "1",
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_PROOF_ID: "local-proof-1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@db.example.com/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("local-only");

    expect(() =>
      resolveAccountantBrowserE2eSettings({
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E: "1",
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_PROOF_ID: "local-proof-1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting_prod?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("disposable local database name");

    expect(() =>
      resolveAccountantBrowserE2eSettings({
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E: "1",
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_PROOF_ID: "local-proof-1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
        LEDGERBYTE_WEB_URL: "https://staging.example.com",
      } as NodeJS.ProcessEnv),
    ).toThrow("refuses non-local web/API URLs");
  });

  test("accepts explicit local URLs, local test DB, and proof-run id", () => {
    const databaseUrl = "postgresql://accounting:accounting@localhost:5432/accounting?schema=public";

    expect(
      resolveAccountantBrowserE2eSettings({
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E: "1",
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_PROOF_ID: "local-proof-1",
        LEDGERBYTE_TEST_DATABASE_URL: databaseUrl,
        LEDGERBYTE_WEB_URL: "http://localhost:3000",
        LEDGERBYTE_API_URL: "http://localhost:4000",
      } as NodeJS.ProcessEnv),
    ).toEqual({ enabled: true, databaseUrl, proofRunId: "local-proof-1" });
  });
});

test.describe("accountant workflow browser E2E proof", () => {
  test.skip(
    !settings.enabled,
    "Set LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E=1, LEDGERBYTE_TEST_DATABASE_URL, and LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_PROOF_ID to run this local-only browser proof.",
  );
  test.describe.configure({ timeout: 180_000 });

  let prisma: PrismaClient | undefined;
  let fixture: AccountantBrowserFixtureSet | undefined;

  test.beforeAll(async () => {
    if (!settings.enabled) {
      return;
    }

    prisma = new PrismaClient({
      datasources: { db: { url: settings.databaseUrl } },
      transactionOptions: { maxWait: 10_000, timeout: 25_000 },
    });
    await prisma.$connect();
    fixture = await seedAccountantBrowserFixture(prisma, settings.proofRunId);
  });

  test.afterAll(async () => {
    if (!prisma) {
      return;
    }
    await cleanupAccountantBrowserFixture(prisma, fixture);
    await prisma.$disconnect();
  });

  test("proves core accountant workflow through browser UI and tenant-scoped reports", async ({ page, criticalPageErrors }) => {
    const fixtureSet = requireFixture(fixture);
    await loginAsTenantA(page, fixtureSet);

    const invoice = await createFinalizeAndPartiallyPayInvoice(page, fixtureSet);
    await assertCustomerLedgerAndArReport(page, fixtureSet, invoice);

    const bill = await createFinalizeAndPartiallyPayBill(page, fixtureSet);
    await assertSupplierLedgerAndApReport(page, fixtureSet, bill);

    const journal = await createPostAndReverseManualJournal(page, fixtureSet);
    await assertJournalReportAndAuditUi(page, fixtureSet, journal);

    await assertTenantBoundaryProof(page, criticalPageErrors, fixtureSet, invoice, bill);
  });
});

function resolveAccountantBrowserE2eSettings(env: NodeJS.ProcessEnv): AccountantBrowserE2eSettings {
  if (env.LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E !== "1") {
    return { enabled: false };
  }

  requireLocalHttpUrl(env.LEDGERBYTE_WEB_URL ?? "http://localhost:3000", "web");
  requireLocalHttpUrl(env.LEDGERBYTE_API_URL ?? "http://localhost:4000", "API");

  return {
    enabled: true,
    databaseUrl: requireLocalPostgresUrl(env.LEDGERBYTE_TEST_DATABASE_URL),
    proofRunId: requireProofRunId(env.LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_PROOF_ID),
  };
}

function requireLocalPostgresUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error(
      "LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E=1. Point it at disposable local Postgres.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be a valid Postgres URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Accountant workflow browser E2E requires a Postgres URL.");
  }

  if (!isLocalHost(url.hostname)) {
    throw new Error("Accountant workflow browser E2E is local-only and refuses non-local database hosts.");
  }

  const databaseName = url.pathname.replace(/^\//, "");
  if (!databaseName || databaseName.toLowerCase().includes("prod")) {
    throw new Error("Accountant workflow browser E2E requires a disposable local database name.");
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
    throw new Error(`Accountant workflow browser E2E refuses non-local web/API URLs. Check LEDGERBYTE_${label.toUpperCase()}_URL.`);
  }

  return rawUrl;
}

function requireProofRunId(rawValue: string | undefined): string {
  const value = rawValue?.trim();
  if (!value) {
    throw new Error("LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_PROOF_ID is required when browser accountant proof is enabled.");
  }
  if (!/^[A-Za-z0-9._-]{3,80}$/.test(value)) {
    throw new Error("LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_PROOF_ID must be 3-80 characters using letters, numbers, dot, underscore, or dash.");
  }
  return value;
}

function isLocalHost(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(hostname.toLowerCase());
}

async function seedAccountantBrowserFixture(prisma: PrismaClient, proofRunId: string): Promise<AccountantBrowserFixtureSet> {
  const marker = `AWB-${proofRunId}-${Date.now()}-${randomUUID().slice(0, 8)}`.replace(/[^A-Za-z0-9._-]/g, "-");
  const uniqueSuffix = marker.replace(/[^A-Za-z0-9]/g, "").slice(-12);
  const password = `AccountantBrowser-${uniqueSuffix}-123!`;
  const passwordHash = await bcrypt.hash(password, 12);
  const tenantA = fixtureIds(marker, "A", uniqueSuffix);
  const tenantB = fixtureIds(marker, "B", uniqueSuffix);

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
        name: `${marker} Accountant A`,
        permissions: [PERMISSIONS.admin.fullAccess],
        isSystem: true,
      },
      {
        id: tenantB.roleId,
        organizationId: tenantB.organizationId,
        name: `${marker} Accountant B`,
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

  await Promise.all([seedTenantBaseRecords(prisma, tenantA), seedTenantBaseRecords(prisma, tenantB)]);
  await seedForeignTenantFinancialMarkers(prisma, tenantB);

  return { marker, password, tenantA, tenantB };
}

async function seedTenantBaseRecords(prisma: PrismaClient, tenant: AccountantBrowserTenantFixture): Promise<void> {
  await prisma.account.createMany({
    data: [
      {
        id: tenant.accounts.cash,
        organizationId: tenant.organizationId,
        code: "100",
        name: `${tenant.customerName} Cash`,
        type: AccountType.ASSET,
      },
      {
        id: tenant.accounts.accountsReceivable,
        organizationId: tenant.organizationId,
        code: "120",
        name: `${tenant.customerName} Accounts Receivable`,
        type: AccountType.ASSET,
      },
      {
        id: tenant.accounts.accountsPayable,
        organizationId: tenant.organizationId,
        code: "210",
        name: `${tenant.supplierName} Accounts Payable`,
        type: AccountType.LIABILITY,
      },
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
      {
        id: tenant.accounts.revenue,
        organizationId: tenant.organizationId,
        code: "400",
        name: `${tenant.customerName} Revenue`,
        type: AccountType.REVENUE,
      },
      {
        id: tenant.accounts.expense,
        organizationId: tenant.organizationId,
        code: "500",
        name: `${tenant.supplierName} Expense`,
        type: AccountType.EXPENSE,
      },
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
        email: `${tenant.userEmail.replace("@", "+customer@")}`,
      },
      {
        id: tenant.supplierId,
        organizationId: tenant.organizationId,
        type: ContactType.SUPPLIER,
        name: tenant.supplierName,
        displayName: tenant.supplierName,
        email: `${tenant.userEmail.replace("@", "+supplier@")}`,
      },
    ],
  });
}

async function seedForeignTenantFinancialMarkers(prisma: PrismaClient, tenant: AccountantBrowserTenantFixture): Promise<void> {
  const activityDate = new Date(`${todayDate}T00:00:00.000Z`);
  const dueDateValue = new Date(`${dueDate}T00:00:00.000Z`);

  await prisma.salesInvoice.create({
    data: {
      id: tenant.foreignInvoiceId,
      organizationId: tenant.organizationId,
      invoiceNumber: tenant.foreignInvoiceNumber,
      customerId: tenant.customerId,
      issueDate: activityDate,
      dueDate: dueDateValue,
      currency: "SAR",
      status: SalesInvoiceStatus.FINALIZED,
      subtotal: "987.0000",
      taxableTotal: "987.0000",
      total: "987.0000",
      balanceDue: "987.0000",
      createdById: tenant.userId,
      lines: {
        create: {
          organizationId: tenant.organizationId,
          description: `${tenant.customerName} foreign invoice line`,
          accountId: tenant.accounts.revenue,
          quantity: "1.0000",
          unitPrice: "987.0000",
          lineGrossAmount: "987.0000",
          lineSubtotal: "987.0000",
          taxableAmount: "987.0000",
          lineTotal: "987.0000",
        },
      },
    },
  });

  await prisma.purchaseBill.create({
    data: {
      id: tenant.foreignBillId,
      organizationId: tenant.organizationId,
      billNumber: tenant.foreignBillNumber,
      supplierId: tenant.supplierId,
      billDate: activityDate,
      dueDate: dueDateValue,
      currency: "SAR",
      status: PurchaseBillStatus.FINALIZED,
      subtotal: "654.0000",
      taxableTotal: "654.0000",
      total: "654.0000",
      balanceDue: "654.0000",
      createdById: tenant.userId,
      lines: {
        create: {
          organizationId: tenant.organizationId,
          description: `${tenant.supplierName} foreign bill line`,
          accountId: tenant.accounts.expense,
          quantity: "1.0000",
          unitPrice: "654.0000",
          lineGrossAmount: "654.0000",
          taxableAmount: "654.0000",
          lineTotal: "654.0000",
        },
      },
    },
  });

  await prisma.journalEntry.create({
    data: {
      id: tenant.foreignJournalId,
      organizationId: tenant.organizationId,
      entryNumber: tenant.foreignJournalNumber,
      status: JournalEntryStatus.POSTED,
      entryDate: activityDate,
      description: `${tenant.customerName} foreign journal`,
      currency: "SAR",
      totalDebit: "321.0000",
      totalCredit: "321.0000",
      postedAt: activityDate,
      postedById: tenant.userId,
      createdById: tenant.userId,
      lines: {
        create: [
          {
            organizationId: tenant.organizationId,
            accountId: tenant.accounts.cash,
            lineNumber: 1,
            debit: "321.0000",
            credit: "0.0000",
          },
          {
            organizationId: tenant.organizationId,
            accountId: tenant.accounts.revenue,
            lineNumber: 2,
            debit: "0.0000",
            credit: "321.0000",
          },
        ],
      },
    },
  });
}

async function cleanupAccountantBrowserFixture(prisma: PrismaClient, fixture: AccountantBrowserFixtureSet | undefined): Promise<void> {
  if (!fixture) {
    return;
  }

  await prisma.organization.deleteMany({
    where: { id: { in: [fixture.tenantA.organizationId, fixture.tenantB.organizationId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [fixture.tenantA.userId, fixture.tenantB.userId] } },
  });
}

function fixtureIds(marker: string, suffix: "A" | "B", uniqueSuffix: string): AccountantBrowserTenantFixture {
  const tenantSuffix = `${uniqueSuffix}-${suffix}`.toLowerCase();

  return {
    organizationId: randomUUID(),
    organizationName: `${marker} Organization ${suffix}`,
    userId: randomUUID(),
    userEmail: `${marker.toLowerCase()}-${suffix.toLowerCase()}@example.test`,
    userName: `${marker} User ${suffix}`,
    roleId: randomUUID(),
    memberId: randomUUID(),
    customerId: randomUUID(),
    customerName: `${marker} Customer ${suffix}`,
    supplierId: randomUUID(),
    supplierName: `${marker} Supplier ${suffix}`,
    accounts: {
      cash: randomUUID(),
      accountsReceivable: randomUUID(),
      accountsPayable: randomUUID(),
      vatPayable: randomUUID(),
      vatReceivable: randomUUID(),
      revenue: randomUUID(),
      expense: randomUUID(),
    },
    foreignInvoiceId: randomUUID(),
    foreignInvoiceNumber: `AWB-${tenantSuffix}-INV-BLOCK`,
    foreignBillId: randomUUID(),
    foreignBillNumber: `AWB-${tenantSuffix}-BILL-BLOCK`,
    foreignJournalId: randomUUID(),
    foreignJournalNumber: `AWB-${tenantSuffix}-JE-BLOCK`,
  };
}

async function loginAsTenantA(page: Page, fixture: AccountantBrowserFixtureSet) {
  const session = await loginByBrowserApi(page, {
    email: fixture.tenantA.userEmail,
    password: fixture.password,
    organizationId: fixture.tenantA.organizationId,
  });
  expect(session.organizationId).toBe(fixture.tenantA.organizationId);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expectNoForeignMarkers(page, fixture);
  return session;
}

async function createFinalizeAndPartiallyPayInvoice(page: Page, fixture: AccountantBrowserFixtureSet) {
  const lineDescription = `${fixture.marker} browser sales line`;
  await page.goto("/sales/invoices/new");
  await expect(page.getByRole("heading", { name: "Create sales invoice", exact: true })).toBeVisible();
  await expectNoForeignMarkers(page, fixture);

  await page.getByLabel("Customer").selectOption(fixture.tenantA.customerId);
  await page.getByLabel("Due date").fill(dueDate);
  await page.getByLabel("Tax mode").selectOption("NO_TAX");
  await fillSalesInvoiceLine(page, fixture.tenantA, lineDescription, "120.0000");

  const createButton = page.getByRole("button", { name: "Create draft invoice", exact: true });
  await expect(createButton).toBeEnabled();
  await Promise.all([waitForEntityUrl(page, "/sales/invoices/"), createButton.click()]);

  const invoiceId = idFromCurrentUrl(page, "/sales/invoices/");
  let invoice = asRecord((await browserFetch(page, `/sales-invoices/${invoiceId}`, fixture.tenantA.organizationId)).body);
  const invoiceNumber = requireString(invoice.invoiceNumber, "invoiceNumber");
  await expect(page.getByRole("heading", { name: invoiceNumber }).first()).toBeVisible();
  await expect(page.locator("main")).toContainText(lineDescription);

  const finalizeButton = page.getByRole("button", { name: "Finalize", exact: true }).first();
  await expect(finalizeButton).toBeEnabled();
  await finalizeButton.click();
  await expect(page.locator("main")).toContainText(`Invoice posted. Accounting entries were created for ${invoiceNumber}`);
  invoice = asRecord((await browserFetch(page, `/sales-invoices/${invoiceId}`, fixture.tenantA.organizationId)).body);
  expect(requireString(invoice.status, "invoice.status")).toBe("FINALIZED");
  expectDecimal(invoice.balanceDue, "invoice.balanceDue", 120);
  expect(typeof invoice.journalEntryId).toBe("string");

  await page.getByRole("link", { name: "Record payment" }).first().click();
  await expect(page.getByRole("heading", { name: "Record customer payment", exact: true })).toBeVisible();
  const invoiceRow = page.getByRole("row").filter({ hasText: invoiceNumber });
  await expect(invoiceRow).toBeVisible();
  await page.getByLabel("Amount received").fill("75.0000");
  await page.getByLabel("Paid-through account").selectOption(fixture.tenantA.accounts.cash);
  await invoiceRow.locator("input").first().fill("75.0000");

  await Promise.all([
    waitForEntityOrSourceUrl(page, "/sales/customer-payments/", `/sales/invoices/${invoiceId}`),
    page.getByRole("button", { name: "Record payment", exact: true }).click(),
  ]);
  const paymentId = idFromCurrentUrlOrNull(page, "/sales/customer-payments/") ?? (await findCustomerPaymentId(page, fixture, 75));
  await page.goto(`/sales/customer-payments/${paymentId}`);
  const payment = asRecord((await browserFetch(page, `/customer-payments/${paymentId}`, fixture.tenantA.organizationId)).body);
  const paymentNumber = requireString(payment.paymentNumber, "paymentNumber");
  await expect(page.getByRole("heading", { name: paymentNumber }).first()).toBeVisible();
  await expect(page.locator("main")).toContainText(invoiceNumber);
  expect(requireString(payment.journalEntryId, "payment.journalEntryId")).toBeTruthy();

  invoice = asRecord((await browserFetch(page, `/sales-invoices/${invoiceId}`, fixture.tenantA.organizationId)).body);
  expectDecimal(invoice.balanceDue, "invoice.balanceDue after payment", 45);

  return { invoiceId, invoiceNumber, paymentId, paymentNumber, lineDescription };
}

async function fillSalesInvoiceLine(
  page: Page,
  tenant: AccountantBrowserTenantFixture,
  description: string,
  amount: string,
): Promise<void> {
  const accountSelect = page.getByLabel("Posting account for line 1", { exact: true });
  const lineRow = accountSelect.locator("xpath=ancestor::div[contains(@class, 'grid')][1]");
  await lineRow.locator("input").nth(0).fill(description);
  await accountSelect.selectOption(tenant.accounts.revenue);
  await lineRow.locator("input").nth(2).fill("1.0000");
  await lineRow.locator("input").nth(3).fill(amount);
}

async function assertCustomerLedgerAndArReport(
  page: Page,
  fixture: AccountantBrowserFixtureSet,
  invoice: { invoiceNumber: string; paymentNumber: string },
): Promise<void> {
  await page.goto(`/customers/${fixture.tenantA.customerId}`);
  await expect(page.getByRole("heading", { name: fixture.tenantA.customerName }).first()).toBeVisible();
  await expect(page.locator("main")).toContainText(invoice.invoiceNumber);
  await expect(page.locator("main")).toContainText(invoice.paymentNumber);
  await expect(page.locator("main")).toContainText(/SAR[\s\u00a0]*45\.00/);
  await expectNoForeignMarkers(page, fixture);

  await page.goto("/reports/aged-receivables");
  await expect(page.getByRole("heading", { name: "Aged Receivables", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Run report", exact: true }).click();
  await expect(page.locator("main")).toContainText(invoice.invoiceNumber);
  await expect(page.locator("main")).toContainText(fixture.tenantA.customerName);
  await expect(page.locator("main")).toContainText(/SAR[\s\u00a0]*45\.00/);
  await expectNoForeignMarkers(page, fixture);
}

async function createFinalizeAndPartiallyPayBill(page: Page, fixture: AccountantBrowserFixtureSet) {
  const lineDescription = `${fixture.marker} browser purchase line`;
  await page.goto("/purchases/bills/new");
  await expect(page.getByRole("heading", { name: "Create purchase bill", exact: true })).toBeVisible();
  await expectNoForeignMarkers(page, fixture);

  await page.getByLabel("Supplier").selectOption(fixture.tenantA.supplierId);
  await page.getByLabel("Due date").fill(dueDate);
  await page.getByLabel("Description for bill line 1").fill(lineDescription);
  await page.getByLabel("Purchase account for bill line 1").selectOption(fixture.tenantA.accounts.expense);
  await page.getByLabel("Quantity for bill line 1").fill("1.0000");
  await page.getByLabel("Unit price for bill line 1").fill("150.0000");

  await Promise.all([
    waitForEntityUrl(page, "/purchases/bills/"),
    page.getByRole("button", { name: "Save draft", exact: true }).click(),
  ]);

  const billId = idFromCurrentUrl(page, "/purchases/bills/");
  let bill = asRecord((await browserFetch(page, `/purchase-bills/${billId}`, fixture.tenantA.organizationId)).body);
  const billNumber = requireString(bill.billNumber, "billNumber");
  await expect(page.getByRole("heading", { name: billNumber }).first()).toBeVisible();
  await expect(page.locator("main")).toContainText(lineDescription);

  const finalizeButton = page.getByRole("button", { name: "Finalize", exact: true }).first();
  await expect(finalizeButton).toBeEnabled();
  await finalizeButton.click();
  await expect(page.locator("main")).toContainText(`Finalized bill ${billNumber}.`);
  bill = asRecord((await browserFetch(page, `/purchase-bills/${billId}`, fixture.tenantA.organizationId)).body);
  expect(requireString(bill.status, "bill.status")).toBe("FINALIZED");
  expectDecimal(bill.balanceDue, "bill.balanceDue", 150);
  expect(typeof bill.journalEntryId).toBe("string");

  await page.getByRole("link", { name: "Record supplier payment" }).click();
  await expect(page.getByRole("heading", { name: "Record supplier payment", exact: true })).toBeVisible();
  const billRow = page.getByRole("row").filter({ hasText: billNumber });
  await expect(billRow).toBeVisible();
  await page.getByLabel("Amount paid").fill("80.0000");
  await page.getByLabel("Paid-through account").selectOption(fixture.tenantA.accounts.cash);
  await billRow.locator("input").first().fill("80.0000");

  await Promise.all([
    waitForEntityOrSourceUrl(page, "/purchases/supplier-payments/", `/purchases/bills/${billId}`),
    page.getByRole("button", { name: "Record payment", exact: true }).click(),
  ]);
  const paymentId = idFromCurrentUrlOrNull(page, "/purchases/supplier-payments/") ?? (await findSupplierPaymentId(page, fixture, 80));
  await page.goto(`/purchases/supplier-payments/${paymentId}`);
  const payment = asRecord((await browserFetch(page, `/supplier-payments/${paymentId}`, fixture.tenantA.organizationId)).body);
  const paymentNumber = requireString(payment.paymentNumber, "supplier paymentNumber");
  await expect(page.getByRole("heading", { name: paymentNumber }).first()).toBeVisible();
  await expect(page.locator("main")).toContainText(billNumber);
  expect(requireString(payment.journalEntryId, "supplier payment.journalEntryId")).toBeTruthy();

  bill = asRecord((await browserFetch(page, `/purchase-bills/${billId}`, fixture.tenantA.organizationId)).body);
  expectDecimal(bill.balanceDue, "bill.balanceDue after payment", 70);

  return { billId, billNumber, paymentId, paymentNumber, lineDescription };
}

async function assertSupplierLedgerAndApReport(
  page: Page,
  fixture: AccountantBrowserFixtureSet,
  bill: { billNumber: string; paymentNumber: string },
): Promise<void> {
  await page.goto(`/suppliers/${fixture.tenantA.supplierId}`);
  await expect(page.getByRole("heading", { name: fixture.tenantA.supplierName }).first()).toBeVisible();
  await expect(page.locator("main")).toContainText(bill.billNumber);
  await expect(page.locator("main")).toContainText(bill.paymentNumber);
  await expect(page.locator("main")).toContainText(/SAR[\s\u00a0]*70\.00/);
  await expectNoForeignMarkers(page, fixture);

  await page.goto("/reports/aged-payables");
  await expect(page.getByRole("heading", { name: "Aged Payables", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Run report", exact: true }).click();
  await expect(page.locator("main")).toContainText(bill.billNumber);
  await expect(page.locator("main")).toContainText(fixture.tenantA.supplierName);
  await expect(page.locator("main")).toContainText(/SAR[\s\u00a0]*70\.00/);
  await expectNoForeignMarkers(page, fixture);
}

async function createPostAndReverseManualJournal(page: Page, fixture: AccountantBrowserFixtureSet) {
  const description = `${fixture.marker} browser manual journal`;
  await page.goto("/journal-entries/new");
  await expect(page.getByRole("heading", { name: "Create manual journal", exact: true })).toBeVisible();

  await page.getByLabel("Description", { exact: true }).fill(description);
  await page.getByLabel("Reference").fill(`AWB-${fixture.tenantA.userId.slice(0, 8)}`);
  const selects = page.locator("form select");
  await selects.nth(0).selectOption(fixture.tenantA.accounts.cash);
  await selects.nth(2).selectOption(fixture.tenantA.accounts.revenue);
  const inputs = page.locator("form input");
  await inputs.nth(3).fill(`${description} debit`);
  await inputs.nth(4).fill("25.0000");
  await inputs.nth(5).fill("0.0000");
  await inputs.nth(6).fill(`${description} credit`);
  await inputs.nth(7).fill("0.0000");
  await inputs.nth(8).fill("25.0000");
  await page.getByRole("button", { name: "Save draft journal", exact: true }).click();
  await expect(page.locator("main")).toContainText(/Draft journal .* created\./);

  const journalList = asArray(asRecord((await browserFetch(page, "/journal-entries", fixture.tenantA.organizationId)).body));
  const createdJournal = journalList.map(asRecord).find((entry) => entry.description === description);
  expect(createdJournal, "created browser journal should be returned by tenant A API").toBeTruthy();
  const journalId = requireString(createdJournal?.id, "journal.id");
  const journalNumber = requireString(createdJournal?.entryNumber, "journal.entryNumber");

  await page.goto("/journal-entries");
  await expect(page.getByRole("heading", { name: "Manual journals", exact: true })).toBeVisible();
  const journalRow = page.getByRole("row").filter({ hasText: journalNumber });
  await expect(journalRow).toBeVisible();
  await journalRow.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.locator("main")).toContainText(`Posted journal ${journalNumber}.`);

  await page.getByRole("row").filter({ hasText: journalNumber }).getByRole("button", { name: "Reverse", exact: true }).click();
  await expect(page.locator("main")).toContainText(/Created reversal journal/);
  await expect(page.locator("main")).toContainText(journalNumber);
  await expectNoForeignMarkers(page, fixture);

  const updatedJournal = asRecord((await browserFetch(page, `/journal-entries/${journalId}`, fixture.tenantA.organizationId)).body);
  expect(requireString(updatedJournal.status, "journal.status")).toBe("REVERSED");

  const journalsAfterReverse = asArray(asRecord((await browserFetch(page, "/journal-entries", fixture.tenantA.organizationId)).body)).map(asRecord);
  const reversalJournal = journalsAfterReverse.find((entry) => entry.reversalOfId === journalId || String(entry.description ?? "").includes(journalNumber));
  const reversalJournalNumber = requireString(reversalJournal?.entryNumber, "reversalJournal.entryNumber");

  return { journalId, journalNumber, reversalJournalNumber, description };
}

async function assertJournalReportAndAuditUi(
  page: Page,
  fixture: AccountantBrowserFixtureSet,
  journal: { journalNumber: string; reversalJournalNumber: string; description: string },
): Promise<void> {
  await page.goto("/reports/general-ledger");
  await expect(page.getByRole("heading", { name: "General Ledger", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Run report", exact: true }).click();
  await expect(page.locator("main")).toContainText(journal.journalNumber);
  await expect(page.locator("main")).toContainText(journal.reversalJournalNumber);
  await expect(page.locator("main")).toContainText(journal.description);
  await expectNoForeignMarkers(page, fixture);

  await page.goto("/settings/audit-logs");
  await expect(page.getByRole("heading", { name: "Audit logs", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText(/Sales invoice|Invoice/i);
  await expect(page.locator("main")).toContainText(/Purchase bill|Bill/i);
  await expect(page.locator("main")).toContainText(/Customer payment|Payment/i);
  await expect(page.locator("main")).toContainText(/Journal/i);
  await expectNoForeignMarkers(page, fixture);
}

async function assertTenantBoundaryProof(
  page: Page,
  criticalPageErrors: string[],
  fixture: AccountantBrowserFixtureSet,
  invoice: { invoiceNumber: string },
  bill: { billNumber: string },
): Promise<void> {
  await page.goto("/sales/invoices");
  await expect(page.getByRole("heading", { name: "Sales invoices", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText(invoice.invoiceNumber);
  await expectNoForeignMarkers(page, fixture);

  await page.goto("/purchases/bills");
  await expect(page.getByRole("heading", { name: "Purchase bills", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText(bill.billNumber);
  await expectNoForeignMarkers(page, fixture);

  await expectForeignPageNotFound(page, criticalPageErrors, `/sales/invoices/${fixture.tenantB.foreignInvoiceId}`, fixture);
  await expectForeignPageNotFound(page, criticalPageErrors, `/purchases/bills/${fixture.tenantB.foreignBillId}`, fixture);

  for (const [label, path, forbiddenMarker] of [
    ["foreign invoice API", `/sales-invoices/${fixture.tenantB.foreignInvoiceId}`, fixture.tenantB.foreignInvoiceNumber],
    ["foreign bill API", `/purchase-bills/${fixture.tenantB.foreignBillId}`, fixture.tenantB.foreignBillNumber],
    ["foreign journal API", `/journal-entries/${fixture.tenantB.foreignJournalId}`, fixture.tenantB.foreignJournalNumber],
  ] as const) {
    const result = await browserContextFetch(page, path, fixture.tenantA.organizationId);
    expect(result.status, `${label} should be hidden from tenant A`).toBe(404);
    expect(result.text).not.toContain(forbiddenMarker);
  }

  for (const [label, path] of [
    ["foreign AR report", "/reports/aged-receivables"],
    ["foreign AP report", "/reports/aged-payables"],
    ["foreign general ledger", "/reports/general-ledger"],
  ] as const) {
    const result = await browserContextFetch(page, `${path}?asOf=${todayDate}&from=${todayDate}&to=${todayDate}`, fixture.tenantB.organizationId);
    expect(result.status, `${label} should reject a foreign organization context`).toBe(403);
    expect(result.text).not.toContain(fixture.tenantB.foreignInvoiceNumber);
    expect(result.text).not.toContain(fixture.tenantB.foreignBillNumber);
    expect(result.text).not.toContain(fixture.tenantB.foreignJournalNumber);
  }

  const receivables = await browserFetch(page, `/reports/aged-receivables?asOf=${todayDate}`, fixture.tenantA.organizationId);
  expectOk(receivables, "/reports/aged-receivables");
  expect(receivables.text).not.toContain(fixture.tenantB.foreignInvoiceNumber);
  expect(receivables.text).not.toContain(fixture.tenantB.customerName);

  const payables = await browserFetch(page, `/reports/aged-payables?asOf=${todayDate}`, fixture.tenantA.organizationId);
  expectOk(payables, "/reports/aged-payables");
  expect(payables.text).not.toContain(fixture.tenantB.foreignBillNumber);
  expect(payables.text).not.toContain(fixture.tenantB.supplierName);
}

async function expectForeignPageNotFound(
  page: Page,
  criticalPageErrors: string[],
  path: string,
  fixture: AccountantBrowserFixtureSet,
): Promise<void> {
  const errorCount = criticalPageErrors.length;
  await page.goto(path);
  await expect(page.locator("main")).toContainText(/not found|HTTP 404|Unable to load/i);
  await expectNoForeignMarkers(page, fixture);

  const expectedResourceErrors = criticalPageErrors.splice(errorCount);
  expect(
    expectedResourceErrors.every((message) => /Failed to load resource: the server responded with a status of (400|404)/.test(message)),
    `Unexpected browser errors from foreign page probe: ${expectedResourceErrors.join("\n")}`,
  ).toBe(true);
}

async function expectNoForeignMarkers(page: Page, fixture: AccountantBrowserFixtureSet): Promise<void> {
  const main = page.locator("main");
  await expect(main).not.toContainText(fixture.tenantB.organizationName);
  await expect(main).not.toContainText(fixture.tenantB.customerName);
  await expect(main).not.toContainText(fixture.tenantB.supplierName);
  await expect(main).not.toContainText(fixture.tenantB.foreignInvoiceNumber);
  await expect(main).not.toContainText(fixture.tenantB.foreignBillNumber);
  await expect(main).not.toContainText(fixture.tenantB.foreignJournalNumber);
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

async function findCustomerPaymentId(page: Page, fixture: AccountantBrowserFixtureSet, amountReceived: number): Promise<string> {
  const payments = asArray(asRecord((await browserFetch(page, "/customer-payments", fixture.tenantA.organizationId)).body)).map(asRecord);
  const match = payments.find(
    (payment) => payment.customerId === fixture.tenantA.customerId && decimalMatches(payment.amountReceived, amountReceived),
  );
  return requireString(match?.id, "customerPayment.id");
}

async function findSupplierPaymentId(page: Page, fixture: AccountantBrowserFixtureSet, amountPaid: number): Promise<string> {
  const payments = asArray(asRecord((await browserFetch(page, "/supplier-payments", fixture.tenantA.organizationId)).body)).map(asRecord);
  const match = payments.find((payment) => payment.supplierId === fixture.tenantA.supplierId && decimalMatches(payment.amountPaid, amountPaid));
  return requireString(match?.id, "supplierPayment.id");
}

function expectOk(result: BrowserFetchResult, label: string) {
  expect(result.ok, `${label} returned HTTP ${result.status}: ${result.text.slice(0, 300)}`).toBe(true);
}

function requireFixture(fixture: AccountantBrowserFixtureSet | undefined): AccountantBrowserFixtureSet {
  if (!fixture) {
    throw new Error("Accountant workflow browser fixture was not initialized.");
  }
  return fixture;
}

function idFromCurrentUrl(page: Page, prefix: string): string {
  const path = new URL(page.url()).pathname;
  const id = entityIdFromPath(path, prefix);
  if (!id) {
    throw new Error(`Unable to read id from URL ${page.url()} with prefix ${prefix}`);
  }
  return id;
}

function idFromCurrentUrlOrNull(page: Page, prefix: string): string | null {
  return entityIdFromPath(new URL(page.url()).pathname, prefix);
}

async function waitForEntityUrl(page: Page, prefix: string): Promise<void> {
  await page.waitForURL((url) => {
    return Boolean(entityIdFromPath(url.pathname, prefix));
  }, { timeout: 30_000 });
}

async function waitForEntityOrSourceUrl(page: Page, entityPrefix: string, sourcePath: string): Promise<void> {
  await page.waitForURL((url) => url.pathname === sourcePath || Boolean(entityIdFromPath(url.pathname, entityPrefix)), {
    timeout: 30_000,
  });
}

function entityIdFromPath(path: string, prefix: string): string | null {
  if (!path.startsWith(prefix)) {
    return null;
  }
  const id = path.slice(prefix.length).split("/")[0];
  return isUuid(id) ? id : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function expectDecimal(value: unknown, label: string, expected: number): void {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  expect(Number.isFinite(numeric), `${label} must be a numeric decimal value.`).toBe(true);
  expect(numeric, label).toBeCloseTo(expected, 4);
}

function decimalMatches(value: unknown, expected: number): boolean {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) && Math.abs(numeric - expected) < 0.0001;
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days, 0, 0, 0, 0));
}
