import { ConflictException } from "@nestjs/common";
import { CurrencyRateSource, Prisma, PurchaseBillInventoryPostingMode, PurchaseBillStatus } from "@prisma/client";
import { DocumentFxContextService } from "../foreign-exchange/document-fx-context.service";
import { PurchaseBillService } from "./purchase-bill.service";

describe("PurchaseBillService document FX drafts", () => {
  it("persists transaction totals and line-rounded base totals from a tenant-owned snapshot", async () => {
    const prisma: any = {
      organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "SAR" }) },
      currencyRateSnapshot: {
        findFirst: jest.fn().mockResolvedValue({
          id: "11111111-1111-4111-8111-111111111111",
          organizationId: "org-1",
          transactionCurrency: "USD",
          baseCurrency: "SAR",
          rate: new Prisma.Decimal("3.75000000"),
          rateDate: new Date("2026-07-10T00:00:00.000Z"),
          source: CurrencyRateSource.MANUAL,
        }),
      },
      contact: { findFirst: jest.fn().mockResolvedValue({ id: "supplier-1" }) },
      branch: { findFirst: jest.fn() },
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: { findMany: jest.fn().mockResolvedValue([{ id: "expense-1", type: "EXPENSE" }]) },
      taxRate: {
        findMany: jest.fn().mockResolvedValue([
          { id: "tax-1", rate: new Prisma.Decimal("15"), scope: "BOTH", isActive: true },
        ]),
      },
      purchaseBill: {
        create: jest.fn().mockImplementation(({ data }: { data: object }) => ({ id: "bill-1", ...data })),
      },
    };
    prisma.$transaction = jest.fn((callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
    const service = new PurchaseBillService(
      prisma,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("BILL-000001") } as never,
      undefined,
      undefined,
      undefined,
      undefined,
      new DocumentFxContextService(prisma),
    );

    await service.create("org-1", "user-1", {
      supplierId: "supplier-1",
      billDate: "2026-07-11",
      currency: "USD",
      rateSnapshotId: "11111111-1111-4111-8111-111111111111",
      lines: [
        {
          description: "Services",
          accountId: "expense-1",
          quantity: "1",
          unitPrice: "100",
          taxRateId: "tax-1",
        },
      ],
    });

    expect(prisma.purchaseBill.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        currency: "USD",
        baseCurrency: "SAR",
        exchangeRate: new Prisma.Decimal("3.75000000"),
        transactionSubtotal: "100.0000",
        transactionTaxTotal: "15.0000",
        transactionTotal: "115.0000",
        subtotal: "375.0000",
        taxTotal: "56.2500",
        total: "431.2500",
        lines: {
          create: [
            expect.objectContaining({
              lineGrossAmount: "375.0000",
              taxAmount: "56.2500",
              lineTotal: "431.2500",
              transactionLineGrossAmount: "100.0000",
              transactionTaxAmount: "15.0000",
              transactionLineTotal: "115.0000",
            }),
          ],
        },
      }),
      include: expect.any(Object),
    });
  });

  it("writes a focused FX context-change event through the draft update transaction only when the currency/rate tuple changes", async () => {
    const existing = foreignDraftBill();
    const updated = { ...existing, exchangeRate: new Prisma.Decimal("3.80000000") };
    const tx: any = {
      purchaseBillLine: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      purchaseBill: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn().mockResolvedValue(updated) },
    };
    const prisma: any = {
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: { findMany: jest.fn().mockResolvedValue([{ id: "expense-1", type: "EXPENSE" }]) },
      taxRate: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const auditLog = { log: jest.fn() };
    const fxContext = {
      resolve: jest.fn().mockResolvedValue({
        currency: "USD", baseCurrency: "SAR", exchangeRate: new Prisma.Decimal("3.80000000"),
        rateDate: new Date("2026-07-11T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: null,
      }),
    };
    const service = new PurchaseBillService(
      prisma, auditLog as never, { next: jest.fn() } as never,
      undefined, undefined, undefined, undefined, fxContext as never,
    );
    jest.spyOn(service, "get").mockResolvedValue(existing as never);

    await service.update("org-1", "user-1", "bill-1", { exchangeRate: "3.80000000", rateSnapshotId: null });

    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CHANGE_FX_CONTEXT", entityType: "PurchaseBill", entityId: "bill-1",
        before: expect.objectContaining({ currency: "USD", baseCurrency: "SAR", exchangeRate: "3.75000000" }),
        after: expect.objectContaining({ currency: "USD", baseCurrency: "SAR", exchangeRate: "3.80000000" }),
      }),
      tx,
    );
  });

  it("keeps unchanged and same-currency draft tuples silent", async () => {
    const auditLog = { log: jest.fn() };
    const tx: any = { purchaseBill: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn() } };
    const prisma: any = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const fxContext = { resolve: jest.fn() };
    const service = new PurchaseBillService(
      prisma, auditLog as never, { next: jest.fn() } as never,
      undefined, undefined, undefined, undefined, fxContext as never,
    );

    for (const existing of [foreignDraftBill(), foreignDraftBill({
      currency: "SAR", baseCurrency: "SAR", exchangeRate: new Prisma.Decimal("1.00000000"),
      rateSource: CurrencyRateSource.SYSTEM_RATE_1, rateSnapshotId: null,
    })]) {
      tx.purchaseBill.update.mockResolvedValueOnce(existing);
      fxContext.resolve.mockResolvedValueOnce({
        currency: existing.currency, baseCurrency: existing.baseCurrency, exchangeRate: existing.exchangeRate,
        rateDate: existing.rateDate, rateSource: existing.rateSource, rateSnapshotId: existing.rateSnapshotId,
      });
      jest.spyOn(service, "get").mockResolvedValueOnce(existing as never);
      await service.update("org-1", "user-1", "bill-1", { notes: "No FX tuple change" });
    }

    expect(auditLog.log).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHANGE_FX_CONTEXT" }),
      expect.anything(),
    );
  });

  it("rejects a stale draft snapshot before line deletion or FX audit emission", async () => {
    const existing = foreignDraftBill();
    const tx: any = {
      purchaseBill: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockResolvedValue({ ...existing, exchangeRate: new Prisma.Decimal("3.80000000") }),
      },
      purchaseBillLine: { deleteMany: jest.fn() },
    };
    const prisma: any = {
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: { findMany: jest.fn().mockResolvedValue([{ id: "expense-1", type: "EXPENSE" }]) },
      taxRate: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const auditLog = { log: jest.fn() };
    const fxContext = { resolve: jest.fn().mockResolvedValue({
      currency: "USD", baseCurrency: "SAR", exchangeRate: new Prisma.Decimal("3.80000000"),
      rateDate: existing.rateDate, rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: null,
    }) };
    const service = new PurchaseBillService(
      prisma, auditLog as never, { next: jest.fn() } as never,
      undefined, undefined, undefined, undefined, fxContext as never,
    );
    jest.spyOn(service, "get").mockResolvedValue(existing as never);

    await expect(service.update("org-1", "user-1", "bill-1", {
      exchangeRate: "3.80000000", rateSnapshotId: null,
    })).rejects.toBeInstanceOf(ConflictException);

    expect(tx.purchaseBill.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "bill-1", organizationId: "org-1", updatedAt: existing.updatedAt }),
    }));
    expect(tx.purchaseBillLine.deleteMany).not.toHaveBeenCalled();
    expect(tx.purchaseBill.update).not.toHaveBeenCalled();
    expect(auditLog.log).not.toHaveBeenCalled();
  });
});

function foreignDraftBill(overrides: Record<string, unknown> = {}) {
  return {
    id: "bill-1", status: PurchaseBillStatus.DRAFT, supplierId: "supplier-1", branchId: null,
    updatedAt: new Date("2026-07-11T08:00:00.000Z"),
    billDate: new Date("2026-07-11T00:00:00.000Z"), dueDate: null,
    currency: "USD", baseCurrency: "SAR", exchangeRate: new Prisma.Decimal("3.75000000"),
    rateDate: new Date("2026-07-11T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: null,
    inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
    lines: [{
      itemId: null, item: null, description: "Services", accountId: "expense-1", quantity: new Prisma.Decimal("1"),
      unitPrice: new Prisma.Decimal("100"), discountRate: new Prisma.Decimal("0"), taxRateId: null, sortOrder: 0,
    }],
    ...overrides,
  };
}
