import { BadRequestException } from "@nestjs/common";
import { FxCloseReadinessService } from "./fx-close-readiness.service";

describe("FxCloseReadinessService", () => {
  it("returns NOT_APPLICABLE for a base-only organization without requiring FX configuration", async () => {
    const prisma = readinessPrisma();
    const service = new FxCloseReadinessService(prisma as never);

    await expect(service.readiness("org-1", "2026-07-31")).resolves.toMatchObject({ status: "NOT_APPLICABLE", blockers: [], counts: { foreignDocuments: 0 } });
    expect(prisma.fxAccountConfiguration.findFirst).not.toHaveBeenCalled();
  });

  it("returns the latest FX source update separately from the close date", async () => {
    const prisma = readinessPrisma();
    prisma.salesInvoice.findFirst.mockResolvedValue({ updatedAt: new Date("2026-08-01T10:30:00.000Z") });
    const service = new FxCloseReadinessService(prisma as never);

    await expect(service.readiness("org-1", "2026-07-31")).resolves.toMatchObject({
      asOf: "2026-07-31",
      sourceUpdatedAt: "2026-08-01T10:30:00.000Z",
    });
  });

  it("blocks missing closing rates, configuration, and posted revaluation for open foreign balances", async () => {
    const prisma = readinessPrisma();
    setSalesInvoices(prisma, [foreignInvoice()]);
    const service = new FxCloseReadinessService(prisma as never);

    const result = await service.readiness("org-1", "2026-07-31");

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(expect.arrayContaining(["MISSING_FX_ACCOUNT_CONFIGURATION", "MISSING_CLOSING_RATE", "REVALUATION_NOT_POSTED"]));
    expect(prisma.salesInvoice.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", transactionBalanceDue: { gt: 0 } }) }));
    expect(prisma.salesInvoice.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }));
    expect(prisma.currencyRateSnapshot.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ["transactionCurrency"], _max: { createdAt: true } }));
  });

  it("blocks when a posted close-date run does not cover every currently open foreign source", async () => {
    const prisma = readinessPrisma();
    setSalesInvoices(prisma, [foreignInvoice({ fxMonetaryBalance: null })]);
    prisma.currencyRateSnapshot.groupBy.mockResolvedValue([{ transactionCurrency: "USD", _max: { createdAt: null } }]);
    prisma.fxAccountConfiguration.findFirst.mockResolvedValue(readyConfiguration());
    prisma.account.findMany.mockResolvedValue(readyControlAccounts());
    const service = new FxCloseReadinessService(prisma as never);

    const result = await service.readiness("org-1", "2026-07-31");

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: "REVALUATION_NOT_POSTED", count: 1 })]));
  });

  it("requires active posting type-correct FX and AR/AP control accounts", async () => {
    const prisma = readinessPrisma();
    setSalesInvoices(prisma, [coveredForeignInvoice()]);
    setPostedCloseCoverage(prisma, 1);
    prisma.currencyRateSnapshot.groupBy.mockResolvedValue([{ transactionCurrency: "USD", _max: { createdAt: null } }]);
    prisma.fxAccountConfiguration.findFirst.mockResolvedValue(readyConfiguration({ realizedGainAccount: { type: "EXPENSE", isActive: true, allowPosting: true } }));
    prisma.account.findMany.mockResolvedValue([{ code: "120", type: "ASSET", isActive: true, allowPosting: true }]);
    const service = new FxCloseReadinessService(prisma as never);

    const result = await service.readiness("org-1", "2026-07-31");

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.map((item) => item.code)).toEqual(expect.arrayContaining(["MISSING_FX_ACCOUNT_CONFIGURATION", "MISSING_FX_CONTROL_ACCOUNTS"]));
  });

  it("blocks draft manual-rate documents, unposted runs, and realized FX without journals", async () => {
    const prisma = readinessPrisma();
    setSalesInvoices(prisma, [
      foreignInvoice({ id: "draft-1", status: "DRAFT", rateSource: "MANUAL", transactionBalanceDue: "0.0000", balanceDue: "0.0000" }),
      foreignInvoice({ id: "open-1" }),
    ]);
    prisma.currencyRateSnapshot.groupBy.mockResolvedValue([{ transactionCurrency: "USD", _max: { createdAt: null } }]);
    prisma.fxAccountConfiguration.findFirst.mockResolvedValue(readyConfiguration());
    prisma.account.findMany.mockResolvedValue(readyControlAccounts());
    prisma.fxRevaluationRun.count.mockResolvedValue(1);
    prisma.customerPaymentAllocation.count.mockResolvedValue(1);
    const service = new FxCloseReadinessService(prisma as never);

    const result = await service.readiness("org-1", "2026-07-31");

    expect(result.blockers.map((blocker) => blocker.code)).toEqual(expect.arrayContaining(["DRAFT_MANUAL_RATE_DOCUMENT", "REVALUATION_NOT_POSTED", "REALIZED_FX_JOURNAL_MISSING"]));
  });

  it("returns READY and permits close when every foreign close control passes", async () => {
    const prisma = readinessPrisma();
    setSalesInvoices(prisma, [coveredForeignInvoice()]);
    setPostedCloseCoverage(prisma, 1);
    prisma.currencyRateSnapshot.groupBy.mockResolvedValue([{ transactionCurrency: "USD", _max: { createdAt: null } }]);
    prisma.fxAccountConfiguration.findFirst.mockResolvedValue(readyConfiguration());
    prisma.account.findMany.mockResolvedValue(readyControlAccounts());
    const service = new FxCloseReadinessService(prisma as never);

    await expect(service.readiness("org-1", "2026-07-31")).resolves.toMatchObject({ status: "READY", blockers: [] });
    await expect(service.assertReadyForPeriodClose("org-1", new Date("2026-07-31"))).resolves.toBeUndefined();
  });

  it("fails closed with actionable blocker codes", async () => {
    const prisma = readinessPrisma();
    setPurchaseBills(prisma, [foreignBill()]);
    const service = new FxCloseReadinessService(prisma as never);

    await expect(service.assertReadyForPeriodClose("org-1", new Date("2026-07-31"))).rejects.toThrow(BadRequestException);
    await expect(service.assertReadyForPeriodClose("org-1", new Date("2026-07-31"))).rejects.toThrow(/MISSING_FX_ACCOUNT_CONFIGURATION/);
  });

  it("uses source accounting dates for realized-journal close exceptions and valid settings routes", async () => {
    const prisma = readinessPrisma();
    setSalesInvoices(prisma, [foreignInvoice()]);
    const service = new FxCloseReadinessService(prisma as never);

    const result = await service.readiness("org-1", "2026-07-31");

    expect(prisma.customerPaymentAllocation.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: "org-1",
        payment: { paymentDate: { lte: new Date("2026-07-31T23:59:59.999Z") } },
      }),
    });
    expect(result.blockers.filter((item) => item.code === "MISSING_FX_ACCOUNT_CONFIGURATION" || item.code === "MISSING_CLOSING_RATE").map((item) => item.actionHref)).toEqual([
      "/settings/currencies-fx",
      "/settings/currencies-fx",
    ]);
  });

  it.each([
    ["full or partial customer settlement", "customerPaymentAllocation", "sales"],
    ["customer allocation reversal", "customerPaymentUnappliedAllocation", "sales"],
    ["customer credit allocation", "creditNoteAllocation", "sales"],
    ["full or partial supplier settlement", "supplierPaymentAllocation", "purchase"],
    ["supplier allocation reversal", "supplierPaymentUnappliedAllocation", "purchase"],
    ["supplier debit allocation", "purchaseDebitNoteAllocation", "purchase"],
  ] as const)("fails closed for post-close %s when no exact posted close run exists", async (_label, model, source) => {
    const prisma = readinessPrisma();
    if (source === "sales") setSalesInvoices(prisma, [foreignInvoice({ transactionBalanceDue: "0.0000", balanceDue: "0.0000" })]);
    else setPurchaseBills(prisma, [foreignBill({ transactionBalanceDue: "0.0000", balanceDue: "0.0000" })]);
    prisma.fxAccountConfiguration.findFirst.mockResolvedValue(readyConfiguration());
    prisma.account.findMany.mockResolvedValue(readyControlAccounts());
    prisma[model].count.mockImplementation(({ where }: any) => Promise.resolve((where.invoice || where.bill) && where.OR ? 1 : 0));
    const service = new FxCloseReadinessService(prisma as never);

    const result = await service.readiness("org-1", "2026-07-31");

    expect(result.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: "HISTORICAL_FX_ACTIVITY_AFTER_CLOSE" })]));
  });

  it("fails closed for a foreign document voided after the requested close date", async () => {
    const prisma = readinessPrisma();
    setSalesInvoices(prisma, [foreignInvoice({ status: "VOIDED", transactionBalanceDue: "0.0000", balanceDue: "0.0000" })]);
    prisma.fxAccountConfiguration.findFirst.mockResolvedValue(readyConfiguration());
    prisma.account.findMany.mockResolvedValue(readyControlAccounts());
    const service = new FxCloseReadinessService(prisma as never);

    const result = await service.readiness("org-1", "2026-07-31");

    expect(result.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: "HISTORICAL_FX_ACTIVITY_AFTER_CLOSE" })]));
  });

  it("accepts later settlement only when an exact posted close-date run already proves the historical scope", async () => {
    const prisma = readinessPrisma();
    setSalesInvoices(prisma, [foreignInvoice({ transactionBalanceDue: "0.0000", balanceDue: "0.0000" })]);
    setPostedCloseCoverage(prisma, 0);
    prisma.fxAccountConfiguration.findFirst.mockResolvedValue(readyConfiguration());
    prisma.account.findMany.mockResolvedValue(readyControlAccounts());
    prisma.customerPaymentAllocation.count.mockImplementation(({ where }: any) => Promise.resolve(where.invoice && where.OR ? 1 : 0));
    const service = new FxCloseReadinessService(prisma as never);

    await expect(service.readiness("org-1", "2026-07-31")).resolves.toMatchObject({
      status: "READY",
      blockers: [],
      counts: { historicalSourceChangesAfterClose: 0 },
    });
  });

  it("blocks a backdated foreign source finalized after close even when another exact posted run exists", async () => {
    const prisma = readinessPrisma();
    setSalesInvoices(prisma, [foreignInvoice({
      transactionBalanceDue: "0.0000",
      balanceDue: "0.0000",
      finalizedAt: new Date("2026-08-02T10:00:00.000Z"),
    })]);
    setPostedCloseCoverage(prisma, 0);
    prisma.fxAccountConfiguration.findFirst.mockResolvedValue(readyConfiguration());
    prisma.account.findMany.mockResolvedValue(readyControlAccounts());
    const service = new FxCloseReadinessService(prisma as never);

    const result = await service.readiness("org-1", "2026-07-31");

    expect(result.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: "HISTORICAL_FX_ACTIVITY_AFTER_CLOSE" })]));
  });
});

function readinessPrisma() {
  return {
    organization: { findFirst: jest.fn().mockResolvedValue({ baseCurrency: "AED" }) },
    salesInvoice: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
    purchaseBill: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
    customerPayment: { findFirst: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0) },
    supplierPayment: { findFirst: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0) },
    currencyRateSnapshot: { groupBy: jest.fn().mockResolvedValue([]) },
    fxAccountConfiguration: { findFirst: jest.fn().mockResolvedValue(null) },
    account: { findMany: jest.fn().mockResolvedValue([]) },
    fxRevaluationRun: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
    fxRevaluationLine: { count: jest.fn().mockResolvedValue(0) },
    customerPaymentAllocation: { count: jest.fn().mockResolvedValue(0) },
    customerPaymentUnappliedAllocation: { count: jest.fn().mockResolvedValue(0) },
    supplierPaymentAllocation: { count: jest.fn().mockResolvedValue(0) },
    supplierPaymentUnappliedAllocation: { count: jest.fn().mockResolvedValue(0) },
    creditNoteAllocation: { count: jest.fn().mockResolvedValue(0) },
    purchaseDebitNoteAllocation: { count: jest.fn().mockResolvedValue(0) },
  };
}

function setSalesInvoices(prisma: ReturnType<typeof readinessPrisma>, rows: Array<Record<string, any>>) {
  prisma.salesInvoice.count.mockImplementation(({ where }: any) => Promise.resolve(
    where.status === "DRAFT"
      ? rows.filter((row) => row.status === "DRAFT" && row.rateSource === "MANUAL").length
      : where.status === "VOIDED"
        ? rows.filter((row) => row.status === "VOIDED").length
        : where.finalizedAt?.gte
          ? rows.filter((row) => row.finalizedAt && new Date(row.finalizedAt) >= where.finalizedAt.gte).length
        : where.transactionBalanceDue
          ? rows.filter((row) => row.status === "FINALIZED" && Number(row.transactionBalanceDue) > 0).length
          : rows.length,
  ));
  prisma.salesInvoice.groupBy.mockResolvedValue([...new Set(rows.filter((row) => row.status === "FINALIZED" && Number(row.transactionBalanceDue) > 0).map((row) => row.currency))].map((currency) => ({ currency })));
}

function setPurchaseBills(prisma: ReturnType<typeof readinessPrisma>, rows: Array<Record<string, any>>) {
  prisma.purchaseBill.count.mockImplementation(({ where }: any) => Promise.resolve(
    where.status === "DRAFT"
      ? rows.filter((row) => row.status === "DRAFT" && row.rateSource === "MANUAL").length
      : where.status === "VOIDED"
        ? rows.filter((row) => row.status === "VOIDED").length
        : where.finalizedAt?.gte
          ? rows.filter((row) => row.finalizedAt && new Date(row.finalizedAt) >= where.finalizedAt.gte).length
        : where.transactionBalanceDue
          ? rows.filter((row) => row.status === "FINALIZED" && Number(row.transactionBalanceDue) > 0).length
          : rows.length,
  ));
  prisma.purchaseBill.groupBy.mockResolvedValue([...new Set(rows.filter((row) => row.status === "FINALIZED" && Number(row.transactionBalanceDue) > 0).map((row) => row.currency))].map((currency) => ({ currency })));
}

function setPostedCloseCoverage(prisma: ReturnType<typeof readinessPrisma>, coveredSourceCount: number) {
  prisma.fxRevaluationRun.findFirst.mockResolvedValue({ id: "posted-close-run" });
  prisma.fxRevaluationLine.count.mockImplementation(({ where }: any) => Promise.resolve(where.salesInvoice ? coveredSourceCount : 0));
}

function foreignInvoice(overrides: Record<string, unknown> = {}) {
  return { id: "invoice-1", invoiceNumber: "INV-1", currency: "USD", baseCurrency: "AED", status: "FINALIZED", rateSource: "IMPORT", transactionBalanceDue: "100.0000", balanceDue: "367.2500", ...overrides };
}

function foreignBill(overrides: Record<string, unknown> = {}) {
  return { id: "bill-1", billNumber: "BILL-1", currency: "USD", baseCurrency: "AED", status: "FINALIZED", rateSource: "IMPORT", transactionBalanceDue: "100.0000", balanceDue: "367.2500", ...overrides };
}

function coveredForeignInvoice() {
  return foreignInvoice({
    fxMonetaryBalance: {
      lastRevaluationLine: { revaluationRun: { status: "POSTED", revaluationDate: new Date("2026-07-31T00:00:00.000Z") } },
    },
  });
}

function readyConfiguration(overrides: Record<string, unknown> = {}) {
  return {
    realizedGainAccountId: "a",
    realizedLossAccountId: "b",
    unrealizedGainAccountId: "c",
    unrealizedLossAccountId: "d",
    realizedGainAccount: { type: "REVENUE", isActive: true, allowPosting: true },
    realizedLossAccount: { type: "EXPENSE", isActive: true, allowPosting: true },
    unrealizedGainAccount: { type: "REVENUE", isActive: true, allowPosting: true },
    unrealizedLossAccount: { type: "EXPENSE", isActive: true, allowPosting: true },
    ...overrides,
  };
}

function readyControlAccounts() {
  return [
    { code: "120", type: "ASSET", isActive: true, allowPosting: true },
    { code: "210", type: "LIABILITY", isActive: true, allowPosting: true },
  ];
}
