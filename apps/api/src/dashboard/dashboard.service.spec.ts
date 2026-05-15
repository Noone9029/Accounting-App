import { Prisma, StockMovementType } from "@prisma/client";
import { DashboardService } from "./dashboard.service";

describe("DashboardService", () => {
  const organizationId = "org-1";

  function makeService(overrides: Partial<MockPrisma> = {}) {
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: organizationId, baseCurrency: "SAR" }) },
      salesInvoice: {
        findMany: jest.fn().mockResolvedValue([
          {
            issueDate: new Date("2026-05-02T00:00:00.000Z"),
            dueDate: new Date("2026-05-03T00:00:00.000Z"),
            total: new Prisma.Decimal("100.0000"),
            balanceDue: new Prisma.Decimal("75.0000"),
          },
        ]),
      },
      customerPayment: { findMany: jest.fn().mockResolvedValue([{ amountReceived: new Prisma.Decimal("25.0000") }]) },
      purchaseBill: {
        findMany: jest.fn().mockResolvedValue([
          {
            billDate: new Date("2026-05-01T00:00:00.000Z"),
            dueDate: new Date("2026-05-04T00:00:00.000Z"),
            total: new Prisma.Decimal("50.0000"),
            balanceDue: new Prisma.Decimal("30.0000"),
          },
        ]),
      },
      supplierPayment: { findMany: jest.fn().mockResolvedValue([{ amountPaid: new Prisma.Decimal("20.0000") }]) },
      bankAccountProfile: { findMany: jest.fn().mockResolvedValue([{ accountId: "bank-account-1" }]) },
      bankStatementTransaction: { count: jest.fn().mockResolvedValue(2) },
      bankReconciliation: {
        findFirst: jest.fn().mockResolvedValue({ closedAt: new Date("2026-05-10T00:00:00.000Z"), periodEnd: new Date("2026-05-09T00:00:00.000Z") }),
      },
      journalLine: {
        findMany: jest.fn().mockResolvedValue([
          {
            debit: new Prisma.Decimal("120.0000"),
            credit: new Prisma.Decimal("0.0000"),
            journalEntry: { entryDate: new Date("2026-05-01T00:00:00.000Z") },
          },
          {
            debit: new Prisma.Decimal("0.0000"),
            credit: new Prisma.Decimal("10.0000"),
            journalEntry: { entryDate: new Date("2026-05-02T00:00:00.000Z") },
          },
        ]),
      },
      item: {
        findMany: jest.fn().mockResolvedValue([{ id: "item-1", name: "E2E Widget", reorderPoint: new Prisma.Decimal("10.0000") }]),
      },
      stockMovement: {
        findMany: jest.fn().mockResolvedValue([
          {
            itemId: "item-1",
            type: StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER,
            quantity: new Prisma.Decimal("5.0000"),
            unitCost: new Prisma.Decimal("4.0000"),
            totalCost: null,
          },
        ]),
      },
      fiscalPeriod: {
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue({ status: "OPEN" }),
      },
      auditLog: { count: jest.fn().mockResolvedValue(4) },
      zatcaOrganizationProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      zatcaEgsUnit: { findFirst: jest.fn().mockResolvedValue(null) },
      zatcaInvoiceMetadata: { count: jest.fn().mockResolvedValue(0) },
      ...overrides,
    } satisfies MockPrisma;
    const reportsService = {
      trialBalance: jest.fn().mockResolvedValue({ totals: { balanced: true } }),
      profitAndLoss: jest.fn().mockResolvedValue({ netProfit: "42.0000" }),
      balanceSheet: jest.fn().mockResolvedValue({ balanced: true }),
      agedReceivables: jest.fn().mockResolvedValue({
        bucketTotals: { CURRENT: "10.0000", "1_30": "5.0000", "31_60": "0.0000", "61_90": "0.0000", "90_PLUS": "0.0000" },
      }),
      agedPayables: jest.fn().mockResolvedValue({
        bucketTotals: { CURRENT: "3.0000", "1_30": "2.0000", "31_60": "0.0000", "61_90": "0.0000", "90_PLUS": "0.0000" },
      }),
    };
    const clearingReportService = {
      clearingVarianceReport: jest.fn().mockResolvedValue({ summary: { rowCount: 1 } }),
    };
    const storageService = {
      readiness: jest.fn().mockReturnValue({
        attachmentStorage: { activeProvider: "database" },
        generatedDocumentStorage: { activeProvider: "database" },
      }),
    };

    return {
      service: new DashboardService(prisma as never, reportsService as never, clearingReportService as never, storageService as never),
      prisma,
      reportsService,
      clearingReportService,
      storageService,
    };
  }

  it("returns tenant-scoped business KPI totals and attention items", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-15T12:00:00.000Z"));
    const { service, prisma } = makeService();

    const summary = await service.summary(organizationId);

    expect(summary.currency).toBe("SAR");
    expect(summary.sales).toEqual(
      expect.objectContaining({
        unpaidInvoiceCount: 1,
        unpaidInvoiceBalance: "75.0000",
        overdueInvoiceCount: 1,
        overdueInvoiceBalance: "75.0000",
        salesThisMonth: "100.0000",
        customerPaymentThisMonth: "25.0000",
      }),
    );
    expect(summary.purchases.unpaidBillBalance).toBe("30.0000");
    expect(summary.banking.totalBankBalance).toBe("110.0000");
    expect(summary.inventory.lowStockCount).toBe(1);
    expect(summary.inventory.inventoryEstimatedValue).toBe("20.0000");
    expect(summary.inventory.lowStockItems).toEqual([
      {
        itemId: "item-1",
        name: "E2E Widget",
        quantityOnHand: "5.0000",
        reorderPoint: "10.0000",
      },
    ]);
    expect(summary.reports).toEqual({
      trialBalanceBalanced: true,
      profitAndLossNetProfit: "42.0000",
      balanceSheetBalanced: true,
    });
    expect(summary.trends.monthlySales).toHaveLength(6);
    expect(summary.trends.monthlySales.at(-1)).toEqual({ month: "2026-05", amount: "100.0000" });
    expect(summary.trends.monthlyPurchases.at(-1)).toEqual({ month: "2026-05", amount: "50.0000" });
    expect(summary.trends.monthlyNetProfit).toHaveLength(6);
    expect(summary.trends.cashBalanceTrend.at(-1)).toEqual({ date: "2026-05-01", balance: "110.0000" });
    expect(summary.aging.receivablesBuckets).toEqual(
      expect.arrayContaining([
        { bucket: "Current", amount: "10.0000" },
        { bucket: "1-30", amount: "5.0000" },
      ]),
    );
    expect(summary.aging.payablesBuckets).toEqual(
      expect.arrayContaining([
        { bucket: "Current", amount: "3.0000" },
        { bucket: "1-30", amount: "2.0000" },
      ]),
    );
    expect(summary.attentionItems.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        "OVERDUE_INVOICES",
        "OVERDUE_BILLS",
        "UNRECONCILED_BANK_TRANSACTIONS",
        "LOW_STOCK",
        "INVENTORY_CLEARING_VARIANCE",
        "ZATCA_NOT_READY",
        "DATABASE_STORAGE_ACTIVE",
      ]),
    );
    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId }) }));
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId }) }));
    jest.useRealTimers();
  });

  it("handles empty data without crashing", async () => {
    const { service } = makeService({
      salesInvoice: { findMany: jest.fn().mockResolvedValue([]) },
      customerPayment: { findMany: jest.fn().mockResolvedValue([]) },
      purchaseBill: { findMany: jest.fn().mockResolvedValue([]) },
      supplierPayment: { findMany: jest.fn().mockResolvedValue([]) },
      bankAccountProfile: { findMany: jest.fn().mockResolvedValue([]) },
      bankStatementTransaction: { count: jest.fn().mockResolvedValue(0) },
      bankReconciliation: { findFirst: jest.fn().mockResolvedValue(null) },
      item: { findMany: jest.fn().mockResolvedValue([]) },
      stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
      fiscalPeriod: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      auditLog: { count: jest.fn().mockResolvedValue(0) },
    });

    const summary = await service.summary(organizationId);

    expect(summary.sales.unpaidInvoiceCount).toBe(0);
    expect(summary.purchases.unpaidBillCount).toBe(0);
    expect(summary.banking.bankAccountCount).toBe(0);
    expect(summary.inventory.trackedItemCount).toBe(0);
    expect(summary.trends.monthlySales).toHaveLength(6);
    expect(summary.trends.cashBalanceTrend.every((point) => point.balance === "0.0000")).toBe(true);
    expect(summary.aging.receivablesBuckets).toHaveLength(5);
    expect(summary.attentionItems.map((item) => item.type)).toContain("FISCAL_PERIOD_MISSING");
  });
});

type MockPrisma = {
  organization: { findFirst: jest.Mock };
  salesInvoice: { findMany: jest.Mock };
  customerPayment: { findMany: jest.Mock };
  purchaseBill: { findMany: jest.Mock };
  supplierPayment: { findMany: jest.Mock };
  bankAccountProfile: { findMany: jest.Mock };
  bankStatementTransaction: { count: jest.Mock };
  bankReconciliation: { findFirst: jest.Mock };
  journalLine: { findMany: jest.Mock };
  item: { findMany: jest.Mock };
  stockMovement: { findMany: jest.Mock };
  fiscalPeriod: { count: jest.Mock; findFirst: jest.Mock };
  auditLog: { count: jest.Mock };
  zatcaOrganizationProfile: { findUnique: jest.Mock };
  zatcaEgsUnit: { findFirst: jest.Mock };
  zatcaInvoiceMetadata: { count: jest.Mock };
};
