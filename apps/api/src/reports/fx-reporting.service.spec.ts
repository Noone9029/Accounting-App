import { BadRequestException } from "@nestjs/common";
import { FxReportingService } from "./fx-reporting.service";

describe("FxReportingService", () => {
  it("reports realized gains/losses, reversal net effect, and missing-journal exceptions", async () => {
    const prisma = fxPrisma();
    prisma.customerPaymentAllocation.findMany.mockResolvedValue([
      allocation({ id: "cpa-1", realizedGainAmount: "5.0000", realizedFxJournalEntryId: "je-1" }),
      allocation({ id: "cpa-missing", realizedLossAmount: "2.0000", realizedFxJournalEntryId: null }),
    ]);
    prisma.supplierPaymentUnappliedAllocation.findMany.mockResolvedValue([
      allocation({ id: "spua-reversed", realizedGainAmount: "3.0000", realizedFxJournalEntryId: "je-2", reversedAt: new Date("2026-07-12"), realizedFxReversalJournalEntryId: "je-3" }),
    ]);
    const service = new FxReportingService(prisma as never);

    const report = await service.realizedActivity("org-1", { from: "2026-07-01", to: "2026-07-31", transactionCurrency: " usd " });

    expect(report.accountingContext).toEqual({ baseCurrency: "AED", amountBasis: "BASE_CURRENCY" });
    expect(report.rows).toHaveLength(4);
    expect(report.totals).toMatchObject({ grossGain: "8.0000", grossLoss: "2.0000", reversedGain: "3.0000", netGain: "5.0000", netLoss: "2.0000", missingJournalCount: 1 });
    expect(report.rows.find((row) => row.id === "spua-reversed:reversal")).toMatchObject({ eventType: "REVERSAL", reversed: true, netGain: "-3.0000" });
    for (const model of [prisma.customerPaymentAllocation, prisma.customerPaymentUnappliedAllocation, prisma.supplierPaymentAllocation, prisma.supplierPaymentUnappliedAllocation]) {
      expect(model.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }));
    }
  });

  it.each([
    ["customer applied", "customerPaymentAllocation", { payment: { paymentNumber: "PAY-1", paymentDate: new Date("2026-07-10"), currency: "USD", baseCurrency: "AED", status: "VOIDED", voidedAt: new Date("2026-08-05"), voidReversalJournalEntryId: null } }],
    ["customer unapplied", "customerPaymentUnappliedAllocation", { createdAt: new Date("2026-07-10"), reversedAt: new Date("2026-08-05"), realizedFxReversalJournalEntryId: null }],
    ["supplier applied", "supplierPaymentAllocation", { payment: { paymentNumber: "SPAY-1", paymentDate: new Date("2026-07-10"), currency: "USD", baseCurrency: "AED", status: "VOIDED", voidedAt: new Date("2026-08-05"), voidReversalJournalEntryId: null } }],
    ["supplier unapplied", "supplierPaymentUnappliedAllocation", { createdAt: new Date("2026-07-10"), reversedAt: new Date("2026-08-05"), realizedFxReversalJournalEntryId: null }],
  ])("places %s original and reversal evidence in their accounting periods", async (_label, modelName, overrides) => {
    const prisma = fxPrisma();
    (prisma as any)[modelName].findMany.mockResolvedValue([
      allocation({ id: "cross-period", realizedGainAmount: "5.0000", realizedFxJournalEntryId: "je-original", ...overrides }),
    ]);
    const service = new FxReportingService(prisma as never);

    const original = await service.realizedActivity("org-1", { from: "2026-07-01", to: "2026-07-31" });
    const reversal = await service.realizedActivity("org-1", { from: "2026-08-01", to: "2026-08-31" });

    expect(original.rows).toEqual([expect.objectContaining({ id: "cross-period:original", eventType: "ORIGINAL", date: "2026-07-10", netGain: "5.0000", missingJournal: false })]);
    expect(reversal.rows).toEqual([expect.objectContaining({ id: "cross-period:reversal", eventType: "REVERSAL", date: "2026-08-05", reversedGain: "5.0000", netGain: "-5.0000", missingJournal: true })]);
  });

  it("keeps posted and reversed unrealized activity separate", async () => {
    const prisma = fxPrisma();
    setRevaluationRuns(prisma, [
      revaluationRun({ id: "run-posted", status: "POSTED", gain: "10.0000", loss: "1.0000" }),
      revaluationRun({ id: "run-reversed", status: "REVERSED", gain: "4.0000", loss: "0.0000" }),
    ]);
    const service = new FxReportingService(prisma as never);

    const report = await service.unrealizedActivity("org-1", { from: "2026-07-01", to: "2026-07-31" });

    expect(report.totals).toMatchObject({ grossGain: "14.0000", grossLoss: "1.0000", reversedGain: "4.0000", netGain: "10.0000", netLoss: "1.0000" });
    expect(report.rows.find((row) => row.revaluationRunId === "run-reversed")).toMatchObject({ status: "REVERSED", netGain: "0.0000" });
    expect(prisma.fxRevaluationRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }));
  });

  it("excludes draft, reviewed, and failed revaluation previews from recognized totals", async () => {
    const prisma = fxPrisma();
    setRevaluationRuns(prisma, [
      revaluationRun({ id: "run-posted", status: "POSTED", gain: "10.0000", loss: "0.0000" }),
      revaluationRun({ id: "run-draft", status: "DRAFT", gain: "20.0000", loss: "0.0000" }),
      revaluationRun({ id: "run-reviewed", status: "REVIEWED", gain: "30.0000", loss: "0.0000" }),
      revaluationRun({ id: "run-failed", status: "FAILED", gain: "40.0000", loss: "0.0000" }),
    ]);
    const service = new FxReportingService(prisma as never);

    const report = await service.unrealizedActivity("org-1", {});

    expect(report.totals).toMatchObject({ grossGain: "10.0000", previewGain: "90.0000", netGain: "10.0000" });
    expect(report.rows.find((row) => row.revaluationRunId === "run-reviewed")).toMatchObject({ recognition: "UNPOSTED_PREVIEW", netGain: "0.0000" });
  });

  it("audits tenant-scoped rate snapshots and their source usage", async () => {
    const prisma = fxPrisma();
    prisma.currencyRateSnapshot.findMany.mockResolvedValue([{ id: "rate-1", transactionCurrency: "USD", baseCurrency: "AED", rate: "3.67250000", rateDate: new Date("2026-07-10"), source: "MANUAL", sourceReference: "Reviewed" }]);
    prisma.salesInvoice.groupBy.mockResolvedValue([{ rateSnapshotId: "rate-1", _count: { _all: 1 } }]);
    prisma.purchaseBill.groupBy.mockResolvedValue([]);
    prisma.journalLine.groupBy.mockResolvedValue([{ rateSnapshotId: "rate-1", _count: { _all: 2 } }]);
    prisma.fxRevaluationLine.groupBy.mockResolvedValue([{ rateSnapshotId: "rate-1", _count: { _all: 1 } }]);
    const service = new FxReportingService(prisma as never);

    const report = await service.rateSnapshots("org-1", { transactionCurrency: "USD" });

    expect(report.rows[0]).toMatchObject({ id: "rate-1", usage: { documents: 1, journalLines: 2, revaluationLines: 1, total: 4 } });
    expect(prisma.currencyRateSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }));
    for (const model of [prisma.salesInvoice, prisma.purchaseBill, prisma.journalLine, prisma.fxRevaluationLine]) {
      expect(model.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }), by: ["rateSnapshotId"] }));
    }
  });

  it("groups open foreign exposure by currency without combining transaction amounts", async () => {
    const prisma = fxPrisma();
    prisma.salesInvoice.findMany.mockResolvedValue([openDocument("invoice-1", "USD", "100.0000", "367.2500", "375.0000")]);
    prisma.purchaseBill.findMany.mockResolvedValue([openDocument("bill-1", "EUR", "50.0000", "200.0000", null)]);
    const service = new FxReportingService(prisma as never);

    const report = await service.openExposure("org-1", {});

    expect(report.groups).toEqual([
      expect.objectContaining({ currency: "EUR", payableOpenTransactionAmount: "50.0000", grossCarryingBaseAmount: "200.0000", netCarryingBaseAmount: "-200.0000" }),
      expect.objectContaining({ currency: "USD", receivableOpenTransactionAmount: "100.0000", grossCarryingBaseAmount: "375.0000", netCarryingBaseAmount: "375.0000" }),
    ]);
    expect(report.totals).toMatchObject({ grossCarryingBaseAmount: "575.0000", netCarryingBaseAmount: "175.0000", grossSourceBaseAmount: "567.2500", netSourceBaseAmount: "167.2500", documentCount: 2 });
    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", currency: { not: "AED" }, transactionBalanceDue: { gt: 0 } }) }));
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", currency: { not: "AED" }, transactionBalanceDue: { gt: 0 } }) }));
  });

  it("separates gross receivables, gross payables, and net exposure within one currency", async () => {
    const prisma = fxPrisma();
    prisma.salesInvoice.findMany.mockResolvedValue([openDocument("invoice-1", "USD", "100.0000", "367.2500", "375.0000")]);
    prisma.purchaseBill.findMany.mockResolvedValue([openDocument("bill-1", "USD", "100.0000", "367.2500", "375.0000")]);
    const service = new FxReportingService(prisma as never);

    const report = await service.openExposure("org-1", {});

    expect(report.groups).toEqual([
      expect.objectContaining({
        currency: "USD",
        receivableOpenTransactionAmount: "100.0000",
        payableOpenTransactionAmount: "100.0000",
        grossOpenTransactionAmount: "200.0000",
        netOpenTransactionAmount: "0.0000",
        netCarryingBaseAmount: "0.0000",
      }),
    ]);
    expect(report.totals).toMatchObject({ receivableCarryingBaseAmount: "375.0000", payableCarryingBaseAmount: "375.0000", grossCarryingBaseAmount: "750.0000", netCarryingBaseAmount: "0.0000" });
  });

  it("rejects date filters for current open exposure instead of silently ignoring them", async () => {
    const service = new FxReportingService(fxPrisma() as never);
    await expect(service.openExposure("org-1", { from: "2026-07-01" })).rejects.toThrow(/date filters/i);
    await expect(service.openExposure("org-1", { to: "2026-07-31" })).rejects.toThrow(/date filters/i);
  });

  it("rejects unsupported PDF and invalid ISO currency filters", async () => {
    const service = new FxReportingService(fxPrisma() as never);
    await expect(service.realizedActivity("org-1", { format: "pdf" })).rejects.toThrow(BadRequestException);
    await expect(service.openExposure("org-1", { transactionCurrency: "US" })).rejects.toThrow(BadRequestException);
    await expect(service.realizedActivity("org-1", { transactionCurrency: ["USD"] as never })).rejects.toThrow(BadRequestException);
    await expect(service.realizedActivity("org-1", { from: { injected: true } as never })).rejects.toThrow(BadRequestException);
  });

  it("returns bounded JSON pages after loading the complete safe event-ordering window", async () => {
    const prisma = fxPrisma();
    prisma.customerPaymentAllocation.findMany.mockResolvedValue([
      allocation({ id: "a-1", realizedGainAmount: "1.0000", realizedFxJournalEntryId: "je-1" }),
      allocation({ id: "a-2", realizedGainAmount: "2.0000", realizedFxJournalEntryId: "je-2" }),
      allocation({ id: "a-3", realizedGainAmount: "3.0000", realizedFxJournalEntryId: "je-3" }),
    ]);
    const service = new FxReportingService(prisma as never);

    const report = await service.realizedActivity("org-1", { page: 2, limit: 1 });

    expect(report.rows).toEqual([expect.objectContaining({ allocationId: "a-2" })]);
    expect(report.totalsScope).toBe("PAGE");
    expect(report.totals).toMatchObject({ grossGain: "2.0000", rowCount: 1 });
    expect(report.pagination).toEqual({ page: 2, limit: 1, hasMore: true });
    expect(prisma.customerPaymentAllocation.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10_001 }));
  });

  it("orders the complete bounded realized scope by event date before paging across all allocation families", async () => {
    const prisma = fxPrisma();
    const customerApplied = [
      allocation({ id: "created-first", createdAt: new Date("2026-07-01"), payment: { paymentNumber: "PAY-1", paymentDate: new Date("2026-07-10"), currency: "USD", baseCurrency: "AED" } }),
      allocation({ id: "created-second", createdAt: new Date("2026-07-02"), payment: { paymentNumber: "PAY-2", paymentDate: new Date("2026-07-20"), currency: "USD", baseCurrency: "AED" } }),
      allocation({ id: "backdated-payment", createdAt: new Date("2026-07-30"), payment: { paymentNumber: "PAY-3", paymentDate: new Date("2026-07-01"), currency: "USD", baseCurrency: "AED" } }),
    ];
    prisma.customerPaymentAllocation.findMany.mockImplementation(({ take }: any) => Promise.resolve(customerApplied.slice(0, take)));
    prisma.customerPaymentUnappliedAllocation.findMany.mockResolvedValue([allocation({ id: "customer-unapplied", createdAt: new Date("2026-07-11") })]);
    prisma.supplierPaymentAllocation.findMany.mockResolvedValue([allocation({ id: "supplier-applied", payment: { paymentNumber: "SPAY-1", paymentDate: new Date("2026-07-12"), currency: "USD", baseCurrency: "AED" } })]);
    prisma.supplierPaymentUnappliedAllocation.findMany.mockResolvedValue([allocation({ id: "supplier-unapplied", createdAt: new Date("2026-07-13") })]);
    const service = new FxReportingService(prisma as never);

    const report = await service.realizedActivity("org-1", { page: 1, limit: 1 });

    expect(report.rows).toEqual([expect.objectContaining({ allocationId: "backdated-payment", date: "2026-07-01" })]);
  });

  it("allows navigation beyond page twenty within the 10,000-event safe scope", async () => {
    const service = new FxReportingService(fxPrisma() as never);

    await expect(service.realizedActivity("org-1", { page: 21, limit: 100 })).resolves.toMatchObject({
      pagination: { page: 21, limit: 100, hasMore: false },
    });
  });

  it("uses bounded database offsets for later unrealized pages", async () => {
    const prisma = fxPrisma();
    const runs = [
      revaluationRun({ id: "run-1", status: "POSTED", gain: "1.0000", loss: "0.0000" }),
      revaluationRun({ id: "run-2", status: "POSTED", gain: "2.0000", loss: "0.0000" }),
      revaluationRun({ id: "run-3", status: "POSTED", gain: "3.0000", loss: "0.0000" }),
    ];
    setRevaluationRuns(prisma, runs);
    const lines = runs.flatMap((run: any) => run.lines.map((line: any) => ({ ...line, revaluationRunId: run.id })));
    prisma.fxRevaluationLine.findMany.mockImplementation(({ skip = 0, take }: any) => Promise.resolve(lines.slice(skip, skip + take)));
    const service = new FxReportingService(prisma as never);

    const report = await service.unrealizedActivity("org-1", { page: 2, limit: 1 });

    expect(report.rows).toEqual([expect.objectContaining({ revaluationRunId: "run-2" })]);
    expect(prisma.fxRevaluationLine.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 1, take: 2 }));
  });
});

function fxPrisma() {
  return {
    organization: { findFirst: jest.fn().mockResolvedValue({ baseCurrency: "AED" }) },
    customerPaymentAllocation: { findMany: jest.fn().mockResolvedValue([]) },
    customerPaymentUnappliedAllocation: { findMany: jest.fn().mockResolvedValue([]) },
    supplierPaymentAllocation: { findMany: jest.fn().mockResolvedValue([]) },
    supplierPaymentUnappliedAllocation: { findMany: jest.fn().mockResolvedValue([]) },
    fxRevaluationRun: { findMany: jest.fn().mockResolvedValue([]) },
    currencyRateSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
    salesInvoice: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
    purchaseBill: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
    journalLine: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
    fxRevaluationLine: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
  };
}

function allocation(overrides: Record<string, unknown>) {
  return {
    id: "allocation", transactionAmountApplied: "10.0000", sourceBaseAmountApplied: "36.7250", carryingBaseAmount: "36.7250",
    settlementBaseAmountApplied: "36.7250", carryingRate: "3.67250000", settlementRate: "3.67250000",
    realizedGainAmount: "0.0000", realizedLossAmount: "0.0000", realizedFxJournalEntryId: null, createdAt: new Date("2026-07-10"),
    reversedAt: null, realizedFxReversalJournalEntryId: null,
    payment: { paymentNumber: "PAY-1", paymentDate: new Date("2026-07-10"), currency: "USD", baseCurrency: "AED" },
    invoice: { id: "invoice-1", invoiceNumber: "INV-1", currency: "USD", customer: { id: "customer-1", name: "Customer", displayName: null } },
    bill: { id: "bill-1", billNumber: "BILL-1", currency: "USD", supplier: { id: "supplier-1", name: "Supplier", displayName: null } },
    ...overrides,
  };
}

function revaluationRun({ id, status, gain, loss }: { id: string; status: string; gain: string; loss: string }) {
  return {
    id, status, revaluationDate: new Date("2026-07-31"), postedJournalEntryId: status === "POSTED" ? `je-${id}` : `je-${id}`,
    reversalJournalEntryId: status === "REVERSED" ? `rev-${id}` : null,
    lines: [{ id: `line-${id}`, sourceType: "SALES_INVOICE", currencyCode: "USD", baseCurrencyCode: "AED", openTransactionAmount: "100.0000", carryingBaseAmount: "367.2500", revaluedBaseAmount: "377.2500", unrealizedGainAmount: gain, unrealizedLossAmount: loss, closingRate: "3.77250000", rateSnapshotId: "rate-1" }],
  };
}

function setRevaluationRuns(prisma: ReturnType<typeof fxPrisma>, runs: Array<ReturnType<typeof revaluationRun>>) {
  prisma.fxRevaluationRun.findMany.mockResolvedValue(runs);
  prisma.fxRevaluationLine.findMany.mockResolvedValue(runs.flatMap((run) => run.lines.map((line) => ({ ...line, revaluationRunId: run.id }))));
}

function openDocument(id: string, currency: string, transactionBalanceDue: string, balanceDue: string, carrying: string | null) {
  return {
    id, currency, baseCurrency: "AED", transactionBalanceDue, balanceDue, exchangeRate: "3.67250000",
    customer: { id: "customer-1", name: "Customer", displayName: null }, supplier: { id: "supplier-1", name: "Supplier", displayName: null },
    fxMonetaryBalance: carrying ? { carryingBaseAmount: carrying, sourceBaseOpenAmount: balanceDue, openTransactionAmount: transactionBalanceDue, carryingRate: "3.75000000", rateSnapshotId: "rate-1", lastRevaluationLineId: "line-1" } : null,
  };
}
