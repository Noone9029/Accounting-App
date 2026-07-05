import {
  AccountType,
  AttachmentLinkedEntityType,
  AttachmentStatus,
  AttachmentStorageProvider,
  ContactType,
  DocumentType,
  GeneratedDocumentStatus,
  JournalEntryStatus,
  MembershipStatus,
  PrismaClient,
  PurchaseBillStatus,
  SalesInvoiceStatus,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import { PERMISSIONS } from "../../../packages/shared/src/permissions";

export type BrowserTenantE2eSettings =
  | { enabled: false; databaseUrl?: undefined }
  | { enabled: true; databaseUrl: string };

export interface BrowserTenantFixtureSet {
  marker: string;
  password: string;
  tenantA: BrowserTenantFixture;
  tenantB: BrowserTenantFixture;
}

export interface BrowserTenantFixture {
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
  cashAccountId: string;
  revenueAccountId: string;
  revenueAccountName: string;
  expenseAccountId: string;
  expenseAccountName: string;
  invoiceId: string;
  invoiceNumber: string;
  billId: string;
  billNumber: string;
  journalId: string;
  journalNumber: string;
  generatedDocumentId: string;
  attachmentId: string;
  reportAmount: string;
}

export function resolveBrowserTenantE2eSettings(env: NodeJS.ProcessEnv): BrowserTenantE2eSettings {
  if (env.LEDGERBYTE_BROWSER_TENANT_E2E !== "1") {
    return { enabled: false };
  }

  return {
    enabled: true,
    databaseUrl: requireLocalPostgresUrl(env.LEDGERBYTE_TEST_DATABASE_URL),
  };
}

export function createBrowserTenantPrisma(settings: BrowserTenantE2eSettings): PrismaClient {
  if (!settings.enabled) {
    throw new Error("Browser tenant isolation E2E is not enabled.");
  }

  return new PrismaClient({
    datasources: { db: { url: settings.databaseUrl } },
    transactionOptions: { maxWait: 10_000, timeout: 25_000 },
  });
}

export async function seedBrowserTenantFixture(prisma: PrismaClient): Promise<BrowserTenantFixtureSet> {
  const marker = `TI-BROWSER-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const uniqueSuffix = marker.replace(/[^A-Za-z0-9]/g, "").slice(-12);
  const password = `TenantBrowser-${uniqueSuffix}-123!`;
  const passwordHash = await bcrypt.hash(password, 12);
  const tenantA = fixtureIds(marker, "A", uniqueSuffix, "123.0000");
  const tenantB = fixtureIds(marker, "B", uniqueSuffix, "987.0000");

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

  await seedTenantRecords(prisma, tenantA);
  await seedTenantRecords(prisma, tenantB);

  return { marker, password, tenantA, tenantB };
}

export async function cleanupBrowserTenantFixture(prisma: PrismaClient, fixture: BrowserTenantFixtureSet | undefined): Promise<void> {
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

function requireLocalPostgresUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error(
      "LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_BROWSER_TENANT_E2E=1. Point it at disposable local Postgres.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be a valid Postgres URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Browser tenant isolation E2E requires a Postgres URL.");
  }

  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Browser tenant isolation E2E is local-only and refuses non-local database hosts.");
  }

  const databaseName = url.pathname.replace(/^\//, "");
  if (!databaseName || databaseName.toLowerCase().includes("prod")) {
    throw new Error("Browser tenant isolation E2E requires a disposable local database name.");
  }

  return rawUrl;
}

async function seedTenantRecords(prisma: PrismaClient, tenant: BrowserTenantFixture): Promise<void> {
  await prisma.account.createMany({
    data: [
      {
        id: tenant.cashAccountId,
        organizationId: tenant.organizationId,
        code: "1000",
        name: `${tenant.organizationName} Cash`,
        type: AccountType.ASSET,
      },
      {
        id: tenant.revenueAccountId,
        organizationId: tenant.organizationId,
        code: "4000",
        name: tenant.revenueAccountName,
        type: AccountType.REVENUE,
      },
      {
        id: tenant.expenseAccountId,
        organizationId: tenant.organizationId,
        code: "5000",
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
        email: `${tenant.userEmail.replace("@", "+customer@")}`,
      },
      {
        id: tenant.supplierId,
        organizationId: tenant.organizationId,
        type: ContactType.SUPPLIER,
        name: tenant.supplierName,
        email: `${tenant.userEmail.replace("@", "+supplier@")}`,
      },
    ],
  });

  await prisma.salesInvoice.create({
    data: {
      id: tenant.invoiceId,
      organizationId: tenant.organizationId,
      invoiceNumber: tenant.invoiceNumber,
      customerId: tenant.customerId,
      issueDate: new Date("2026-01-10T00:00:00.000Z"),
      dueDate: new Date("2026-01-31T00:00:00.000Z"),
      currency: "SAR",
      status: SalesInvoiceStatus.FINALIZED,
      subtotal: tenant.reportAmount,
      taxableTotal: tenant.reportAmount,
      total: tenant.reportAmount,
      balanceDue: tenant.reportAmount,
      createdById: tenant.userId,
      lines: {
        create: {
          organizationId: tenant.organizationId,
          description: `${tenant.customerName} browser invoice line`,
          accountId: tenant.revenueAccountId,
          quantity: "1.0000",
          unitPrice: tenant.reportAmount,
          lineGrossAmount: tenant.reportAmount,
          lineSubtotal: tenant.reportAmount,
          taxableAmount: tenant.reportAmount,
          lineTotal: tenant.reportAmount,
        },
      },
    },
  });

  await prisma.purchaseBill.create({
    data: {
      id: tenant.billId,
      organizationId: tenant.organizationId,
      billNumber: tenant.billNumber,
      supplierId: tenant.supplierId,
      billDate: new Date("2026-01-11T00:00:00.000Z"),
      dueDate: new Date("2026-01-31T00:00:00.000Z"),
      currency: "SAR",
      status: PurchaseBillStatus.FINALIZED,
      subtotal: "41.0000",
      taxableTotal: "41.0000",
      total: "41.0000",
      balanceDue: "41.0000",
      createdById: tenant.userId,
      lines: {
        create: {
          organizationId: tenant.organizationId,
          description: `${tenant.supplierName} browser bill line`,
          accountId: tenant.expenseAccountId,
          quantity: "1.0000",
          unitPrice: "41.0000",
          lineGrossAmount: "41.0000",
          taxableAmount: "41.0000",
          lineTotal: "41.0000",
        },
      },
    },
  });

  await prisma.journalEntry.create({
    data: {
      id: tenant.journalId,
      organizationId: tenant.organizationId,
      entryNumber: tenant.journalNumber,
      status: JournalEntryStatus.POSTED,
      entryDate: new Date("2026-01-14T00:00:00.000Z"),
      description: `${tenant.revenueAccountName} browser posted activity`,
      currency: "SAR",
      totalDebit: tenant.reportAmount,
      totalCredit: tenant.reportAmount,
      postedAt: new Date("2026-01-14T00:00:00.000Z"),
      postedById: tenant.userId,
      createdById: tenant.userId,
      lines: {
        create: [
          {
            organizationId: tenant.organizationId,
            accountId: tenant.cashAccountId,
            lineNumber: 1,
            debit: tenant.reportAmount,
            credit: "0.0000",
          },
          {
            organizationId: tenant.organizationId,
            accountId: tenant.revenueAccountId,
            lineNumber: 2,
            debit: "0.0000",
            credit: tenant.reportAmount,
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
      documentNumber: `${tenant.invoiceNumber}-DOC`,
      filename: `${tenant.invoiceNumber}.pdf`,
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
      filename: `${tenant.invoiceNumber}-attachment.pdf`,
      originalFilename: `${tenant.invoiceNumber}-attachment.pdf`,
      mimeType: "application/pdf",
      sizeBytes: attachmentContent.length,
      storageProvider: AttachmentStorageProvider.DATABASE,
      contentBase64: attachmentContent,
      contentHash: createHash("sha256").update(attachmentContent).digest("hex"),
      status: AttachmentStatus.ACTIVE,
      uploadedById: tenant.userId,
    },
  });
}

function fixtureIds(marker: string, suffix: "A" | "B", uniqueSuffix: string, reportAmount: string): BrowserTenantFixture {
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
    cashAccountId: randomUUID(),
    revenueAccountId: randomUUID(),
    revenueAccountName: `${marker} Revenue ${suffix}`,
    expenseAccountId: randomUUID(),
    expenseAccountName: `${marker} Expense ${suffix}`,
    invoiceId: randomUUID(),
    invoiceNumber: `TIB-${uniqueSuffix}-${suffix}-INV`,
    billId: randomUUID(),
    billNumber: `TIB-${uniqueSuffix}-${suffix}-BILL`,
    journalId: randomUUID(),
    journalNumber: `TIB-${uniqueSuffix}-${suffix}-JE`,
    generatedDocumentId: randomUUID(),
    attachmentId: randomUUID(),
    reportAmount,
  };
}
