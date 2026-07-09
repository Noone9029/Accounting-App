import { type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { PERMISSIONS } from "@ledgerbyte/shared";
import {
  AccountType,
  AttachmentLinkedEntityType,
  AttachmentStatus,
  AttachmentStorageProvider,
  BankAccountStatus,
  BankAccountType,
  ContactType,
  CustomerPaymentStatus,
  DocumentType,
  GeneratedDocumentStatus,
  JournalEntryStatus,
  MembershipStatus,
  PrismaClient,
  PurchaseBillStatus,
  SupplierPaymentStatus,
  SalesInvoiceStatus,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import { AuditLogController } from "./audit-log/audit-log.controller";
import { AUDIT_EVENTS } from "./audit-log/audit-events";
import { AuditLogService } from "./audit-log/audit-log.service";
import { DatabaseAttachmentStorageService, AttachmentStorageService } from "./attachments/attachment-storage.service";
import { AttachmentController } from "./attachments/attachment.controller";
import { AttachmentService } from "./attachments/attachment.service";
import { AuthTokenRateLimitService } from "./auth/auth-token-rate-limit.service";
import { AuthTokenService } from "./auth/auth-token.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { AuthSessionService } from "./auth/auth-session.service";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "./auth/guards/organization-context.guard";
import { PermissionGuard } from "./auth/guards/permission.guard";
import { LoginThrottleService } from "./auth/login-throttle.service";
import { configureApp } from "./app-bootstrap";
import { ContactController } from "./contacts/contact.controller";
import { ContactLedgerService } from "./contacts/contact-ledger.service";
import { ContactService } from "./contacts/contact.service";
import { SupplierApDashboardService } from "./contacts/supplier-ap-dashboard.service";
import { CreditNoteService } from "./credit-notes/credit-note.service";
import { OrganizationDocumentSettingsService } from "./document-settings/organization-document-settings.service";
import { EmailService } from "./email/email.service";
import { FiscalPeriodGuardService } from "./fiscal-periods/fiscal-period-guard.service";
import { GeneratedDocumentController } from "./generated-documents/generated-document.controller";
import { GeneratedDocumentService } from "./generated-documents/generated-document.service";
import { AccountingService } from "./accounting/accounting.service";
import { NumberSequenceService } from "./number-sequences/number-sequence.service";
import { ObservabilityContextService } from "./observability/observability-context.service";
import { PrismaService } from "./prisma/prisma.service";
import { PurchaseBillController } from "./purchase-bills/purchase-bill.controller";
import { PurchaseBillService } from "./purchase-bills/purchase-bill.service";
import { ReportsController } from "./reports/reports.controller";
import { ReportsService } from "./reports/reports.service";
import { SalesInvoiceController } from "./sales-invoices/sales-invoice.controller";
import { SalesInvoiceService } from "./sales-invoices/sales-invoice.service";

type ReportExportDbSettings =
  | { enabled: false; databaseUrl?: undefined }
  | { enabled: true; databaseUrl: string };

interface ReportExportFixtureSet {
  marker: string;
  tenantA: ReportExportTenantFixture;
  tenantB: ReportExportTenantFixture;
}

interface ReportExportTenantFixture {
  organizationId: string;
  userId: string;
  email: string;
  roleId: string;
  memberId: string;
  customerId: string;
  supplierId: string;
  customerName: string;
  supplierName: string;
  invoiceId: string;
  invoiceNumber: string;
  billId: string;
  billNumber: string;
  customerPaymentId: string;
  customerPaymentNumber: string;
  supplierPaymentId: string;
  supplierPaymentNumber: string;
  generatedDocumentId: string;
  attachmentId: string;
  amounts: ReportExportTenantAmounts;
  accounts: {
    cash: string;
    accountsReceivable: string;
    accountsPayable: string;
    vatPayable: string;
    vatReceivable: string;
    revenue: string;
    expense: string;
  };
}

interface ReportExportTenantAmounts {
  invoiceTotal: string;
  customerPayment: string;
  invoiceBalance: string;
  billTotal: string;
  supplierPayment: string;
  billBalance: string;
  expectedRevenue: string;
  expectedExpenses: string;
  expectedNetProfit: string;
}

type ProofSession = {
  cookieHeader: string;
  organizationId: string;
};

const DB_INTEGRATION_SETTINGS = resolveReportExportDbSettings(process.env);
const DATABASE_URL = DB_INTEGRATION_SETTINGS.enabled ? DB_INTEGRATION_SETTINGS.databaseUrl : undefined;
const describeReportExportDb = DB_INTEGRATION_SETTINGS.enabled ? describe : describe.skip;
const PROOF_FROM = "2026-03-01";
const PROOF_TO = "2026-03-31";
const PROOF_AS_OF = "2026-03-31";
const LOGIN_VALUE = "LocalOnlyProofPass!2026";

describe("accountant report/export proof DB URL gate", () => {
  it("skips safely when the opt-in environment variable is not set", () => {
    expect(resolveReportExportDbSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
  });

  it("requires LEDGERBYTE_TEST_DATABASE_URL when the report/export DB proof is enabled", () => {
    expect(() =>
      resolveReportExportDbSettings({
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_DB_INTEGRATION: "1",
        DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_DB_INTEGRATION=1");
  });

  it("rejects hosted or non-local database URLs", () => {
    expect(() =>
      resolveReportExportDbSettings({
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@db.example.com/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("local-only");
  });

  it("rejects production-looking database names", () => {
    expect(() =>
      resolveReportExportDbSettings({
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting_prod?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("disposable local database name");
  });

  it("accepts an explicit disposable local test database URL", () => {
    const localUrl = "postgresql://accounting:accounting@localhost:5432/accounting?schema=public";

    expect(
      resolveReportExportDbSettings({
        LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: localUrl,
      } as NodeJS.ProcessEnv),
    ).toEqual({ enabled: true, databaseUrl: localUrl });
  });
});

describeReportExportDb("accountant report/export proof: guarded HTTP routes against local Prisma DB", () => {
  jest.setTimeout(120_000);

  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaClient;
  let fixture: ReportExportFixtureSet;
  let tenantASession: ProofSession;
  let tenantBSession: ProofSession;
  let previousDatabaseUrl: string | undefined;

  beforeAll(async () => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = DATABASE_URL;

    prisma = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
      transactionOptions: { maxWait: 10_000, timeout: 25_000 },
    });
    await prisma.$connect();

    fixture = await seedReportExportFixture(prisma);
    const config = makeConfigService();

    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        ReportsController,
        ContactController,
        SalesInvoiceController,
        PurchaseBillController,
        GeneratedDocumentController,
        AttachmentController,
        AuditLogController,
      ],
      providers: [
        Reflector,
        JwtAuthGuard,
        OrganizationContextGuard,
        PermissionGuard,
        ObservabilityContextService,
        JwtService,
        AuthSessionService,
        AuthService,
        AuditLogService,
        ReportsService,
        ContactService,
        ContactLedgerService,
        SalesInvoiceService,
        PurchaseBillService,
        GeneratedDocumentService,
        AttachmentService,
        OrganizationDocumentSettingsService,
        FiscalPeriodGuardService,
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: prisma },
        { provide: LoginThrottleService, useValue: makeLoginThrottleService() },
        { provide: AuthTokenService, useValue: makeAuthTokenService() },
        { provide: AuthTokenRateLimitService, useValue: makeAuthTokenRateLimitService() },
        { provide: EmailService, useValue: makeEmailService() },
        { provide: SupplierApDashboardService, useValue: makeSupplierApDashboardService() },
        { provide: CreditNoteService, useValue: makeCreditNoteService() },
        { provide: AccountingService, useValue: makeAccountingService() },
        { provide: NumberSequenceService, useValue: makeNumberSequenceService() },
        { provide: AttachmentStorageService, useClass: DatabaseAttachmentStorageService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    await app.listen(0);
    baseUrl = getBaseUrl(app);

    tenantASession = await login(fixture.tenantA);
    tenantBSession = await login(fixture.tenantB);
  });

  afterAll(async () => {
    if (fixture) {
      await cleanupReportExportFixture(prisma, fixture);
    }
    if (app) {
      await app.close();
    }
    await prisma?.$disconnect();
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  it("proves core JSON reports and dashboard summary are tenant-scoped and calculated from posted local data", async () => {
    const profitAndLoss = await getJson<Record<string, unknown>>(`/reports/profit-and-loss?from=${PROOF_FROM}&to=${PROOF_TO}`);
    expect(profitAndLoss.status).toBe(200);
    expect(profitAndLoss.body.revenue).toBe(fixture.tenantA.amounts.expectedRevenue);
    expect(profitAndLoss.body.expenses).toBe(fixture.tenantA.amounts.expectedExpenses);
    expect(profitAndLoss.body.netProfit).toBe(fixture.tenantA.amounts.expectedNetProfit);
    assertTenantBAbsent(profitAndLoss.text, fixture);

    const balanceSheet = await getJson<Record<string, unknown>>(`/reports/balance-sheet?asOf=${PROOF_AS_OF}`);
    expect(balanceSheet.status).toBe(200);
    expect(balanceSheet.body.balanced).toBe(true);
    expect(balanceSheet.body.retainedEarnings).toBe(fixture.tenantA.amounts.expectedNetProfit);
    assertTenantBAbsent(balanceSheet.text, fixture);

    const trialBalance = await getJson<{ totals: { balanced: boolean; closingDebit: string; closingCredit: string } }>(
      `/reports/trial-balance?from=${PROOF_FROM}&to=${PROOF_TO}`,
    );
    expect(trialBalance.status).toBe(200);
    expect(trialBalance.body.totals.balanced).toBe(true);
    expect(trialBalance.body.totals.closingDebit).toBe(trialBalance.body.totals.closingCredit);
    assertTenantBAbsent(trialBalance.text, fixture);

    const generalLedger = await getJson<Record<string, unknown>>(`/reports/general-ledger?from=${PROOF_FROM}&to=${PROOF_TO}`);
    expect(generalLedger.status).toBe(200);
    expect(generalLedger.text).toContain(fixture.tenantA.invoiceNumber);
    expect(generalLedger.text).toContain(fixture.tenantA.billNumber);
    assertTenantBAbsent(generalLedger.text, fixture);

    const dashboard = await getJson<{
      receivables: { total: string };
      payables: { total: string };
      revenue: { currentPeriod: string };
      cashAndBank: { balance: string; accountCount: number };
    }>(`/reports/dashboard-summary?from=${PROOF_FROM}&to=${PROOF_TO}&asOf=${PROOF_AS_OF}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.receivables.total).toBe(fixture.tenantA.amounts.invoiceBalance);
    expect(dashboard.body.payables.total).toBe(fixture.tenantA.amounts.billBalance);
    expect(dashboard.body.revenue.currentPeriod).toBe(fixture.tenantA.amounts.expectedRevenue);
    expect(dashboard.body.cashAndBank.accountCount).toBe(1);
    assertTenantBAbsent(dashboard.text, fixture);
  });

  it("proves AR/AP aging plus customer and supplier statements remain tenant-scoped over HTTP", async () => {
    const arAging = await getJson<{ grandTotal: string; rows: Array<{ number: string; balanceDue: string }> }>(
      `/reports/aged-receivables?asOf=${PROOF_AS_OF}`,
    );
    expect(arAging.status).toBe(200);
    expect(arAging.body.grandTotal).toBe(fixture.tenantA.amounts.invoiceBalance);
    expect(arAging.text).toContain(fixture.tenantA.invoiceNumber);
    assertTenantBAbsent(arAging.text, fixture);

    const apAging = await getJson<{ grandTotal: string; rows: Array<{ number: string; balanceDue: string }> }>(
      `/reports/aged-payables?asOf=${PROOF_AS_OF}`,
    );
    expect(apAging.status).toBe(200);
    expect(apAging.body.grandTotal).toBe(fixture.tenantA.amounts.billBalance);
    expect(apAging.text).toContain(fixture.tenantA.billNumber);
    assertTenantBAbsent(apAging.text, fixture);

    const customerLedger = await getJson<{ closingBalance: string }>(`/contacts/${fixture.tenantA.customerId}/ledger`);
    expect(customerLedger.status).toBe(200);
    expect(customerLedger.body.closingBalance).toBe(fixture.tenantA.amounts.invoiceBalance);
    expect(customerLedger.text).toContain(fixture.tenantA.invoiceNumber);
    assertTenantBAbsent(customerLedger.text, fixture);

    const customerStatement = await getJson<{ closingBalance: string }>(
      `/contacts/${fixture.tenantA.customerId}/statement?from=${PROOF_FROM}&to=${PROOF_TO}`,
    );
    expect(customerStatement.status).toBe(200);
    expect(customerStatement.body.closingBalance).toBe(fixture.tenantA.amounts.invoiceBalance);
    assertTenantBAbsent(customerStatement.text, fixture);

    const supplierLedger = await getJson<{ closingBalance: string }>(`/contacts/${fixture.tenantA.supplierId}/supplier-ledger`);
    expect(supplierLedger.status).toBe(200);
    expect(supplierLedger.body.closingBalance).toBe(fixture.tenantA.amounts.billBalance);
    expect(supplierLedger.text).toContain(fixture.tenantA.billNumber);
    assertTenantBAbsent(supplierLedger.text, fixture);

    const supplierStatement = await getJson<{ closingBalance: string }>(
      `/contacts/${fixture.tenantA.supplierId}/supplier-statement?from=${PROOF_FROM}&to=${PROOF_TO}`,
    );
    expect(supplierStatement.status).toBe(200);
    expect(supplierStatement.body.closingBalance).toBe(fixture.tenantA.amounts.billBalance);
    assertTenantBAbsent(supplierStatement.text, fixture);
  });

  it("proves CSV exports and generated report PDFs do not leak another tenant's data", async () => {
    const csvPaths = [
      `/reports/profit-and-loss?from=${PROOF_FROM}&to=${PROOF_TO}&format=csv`,
      `/reports/trial-balance?from=${PROOF_FROM}&to=${PROOF_TO}&format=csv`,
      `/reports/aged-receivables?asOf=${PROOF_AS_OF}&format=csv`,
      `/reports/aged-payables?asOf=${PROOF_AS_OF}&format=csv`,
    ];

    for (const path of csvPaths) {
      const response = await request(path);
      const csv = await response.text();
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/csv");
      assertTenantBAbsent(csv, fixture);
    }

    const profitPdf = await request(`/reports/profit-and-loss/pdf?from=${PROOF_FROM}&to=${PROOF_TO}`);
    expect(profitPdf.status).toBe(200);
    expect(profitPdf.headers.get("content-type")).toContain("application/pdf");
    expect(profitPdf.headers.get("content-disposition")).toContain("profit-and-loss");
    expect((await profitPdf.arrayBuffer()).byteLength).toBeGreaterThan(100);

    const arPdf = await request(`/reports/aged-receivables/pdf?asOf=${PROOF_AS_OF}`);
    expect(arPdf.status).toBe(200);
    expect(arPdf.headers.get("content-type")).toContain("application/pdf");
    expect((await arPdf.arrayBuffer()).byteLength).toBeGreaterThan(100);

    const foreignAccountFilter = await getJson<Record<string, unknown>>(
      `/reports/general-ledger?from=${PROOF_FROM}&to=${PROOF_TO}&accountId=${fixture.tenantB.accounts.revenue}`,
    );
    expect(foreignAccountFilter.status).toBe(200);
    assertTenantBAbsent(foreignAccountFilter.text, fixture);
  });

  it("proves invoice, bill, generated-document, and attachment downloads are tenant-scoped", async () => {
    const invoiceData = await getJson<Record<string, unknown>>(`/sales-invoices/${fixture.tenantA.invoiceId}/pdf-data`);
    expect(invoiceData.status).toBe(200);
    expect(invoiceData.text).toContain(fixture.tenantA.customerName);
    expect(invoiceData.text).toContain(fixture.tenantA.invoiceNumber);
    assertTenantBAbsent(invoiceData.text, fixture);

    const invoicePdf = await request(`/sales-invoices/${fixture.tenantA.invoiceId}/pdf`);
    expect(invoicePdf.status).toBe(200);
    expect(invoicePdf.headers.get("content-type")).toContain("application/pdf");
    expect(invoicePdf.headers.get("content-disposition")).toContain(fixture.tenantA.invoiceNumber);
    expect((await invoicePdf.arrayBuffer()).byteLength).toBeGreaterThan(100);

    const billData = await getJson<Record<string, unknown>>(`/purchase-bills/${fixture.tenantA.billId}/pdf-data`);
    expect(billData.status).toBe(200);
    expect(billData.text).toContain(fixture.tenantA.supplierName);
    expect(billData.text).toContain(fixture.tenantA.billNumber);
    assertTenantBAbsent(billData.text, fixture);

    const billPdf = await request(`/purchase-bills/${fixture.tenantA.billId}/pdf`);
    expect(billPdf.status).toBe(200);
    expect(billPdf.headers.get("content-type")).toContain("application/pdf");
    expect(billPdf.headers.get("content-disposition")).toContain(fixture.tenantA.billNumber);
    expect((await billPdf.arrayBuffer()).byteLength).toBeGreaterThan(100);

    const generatedDocument = await request(`/generated-documents/${fixture.tenantA.generatedDocumentId}/download`);
    expect(generatedDocument.status).toBe(200);
    expect(generatedDocument.headers.get("content-type")).toContain("application/pdf");
    expect(await generatedDocument.text()).toContain(fixture.tenantA.invoiceNumber);

    const attachment = await request(`/attachments/${fixture.tenantA.attachmentId}/download`);
    expect(attachment.status).toBe(200);
    expect(attachment.headers.get("content-type")).toContain("application/pdf");
    expect(await attachment.text()).toContain(fixture.tenantA.invoiceNumber);

    await expectStatus(`/sales-invoices/${fixture.tenantB.invoiceId}/pdf-data`, 404);
    await expectStatus(`/sales-invoices/${fixture.tenantB.invoiceId}/pdf`, 404);
    await expectStatus(`/purchase-bills/${fixture.tenantB.billId}/pdf-data`, 404);
    await expectStatus(`/purchase-bills/${fixture.tenantB.billId}/pdf`, 404);
    await expectStatus(`/generated-documents/${fixture.tenantB.generatedDocumentId}/download`, 404);
    await expectStatus(`/attachments/${fixture.tenantB.attachmentId}/download`, 404);
    await expectStatus(`/contacts/${fixture.tenantB.customerId}/statement?from=${PROOF_FROM}&to=${PROOF_TO}`, 404);
    await expectStatus(`/contacts/${fixture.tenantB.supplierId}/supplier-statement?from=${PROOF_FROM}&to=${PROOF_TO}`, 404);
  });

  it("proves organization switching is rejected and export audit evidence remains tenant-scoped", async () => {
    const switchAttempt = await request(`/reports/profit-and-loss?from=${PROOF_FROM}&to=${PROOF_TO}`, {
      organizationId: fixture.tenantB.organizationId,
    });
    expect(switchAttempt.status).toBe(403);

    const tenantBAging = await getJson<{ grandTotal: string }>(`/reports/aged-receivables?asOf=${PROOF_AS_OF}`, {
      session: tenantBSession,
      organizationId: fixture.tenantB.organizationId,
    });
    expect(tenantBAging.status).toBe(200);
    expect(tenantBAging.body.grandTotal).toBe(fixture.tenantB.amounts.invoiceBalance);
    expect(tenantBAging.text).toContain(fixture.tenantB.invoiceNumber);
    expect(tenantBAging.text).not.toContain(fixture.tenantA.invoiceNumber);

    const logs = await getJson<{ data: Array<{ action: string; organizationId: string }> }>("/audit-logs");
    expect(logs.status).toBe(200);
    expect(logs.body.data.every((log) => log.organizationId === fixture.tenantA.organizationId)).toBe(true);
    expect(logs.body.data.map((log) => log.action)).toContain(AUDIT_EVENTS.GENERATED_DOCUMENT_CREATED);
    assertTenantBAbsent(logs.text, fixture);

    const auditExport = await request("/audit-logs/export.csv");
    const csv = await auditExport.text();
    expect(auditExport.status).toBe(200);
    expect(auditExport.headers.get("content-type")).toContain("text/csv");
    expect(csv).toContain(AUDIT_EVENTS.GENERATED_DOCUMENT_CREATED);
    assertTenantBAbsent(csv, fixture);
  });

  async function login(tenant: ReportExportTenantFixture): Promise<ProofSession> {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: tenant.email, password: LOGIN_VALUE }),
    });
    const text = await response.text();
    expect(response.status).toBe(201);
    expect(text).toContain(tenant.email);
    const cookies = response.headers.getSetCookie?.() ?? splitSetCookieHeader(response.headers.get("set-cookie"));
    const cookieHeader = cookies.map((cookie) => cookie.split(";")[0]).join("; ");
    expect(cookieHeader).toContain("ledgerbyte_auth=");
    return { cookieHeader, organizationId: tenant.organizationId };
  }

  async function getJson<T>(
    path: string,
    options: { session?: ProofSession; organizationId?: string } = {},
  ): Promise<{ status: number; body: T; text: string; response: Response }> {
    const response = await request(path, options);
    const text = await response.text();
    return { status: response.status, body: JSON.parse(text) as T, text, response };
  }

  async function expectStatus(path: string, status: number): Promise<void> {
    const response = await request(path);
    const text = await response.text();
    expect(response.status).toBe(status);
    assertTenantBAbsent(text, fixture);
  }

  async function request(
    path: string,
    options: { session?: ProofSession; organizationId?: string } = {},
  ): Promise<Response> {
    const session = options.session ?? tenantASession;
    return fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        cookie: session.cookieHeader,
        "x-organization-id": options.organizationId ?? session.organizationId,
      },
    });
  }
});

function resolveReportExportDbSettings(env: NodeJS.ProcessEnv): ReportExportDbSettings {
  if (env.LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_DB_INTEGRATION !== "1") {
    return { enabled: false };
  }

  const databaseUrl = env.LEDGERBYTE_TEST_DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_DB_INTEGRATION=1");
  }

  assertLocalDisposableDatabaseUrl(databaseUrl);
  return { enabled: true, databaseUrl };
}

function assertLocalDisposableDatabaseUrl(databaseUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be a valid local-only PostgreSQL URL.");
  }

  const isPostgres = parsed.protocol === "postgresql:" || parsed.protocol === "postgres:";
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (!isPostgres || !localHosts.has(parsed.hostname)) {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must point to a local-only PostgreSQL database.");
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, "")).toLowerCase();
  if (!databaseName || /(prod|production|live|hosted|staging)/.test(databaseName) || !/(accounting|ledgerbyte|test|local)/.test(databaseName)) {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must use a disposable local database name.");
  }
}

async function seedReportExportFixture(prisma: PrismaClient): Promise<ReportExportFixtureSet> {
  const marker = `AREP-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const uniqueSuffix = marker.replace(/[^A-Za-z0-9]/g, "").slice(-12).toLowerCase();
  const tenantA = fixtureIds(marker, uniqueSuffix, "A", {
    invoiceTotal: "120.0000",
    customerPayment: "75.0000",
    invoiceBalance: "45.0000",
    billTotal: "150.0000",
    supplierPayment: "80.0000",
    billBalance: "70.0000",
    expectedRevenue: "120.0000",
    expectedExpenses: "150.0000",
    expectedNetProfit: "-30.0000",
  });
  const tenantB = fixtureIds(marker, uniqueSuffix, "B", {
    invoiceTotal: "987.0000",
    customerPayment: "456.0000",
    invoiceBalance: "531.0000",
    billTotal: "654.0000",
    supplierPayment: "321.0000",
    billBalance: "333.0000",
    expectedRevenue: "987.0000",
    expectedExpenses: "654.0000",
    expectedNetProfit: "333.0000",
  });
  const passwordHash = await bcrypt.hash(LOGIN_VALUE, 4);

  await prisma.user.createMany({
    data: [
      { id: tenantA.userId, email: tenantA.email, name: `${marker} User A`, passwordHash },
      { id: tenantB.userId, email: tenantB.email, name: `${marker} User B`, passwordHash },
    ],
  });
  await prisma.organization.createMany({
    data: [
      { id: tenantA.organizationId, name: `${marker} Organization A`, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
      { id: tenantB.organizationId, name: `${marker} Organization B`, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
    ],
  });
  await prisma.role.createMany({
    data: [
      {
        id: tenantA.roleId,
        organizationId: tenantA.organizationId,
        name: `${marker} Accountant Report Export A`,
        permissions: [PERMISSIONS.admin.fullAccess],
        isSystem: true,
      },
      {
        id: tenantB.roleId,
        organizationId: tenantB.organizationId,
        name: `${marker} Accountant Report Export B`,
        permissions: [PERMISSIONS.admin.fullAccess],
        isSystem: true,
      },
    ],
  });
  await prisma.organizationMember.createMany({
    data: [
      { id: tenantA.memberId, organizationId: tenantA.organizationId, userId: tenantA.userId, roleId: tenantA.roleId, status: MembershipStatus.ACTIVE },
      { id: tenantB.memberId, organizationId: tenantB.organizationId, userId: tenantB.userId, roleId: tenantB.roleId, status: MembershipStatus.ACTIVE },
    ],
  });

  await seedTenantRecords(prisma, tenantA, "A");
  await seedTenantRecords(prisma, tenantB, "B");

  return { marker, tenantA, tenantB };
}

function fixtureIds(
  marker: string,
  uniqueSuffix: string,
  tenantLabel: "A" | "B",
  amounts: ReportExportTenantAmounts,
): ReportExportTenantFixture {
  const tenantSuffix = `${uniqueSuffix}-${tenantLabel.toLowerCase()}`;
  const invoiceNumber = `${marker}-INV-${tenantLabel}`;
  const billNumber = `${marker}-BILL-${tenantLabel}`;
  return {
    organizationId: randomUUID(),
    userId: randomUUID(),
    email: `accountant-report-export-${tenantSuffix}@example.test`,
    roleId: randomUUID(),
    memberId: randomUUID(),
    customerId: randomUUID(),
    supplierId: randomUUID(),
    customerName: `${marker} Customer ${tenantLabel}`,
    supplierName: `${marker} Supplier ${tenantLabel}`,
    invoiceId: randomUUID(),
    invoiceNumber,
    billId: randomUUID(),
    billNumber,
    customerPaymentId: randomUUID(),
    customerPaymentNumber: `${marker}-CP-${tenantLabel}`,
    supplierPaymentId: randomUUID(),
    supplierPaymentNumber: `${marker}-SP-${tenantLabel}`,
    generatedDocumentId: randomUUID(),
    attachmentId: randomUUID(),
    amounts,
    accounts: {
      cash: randomUUID(),
      accountsReceivable: randomUUID(),
      accountsPayable: randomUUID(),
      vatPayable: randomUUID(),
      vatReceivable: randomUUID(),
      revenue: randomUUID(),
      expense: randomUUID(),
    },
  };
}

async function seedTenantRecords(prisma: PrismaClient, tenant: ReportExportTenantFixture, tenantLabel: "A" | "B"): Promise<void> {
  const invoiceDate = new Date("2026-03-10T00:00:00.000Z");
  const paymentDate = new Date("2026-03-15T00:00:00.000Z");
  const billDate = new Date("2026-03-11T00:00:00.000Z");
  const supplierPaymentDate = new Date("2026-03-20T00:00:00.000Z");
  const suffix = `${tenant.invoiceNumber}-${tenantLabel}`;

  await prisma.account.createMany({
    data: [
      { id: tenant.accounts.cash, organizationId: tenant.organizationId, code: "100", name: `${tenant.customerName} Cash`, type: AccountType.ASSET },
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
      { id: tenant.accounts.revenue, organizationId: tenant.organizationId, code: "400", name: `${tenant.customerName} Revenue`, type: AccountType.REVENUE },
      { id: tenant.accounts.expense, organizationId: tenant.organizationId, code: "500", name: `${tenant.supplierName} Expense`, type: AccountType.EXPENSE },
    ],
  });

  await prisma.bankAccountProfile.create({
    data: {
      organizationId: tenant.organizationId,
      accountId: tenant.accounts.cash,
      type: BankAccountType.BANK,
      status: BankAccountStatus.ACTIVE,
      displayName: `${tenant.customerName} Operating Cash`,
      currency: "SAR",
    },
  });

  await prisma.contact.createMany({
    data: [
      {
        id: tenant.customerId,
        organizationId: tenant.organizationId,
        type: ContactType.CUSTOMER,
        name: tenant.customerName,
        displayName: tenant.customerName,
        email: `customer-${suffix.toLowerCase()}@example.test`,
      },
      {
        id: tenant.supplierId,
        organizationId: tenant.organizationId,
        type: ContactType.SUPPLIER,
        name: tenant.supplierName,
        displayName: tenant.supplierName,
        email: `supplier-${suffix.toLowerCase()}@example.test`,
      },
    ],
  });

  const invoiceJournalId = randomUUID();
  const customerPaymentJournalId = randomUUID();
  const billJournalId = randomUUID();
  const supplierPaymentJournalId = randomUUID();

  await createPostedJournal(prisma, tenant, {
    id: invoiceJournalId,
    entryNumber: `${tenant.invoiceNumber}-JE`,
    entryDate: invoiceDate,
    description: `${tenant.invoiceNumber} posting`,
    reference: tenant.invoiceNumber,
    total: tenant.amounts.invoiceTotal,
    lines: [
      { accountId: tenant.accounts.accountsReceivable, debit: tenant.amounts.invoiceTotal, credit: "0.0000", description: tenant.invoiceNumber },
      { accountId: tenant.accounts.revenue, debit: "0.0000", credit: tenant.amounts.invoiceTotal, description: tenant.invoiceNumber },
    ],
  });
  await prisma.salesInvoice.create({
    data: {
      id: tenant.invoiceId,
      organizationId: tenant.organizationId,
      invoiceNumber: tenant.invoiceNumber,
      customerId: tenant.customerId,
      issueDate: invoiceDate,
      dueDate: new Date("2026-03-25T00:00:00.000Z"),
      currency: "SAR",
      status: SalesInvoiceStatus.FINALIZED,
      subtotal: tenant.amounts.invoiceTotal,
      taxableTotal: tenant.amounts.invoiceTotal,
      total: tenant.amounts.invoiceTotal,
      balanceDue: tenant.amounts.invoiceBalance,
      createdById: tenant.userId,
      finalizedAt: invoiceDate,
      journalEntryId: invoiceJournalId,
      lines: {
        create: [
          {
            organizationId: tenant.organizationId,
            description: `${tenant.invoiceNumber} service line`,
            accountId: tenant.accounts.revenue,
            quantity: "1.0000",
            unitPrice: tenant.amounts.invoiceTotal,
            lineGrossAmount: tenant.amounts.invoiceTotal,
            taxableAmount: tenant.amounts.invoiceTotal,
            lineSubtotal: tenant.amounts.invoiceTotal,
            lineTotal: tenant.amounts.invoiceTotal,
          },
        ],
      },
    },
  });

  await createPostedJournal(prisma, tenant, {
    id: customerPaymentJournalId,
    entryNumber: `${tenant.customerPaymentNumber}-JE`,
    entryDate: paymentDate,
    description: `${tenant.customerPaymentNumber} posting`,
    reference: tenant.customerPaymentNumber,
    total: tenant.amounts.customerPayment,
    lines: [
      { accountId: tenant.accounts.cash, debit: tenant.amounts.customerPayment, credit: "0.0000", description: tenant.customerPaymentNumber },
      { accountId: tenant.accounts.accountsReceivable, debit: "0.0000", credit: tenant.amounts.customerPayment, description: tenant.customerPaymentNumber },
    ],
  });
  await prisma.customerPayment.create({
    data: {
      id: tenant.customerPaymentId,
      organizationId: tenant.organizationId,
      paymentNumber: tenant.customerPaymentNumber,
      customerId: tenant.customerId,
      paymentDate,
      currency: "SAR",
      status: CustomerPaymentStatus.POSTED,
      amountReceived: tenant.amounts.customerPayment,
      unappliedAmount: "0.0000",
      accountId: tenant.accounts.cash,
      journalEntryId: customerPaymentJournalId,
      createdById: tenant.userId,
      postedAt: paymentDate,
      allocations: {
        create: [
          {
            organizationId: tenant.organizationId,
            invoiceId: tenant.invoiceId,
            amountApplied: tenant.amounts.customerPayment,
          },
        ],
      },
    },
  });

  await createPostedJournal(prisma, tenant, {
    id: billJournalId,
    entryNumber: `${tenant.billNumber}-JE`,
    entryDate: billDate,
    description: `${tenant.billNumber} posting`,
    reference: tenant.billNumber,
    total: tenant.amounts.billTotal,
    lines: [
      { accountId: tenant.accounts.expense, debit: tenant.amounts.billTotal, credit: "0.0000", description: tenant.billNumber },
      { accountId: tenant.accounts.accountsPayable, debit: "0.0000", credit: tenant.amounts.billTotal, description: tenant.billNumber },
    ],
  });
  await prisma.purchaseBill.create({
    data: {
      id: tenant.billId,
      organizationId: tenant.organizationId,
      billNumber: tenant.billNumber,
      supplierId: tenant.supplierId,
      billDate,
      dueDate: new Date("2026-03-26T00:00:00.000Z"),
      currency: "SAR",
      status: PurchaseBillStatus.FINALIZED,
      subtotal: tenant.amounts.billTotal,
      taxableTotal: tenant.amounts.billTotal,
      total: tenant.amounts.billTotal,
      balanceDue: tenant.amounts.billBalance,
      createdById: tenant.userId,
      finalizedAt: billDate,
      journalEntryId: billJournalId,
      lines: {
        create: [
          {
            organizationId: tenant.organizationId,
            description: `${tenant.billNumber} expense line`,
            accountId: tenant.accounts.expense,
            quantity: "1.0000",
            unitPrice: tenant.amounts.billTotal,
            lineGrossAmount: tenant.amounts.billTotal,
            taxableAmount: tenant.amounts.billTotal,
            lineTotal: tenant.amounts.billTotal,
          },
        ],
      },
    },
  });

  await createPostedJournal(prisma, tenant, {
    id: supplierPaymentJournalId,
    entryNumber: `${tenant.supplierPaymentNumber}-JE`,
    entryDate: supplierPaymentDate,
    description: `${tenant.supplierPaymentNumber} posting`,
    reference: tenant.supplierPaymentNumber,
    total: tenant.amounts.supplierPayment,
    lines: [
      { accountId: tenant.accounts.accountsPayable, debit: tenant.amounts.supplierPayment, credit: "0.0000", description: tenant.supplierPaymentNumber },
      { accountId: tenant.accounts.cash, debit: "0.0000", credit: tenant.amounts.supplierPayment, description: tenant.supplierPaymentNumber },
    ],
  });
  await prisma.supplierPayment.create({
    data: {
      id: tenant.supplierPaymentId,
      organizationId: tenant.organizationId,
      paymentNumber: tenant.supplierPaymentNumber,
      supplierId: tenant.supplierId,
      paymentDate: supplierPaymentDate,
      currency: "SAR",
      status: SupplierPaymentStatus.POSTED,
      amountPaid: tenant.amounts.supplierPayment,
      unappliedAmount: "0.0000",
      accountId: tenant.accounts.cash,
      journalEntryId: supplierPaymentJournalId,
      createdById: tenant.userId,
      postedAt: supplierPaymentDate,
      allocations: {
        create: [
          {
            organizationId: tenant.organizationId,
            billId: tenant.billId,
            amountApplied: tenant.amounts.supplierPayment,
          },
        ],
      },
    },
  });

  await createSeededGeneratedDocument(prisma, tenant);
  await createSeededAttachment(prisma, tenant);
  await createSeededAuditLogs(prisma, tenant, [invoiceJournalId, customerPaymentJournalId, billJournalId, supplierPaymentJournalId]);
}

async function createPostedJournal(
  prisma: PrismaClient,
  tenant: ReportExportTenantFixture,
  input: {
    id: string;
    entryNumber: string;
    entryDate: Date;
    description: string;
    reference: string;
    total: string;
    lines: Array<{ accountId: string; debit: string; credit: string; description: string }>;
  },
): Promise<void> {
  await prisma.journalEntry.create({
    data: {
      id: input.id,
      organizationId: tenant.organizationId,
      entryNumber: input.entryNumber,
      status: JournalEntryStatus.POSTED,
      entryDate: input.entryDate,
      description: input.description,
      reference: input.reference,
      currency: "SAR",
      totalDebit: input.total,
      totalCredit: input.total,
      postedAt: input.entryDate,
      postedById: tenant.userId,
      createdById: tenant.userId,
      lines: {
        create: input.lines.map((line, index) => ({
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

async function createSeededGeneratedDocument(prisma: PrismaClient, tenant: ReportExportTenantFixture): Promise<void> {
  const content = Buffer.from(`${tenant.customerName} ${tenant.invoiceNumber} seeded generated document`, "utf8");
  await prisma.generatedDocument.create({
    data: {
      id: tenant.generatedDocumentId,
      organizationId: tenant.organizationId,
      documentType: DocumentType.SALES_INVOICE,
      sourceType: "SalesInvoice",
      sourceId: tenant.invoiceId,
      documentNumber: `${tenant.invoiceNumber}-DOC`,
      filename: `${tenant.invoiceNumber}-document.pdf`,
      mimeType: "application/pdf",
      storageProvider: "database",
      contentBase64: content.toString("base64"),
      contentHash: sha256(content),
      sizeBytes: content.byteLength,
      status: GeneratedDocumentStatus.GENERATED,
      generatedById: tenant.userId,
    },
  });
}

async function createSeededAttachment(prisma: PrismaClient, tenant: ReportExportTenantFixture): Promise<void> {
  const content = Buffer.from(`${tenant.customerName} ${tenant.invoiceNumber} seeded attachment`, "utf8");
  await prisma.attachment.create({
    data: {
      id: tenant.attachmentId,
      organizationId: tenant.organizationId,
      linkedEntityType: AttachmentLinkedEntityType.SALES_INVOICE,
      linkedEntityId: tenant.invoiceId,
      filename: `${tenant.invoiceNumber}-attachment.pdf`,
      originalFilename: `${tenant.invoiceNumber}-attachment.pdf`,
      mimeType: "application/pdf",
      sizeBytes: content.byteLength,
      storageProvider: AttachmentStorageProvider.DATABASE,
      contentBase64: content.toString("base64"),
      contentHash: sha256(content),
      status: AttachmentStatus.ACTIVE,
      uploadedById: tenant.userId,
    },
  });
}

async function createSeededAuditLogs(prisma: PrismaClient, tenant: ReportExportTenantFixture, journalEntryIds: string[]): Promise<void> {
  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: tenant.organizationId,
        actorUserId: tenant.userId,
        action: AUDIT_EVENTS.SALES_INVOICE_FINALIZED,
        entityType: "SalesInvoice",
        entityId: tenant.invoiceId,
        after: { invoiceNumber: tenant.invoiceNumber, journalEntryId: journalEntryIds[0] },
      },
      {
        organizationId: tenant.organizationId,
        actorUserId: tenant.userId,
        action: AUDIT_EVENTS.CUSTOMER_PAYMENT_CREATED,
        entityType: "CustomerPayment",
        entityId: tenant.customerPaymentId,
        after: { paymentNumber: tenant.customerPaymentNumber, journalEntryId: journalEntryIds[1] },
      },
      {
        organizationId: tenant.organizationId,
        actorUserId: tenant.userId,
        action: AUDIT_EVENTS.PURCHASE_BILL_FINALIZED,
        entityType: "PurchaseBill",
        entityId: tenant.billId,
        after: { billNumber: tenant.billNumber, journalEntryId: journalEntryIds[2] },
      },
      {
        organizationId: tenant.organizationId,
        actorUserId: tenant.userId,
        action: AUDIT_EVENTS.SUPPLIER_PAYMENT_CREATED,
        entityType: "SupplierPayment",
        entityId: tenant.supplierPaymentId,
        after: { paymentNumber: tenant.supplierPaymentNumber, journalEntryId: journalEntryIds[3] },
      },
      {
        organizationId: tenant.organizationId,
        actorUserId: tenant.userId,
        action: AUDIT_EVENTS.ATTACHMENT_UPLOADED,
        entityType: "Attachment",
        entityId: tenant.attachmentId,
        after: { filename: `${tenant.invoiceNumber}-attachment.pdf` },
      },
    ],
  });
}

async function cleanupReportExportFixture(prisma: PrismaClient, fixture: ReportExportFixtureSet): Promise<void> {
  await prisma.organization.deleteMany({
    where: { id: { in: [fixture.tenantA.organizationId, fixture.tenantB.organizationId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [fixture.tenantA.userId, fixture.tenantB.userId] } },
  });
}

function assertTenantBAbsent(text: string, fixture: ReportExportFixtureSet): void {
  expect(text).not.toContain(fixture.tenantB.email);
  expect(text).not.toContain(fixture.tenantB.customerName);
  expect(text).not.toContain(fixture.tenantB.supplierName);
  expect(text).not.toContain(fixture.tenantB.invoiceNumber);
  expect(text).not.toContain(fixture.tenantB.billNumber);
  expect(text).not.toContain(fixture.tenantB.amounts.invoiceTotal);
  expect(text).not.toContain(fixture.tenantB.amounts.billTotal);
}

function makeConfigService(): ConfigService {
  const values: Record<string, string> = {
    APP_ENV: "test",
    AUTH_COOKIE_SECURE: "false",
    CORS_ORIGIN: "http://localhost:3000",
    JWT_EXPIRES_IN: "1h",
  };

  return {
    get: jest.fn((key: string) => values[key] ?? process.env[key]),
  } as unknown as ConfigService;
}

function makeLoginThrottleService(): LoginThrottleService {
  return {
    assertLoginAllowed: jest.fn(async () => ({ allowed: true as const })),
    recordFailedLogin: jest.fn(async () => undefined),
    resetSuccessfulLogin: jest.fn(async () => undefined),
  } as unknown as LoginThrottleService;
}

function makeAuthTokenService(): AuthTokenService {
  return {
    preview: jest.fn(),
    getTokenForUse: jest.fn(),
    create: jest.fn(),
    consume: jest.fn(),
    cleanupExpiredUnconsumed: jest.fn(),
  } as unknown as AuthTokenService;
}

function makeAuthTokenRateLimitService(): AuthTokenRateLimitService {
  return {
    registerPasswordResetAttempt: jest.fn(async () => ({ allowed: true, blockingReasons: [] })),
  } as unknown as AuthTokenRateLimitService;
}

function makeEmailService(): Partial<EmailService> {
  return {
    sendPasswordReset: jest.fn(),
  } as unknown as Partial<EmailService>;
}

function makeSupplierApDashboardService(): Partial<SupplierApDashboardService> {
  return {
    dashboard: jest.fn(),
    supplierSummary: jest.fn(),
  };
}

function makeCreditNoteService(): Partial<CreditNoteService> {
  return {
    listForInvoice: jest.fn(async () => []),
    allocationsForInvoice: jest.fn(async () => []),
  } as unknown as Partial<CreditNoteService>;
}

function makeAccountingService(): Partial<AccountingService> {
  return {};
}

function makeNumberSequenceService(): Partial<NumberSequenceService> {
  return {};
}

function getBaseUrl(app: INestApplication): string {
  const address = app.getHttpServer().address();
  if (typeof address === "string" || !address) {
    throw new Error("Expected the HTTP server to listen on a TCP port.");
  }
  return `http://127.0.0.1:${address.port}`;
}

function splitSetCookieHeader(header: string | null): string[] {
  if (!header) {
    return [];
  }
  return header.split(/,(?=\s*[^;=]+=[^;]+)/).map((cookie) => cookie.trim());
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
