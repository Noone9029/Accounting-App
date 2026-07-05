import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import {
  AccountType,
  AttachmentLinkedEntityType,
  AttachmentStatus,
  AttachmentStorageProvider,
  ContactType,
  CustomerPaymentStatus,
  DocumentType,
  GeneratedDocumentStatus,
  JournalEntryStatus,
  MembershipStatus,
  PrismaClient,
  PurchaseBillStatus,
  SalesInvoiceStatus,
  SupplierPaymentStatus,
} from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { AccountingService } from "./accounting/accounting.service";
import { AttachmentService } from "./attachments/attachment.service";
import { AuditLogService } from "./audit-log/audit-log.service";
import { OrganizationContextGuard } from "./auth/guards/organization-context.guard";
import { ChartOfAccountsService } from "./chart-of-accounts/chart-of-accounts.service";
import { ContactService } from "./contacts/contact.service";
import { CustomerPaymentService } from "./customer-payments/customer-payment.service";
import { GeneratedDocumentService } from "./generated-documents/generated-document.service";
import { OrganizationMemberService } from "./organization-members/organization-member.service";
import { OrganizationService } from "./organizations/organization.service";
import { PrismaService } from "./prisma/prisma.service";
import { PurchaseBillService } from "./purchase-bills/purchase-bill.service";
import { ReportsService } from "./reports/reports.service";
import { SalesInvoiceService } from "./sales-invoices/sales-invoice.service";
import { SearchService } from "./search/search.service";
import { SupplierPaymentService } from "./supplier-payments/supplier-payment.service";

type TenantDbIntegrationSettings =
  | { enabled: false; databaseUrl?: undefined }
  | { enabled: true; databaseUrl: string };

const DB_INTEGRATION_SETTINGS = resolveTenantDbIntegrationSettings(process.env);
const DATABASE_URL = DB_INTEGRATION_SETTINGS.enabled ? DB_INTEGRATION_SETTINGS.databaseUrl : undefined;
const describeTenantDb = DB_INTEGRATION_SETTINGS.enabled ? describe : describe.skip;

describe("tenant isolation DB integration URL gate", () => {
  it("skips safely when the opt-in environment variable is not set", () => {
    expect(resolveTenantDbIntegrationSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
  });

  it("requires LEDGERBYTE_TEST_DATABASE_URL when the DB integration spec is enabled", () => {
    expect(() =>
      resolveTenantDbIntegrationSettings({
        LEDGERBYTE_TENANT_DB_INTEGRATION: "1",
        DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_TENANT_DB_INTEGRATION=1");
  });

  it("rejects hosted or non-local database URLs", () => {
    expect(() =>
      resolveTenantDbIntegrationSettings({
        LEDGERBYTE_TENANT_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@db.example.com/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("local-only");
  });

  it("rejects production-looking database names", () => {
    expect(() =>
      resolveTenantDbIntegrationSettings({
        LEDGERBYTE_TENANT_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting_prod?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("disposable local database name");
  });

  it("accepts an explicit disposable local test database URL", () => {
    const localUrl = "postgresql://accounting:accounting@localhost:5432/accounting?schema=public";

    expect(
      resolveTenantDbIntegrationSettings({
        LEDGERBYTE_TENANT_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: localUrl,
      } as NodeJS.ProcessEnv),
    ).toEqual({ enabled: true, databaseUrl: localUrl });
  });
});

describeTenantDb("tenant isolation: Prisma-backed local DB proof", () => {
  let prisma: PrismaClient;
  let fixture: TenantIsolationFixtureSet;
  let auditLogService: AuditLogService;
  let contactService: ContactService;
  let salesInvoiceService: SalesInvoiceService;
  let purchaseBillService: PurchaseBillService;
  let customerPaymentService: CustomerPaymentService;
  let supplierPaymentService: SupplierPaymentService;
  let accountingService: AccountingService;
  let chartOfAccountsService: ChartOfAccountsService;
  let reportsService: ReportsService;
  let generatedDocumentService: GeneratedDocumentService;
  let attachmentService: AttachmentService;
  let searchService: SearchService;
  let organizationService: OrganizationService;
  let organizationMemberService: OrganizationMemberService;
  let organizationContextGuard: OrganizationContextGuard;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
      transactionOptions: { maxWait: 10_000, timeout: 25_000 },
    });
    await prisma.$connect();

    auditLogService = new AuditLogService(prisma as unknown as PrismaService);
    const numberSequenceService = makeNumberSequenceService();
    accountingService = new AccountingService(prisma as unknown as PrismaService, auditLogService, numberSequenceService);
    contactService = new ContactService(prisma as unknown as PrismaService, auditLogService);
    salesInvoiceService = new SalesInvoiceService(
      prisma as unknown as PrismaService,
      auditLogService,
      numberSequenceService,
      accountingService,
    );
    purchaseBillService = new PurchaseBillService(
      prisma as unknown as PrismaService,
      auditLogService,
      numberSequenceService,
    );
    customerPaymentService = new CustomerPaymentService(prisma as unknown as PrismaService, auditLogService, numberSequenceService);
    supplierPaymentService = new SupplierPaymentService(prisma as unknown as PrismaService, auditLogService, numberSequenceService);
    chartOfAccountsService = new ChartOfAccountsService(prisma as unknown as PrismaService, auditLogService);
    reportsService = new ReportsService(prisma as unknown as PrismaService);
    generatedDocumentService = new GeneratedDocumentService(prisma as unknown as PrismaService, auditLogService);
    attachmentService = new AttachmentService(
      prisma as unknown as PrismaService,
      {
        read: jest.fn(async (record: { contentBase64?: string | null }) => Buffer.from(record.contentBase64 ?? "", "base64")),
      } as never,
      auditLogService,
      { get: jest.fn(() => undefined) } as never,
    );
    searchService = new SearchService(prisma as unknown as PrismaService);
    organizationService = new OrganizationService(prisma as unknown as PrismaService, auditLogService);
    organizationMemberService = new OrganizationMemberService(
      prisma as unknown as PrismaService,
      auditLogService,
      { create: jest.fn() } as never,
      { assertInviteAllowed: jest.fn() } as never,
      { isMockProvider: true, sendOrganizationInvite: jest.fn() } as never,
      { get: jest.fn((key: string) => (key === "WEB_APP_URL" ? "http://localhost:3000" : undefined)) } as never,
    );
    organizationContextGuard = new OrganizationContextGuard(prisma as unknown as PrismaService);

    fixture = await seedTenantIsolationFixture(prisma);
  });

  afterAll(async () => {
    if (fixture) {
      await cleanupTenantIsolationFixture(prisma, fixture);
    }
    await prisma.$disconnect();
  });

  it("blocks organization switching when the authenticated user is not a tenant member", async () => {
    const request = {
      user: { id: fixture.tenantA.userId, email: fixture.tenantA.email },
      headers: { "x-organization-id": fixture.tenantB.organizationId },
    };
    const context = executionContextForRequest(request);

    await expect(organizationContextGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(request).not.toHaveProperty("organizationId");

    await expect(organizationService.getForUser(fixture.tenantA.userId, fixture.tenantB.organizationId)).rejects.toThrow(NotFoundException);
    const organizations = await organizationService.listForUser(fixture.tenantA.userId);
    expect(organizations.map((organization) => organization.id)).toContain(fixture.tenantA.organizationId);
    expect(organizations.map((organization) => organization.id)).not.toContain(fixture.tenantB.organizationId);
  });

  it("keeps contacts, customer lists, supplier lists, and search results inside the active tenant", async () => {
    const customerNames = (await contactService.listCustomers(fixture.tenantA.organizationId)).map((summary) => summary.contact.name);
    const supplierNames = (await contactService.listSuppliers(fixture.tenantA.organizationId)).map((summary) => summary.contact.name);

    expect(customerNames).toContain(fixture.tenantA.customerName);
    expect(customerNames).not.toContain(fixture.tenantB.customerName);
    expect(supplierNames).toContain(fixture.tenantA.supplierName);
    expect(supplierNames).not.toContain(fixture.tenantB.supplierName);

    await expect(contactService.getCustomer(fixture.tenantA.organizationId, fixture.tenantB.customerId)).rejects.toThrow(NotFoundException);
    await expect(
      contactService.update(fixture.tenantA.organizationId, fixture.tenantA.userId, fixture.tenantB.customerId, {
        name: `${fixture.marker} mutated foreign customer`,
      }),
    ).rejects.toThrow(NotFoundException);

    const tenantBContact = await prisma.contact.findUniqueOrThrow({ where: { id: fixture.tenantB.customerId } });
    expect(tenantBContact.name).toBe(fixture.tenantB.customerName);

    const search = await searchService.search(fixture.tenantA.organizationId, fixture.tenantB.customerName, [PERMISSIONS.admin.fullAccess]);
    expect(JSON.stringify(search.results)).not.toContain(fixture.tenantB.customerName);
  });

  it("prevents cross-tenant invoice reads, writes, updates, deletes, and PDF data access", async () => {
    await expect(salesInvoiceService.get(fixture.tenantA.organizationId, fixture.tenantB.invoiceId)).rejects.toThrow(NotFoundException);
    await expect(salesInvoiceService.pdfData(fixture.tenantA.organizationId, fixture.tenantB.invoiceId)).rejects.toThrow(NotFoundException);
    await expect(
      salesInvoiceService.update(fixture.tenantA.organizationId, fixture.tenantA.userId, fixture.tenantB.invoiceId, {
        issueDate: "2026-02-01",
        lines: invoiceLines(fixture.tenantA.revenueAccountId),
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(salesInvoiceService.remove(fixture.tenantA.organizationId, fixture.tenantA.userId, fixture.tenantB.invoiceId)).rejects.toThrow(
      NotFoundException,
    );

    const beforeCount = await prisma.salesInvoice.count({ where: { organizationId: fixture.tenantA.organizationId } });
    await expect(
      salesInvoiceService.create(fixture.tenantA.organizationId, fixture.tenantA.userId, {
        customerId: fixture.tenantB.customerId,
        issueDate: "2026-02-01",
        currency: "SAR",
        lines: invoiceLines(fixture.tenantA.revenueAccountId),
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      salesInvoiceService.create(fixture.tenantA.organizationId, fixture.tenantA.userId, {
        customerId: fixture.tenantA.customerId,
        issueDate: "2026-02-01",
        currency: "SAR",
        lines: invoiceLines(fixture.tenantB.revenueAccountId),
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(prisma.salesInvoice.count({ where: { organizationId: fixture.tenantA.organizationId } })).resolves.toBe(beforeCount);
  });

  it("prevents cross-tenant bill reads, writes, updates, deletes, and PDF data access", async () => {
    await expect(purchaseBillService.get(fixture.tenantA.organizationId, fixture.tenantB.billId)).rejects.toThrow(NotFoundException);
    await expect(purchaseBillService.pdfData(fixture.tenantA.organizationId, fixture.tenantB.billId)).rejects.toThrow(NotFoundException);
    await expect(
      purchaseBillService.update(fixture.tenantA.organizationId, fixture.tenantA.userId, fixture.tenantB.billId, {
        billDate: "2026-02-02",
        lines: billLines(fixture.tenantA.expenseAccountId),
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(purchaseBillService.remove(fixture.tenantA.organizationId, fixture.tenantA.userId, fixture.tenantB.billId)).rejects.toThrow(
      NotFoundException,
    );

    const beforeCount = await prisma.purchaseBill.count({ where: { organizationId: fixture.tenantA.organizationId } });
    await expect(
      purchaseBillService.create(fixture.tenantA.organizationId, fixture.tenantA.userId, {
        supplierId: fixture.tenantB.supplierId,
        billDate: "2026-02-02",
        currency: "SAR",
        lines: billLines(fixture.tenantA.expenseAccountId),
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      purchaseBillService.create(fixture.tenantA.organizationId, fixture.tenantA.userId, {
        supplierId: fixture.tenantA.supplierId,
        billDate: "2026-02-02",
        currency: "SAR",
        lines: billLines(fixture.tenantB.expenseAccountId),
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(prisma.purchaseBill.count({ where: { organizationId: fixture.tenantA.organizationId } })).resolves.toBe(beforeCount);
  });

  it("does not let payments allocate unapplied amounts to another tenant's invoice or bill", async () => {
    const paymentBefore = await prisma.customerPayment.findUniqueOrThrow({ where: { id: fixture.tenantA.customerPaymentId } });
    const invoiceBefore = await prisma.salesInvoice.findUniqueOrThrow({ where: { id: fixture.tenantB.invoiceId } });

    await expect(customerPaymentService.get(fixture.tenantA.organizationId, fixture.tenantB.customerPaymentId)).rejects.toThrow(NotFoundException);
    await expect(
      customerPaymentService.applyUnapplied(fixture.tenantA.organizationId, fixture.tenantA.userId, fixture.tenantA.customerPaymentId, {
        invoiceId: fixture.tenantB.invoiceId,
        amountApplied: "10.0000",
      }),
    ).rejects.toThrow(NotFoundException);

    await expect(prisma.customerPayment.findUniqueOrThrow({ where: { id: fixture.tenantA.customerPaymentId } })).resolves.toMatchObject({
      unappliedAmount: paymentBefore.unappliedAmount,
    });
    await expect(prisma.salesInvoice.findUniqueOrThrow({ where: { id: fixture.tenantB.invoiceId } })).resolves.toMatchObject({
      balanceDue: invoiceBefore.balanceDue,
    });
    await expect(
      prisma.customerPaymentUnappliedAllocation.count({
        where: {
          organizationId: fixture.tenantA.organizationId,
          paymentId: fixture.tenantA.customerPaymentId,
          invoiceId: fixture.tenantB.invoiceId,
        },
      }),
    ).resolves.toBe(0);

    const supplierPaymentBefore = await prisma.supplierPayment.findUniqueOrThrow({ where: { id: fixture.tenantA.supplierPaymentId } });
    const billBefore = await prisma.purchaseBill.findUniqueOrThrow({ where: { id: fixture.tenantB.billId } });
    await expect(supplierPaymentService.get(fixture.tenantA.organizationId, fixture.tenantB.supplierPaymentId)).rejects.toThrow(NotFoundException);
    await expect(
      supplierPaymentService.applyUnapplied(fixture.tenantA.organizationId, fixture.tenantA.userId, fixture.tenantA.supplierPaymentId, {
        billId: fixture.tenantB.billId,
        amountApplied: "10.0000",
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(prisma.supplierPayment.findUniqueOrThrow({ where: { id: fixture.tenantA.supplierPaymentId } })).resolves.toMatchObject({
      unappliedAmount: supplierPaymentBefore.unappliedAmount,
    });
    await expect(prisma.purchaseBill.findUniqueOrThrow({ where: { id: fixture.tenantB.billId } })).resolves.toMatchObject({
      balanceDue: billBefore.balanceDue,
    });
  });

  it("keeps journals and chart-of-accounts mutations scoped to the active tenant", async () => {
    await expect(accountingService.get(fixture.tenantA.organizationId, fixture.tenantB.journalId)).rejects.toThrow(NotFoundException);
    await expect(
      accountingService.update(fixture.tenantA.organizationId, fixture.tenantA.userId, fixture.tenantB.journalId, {
        description: `${fixture.marker} foreign journal mutation`,
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(accountingService.post(fixture.tenantA.organizationId, fixture.tenantA.userId, fixture.tenantB.journalId)).rejects.toThrow(
      NotFoundException,
    );

    const beforeJournalCount = await prisma.journalEntry.count({ where: { organizationId: fixture.tenantA.organizationId } });
    await expect(
      accountingService.create(fixture.tenantA.organizationId, fixture.tenantA.userId, {
        entryDate: "2026-03-01",
        description: `${fixture.marker} blocked cross-tenant journal`,
        currency: "SAR",
        lines: [
          journalLine(fixture.tenantA.cashAccountId, "50.0000", "0.0000"),
          journalLine(fixture.tenantB.revenueAccountId, "0.0000", "50.0000"),
        ],
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(prisma.journalEntry.count({ where: { organizationId: fixture.tenantA.organizationId } })).resolves.toBe(beforeJournalCount);

    const accountNames = (await chartOfAccountsService.list(fixture.tenantA.organizationId)).map((account) => account.name);
    expect(accountNames).toContain(fixture.tenantA.revenueAccountName);
    expect(accountNames).not.toContain(fixture.tenantB.revenueAccountName);
    await expect(chartOfAccountsService.get(fixture.tenantA.organizationId, fixture.tenantB.revenueAccountId)).rejects.toThrow(NotFoundException);
    await expect(
      chartOfAccountsService.create(fixture.tenantA.organizationId, fixture.tenantA.userId, {
        code: `51${fixture.uniqueSuffix}`,
        name: `${fixture.marker} blocked child`,
        type: AccountType.EXPENSE,
        parentId: fixture.tenantB.expenseAccountId,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("keeps reports and exportable aggregates from including another tenant's posted activity", async () => {
    const profitAndLoss = await reportsService.profitAndLoss(fixture.tenantA.organizationId, {
      from: "2026-01-01",
      to: "2026-12-31",
    });
    const trialBalance = await reportsService.trialBalance(fixture.tenantA.organizationId, {
      from: "2026-01-01",
      to: "2026-12-31",
      includeZero: false,
    });

    const renderedReports = JSON.stringify({ profitAndLoss, trialBalance });
    expect(renderedReports).toContain(fixture.tenantA.revenueAccountName);
    expect(renderedReports).toContain("123.0000");
    expect(renderedReports).not.toContain(fixture.tenantB.revenueAccountName);
    expect(renderedReports).not.toContain("987.0000");
  });

  it("keeps generated document and attachment downloads inside the active tenant", async () => {
    const tenantADocuments = await generatedDocumentService.list(fixture.tenantA.organizationId, {});
    expect(tenantADocuments.map((document) => document.id)).toContain(fixture.tenantA.generatedDocumentId);
    expect(tenantADocuments.map((document) => document.id)).not.toContain(fixture.tenantB.generatedDocumentId);
    await expect(generatedDocumentService.get(fixture.tenantA.organizationId, fixture.tenantB.generatedDocumentId)).rejects.toThrow(NotFoundException);
    await expect(generatedDocumentService.download(fixture.tenantA.organizationId, fixture.tenantB.generatedDocumentId)).rejects.toThrow(NotFoundException);

    const tenantAAttachments = await attachmentService.list(fixture.tenantA.organizationId, {});
    expect(tenantAAttachments.map((attachment) => attachment.id)).toContain(fixture.tenantA.attachmentId);
    expect(tenantAAttachments.map((attachment) => attachment.id)).not.toContain(fixture.tenantB.attachmentId);
    await expect(attachmentService.get(fixture.tenantA.organizationId, fixture.tenantB.attachmentId)).rejects.toThrow(NotFoundException);
    await expect(attachmentService.download(fixture.tenantA.organizationId, fixture.tenantB.attachmentId)).rejects.toThrow(NotFoundException);
    await expect(attachmentService.softDelete(fixture.tenantA.organizationId, fixture.tenantA.userId, fixture.tenantB.attachmentId)).rejects.toThrow(
      NotFoundException,
    );
    await expect(prisma.attachment.findUniqueOrThrow({ where: { id: fixture.tenantB.attachmentId } })).resolves.toMatchObject({
      status: AttachmentStatus.ACTIVE,
    });
  });

  it("keeps invitations, member administration, and audit logs inside the active tenant", async () => {
    const tenantAMembers = await organizationMemberService.list(fixture.tenantA.organizationId);
    expect(tenantAMembers.map((member) => member.id)).toContain(fixture.tenantA.memberId);
    expect(tenantAMembers.map((member) => member.id)).not.toContain(fixture.tenantB.memberId);
    await expect(organizationMemberService.get(fixture.tenantA.organizationId, fixture.tenantB.memberId)).rejects.toThrow(NotFoundException);
    await expect(
      organizationMemberService.updateStatus(fixture.tenantA.organizationId, fixture.tenantA.userId, fixture.tenantB.memberId, {
        status: MembershipStatus.SUSPENDED,
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      organizationMemberService.invite(fixture.tenantA.organizationId, fixture.tenantA.userId, {
        email: `${fixture.uniqueSuffix}-foreign-role@example.test`,
        roleId: fixture.tenantB.roleId,
      }),
    ).rejects.toThrow(NotFoundException);

    const auditSearch = await auditLogService.list(fixture.tenantA.organizationId, { search: fixture.tenantB.auditMarker });
    expect(auditSearch.data).toHaveLength(0);
    await expect(auditLogService.get(fixture.tenantA.organizationId, fixture.tenantB.auditLogId)).rejects.toThrow(NotFoundException);
    const auditCsv = await auditLogService.exportCsv(fixture.tenantA.organizationId, {});
    expect(auditCsv.csv).toContain(fixture.tenantA.auditMarker);
    expect(auditCsv.csv).not.toContain(fixture.tenantB.auditMarker);
  });
});

interface TenantIsolationFixtureSet {
  marker: string;
  uniqueSuffix: string;
  tenantA: TenantFixture;
  tenantB: TenantFixture;
}

interface TenantFixture {
  organizationId: string;
  userId: string;
  email: string;
  roleId: string;
  memberId: string;
  customerId: string;
  customerName: string;
  supplierId: string;
  supplierName: string;
  cashAccountId: string;
  revenueAccountId: string;
  revenueAccountName: string;
  expenseAccountId: string;
  expenseAccountName: string;
  invoiceId: string;
  billId: string;
  customerPaymentId: string;
  supplierPaymentId: string;
  journalId: string;
  generatedDocumentId: string;
  attachmentId: string;
  auditLogId: string;
  auditMarker: string;
}

function requireLocalPostgresUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error(
      "LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_TENANT_DB_INTEGRATION=1. Point it at disposable local Postgres.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be a valid Postgres URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Tenant DB integration tests require a Postgres URL.");
  }

  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Tenant DB integration tests are local-only and refuse non-local database hosts.");
  }

  const databaseName = url.pathname.replace(/^\//, "");
  if (!databaseName || databaseName.toLowerCase().includes("prod")) {
    throw new Error("Tenant DB integration tests require a disposable local database name.");
  }

  return rawUrl;
}

function resolveTenantDbIntegrationSettings(env: NodeJS.ProcessEnv): TenantDbIntegrationSettings {
  if (env.LEDGERBYTE_TENANT_DB_INTEGRATION !== "1") {
    return { enabled: false };
  }

  return {
    enabled: true,
    databaseUrl: requireLocalPostgresUrl(env.LEDGERBYTE_TEST_DATABASE_URL),
  };
}

function makeNumberSequenceService() {
  let sequence = 0;
  return {
    next: jest.fn(async (_organizationId: string, scope: string) => `TI-${scope}-${++sequence}`),
    preview: jest.fn(async (_organizationId: string, scope: string) => ({
      scope,
      nextNumber: `TI-${scope}-${sequence + 1}`,
    })),
  } as never;
}

function executionContextForRequest(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

async function seedTenantIsolationFixture(prisma: PrismaClient): Promise<TenantIsolationFixtureSet> {
  const marker = `TI-DB-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const uniqueSuffix = marker.replace(/[^A-Za-z0-9]/g, "").slice(-10);
  const tenantA = fixtureIds(marker, "A", uniqueSuffix);
  const tenantB = fixtureIds(marker, "B", uniqueSuffix);

  await prisma.user.createMany({
    data: [
      {
        id: tenantA.userId,
        email: tenantA.email,
        name: `${marker} User A`,
        passwordHash: "tenant-isolation-local-hash",
      },
      {
        id: tenantB.userId,
        email: tenantB.email,
        name: `${marker} User B`,
        passwordHash: "tenant-isolation-local-hash",
      },
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
      { id: tenantA.memberId, organizationId: tenantA.organizationId, userId: tenantA.userId, roleId: tenantA.roleId, status: MembershipStatus.ACTIVE },
      { id: tenantB.memberId, organizationId: tenantB.organizationId, userId: tenantB.userId, roleId: tenantB.roleId, status: MembershipStatus.ACTIVE },
    ],
  });

  await seedTenantRecords(prisma, tenantA, "123.0000");
  await seedTenantRecords(prisma, tenantB, "987.0000");

  return { marker, uniqueSuffix, tenantA, tenantB };
}

async function seedTenantRecords(prisma: PrismaClient, tenant: TenantFixture, reportAmount: string): Promise<void> {
  await prisma.account.createMany({
    data: [
      {
        id: tenant.cashAccountId,
        organizationId: tenant.organizationId,
        code: `10${tenant.email.charCodeAt(0)}`,
        name: `${tenant.revenueAccountName} Cash`,
        type: AccountType.ASSET,
      },
      {
        id: tenant.revenueAccountId,
        organizationId: tenant.organizationId,
        code: `40${tenant.email.charCodeAt(0)}`,
        name: tenant.revenueAccountName,
        type: AccountType.REVENUE,
      },
      {
        id: tenant.expenseAccountId,
        organizationId: tenant.organizationId,
        code: `50${tenant.email.charCodeAt(0)}`,
        name: tenant.expenseAccountName,
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
      },
      {
        id: tenant.supplierId,
        organizationId: tenant.organizationId,
        type: ContactType.SUPPLIER,
        name: tenant.supplierName,
      },
    ],
  });

  await prisma.salesInvoice.create({
    data: {
      id: tenant.invoiceId,
      organizationId: tenant.organizationId,
      invoiceNumber: `${tenant.email}-INV`,
      customerId: tenant.customerId,
      issueDate: new Date("2026-01-10T00:00:00.000Z"),
      currency: "SAR",
      status: SalesInvoiceStatus.FINALIZED,
      subtotal: "200.0000",
      taxableTotal: "200.0000",
      total: "200.0000",
      balanceDue: "200.0000",
      lines: {
        create: {
          organizationId: tenant.organizationId,
          description: `${tenant.customerName} invoice line`,
          accountId: tenant.revenueAccountId,
          quantity: "1.0000",
          unitPrice: "200.0000",
          lineGrossAmount: "200.0000",
          lineSubtotal: "200.0000",
          taxableAmount: "200.0000",
          lineTotal: "200.0000",
        },
      },
    },
  });

  await prisma.purchaseBill.create({
    data: {
      id: tenant.billId,
      organizationId: tenant.organizationId,
      billNumber: `${tenant.email}-BILL`,
      supplierId: tenant.supplierId,
      billDate: new Date("2026-01-11T00:00:00.000Z"),
      currency: "SAR",
      status: PurchaseBillStatus.FINALIZED,
      subtotal: "150.0000",
      taxableTotal: "150.0000",
      total: "150.0000",
      balanceDue: "150.0000",
      lines: {
        create: {
          organizationId: tenant.organizationId,
          description: `${tenant.supplierName} bill line`,
          accountId: tenant.expenseAccountId,
          quantity: "1.0000",
          unitPrice: "150.0000",
          lineGrossAmount: "150.0000",
          taxableAmount: "150.0000",
          lineTotal: "150.0000",
        },
      },
    },
  });

  await prisma.customerPayment.create({
    data: {
      id: tenant.customerPaymentId,
      organizationId: tenant.organizationId,
      paymentNumber: `${tenant.email}-CP`,
      customerId: tenant.customerId,
      accountId: tenant.cashAccountId,
      paymentDate: new Date("2026-01-12T00:00:00.000Z"),
      currency: "SAR",
      status: CustomerPaymentStatus.POSTED,
      amountReceived: "50.0000",
      unappliedAmount: "50.0000",
    },
  });

  await prisma.supplierPayment.create({
    data: {
      id: tenant.supplierPaymentId,
      organizationId: tenant.organizationId,
      paymentNumber: `${tenant.email}-SP`,
      supplierId: tenant.supplierId,
      accountId: tenant.cashAccountId,
      paymentDate: new Date("2026-01-13T00:00:00.000Z"),
      currency: "SAR",
      status: SupplierPaymentStatus.POSTED,
      amountPaid: "50.0000",
      unappliedAmount: "50.0000",
    },
  });

  await prisma.journalEntry.create({
    data: {
      id: tenant.journalId,
      organizationId: tenant.organizationId,
      entryNumber: `${tenant.email}-JE`,
      status: JournalEntryStatus.POSTED,
      entryDate: new Date("2026-01-14T00:00:00.000Z"),
      description: `${tenant.revenueAccountName} posted activity`,
      currency: "SAR",
      totalDebit: reportAmount,
      totalCredit: reportAmount,
      postedAt: new Date("2026-01-14T00:00:00.000Z"),
      postedById: tenant.userId,
      createdById: tenant.userId,
      lines: {
        create: [
          {
            organizationId: tenant.organizationId,
            accountId: tenant.cashAccountId,
            lineNumber: 1,
            debit: reportAmount,
            credit: "0.0000",
          },
          {
            organizationId: tenant.organizationId,
            accountId: tenant.revenueAccountId,
            lineNumber: 2,
            debit: "0.0000",
            credit: reportAmount,
          },
        ],
      },
    },
  });

  const documentContent = Buffer.from(`${tenant.customerName} generated document`).toString("base64");
  await prisma.generatedDocument.create({
    data: {
      id: tenant.generatedDocumentId,
      organizationId: tenant.organizationId,
      documentType: DocumentType.SALES_INVOICE,
      sourceType: "SalesInvoice",
      sourceId: tenant.invoiceId,
      documentNumber: `${tenant.email}-DOC`,
      filename: `${tenant.email}-document.pdf`,
      mimeType: "application/pdf",
      storageProvider: "database",
      contentBase64: documentContent,
      contentHash: createHash("sha256").update(documentContent).digest("hex"),
      sizeBytes: documentContent.length,
      status: GeneratedDocumentStatus.GENERATED,
      generatedById: tenant.userId,
    },
  });

  const attachmentContent = Buffer.from(`${tenant.customerName} attachment`).toString("base64");
  await prisma.attachment.create({
    data: {
      id: tenant.attachmentId,
      organizationId: tenant.organizationId,
      linkedEntityType: AttachmentLinkedEntityType.SALES_INVOICE,
      linkedEntityId: tenant.invoiceId,
      filename: `${tenant.email}-attachment.pdf`,
      originalFilename: `${tenant.email}-attachment.pdf`,
      mimeType: "application/pdf",
      sizeBytes: attachmentContent.length,
      storageProvider: AttachmentStorageProvider.DATABASE,
      contentBase64: attachmentContent,
      contentHash: createHash("sha256").update(attachmentContent).digest("hex"),
      status: AttachmentStatus.ACTIVE,
      uploadedById: tenant.userId,
    },
  });

  const audit = await prisma.auditLog.create({
    data: {
      organizationId: tenant.organizationId,
      actorUserId: tenant.userId,
      action: "CREATE",
      entityType: "TenantIsolationProof",
      entityId: tenant.customerId,
      after: { marker: tenant.auditMarker },
    },
  });
  tenant.auditLogId = audit.id;
}

function fixtureIds(marker: string, suffix: "A" | "B", uniqueSuffix: string): TenantFixture {
  const lowerSuffix = suffix.toLowerCase();
  return {
    organizationId: randomUUID(),
    userId: randomUUID(),
    email: `${marker.toLowerCase()}-${lowerSuffix}@example.test`,
    roleId: randomUUID(),
    memberId: randomUUID(),
    customerId: randomUUID(),
    customerName: `${marker} Customer ${suffix}`,
    supplierId: randomUUID(),
    supplierName: `${marker} Supplier ${suffix}`,
    cashAccountId: randomUUID(),
    revenueAccountId: randomUUID(),
    revenueAccountName: `${marker} Revenue ${suffix}`,
    expenseAccountId: randomUUID(),
    expenseAccountName: `${marker} Expense ${suffix}`,
    invoiceId: randomUUID(),
    billId: randomUUID(),
    customerPaymentId: randomUUID(),
    supplierPaymentId: randomUUID(),
    journalId: randomUUID(),
    generatedDocumentId: randomUUID(),
    attachmentId: randomUUID(),
    auditLogId: "",
    auditMarker: `${marker} Audit ${suffix} ${uniqueSuffix}`,
  };
}

async function cleanupTenantIsolationFixture(prisma: PrismaClient, fixture: TenantIsolationFixtureSet): Promise<void> {
  await prisma.organization.deleteMany({
    where: { id: { in: [fixture.tenantA.organizationId, fixture.tenantB.organizationId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [fixture.tenantA.userId, fixture.tenantB.userId] } },
  });
}

function invoiceLines(accountId: string) {
  return [
    {
      description: "Tenant isolation invoice line",
      accountId,
      quantity: "1.0000",
      unitPrice: "10.0000",
      discountRate: "0.0000",
    },
  ];
}

function billLines(accountId: string) {
  return [
    {
      description: "Tenant isolation bill line",
      accountId,
      quantity: "1.0000",
      unitPrice: "10.0000",
      discountRate: "0.0000",
    },
  ];
}

function journalLine(accountId: string, debit: string, credit: string) {
  return {
    accountId,
    debit,
    credit,
    currency: "SAR",
  };
}
