import { BadRequestException, NotFoundException } from "@nestjs/common";
import { calculateSalesInvoiceTotals } from "@ledgerbyte/accounting-core";
import {
  AccountType,
  NumberSequenceScope,
  Prisma,
  RecurringInvoiceFrequency,
  RecurringInvoiceTemplateStatus,
  SalesInvoiceStatus,
  SalesInvoiceTaxMode,
} from "@prisma/client";
import { RecurringInvoiceService, advanceRunDate, nextOccurrences } from "./recurring-invoice.service";

describe("recurring invoice rules", () => {
  it("calculates template totals with sales invoice tax-exclusive, tax-inclusive, and no-tax rules", async () => {
    const prisma = makePreparePrisma();
    const service = makeService(prisma).service;

    const taxExclusive = await prepareTemplate(service, "org-1", [templateLine({ taxRateId: "tax-15" })], SalesInvoiceTaxMode.TAX_EXCLUSIVE);
    const taxInclusive = await prepareTemplate(service, "org-1", [templateLine({ unitPrice: "115.0000", taxRateId: "tax-15" })], SalesInvoiceTaxMode.TAX_INCLUSIVE);
    const noTax = await prepareTemplate(service, "org-1", [templateLine({ taxRateId: "tax-15" })], SalesInvoiceTaxMode.NO_TAX);

    expect(taxExclusive).toMatchObject(calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "100.0000", taxRate: "15.0000" }]));
    expect(taxInclusive).toMatchObject(calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "115.0000", taxRate: "15.0000" }], "TAX_INCLUSIVE"));
    expect(noTax).toMatchObject(calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "100.0000", taxRate: "15.0000" }], "NO_TAX"));
    expect(noTax.lines[0]?.taxRateId).toBeUndefined();
  });

  it("rejects invalid or cross-tenant recurring template line revenue accounts", async () => {
    const prisma = makePreparePrisma({ account: { findMany: jest.fn().mockResolvedValue([]) } });
    const service = makeService(prisma).service;

    await expect(prepareTemplate(service, "org-1", [templateLine({ accountId: "expense-1" })])).rejects.toThrow("active posting revenue accounts");
    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", id: { in: ["expense-1"] }, type: AccountType.REVENUE, isActive: true, allowPosting: true }),
      }),
    );
  });

  it("creates a non-posting draft recurring template with a recurring sequence number", async () => {
    const tx = makeTransactionClient();
    const prisma = makeCreatePrisma(tx);
    const { service, numbers, audit } = makeService(prisma);

    const template = await service.create("org-1", "user-1", makeCreateDto());

    expect(template).toMatchObject({ id: "rec-1", templateNumber: "REC-000001", status: RecurringInvoiceTemplateStatus.DRAFT });
    expect(numbers.next).toHaveBeenCalledWith("org-1", NumberSequenceScope.RECURRING_INVOICE_TEMPLATE, tx);
    expect(tx.recurringInvoiceTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          templateNumber: "REC-000001",
          taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
          lines: expect.objectContaining({ create: expect.any(Array) }),
        }),
      }),
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "RecurringInvoiceTemplate", entityId: "rec-1" }));
  });

  it("prevents duplicate recurring template numbers when the configured sequence collides", async () => {
    const tx = makeTransactionClient({
      recurringInvoiceTemplate: {
        create: jest.fn().mockRejectedValue({ code: "P2002" }),
      },
    });
    const prisma = makeCreatePrisma(tx);
    const { service } = makeService(prisma);

    await expect(service.create("org-1", "user-1", makeCreateDto())).rejects.toBeInstanceOf(BadRequestException);
  });

  it("tenant-scopes recurring template detail lookup", async () => {
    const prisma = { recurringInvoiceTemplate: { findFirst: jest.fn().mockResolvedValue(null) } };
    const { service } = makeService(prisma);

    await expect(service.get("org-2", "rec-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.recurringInvoiceTemplate.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "rec-1", organizationId: "org-2" } }));
  });

  it("previews upcoming schedule dates without mutation", async () => {
    const template = makeTemplate({ status: RecurringInvoiceTemplateStatus.ACTIVE });
    const prisma = {
      recurringInvoiceTemplate: { findFirst: jest.fn().mockResolvedValue(template), update: jest.fn() },
      account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
      taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-15", rate: decimal("15.0000") }]) },
      salesInvoice: { create: jest.fn() },
    };
    const { service } = makeService(prisma);

    const preview = await service.preview("org-1", "rec-1");

    expect(preview).toMatchObject({
      templateNumber: "REC-000001",
      total: "115",
      previewOnly: true,
      blockers: [],
    });
    expect(preview.nextOccurrences.map((date: Date) => date.toISOString().slice(0, 10))).toEqual([
      "2026-06-15",
      "2026-07-15",
      "2026-08-15",
      "2026-09-15",
      "2026-10-15",
      "2026-11-15",
    ]);
    expect(prisma.recurringInvoiceTemplate.update).not.toHaveBeenCalled();
    expect(prisma.salesInvoice.create).not.toHaveBeenCalled();
  });

  it("advances monthly dates safely at month-end", () => {
    expect(advanceRunDate(new Date("2026-01-31T00:00:00.000Z"), RecurringInvoiceFrequency.MONTHLY, 1).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(nextOccurrences(new Date("2026-03-31T00:00:00.000Z"), RecurringInvoiceFrequency.QUARTERLY, 1, null, 3).map((date) => date.toISOString().slice(0, 10))).toEqual([
      "2026-03-31",
      "2026-06-30",
      "2026-09-30",
    ]);
  });

  it("manual generation creates a draft sales invoice, run history, and no posting side effects", async () => {
    const tx = makeTransactionClient();
    const prisma = {
      account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
      taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-15", rate: decimal("15.0000") }]) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const { service, numbers, audit } = makeService(prisma);
    jest.spyOn(service, "get").mockResolvedValue(makeTemplate({ status: RecurringInvoiceTemplateStatus.ACTIVE }) as never);

    const result = await service.generateNow("org-1", "user-1", "rec-1");

    expect(result.invoice).toMatchObject({ id: "invoice-1", invoiceNumber: "INV-000010", status: SalesInvoiceStatus.DRAFT });
    expect(numbers.next).toHaveBeenCalledWith("org-1", NumberSequenceScope.INVOICE, tx);
    expect(tx.salesInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          invoiceNumber: "INV-000010",
          recurringInvoiceTemplateId: "rec-1",
          status: SalesInvoiceStatus.DRAFT,
          taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
          balanceDue: decimal("115.0000"),
          lines: expect.objectContaining({ create: [expect.objectContaining({ account: { connect: { id: "revenue-1" } } })] }),
        }),
      }),
    );
    expect(tx.recurringInvoiceRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          templateId: "rec-1",
          generatedInvoiceId: "invoice-1",
          generatedById: "user-1",
        }),
      }),
    );
    expect(tx.recurringInvoiceTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastRunDate: new Date("2026-06-15T00:00:00.000Z"), nextRunDate: new Date("2026-07-15T00:00:00.000Z") }),
      }),
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(tx.emailOutbox.create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "GENERATE_INVOICE", entityType: "RecurringInvoiceTemplate" }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "SalesInvoice", entityId: "invoice-1" }));
  });

  it("blocks duplicate generation for the same run date", async () => {
    const tx = makeTransactionClient({
      recurringInvoiceRun: {
        findFirst: jest.fn().mockResolvedValue({ id: "run-1", generatedInvoiceId: "invoice-1" }),
        create: jest.fn(),
      },
    });
    const prisma = {
      account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
      taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-15", rate: decimal("15.0000") }]) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const { service } = makeService(prisma);
    jest.spyOn(service, "get").mockResolvedValue(makeTemplate({ status: RecurringInvoiceTemplateStatus.ACTIVE }) as never);

    await expect(service.generateNow("org-1", "user-1", "rec-1")).rejects.toThrow("already been generated");
    expect(tx.salesInvoice.create).not.toHaveBeenCalled();
  });

  it("blocks generation for draft, paused, ended, and cancelled templates", async () => {
    const { service } = makeService({});
    for (const status of [
      RecurringInvoiceTemplateStatus.DRAFT,
      RecurringInvoiceTemplateStatus.PAUSED,
      RecurringInvoiceTemplateStatus.ENDED,
      RecurringInvoiceTemplateStatus.CANCELLED,
    ]) {
      jest.spyOn(service, "get").mockResolvedValueOnce(makeTemplate({ status }) as never);
      await expect(service.generateNow("org-1", "user-1", "rec-1")).rejects.toThrow("Only active recurring invoice templates");
    }
  });
});

function makeService(prisma: any) {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const numbers = {
    preview: jest.fn().mockResolvedValue({ exampleNextNumber: "REC-000001", scope: NumberSequenceScope.RECURRING_INVOICE_TEMPLATE, prefix: "REC-", nextNumber: 1, padding: 6 }),
    next: jest.fn((_organizationId: string, scope: NumberSequenceScope) =>
      Promise.resolve(scope === NumberSequenceScope.RECURRING_INVOICE_TEMPLATE ? "REC-000001" : "INV-000010"),
    ),
  };
  return { service: new RecurringInvoiceService(prisma as never, audit as never, numbers as never), audit, numbers };
}

function makePreparePrisma(overrides: Record<string, unknown> = {}) {
  return {
    item: { findMany: jest.fn().mockResolvedValue([]) },
    account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
    taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-15", rate: decimal("15.0000") }]) },
    ...overrides,
  };
}

function makeCreatePrisma(tx: ReturnType<typeof makeTransactionClient>) {
  return {
    contact: { findFirst: jest.fn().mockResolvedValue({ id: "customer-1" }) },
    branch: { findFirst: jest.fn().mockResolvedValue({ id: "branch-1" }) },
    item: { findMany: jest.fn().mockResolvedValue([]) },
    account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
    taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-15", rate: decimal("15.0000") }]) },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
}

function makeTransactionClient(overrides: Record<string, any> = {}) {
  const template = makeTemplate();
  const invoice = makeInvoice();
  return {
    account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
    taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-15", rate: decimal("15.0000") }]) },
    journalEntry: { create: jest.fn() },
    zatcaInvoiceMetadata: { upsert: jest.fn() },
    emailOutbox: { create: jest.fn() },
    recurringInvoiceTemplateLine: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    recurringInvoiceTemplate: {
      create: jest.fn().mockResolvedValue(template),
      update: jest.fn().mockResolvedValue({ ...template, lastRunDate: new Date("2026-06-15T00:00:00.000Z"), nextRunDate: new Date("2026-07-15T00:00:00.000Z") }),
      findFirst: jest.fn().mockResolvedValue(makeTemplateForGeneration()),
    },
    recurringInvoiceRun: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(makeRun()),
    },
    salesInvoice: { create: jest.fn().mockResolvedValue(invoice) },
    ...overrides,
  };
}

async function prepareTemplate(
  service: RecurringInvoiceService,
  organizationId: string,
  lines: Array<Partial<Parameters<RecurringInvoiceService["create"]>[2]["lines"][number]>>,
  taxMode: SalesInvoiceTaxMode = SalesInvoiceTaxMode.TAX_EXCLUSIVE,
) {
  return (service as any).prepareTemplate(organizationId, lines, taxMode);
}

function templateLine(overrides: Record<string, unknown> = {}) {
  return {
    description: "Managed service",
    accountId: "revenue-1",
    quantity: "1.0000",
    unitPrice: "100.0000",
    discountRate: "0.0000",
    ...overrides,
  };
}

function makeCreateDto() {
  return {
    customerId: "customer-1",
    branchId: "branch-1",
    name: "Monthly support",
    startDate: "2026-06-15",
    nextRunDate: "2026-06-15",
    frequency: RecurringInvoiceFrequency.MONTHLY,
    interval: 1,
    paymentTermsDays: 15,
    reference: "MSA-1",
    currency: "SAR",
    taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
    lines: [templateLine({ taxRateId: "tax-15" })],
  };
}

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: "rec-1",
    organizationId: "org-1",
    templateNumber: "REC-000001",
    name: "Monthly support",
    customerId: "customer-1",
    branchId: "branch-1",
    status: RecurringInvoiceTemplateStatus.DRAFT,
    startDate: new Date("2026-06-15T00:00:00.000Z"),
    endDate: null,
    nextRunDate: new Date("2026-06-15T00:00:00.000Z"),
    lastRunDate: null,
    frequency: RecurringInvoiceFrequency.MONTHLY,
    interval: 1,
    dayOfMonth: 15,
    dayOfWeek: null,
    monthOfYear: null,
    invoiceDateMode: "RUN_DATE",
    paymentTermsDays: 15,
    reference: "MSA-1",
    currency: "SAR",
    taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
    subtotal: decimal("100.0000"),
    discountTotal: decimal("0.0000"),
    taxableTotal: decimal("100.0000"),
    taxTotal: decimal("15.0000"),
    total: decimal("115.0000"),
    notes: null,
    terms: null,
    customer: { id: "customer-1", name: "Customer", displayName: null, type: "CUSTOMER", isActive: true },
    lines: [makePersistedLine()],
    runs: [],
    ...overrides,
  };
}

function makeTemplateForGeneration() {
  return {
    ...makeTemplate({ status: RecurringInvoiceTemplateStatus.ACTIVE }),
    customer: { id: "customer-1", name: "Customer", displayName: null, type: "CUSTOMER", isActive: true },
    lines: [makePersistedLine()],
  };
}

function makePersistedLine(overrides: Record<string, unknown> = {}) {
  return {
    id: "rec-line-1",
    organizationId: "org-1",
    templateId: "rec-1",
    itemId: null,
    description: "Managed service",
    accountId: "revenue-1",
    quantity: decimal("1.0000"),
    unitPrice: decimal("100.0000"),
    discountRate: decimal("0.0000"),
    taxRateId: "tax-15",
    lineGrossAmount: decimal("100.0000"),
    discountAmount: decimal("0.0000"),
    taxableAmount: decimal("100.0000"),
    taxAmount: decimal("15.0000"),
    lineSubtotal: decimal("100.0000"),
    lineTotal: decimal("115.0000"),
    sortOrder: 0,
    ...overrides,
  };
}

function makeInvoice() {
  return {
    id: "invoice-1",
    organizationId: "org-1",
    invoiceNumber: "INV-000010",
    customerId: "customer-1",
    branchId: "branch-1",
    recurringInvoiceTemplateId: "rec-1",
    issueDate: new Date("2026-06-15T00:00:00.000Z"),
    dueDate: new Date("2026-06-30T00:00:00.000Z"),
    currency: "SAR",
    status: SalesInvoiceStatus.DRAFT,
    taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
    subtotal: decimal("100.0000"),
    discountTotal: decimal("0.0000"),
    taxableTotal: decimal("100.0000"),
    taxTotal: decimal("15.0000"),
    total: decimal("115.0000"),
    balanceDue: decimal("115.0000"),
    lines: [makePersistedLine()],
  };
}

function makeRun() {
  return {
    id: "run-1",
    organizationId: "org-1",
    templateId: "rec-1",
    runDate: new Date("2026-06-15T00:00:00.000Z"),
    invoiceDate: new Date("2026-06-15T00:00:00.000Z"),
    dueDate: new Date("2026-06-30T00:00:00.000Z"),
    periodStart: new Date("2026-06-15T00:00:00.000Z"),
    periodEnd: new Date("2026-07-14T00:00:00.000Z"),
    generatedInvoiceId: "invoice-1",
    generatedById: "user-1",
  };
}

function decimal(value: string) {
  return new Prisma.Decimal(value);
}
