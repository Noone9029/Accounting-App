import { ConflictException } from "@nestjs/common";
import { CurrencyRateSource, Prisma, SalesInvoiceStatus, SalesInvoiceTaxMode } from "@prisma/client";
import { DocumentFxContextService } from "../foreign-exchange/document-fx-context.service";
import { SalesInvoiceService } from "./sales-invoice.service";

describe("SalesInvoiceService document FX drafts", () => {
  it("persists transaction totals and line-rounded base totals from a tenant-owned snapshot", async () => {
    const prisma: any = {
      organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "AED" }) },
      currencyRateSnapshot: {
        findFirst: jest.fn().mockResolvedValue({
          id: "11111111-1111-4111-8111-111111111111",
          organizationId: "org-1",
          transactionCurrency: "USD",
          baseCurrency: "AED",
          rate: new Prisma.Decimal("3.67250000"),
          rateDate: new Date("2026-07-10T00:00:00.000Z"),
          source: CurrencyRateSource.MANUAL,
        }),
      },
      contact: { findFirst: jest.fn().mockResolvedValue({ id: "customer-1" }) },
      branch: { findFirst: jest.fn() },
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
      taxRate: {
        findMany: jest.fn().mockResolvedValue([
          { id: "tax-1", rate: new Prisma.Decimal("5"), scope: "BOTH", isActive: true },
        ]),
      },
      salesInvoice: {
        create: jest.fn().mockImplementation(({ data }: { data: object }) => ({ id: "invoice-1", ...data })),
      },
    };
    prisma.$transaction = jest.fn((callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
    const service = new SalesInvoiceService(
      prisma,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("INV-000001") } as never,
      {} as never,
      undefined,
      undefined,
      undefined,
      undefined,
      new DocumentFxContextService(prisma),
    );

    await service.create("org-1", "user-1", {
      customerId: "customer-1",
      issueDate: "2026-07-11",
      currency: "USD",
      rateSnapshotId: "11111111-1111-4111-8111-111111111111",
      lines: [
        {
          description: "Consulting",
          accountId: "revenue-1",
          quantity: "1",
          unitPrice: "100",
          taxRateId: "tax-1",
        },
      ],
    });

    expect(prisma.salesInvoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        currency: "USD",
        baseCurrency: "AED",
        exchangeRate: new Prisma.Decimal("3.67250000"),
        rateDate: new Date("2026-07-10T00:00:00.000Z"),
        rateSource: CurrencyRateSource.MANUAL,
        rateSnapshotId: "11111111-1111-4111-8111-111111111111",
        transactionSubtotal: "100.0000",
        transactionTaxTotal: "5.0000",
        transactionTotal: "105.0000",
        subtotal: "367.2500",
        taxTotal: "18.3625",
        total: "385.6125",
        balanceDue: "385.6125",
        lines: {
          create: [
            expect.objectContaining({
              lineGrossAmount: "367.2500",
              taxAmount: "18.3625",
              lineTotal: "385.6125",
              transactionLineGrossAmount: "100.0000",
              transactionTaxAmount: "5.0000",
              transactionLineTotal: "105.0000",
            }),
          ],
        },
      }),
      include: expect.any(Object),
    });
  });

  it("writes a focused FX context-change event through the draft update transaction only when the currency/rate tuple changes", async () => {
    const existing = foreignDraftInvoice();
    const updated = { ...existing, exchangeRate: new Prisma.Decimal("3.80000000") };
    const tx: any = {
      salesInvoiceLine: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      salesInvoice: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn().mockResolvedValue(updated) },
    };
    const prisma: any = {
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
      taxRate: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const auditLog = { log: jest.fn() };
    const fxContext = {
      resolve: jest.fn().mockResolvedValue({
        currency: "USD", baseCurrency: "AED", exchangeRate: new Prisma.Decimal("3.80000000"),
        rateDate: new Date("2026-07-11T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: null,
      }),
    };
    const service = new SalesInvoiceService(
      prisma, auditLog as never, { next: jest.fn() } as never, {} as never,
      undefined, undefined, undefined, undefined, fxContext as never,
    );
    jest.spyOn(service, "get").mockResolvedValue(existing as never);

    await service.update("org-1", "user-1", "invoice-1", { exchangeRate: "3.80000000", rateSnapshotId: null });

    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CHANGE_FX_CONTEXT", entityType: "SalesInvoice", entityId: "invoice-1",
        before: expect.objectContaining({ currency: "USD", baseCurrency: "AED", exchangeRate: "3.67250000" }),
        after: expect.objectContaining({ currency: "USD", baseCurrency: "AED", exchangeRate: "3.80000000" }),
      }),
      tx,
    );
  });

  it("keeps unchanged and same-currency draft tuples silent", async () => {
    const auditLog = { log: jest.fn() };
    const tx: any = { salesInvoice: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn() } };
    const prisma: any = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const fxContext = { resolve: jest.fn() };
    const service = new SalesInvoiceService(
      prisma, auditLog as never, { next: jest.fn() } as never, {} as never,
      undefined, undefined, undefined, undefined, fxContext as never,
    );

    for (const existing of [foreignDraftInvoice(), foreignDraftInvoice({
      currency: "AED", baseCurrency: "AED", exchangeRate: new Prisma.Decimal("1.00000000"),
      rateSource: CurrencyRateSource.SYSTEM_RATE_1, rateSnapshotId: null,
    })]) {
      tx.salesInvoice.update.mockResolvedValueOnce(existing);
      fxContext.resolve.mockResolvedValueOnce({
        currency: existing.currency, baseCurrency: existing.baseCurrency, exchangeRate: existing.exchangeRate,
        rateDate: existing.rateDate, rateSource: existing.rateSource, rateSnapshotId: existing.rateSnapshotId,
      });
      jest.spyOn(service, "get").mockResolvedValueOnce(existing as never);
      await service.update("org-1", "user-1", "invoice-1", { notes: "No FX tuple change" });
    }

    expect(auditLog.log).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHANGE_FX_CONTEXT" }),
      expect.anything(),
    );
  });

  it("rejects a stale draft snapshot before line deletion or FX audit emission", async () => {
    const existing = foreignDraftInvoice();
    const tx: any = {
      salesInvoice: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockResolvedValue({ ...existing, exchangeRate: new Prisma.Decimal("3.80000000") }),
      },
      salesInvoiceLine: { deleteMany: jest.fn() },
    };
    const prisma: any = {
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
      taxRate: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const auditLog = { log: jest.fn() };
    const fxContext = { resolve: jest.fn().mockResolvedValue({
      currency: "USD", baseCurrency: "AED", exchangeRate: new Prisma.Decimal("3.80000000"),
      rateDate: existing.rateDate, rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: null,
    }) };
    const service = new SalesInvoiceService(
      prisma, auditLog as never, { next: jest.fn() } as never, {} as never,
      undefined, undefined, undefined, undefined, fxContext as never,
    );
    jest.spyOn(service, "get").mockResolvedValue(existing as never);

    await expect(service.update("org-1", "user-1", "invoice-1", {
      exchangeRate: "3.80000000", rateSnapshotId: null,
    })).rejects.toBeInstanceOf(ConflictException);

    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "invoice-1", organizationId: "org-1", updatedAt: existing.updatedAt }),
    }));
    expect(tx.salesInvoiceLine.deleteMany).not.toHaveBeenCalled();
    expect(tx.salesInvoice.update).not.toHaveBeenCalled();
    expect(auditLog.log).not.toHaveBeenCalled();
  });
});

function foreignDraftInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "invoice-1", status: SalesInvoiceStatus.DRAFT, customerId: "customer-1", branchId: null,
    updatedAt: new Date("2026-07-11T08:00:00.000Z"),
    issueDate: new Date("2026-07-11T00:00:00.000Z"), dueDate: null,
    currency: "USD", baseCurrency: "AED", exchangeRate: new Prisma.Decimal("3.67250000"),
    rateDate: new Date("2026-07-11T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: null,
    taxMode: SalesInvoiceTaxMode.NO_TAX,
    lines: [{
      itemId: null, description: "Consulting", accountId: "revenue-1", quantity: new Prisma.Decimal("1"),
      unitPrice: new Prisma.Decimal("100"), discountRate: new Prisma.Decimal("0"), taxRateId: null, sortOrder: 0,
    }],
    ...overrides,
  };
}
