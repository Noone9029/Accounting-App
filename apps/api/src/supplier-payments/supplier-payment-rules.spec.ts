import { assertBalancedJournal, assertJournalFxContext } from "@ledgerbyte/accounting-core";
import { CurrencyRateSource, JournalEntryStatus, PurchaseBillStatus, SupplierPaymentStatus } from "@prisma/client";
import { buildSupplierPaymentJournalLines } from "./supplier-payment-accounting";
import { SupplierPaymentService } from "./supplier-payment.service";
import type { CreateSupplierPaymentDto } from "./dto/create-supplier-payment.dto";

const basePaymentDto: CreateSupplierPaymentDto = {
  supplierId: "supplier-1",
  paymentDate: "2026-05-12T00:00:00.000Z",
  currency: "SAR",
  amountPaid: "100.0000",
  accountId: "bank-1",
  allocations: [{ billId: "bill-1", amountApplied: "100.0000" }],
};

describe("supplier payment rules", () => {
  it("builds balanced AP-clearing payment journal lines", () => {
    const lines = buildSupplierPaymentJournalLines({
      paidThroughAccountId: "bank",
      accountsPayableAccountId: "ap",
      paymentNumber: "PAY-000001",
      supplierName: "Supplier",
      currency: "SAR",
      amountPaid: "575.0000",
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountId: "ap", debit: "575.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "bank", debit: "0.0000", credit: "575.0000" }),
    ]);
    expect(() => assertBalancedJournal(lines)).not.toThrow();
  });

  it("builds a reproducible foreign supplier settlement with realized gain", () => {
    const lines = buildSupplierPaymentJournalLines({
      paidThroughAccountId: "bank", accountsPayableAccountId: "ap", realizedGainAccountId: "fx-gain", realizedLossAccountId: "fx-loss",
      paymentNumber: "PAY-USD-1", supplierName: "Supplier", currency: "USD", baseCurrency: "SAR",
      exchangeRate: "3.65000000", rateSnapshotId: "payment-rate", transactionAmountPaid: "100.0000", settlementBaseAmountPaid: "365.0000",
      allocations: [{ transactionAmountApplied: "100.0000", documentBaseAmountApplied: "375.0000", recognitionRate: "3.75000000", rateSnapshotId: "bill-rate" }],
      transactionUnappliedAmount: "0.0000", unappliedBaseAmount: "0.0000", realizedGainAmount: "10.0000", realizedLossAmount: "0.0000",
    });
    expect(lines).toEqual([
      expect.objectContaining({ accountId: "ap", debit: "375.0000", transactionDebit: "100.0000", exchangeRate: "3.75000000" }),
      expect.objectContaining({ accountId: "bank", credit: "365.0000", transactionCredit: "100.0000", exchangeRate: "3.65000000" }),
      expect.objectContaining({ accountId: "fx-gain", credit: "10.0000", functionalCurrencyOnly: true }),
    ]);
    expect(() => assertBalancedJournal(lines)).not.toThrow();
    expect(() => assertJournalFxContext(lines, "SAR")).not.toThrow();
  });

  it("posts a direct foreign supplier allocation with frozen realized-gain evidence", async () => {
    const tx = makeForeignCreateTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const fxContext = { resolve: jest.fn().mockResolvedValue({
      currency: "USD", baseCurrency: "SAR", exchangeRate: "3.65000000",
      rateDate: new Date("2026-07-11T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate",
    }) };
    const service = new SupplierPaymentService(
      prisma as never, { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") } as never,
      undefined, undefined, undefined, undefined, fxContext as never,
    );
    await expect(service.create("org-1", "user-1", {
      ...basePaymentDto, currency: "USD", exchangeRate: "3.65000000", rateDate: "2026-07-11",
      rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate",
    })).resolves.toMatchObject({ id: "payment-1" });

    expect(tx.purchaseBill.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ balanceDue: { gte: "375.0000" }, transactionBalanceDue: { gte: "100.0000" } }),
      data: { balanceDue: { decrement: "375.0000" }, transactionBalanceDue: { decrement: "100.0000" } },
    });
    expect(tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      currency: "SAR", totalDebit: "375.0000", totalCredit: "375.0000",
      lines: { create: expect.arrayContaining([
        expect.objectContaining({ debit: "375.0000", transactionDebit: "100.0000" }),
        expect.objectContaining({ credit: "365.0000", transactionCredit: "100.0000" }),
        expect.objectContaining({ account: { connect: { id: "fx-gain" } }, credit: "10.0000", functionalCurrencyOnly: true }),
      ]) },
    }) }));
    expect(tx.supplierPayment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      currency: "USD", baseCurrency: "SAR", amountPaid: "365.0000", transactionAmountPaid: "100.0000",
      transactionUnappliedAmount: "0.0000",
    }) }));
    expect(tx.supplierPaymentAllocation.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      amountApplied: "375.0000", transactionAmountApplied: "100.0000", documentBaseAmountApplied: "375.0000",
      settlementBaseAmountApplied: "365.0000", realizedGainAmount: "10.0000", realizedLossAmount: "0.0000",
      realizedFxJournalEntry: { connect: { organizationId_id: { organizationId: "org-1", id: "journal-1" } } },
    }) });
  });

  it("settles a revalued payable against adjusted carrying basis and preserves source basis", async () => {
    const tx = makeForeignCreateTransactionMock();
    tx.purchaseBill.findMany.mockResolvedValue([{
      id: "bill-1", supplierId: "supplier-1", status: PurchaseBillStatus.FINALIZED,
      currency: "USD", baseCurrency: "SAR", exchangeRate: "3.65000000",
      rateDate: new Date("2026-07-01T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL,
      rateSnapshotId: "bill-rate", balanceDue: "365.0000", transactionBalanceDue: "100.0000",
    }]);
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const fxContext = { resolve: jest.fn().mockResolvedValue({
      currency: "USD", baseCurrency: "SAR", exchangeRate: "3.80000000",
      rateDate: new Date("2026-07-12T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate",
    }) };
    const carrying = {
      resolveSupplierBasis: jest.fn().mockResolvedValue({
        monetaryBalanceId: "balance-1", carryingBaseOpenAmount: "375.0000", sourceBaseOpenAmount: "365.0000",
        carryingRate: "3.75000000", carryingRateSnapshotId: "closing-rate", carryingRevaluationLineId: "revaluation-line-1",
        useProportionalCarryingBasis: true,
      }),
      applySettlement: jest.fn(),
    };
    const service = new SupplierPaymentService(
      prisma as never, { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") } as never,
      undefined, undefined, undefined, undefined, fxContext as never, carrying as never,
    );

    await service.create("org-1", "user-1", {
      ...basePaymentDto, currency: "USD", exchangeRate: "3.80000000", rateDate: "2026-07-12",
      rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate",
    });

    expect(tx.purchaseBill.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ balanceDue: { gte: "365.0000" }, transactionBalanceDue: { gte: "100.0000" } }),
      data: { balanceDue: { decrement: "365.0000" }, transactionBalanceDue: { decrement: "100.0000" } },
    }));
    expect(carrying.applySettlement).toHaveBeenCalledWith("org-1", expect.objectContaining({ carryingRevaluationLineId: "revaluation-line-1" }), {
      transactionAmount: "100.0000", carryingBaseAmount: "375.0000", sourceBaseAmount: "365.0000",
    }, tx);
    expect(tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      totalDebit: "380.0000", totalCredit: "380.0000",
      lines: { create: expect.arrayContaining([
        expect.objectContaining({ debit: "375.0000", transactionDebit: "100.0000", exchangeRate: "3.75000000", rateSnapshot: { connect: { organizationId_id: { organizationId: "org-1", id: "closing-rate" } } } }),
        expect.objectContaining({ account: { connect: { id: "fx-loss" } }, debit: "5.0000" }),
      ]) },
    }) }));
    expect(tx.supplierPaymentAllocation.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      documentBaseAmountApplied: "375.0000", sourceBaseAmountApplied: "365.0000", carryingRate: "3.75000000",
      carryingRevaluationLine: { connect: { organizationId_id: { organizationId: "org-1", id: "revaluation-line-1" } } },
    }) });
  });

  it("reconciles supplier multi-allocation settlement rounding to the exact payment base total", async () => {
    const tx = makeForeignCreateTransactionMock();
    tx.purchaseBill.findMany.mockResolvedValue([
      { id: "bill-1", supplierId: "supplier-1", status: PurchaseBillStatus.FINALIZED, currency: "USD", baseCurrency: "SAR", exchangeRate: "3.67250000", rateDate: new Date("2026-07-01"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "rate-1", balanceDue: "0.0735", transactionBalanceDue: "0.0200" },
      { id: "bill-2", supplierId: "supplier-1", status: PurchaseBillStatus.FINALIZED, currency: "USD", baseCurrency: "SAR", exchangeRate: "3.67250000", rateDate: new Date("2026-07-01"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "rate-2", balanceDue: "3.5991", transactionBalanceDue: "0.9800" },
    ]);
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const fxContext = { resolve: jest.fn().mockResolvedValue({ currency: "USD", baseCurrency: "SAR", exchangeRate: "3.67250000", rateDate: new Date("2026-07-11"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate" }) };
    const service = new SupplierPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValueOnce("PAY-1").mockResolvedValueOnce("JE-1") } as never, undefined, undefined, undefined, undefined, fxContext as never);

    await service.create("org-1", "user-1", { ...basePaymentDto, currency: "USD", exchangeRate: "3.67250000", rateDate: "2026-07-11", rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate", amountPaid: "1.0000", allocations: [{ billId: "bill-1", amountApplied: "0.0200" }, { billId: "bill-2", amountApplied: "0.9800" }] });

    expect(tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalDebit: "3.6726", totalCredit: "3.6726" }) }));
    expect(tx.supplierPaymentAllocation.create).toHaveBeenNthCalledWith(1, { data: expect.objectContaining({ settlementBaseAmountApplied: "0.0735", realizedGainAmount: "0.0000" }) });
    expect(tx.supplierPaymentAllocation.create).toHaveBeenNthCalledWith(2, { data: expect.objectContaining({ settlementBaseAmountApplied: "3.5990", realizedGainAmount: "0.0001" }) });
  });

  it("posts four tiny supplier allocations after the settlement base residual is exhausted", async () => {
    const tx = makeForeignCreateTransactionMock();
    tx.purchaseBill.findMany.mockResolvedValue(Array.from({ length: 4 }, (_, index) => ({ id: `bill-${index + 1}`, supplierId: "supplier-1", status: PurchaseBillStatus.FINALIZED, currency: "USD", baseCurrency: "SAR", exchangeRate: "0.50000000", rateDate: new Date("2026-07-01"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: `rate-${index + 1}`, balanceDue: "0.0001", transactionBalanceDue: "0.0001" })));
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const fxContext = { resolve: jest.fn().mockResolvedValue({ currency: "USD", baseCurrency: "SAR", exchangeRate: "0.50000000", rateDate: new Date("2026-07-11"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate" }) };
    const service = new SupplierPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValueOnce("PAY-1").mockResolvedValueOnce("JE-1") } as never, undefined, undefined, undefined, undefined, fxContext as never);

    await service.create("org-1", "user-1", { ...basePaymentDto, currency: "USD", exchangeRate: "0.50000000", rateDate: "2026-07-11", rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate", amountPaid: "0.0004", allocations: Array.from({ length: 4 }, (_, index) => ({ billId: `bill-${index + 1}`, amountApplied: "0.0001" })) });

    expect(tx.supplierPaymentAllocation.create.mock.calls.map((call) => call[0].data.settlementBaseAmountApplied)).toEqual(["0.0001", "0.0001", "0.0000", "0.0000"]);
    expect(tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalDebit: "0.0004", totalCredit: "0.0004" }) }));
  });

  it("posts zero-base unapplied supplier transaction evidence after direct allocations consume the base residual", async () => {
    const tx = makeForeignCreateTransactionMock();
    tx.purchaseBill.findMany.mockResolvedValue(Array.from({ length: 2 }, (_, index) => ({ id: `bill-${index + 1}`, supplierId: "supplier-1", status: PurchaseBillStatus.FINALIZED, currency: "USD", baseCurrency: "SAR", exchangeRate: "0.50000000", rateDate: new Date("2026-07-01"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: `rate-${index + 1}`, balanceDue: "0.0001", transactionBalanceDue: "0.0001" })));
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const fxContext = { resolve: jest.fn().mockResolvedValue({ currency: "USD", baseCurrency: "SAR", exchangeRate: "0.50000000", rateDate: new Date("2026-07-11"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate" }) };
    const service = new SupplierPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValueOnce("PAY-1").mockResolvedValueOnce("JE-1") } as never, undefined, undefined, undefined, undefined, fxContext as never);

    await service.create("org-1", "user-1", { ...basePaymentDto, currency: "USD", exchangeRate: "0.50000000", rateDate: "2026-07-11", rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate", amountPaid: "0.0004", allocations: [{ billId: "bill-1", amountApplied: "0.0001" }, { billId: "bill-2", amountApplied: "0.0001" }] });

    expect(tx.supplierPayment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ unappliedAmount: "0.0000", transactionUnappliedAmount: "0.0002" }) }));
    expect(tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      totalDebit: "0.0002", totalCredit: "0.0002",
      lines: { create: expect.arrayContaining([expect.objectContaining({ debit: "0.0000", credit: "0.0000", transactionDebit: "0.0002", currency: "USD" })]) },
    }) }));
  });

  it("applies and reverses foreign supplier unapplied credit with a linked FX journal", async () => {
    const applyTx = makeForeignApplyUnappliedTransactionMock();
    const applyPrisma = { $transaction: jest.fn((callback: (client: typeof applyTx) => Promise<unknown>) => callback(applyTx)) };
    const applyService = new SupplierPaymentService(
      applyPrisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValue("JE-FX-1") } as never,
    );
    jest.spyOn(applyService, "get").mockResolvedValue({ id: "payment-1", status: SupplierPaymentStatus.POSTED } as never);
    await expect(applyService.applyUnapplied("org-1", "user-1", "payment-1", {
      billId: "bill-1", amountApplied: "100.0000",
    })).resolves.toMatchObject({ id: "payment-1" });
    expect(applyTx.supplierPayment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: {
      unappliedAmount: { decrement: "365.0000" }, transactionUnappliedAmount: { decrement: "100.0000" },
    } }));
    expect(applyTx.purchaseBill.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: {
      balanceDue: { decrement: "375.0000" }, transactionBalanceDue: { decrement: "100.0000" },
    } }));
    expect(applyTx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      currency: "SAR", totalDebit: "10.0000", totalCredit: "10.0000",
    }) }));
    expect(applyTx.supplierPaymentUnappliedAllocation.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      documentBaseAmountApplied: "375.0000", settlementBaseAmountApplied: "365.0000", transactionAmountApplied: "100.0000",
      realizedGainAmount: "10.0000", realizedFxJournalEntry: { connect: { organizationId_id: { organizationId: "org-1", id: "fx-journal-1" } } },
    }) });

    const reverseTx = makeForeignReverseUnappliedTransactionMock();
    const reversePrisma = { $transaction: jest.fn((callback: (client: typeof reverseTx) => Promise<unknown>) => callback(reverseTx)) };
    const reverseService = new SupplierPaymentService(
      reversePrisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValue("JE-FX-REV-1") } as never,
    );
    await expect(reverseService.reverseUnappliedAllocation(
      "org-1", "user-1", "payment-1", "allocation-1", { reason: "Correction" },
    )).resolves.toMatchObject({ id: "payment-1" });
    expect(reverseTx.supplierPayment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: {
      unappliedAmount: { increment: "365.0000" }, transactionUnappliedAmount: { increment: "100.0000" },
    } }));
    expect(reverseTx.purchaseBill.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: {
      balanceDue: { increment: "375.0000" }, transactionBalanceDue: { increment: "100.0000" },
    } }));
    expect(reverseTx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reversalOfId: "fx-journal-1" }) }));
  });

  it("consumes the exact final supplier unapplied settlement residual", async () => {
    const tx = makeForeignApplyUnappliedTransactionMock();
    tx.supplierPayment.findFirst.mockResolvedValue({ id: "payment-1", paymentNumber: "PAY-1", supplierId: "supplier-1", status: SupplierPaymentStatus.POSTED, currency: "USD", baseCurrency: "SAR", exchangeRate: "3.67250000", amountPaid: "3.6725", unappliedAmount: "3.5990", transactionAmountPaid: "1.0000", transactionUnappliedAmount: "0.9800" });
    tx.purchaseBill.findFirst.mockResolvedValue({ id: "bill-1", billNumber: "BILL-1", supplierId: "supplier-1", status: PurchaseBillStatus.FINALIZED, currency: "USD", baseCurrency: "SAR", exchangeRate: "3.67250000", balanceDue: "3.5991", transactionBalanceDue: "0.9800" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SupplierPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValue("JE-FX-1") } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: SupplierPaymentStatus.POSTED } as never);

    await service.applyUnapplied("org-1", "user-1", "payment-1", { billId: "bill-1", amountApplied: "0.9800" });

    expect(tx.supplierPayment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { unappliedAmount: { decrement: "3.5990" }, transactionUnappliedAmount: { decrement: "0.9800" } } }));
    expect(tx.supplierPaymentUnappliedAllocation.create).toHaveBeenCalledWith({ data: expect.objectContaining({ settlementBaseAmountApplied: "3.5990", documentBaseAmountApplied: "3.5991", realizedGainAmount: "0.0001" }) });
  });

  it("applies supplier transaction credit after its settlement base residual reaches zero", async () => {
    const tx = makeForeignApplyUnappliedTransactionMock();
    tx.supplierPayment.findFirst.mockResolvedValue({ id: "payment-1", paymentNumber: "PAY-1", supplierId: "supplier-1", status: SupplierPaymentStatus.POSTED, currency: "USD", baseCurrency: "SAR", exchangeRate: "0.50000000", amountPaid: "0.0002", unappliedAmount: "0.0000", transactionAmountPaid: "0.0004", transactionUnappliedAmount: "0.0002" });
    tx.purchaseBill.findFirst.mockResolvedValue({ id: "bill-1", billNumber: "BILL-1", supplierId: "supplier-1", status: PurchaseBillStatus.FINALIZED, currency: "USD", baseCurrency: "SAR", exchangeRate: "0.50000000", balanceDue: "0.0001", transactionBalanceDue: "0.0001" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SupplierPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValue("JE-FX-1") } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: SupplierPaymentStatus.POSTED } as never);

    await service.applyUnapplied("org-1", "user-1", "payment-1", { billId: "bill-1", amountApplied: "0.0001" });

    expect(tx.supplierPaymentUnappliedAllocation.create).toHaveBeenCalledWith({ data: expect.objectContaining({ settlementBaseAmountApplied: "0.0000", documentBaseAmountApplied: "0.0001", realizedGainAmount: "0.0001" }) });
  });

  it("creates a posted supplier payment journal and reduces bill balance due", async () => {
    const tx = makeCreateTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const numberSequence = { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") };
    const service = new SupplierPaymentService(prisma as never, { log: jest.fn() } as never, numberSequence as never);

    await expect(service.create("org-1", "user-1", basePaymentDto)).resolves.toMatchObject({
      id: "payment-1",
      status: SupplierPaymentStatus.POSTED,
      journalEntryId: "journal-1",
    });

    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          totalDebit: "100.0000",
          totalCredit: "100.0000",
        }),
      }),
    );
    expect(tx.purchaseBill.updateMany).toHaveBeenCalledWith({
      where: {
        id: "bill-1",
        organizationId: "org-1",
        supplierId: "supplier-1",
        status: PurchaseBillStatus.FINALIZED,
        balanceDue: { gte: "100.0000" },
        transactionBalanceDue: { gte: "100.0000" },
      },
      data: { balanceDue: { decrement: "100.0000" }, transactionBalanceDue: { decrement: "100.0000" } },
    });
  });

  it("blocks supplier payment posting in a closed fiscal period", async () => {
    const tx = makeCreateTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const guard = { assertPostingDateAllowed: jest.fn().mockRejectedValue(new Error("Posting date falls in a closed fiscal period.")) };
    const service = new SupplierPaymentService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      undefined,
      undefined,
      guard as never,
    );

    await expect(service.create("org-1", "user-1", basePaymentDto)).rejects.toThrow("Posting date falls in a closed fiscal period.");

    expect(guard.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", new Date("2026-05-12T00:00:00.000Z"), tx);
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.supplierPayment.create).not.toHaveBeenCalled();
  });

  it("supports unapplied supplier payments", async () => {
    const tx = makeCreateTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const numberSequence = { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") };
    const service = new SupplierPaymentService(prisma as never, { log: jest.fn() } as never, numberSequence as never);

    await service.create("org-1", "user-1", { ...basePaymentDto, amountPaid: "100.0000", allocations: [{ billId: "bill-1", amountApplied: "60.0000" }] });

    expect(tx.supplierPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountPaid: "100.0000",
          unappliedAmount: "40.0000",
        }),
      }),
    );
  });

  it("rejects supplier payment over-allocation", async () => {
    const service = new SupplierPaymentService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(
      service.create("org-1", "user-1", {
        ...basePaymentDto,
        amountPaid: "50.0000",
        allocations: [{ billId: "bill-1", amountApplied: "60.0000" }],
      }),
    ).rejects.toThrow("Total allocations cannot exceed amount paid.");
  });

  it("rejects cross-currency bill allocations until realized FX accounting exists", async () => {
    const tx = makeCreateTransactionMock({ billCurrency: "SAR" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SupplierPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", { ...basePaymentDto, currency: "USD" })).rejects.toThrow(
      "Supplier payment and bill transaction/base currencies must match",
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("voids a posted supplier payment and restores bill balances once", async () => {
    const tx = makeVoidTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SupplierPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValue("JE-000002") } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: SupplierPaymentStatus.POSTED, journalEntryId: "journal-1" } as never);

    await expect(service.void("org-1", "user-1", "payment-1")).resolves.toMatchObject({
      id: "payment-1",
      status: SupplierPaymentStatus.VOIDED,
      voidReversalJournalEntryId: "reversal-1",
    });

    expect(tx.purchaseBill.updateMany).toHaveBeenCalledWith({
      where: {
        id: "bill-1",
        organizationId: "org-1",
        status: PurchaseBillStatus.FINALIZED,
        balanceDue: { lte: "40.0000" },
        transactionBalanceDue: { lte: "40.0000" },
      },
      data: { balanceDue: { increment: "60.0000" }, transactionBalanceDue: { increment: "60.0000" } },
    });
    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
  });

  it("applies unapplied supplier payment amount to a finalized bill without creating a journal", async () => {
    const tx = makeApplyUnappliedTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SupplierPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({
      id: "payment-1",
      status: SupplierPaymentStatus.POSTED,
      amountPaid: "100.0000",
      unappliedAmount: "40.0000",
    } as never);

    await expect(
      service.applyUnapplied("org-1", "user-1", "payment-1", { billId: "bill-2", amountApplied: "25.0000" }),
    ).resolves.toMatchObject({ id: "payment-1", unappliedAmount: "15.0000" });

    expect(tx.supplierPayment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "payment-1",
        organizationId: "org-1",
        status: SupplierPaymentStatus.POSTED,
        unappliedAmount: { gte: "25.0000" },
        transactionUnappliedAmount: { gte: "25.0000" },
      },
      data: { unappliedAmount: { decrement: "25.0000" }, transactionUnappliedAmount: { decrement: "25.0000" } },
    });
    expect(tx.purchaseBill.updateMany).toHaveBeenCalledWith({
      where: {
        id: "bill-2",
        organizationId: "org-1",
        supplierId: "supplier-1",
        status: PurchaseBillStatus.FINALIZED,
        balanceDue: { gte: "25.0000" },
        transactionBalanceDue: { gte: "25.0000" },
      },
      data: { balanceDue: { decrement: "25.0000" }, transactionBalanceDue: { decrement: "25.0000" } },
    });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("rejects applying unapplied supplier payment credit across currencies until realized FX accounting exists", async () => {
    const tx = makeApplyUnappliedTransactionMock({ paymentCurrency: "USD", billCurrency: "SAR" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SupplierPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: SupplierPaymentStatus.POSTED } as never);

    await expect(
      service.applyUnapplied("org-1", "user-1", "payment-1", { billId: "bill-2", amountApplied: "25.0000" }),
    ).rejects.toThrow("Supplier payment and bill transaction/base currencies must match");

    expect(tx.supplierPayment.updateMany).not.toHaveBeenCalled();
    expect(tx.purchaseBill.updateMany).not.toHaveBeenCalled();
    expect(tx.supplierPaymentUnappliedAllocation.create).not.toHaveBeenCalled();
  });

  it("reverses historical cross-currency supplier payment allocation and restores balances", async () => {
    const tx = makeReverseUnappliedTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SupplierPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(
      service.reverseUnappliedAllocation("org-1", "user-1", "payment-1", "allocation-1", { reason: "Matched by mistake" }),
    ).resolves.toMatchObject({ id: "payment-1", unappliedAmount: "40.0000" });

    expect(tx.supplierPaymentUnappliedAllocation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "allocation-1", paymentId: "payment-1", organizationId: "org-1", reversedAt: null },
      }),
    );
    expect(tx.supplierPayment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "payment-1",
        organizationId: "org-1",
        status: SupplierPaymentStatus.POSTED,
        unappliedAmount: { lte: "75.0000" },
        transactionUnappliedAmount: { lte: "75.0000" },
      },
      data: { unappliedAmount: { increment: "25.0000" }, transactionUnappliedAmount: { increment: "25.0000" } },
    });
    expect(tx.purchaseBill.updateMany).toHaveBeenCalledWith({
      where: {
        id: "bill-2",
        organizationId: "org-1",
        status: PurchaseBillStatus.FINALIZED,
        balanceDue: { lte: "75.0000" },
        transactionBalanceDue: { lte: "75.0000" },
      },
      data: { balanceDue: { increment: "25.0000" }, transactionBalanceDue: { increment: "25.0000" } },
    });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });
});

function makeCreateTransactionMock(options: { billCurrency?: string } = {}) {
  const accountFindFirst = jest.fn();
  accountFindFirst.mockResolvedValueOnce({ id: "bank-1" });
  accountFindFirst.mockResolvedValue({ id: "ap-1" });

  return {
    contact: { findFirst: jest.fn().mockResolvedValue({ id: "supplier-1", name: "Supplier", displayName: "Supplier" }) },
    account: { findFirst: accountFindFirst },
    purchaseBill: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "bill-1",
          supplierId: "supplier-1",
          status: PurchaseBillStatus.FINALIZED,
          balanceDue: "100.0000",
          currency: options.billCurrency ?? "SAR",
        },
      ]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    journalEntry: { create: jest.fn().mockResolvedValue({ id: "journal-1" }) },
    supplierPayment: {
      create: jest.fn().mockResolvedValue({ id: "payment-1" }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "payment-1",
        status: SupplierPaymentStatus.POSTED,
        journalEntryId: "journal-1",
      }),
    },
    supplierPaymentAllocation: {
      create: jest.fn().mockResolvedValue({ id: "allocation-1" }),
    },
  };
}

function makeForeignCreateTransactionMock() {
  return {
    contact: { findFirst: jest.fn().mockResolvedValue({ id: "supplier-1", name: "Supplier", displayName: "Supplier" }) },
    account: { findFirst: jest.fn(({ where }: { where: { id?: string; code?: string } }) => {
      if (where.id === "bank-1") return { id: "bank-1" };
      if (where.code === "210") return { id: "ap-1" };
      if (where.id === "fx-gain") return { id: "fx-gain" };
      if (where.id === "fx-loss") return { id: "fx-loss" };
      return null;
    }) },
    fxAccountConfiguration: { findUnique: jest.fn().mockResolvedValue({ realizedGainAccountId: "fx-gain", realizedLossAccountId: "fx-loss" }) },
    purchaseBill: {
      findMany: jest.fn().mockResolvedValue([{
        id: "bill-1", supplierId: "supplier-1", status: PurchaseBillStatus.FINALIZED,
        currency: "USD", baseCurrency: "SAR", exchangeRate: "3.75000000",
        rateDate: new Date("2026-07-01T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL,
        rateSnapshotId: "bill-rate", balanceDue: "375.0000", transactionBalanceDue: "100.0000",
      }]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    journalEntry: { create: jest.fn().mockResolvedValue({ id: "journal-1" }) },
    supplierPayment: {
      create: jest.fn().mockResolvedValue({ id: "payment-1" }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "payment-1", status: SupplierPaymentStatus.POSTED, journalEntryId: "journal-1" }),
    },
    supplierPaymentAllocation: { create: jest.fn().mockResolvedValue({ id: "allocation-1" }) },
  };
}

function makeForeignApplyUnappliedTransactionMock() {
  return {
    supplierPayment: {
      findFirst: jest.fn().mockResolvedValue({
        id: "payment-1", paymentNumber: "PAY-1", supplierId: "supplier-1", status: SupplierPaymentStatus.POSTED,
        currency: "USD", baseCurrency: "SAR", exchangeRate: "3.65000000", amountPaid: "365.0000", unappliedAmount: "365.0000",
        transactionAmountPaid: "100.0000", transactionUnappliedAmount: "100.0000",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "payment-1" }),
    },
    purchaseBill: {
      findFirst: jest.fn().mockResolvedValue({
        id: "bill-1", billNumber: "BILL-1", supplierId: "supplier-1", status: PurchaseBillStatus.FINALIZED,
        currency: "USD", baseCurrency: "SAR", exchangeRate: "3.75000000", balanceDue: "375.0000", transactionBalanceDue: "100.0000",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    fxAccountConfiguration: { findUnique: jest.fn().mockResolvedValue({ realizedGainAccountId: "fx-gain", realizedLossAccountId: "fx-loss" }) },
    account: { findFirst: jest.fn(({ where }: { where: { id?: string; code?: string } }) => {
      if (where.code === "210") return { id: "ap-1" };
      if (where.id === "fx-gain") return { id: "fx-gain" };
      if (where.id === "fx-loss") return { id: "fx-loss" };
      return null;
    }) },
    journalEntry: { create: jest.fn().mockResolvedValue({ id: "fx-journal-1" }) },
    supplierPaymentUnappliedAllocation: { create: jest.fn().mockResolvedValue({ id: "allocation-1" }) },
  };
}

function makeForeignReverseUnappliedTransactionMock() {
  return {
    supplierPaymentUnappliedAllocation: {
      findFirst: jest.fn().mockResolvedValue({
        id: "allocation-1", paymentId: "payment-1", billId: "bill-1", reversedAt: null,
        amountApplied: "375.0000", documentBaseAmountApplied: "375.0000", settlementBaseAmountApplied: "365.0000",
        transactionAmountApplied: "100.0000", realizedFxJournalEntryId: "fx-journal-1",
        payment: { id: "payment-1", status: SupplierPaymentStatus.POSTED, amountPaid: "365.0000", unappliedAmount: "0.0000", transactionAmountPaid: "100.0000", transactionUnappliedAmount: "0.0000" },
        bill: { id: "bill-1", status: PurchaseBillStatus.FINALIZED, total: "375.0000", balanceDue: "0.0000", transactionTotal: "100.0000", transactionBalanceDue: "0.0000" },
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    supplierPayment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "payment-1" }) },
    purchaseBill: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    journalEntry: {
      findFirst: jest.fn().mockResolvedValue({
        id: "fx-journal-1", entryNumber: "JE-FX-1", reference: "PAY-1/BILL-1", currency: "SAR", description: "FX", reversedBy: null,
        lines: [
          { accountId: "ap-1", debit: "10.0000", credit: "0.0000", currency: "SAR", exchangeRate: "1", transactionDebit: null, transactionCredit: null, rateSnapshotId: null, fxRoundingComponentCount: 1, functionalCurrencyOnly: true, taxRateId: null, description: "FX clear" },
          { accountId: "fx-gain", debit: "0.0000", credit: "10.0000", currency: "SAR", exchangeRate: "1", transactionDebit: null, transactionCredit: null, rateSnapshotId: null, fxRoundingComponentCount: 1, functionalCurrencyOnly: true, taxRateId: null, description: "FX gain" },
        ],
      }),
      create: jest.fn().mockResolvedValue({ id: "fx-reversal-1" }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function makeVoidTransactionMock() {
  return {
    supplierPayment: {
      findFirst: jest.fn().mockResolvedValue({
        id: "payment-1",
        paymentNumber: "PAY-000001",
        status: SupplierPaymentStatus.POSTED,
        journalEntryId: "journal-1",
        allocations: [
          {
            billId: "bill-1",
            amountApplied: "60.0000",
            bill: { id: "bill-1", status: PurchaseBillStatus.FINALIZED, total: "100.0000", balanceDue: "40.0000" },
          },
        ],
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "payment-1", status: SupplierPaymentStatus.VOIDED }),
      update: jest.fn().mockResolvedValue({
        id: "payment-1",
        status: SupplierPaymentStatus.VOIDED,
        voidReversalJournalEntryId: "reversal-1",
      }),
    },
    supplierPaymentUnappliedAllocation: {
      count: jest.fn().mockResolvedValue(0),
    },
    supplierRefund: {
      count: jest.fn().mockResolvedValue(0),
    },
    purchaseBill: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    journalEntry: {
      findFirst: jest.fn().mockResolvedValue({
        id: "journal-1",
        entryNumber: "JE-000001",
        reference: "PAY-000001",
        currency: "SAR",
        description: "Supplier payment PAY-000001",
        reversedBy: null,
        lines: [
          { accountId: "ap", debit: "60.0000", credit: "0.0000", description: "AP", currency: "SAR", exchangeRate: "1", taxRateId: null },
          { accountId: "bank", debit: "0.0000", credit: "60.0000", description: "Bank", currency: "SAR", exchangeRate: "1", taxRateId: null },
        ],
      }),
      create: jest.fn().mockResolvedValue({ id: "reversal-1" }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function makeApplyUnappliedTransactionMock(options: { paymentCurrency?: string; billCurrency?: string } = {}) {
  return {
    supplierPayment: {
      findFirst: jest.fn().mockResolvedValue({
        id: "payment-1",
        supplierId: "supplier-1",
        status: SupplierPaymentStatus.POSTED,
        amountPaid: "100.0000",
        unappliedAmount: "40.0000",
        currency: options.paymentCurrency ?? "SAR",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "payment-1",
        status: SupplierPaymentStatus.POSTED,
        unappliedAmount: "15.0000",
      }),
    },
    purchaseBill: {
      findFirst: jest.fn().mockResolvedValue({
        id: "bill-2",
        supplierId: "supplier-1",
        status: PurchaseBillStatus.FINALIZED,
        total: "100.0000",
        balanceDue: "50.0000",
        currency: options.billCurrency ?? "SAR",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    supplierPaymentUnappliedAllocation: {
      create: jest.fn().mockResolvedValue({ id: "allocation-1" }),
    },
    journalEntry: { create: jest.fn() },
  };
}

function makeReverseUnappliedTransactionMock() {
  return {
    supplierPaymentUnappliedAllocation: {
      findFirst: jest.fn().mockResolvedValue({
        id: "allocation-1",
        paymentId: "payment-1",
        billId: "bill-2",
        amountApplied: "25.0000",
        reversedAt: null,
        payment: {
          id: "payment-1",
          currency: "USD",
          status: SupplierPaymentStatus.POSTED,
          amountPaid: "100.0000",
          unappliedAmount: "15.0000",
        },
        bill: {
          id: "bill-2",
          currency: "SAR",
          status: PurchaseBillStatus.FINALIZED,
          total: "100.0000",
          balanceDue: "50.0000",
        },
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    supplierPayment: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "payment-1",
        status: SupplierPaymentStatus.POSTED,
        unappliedAmount: "40.0000",
      }),
    },
    purchaseBill: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    journalEntry: { create: jest.fn() },
  };
}
