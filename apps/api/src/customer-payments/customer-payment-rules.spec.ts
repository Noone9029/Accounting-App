import { BadRequestException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { assertBalancedJournal, assertJournalFxContext } from "@ledgerbyte/accounting-core";
import { plainToInstance } from "class-transformer";
import { validateSync, type ValidationError } from "class-validator";
import {
  CustomerPaymentStatus,
  CustomerRefundStatus,
  CurrencyRateSource,
  DocumentType,
  JournalEntryStatus,
  NumberSequenceScope,
  SalesInvoiceStatus,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { buildCustomerPaymentJournalLines } from "./customer-payment-accounting";
import { CustomerPaymentController } from "./customer-payment.controller";
import { CustomerPaymentService } from "./customer-payment.service";
import { CreateCustomerPaymentDto } from "./dto/create-customer-payment.dto";

const basePaymentDto: CreateCustomerPaymentDto = {
  customerId: "customer-1",
  paymentDate: "2026-05-06T00:00:00.000Z",
  currency: "SAR",
  amountReceived: "100.0000",
  accountId: "bank-1",
  allocations: [{ invoiceId: "invoice-1", amountApplied: "100.0000" }],
};

describe("customer payment rules", () => {
  it("builds balanced AR-clearing payment journal lines", () => {
    const lines = buildCustomerPaymentJournalLines({
      paidThroughAccountId: "bank",
      accountsReceivableAccountId: "ar",
      paymentNumber: "PAY-000001",
      customerName: "Customer",
      currency: "SAR",
      amountReceived: "575.0000",
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountId: "bank", debit: "575.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "ar", debit: "0.0000", credit: "575.0000" }),
    ]);
    expect(() => assertBalancedJournal(lines)).not.toThrow();
  });

  it("posts a direct foreign customer allocation with frozen realized-gain evidence", async () => {
    const tx = makeForeignCreateTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const fxContext = { resolve: jest.fn().mockResolvedValue({
      currency: "USD", baseCurrency: "AED", exchangeRate: "3.75000000",
      rateDate: new Date("2026-07-11T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate",
    }) };
    const auditLog = { log: jest.fn() };
    const service = new CustomerPaymentService(
      prisma as never, auditLog as never,
      { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") } as never,
      undefined, undefined, undefined, undefined, fxContext as never,
    );

    await expect(service.create("org-1", "user-1", {
      ...basePaymentDto,
      currency: "USD",
      exchangeRate: "3.75000000",
      rateDate: "2026-07-11",
      rateSource: CurrencyRateSource.MANUAL,
      rateSnapshotId: "payment-rate",
    })).resolves.toMatchObject({ id: "payment-1" });

    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "invoice-1", organizationId: "org-1",
        balanceDue: { gte: "365.0000" }, transactionBalanceDue: { gte: "100.0000" },
      }),
      data: {
        balanceDue: { decrement: "365.0000" },
        transactionBalanceDue: { decrement: "100.0000" },
      },
    });
    expect(tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        currency: "AED", totalDebit: "375.0000", totalCredit: "375.0000",
        lines: { create: expect.arrayContaining([
          expect.objectContaining({ account: { connect: { id: "bank-1" } }, debit: "375.0000", transactionDebit: "100.0000", currency: "USD" }),
          expect.objectContaining({ account: { connect: { id: "ar-1" } }, credit: "365.0000", transactionCredit: "100.0000", exchangeRate: "3.65000000" }),
          expect.objectContaining({ account: { connect: { id: "fx-gain" } }, credit: "10.0000", functionalCurrencyOnly: true }),
        ]) },
      }),
    }));
    expect(tx.customerPayment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        currency: "USD", baseCurrency: "AED", exchangeRate: "3.75000000",
        amountReceived: "375.0000", transactionAmountReceived: "100.0000",
        unappliedAmount: "0.0000", transactionUnappliedAmount: "0.0000",
        allocations: { create: [expect.objectContaining({
          amountApplied: "365.0000", transactionAmountApplied: "100.0000",
          documentBaseAmountApplied: "365.0000", settlementBaseAmountApplied: "375.0000",
          recognitionRate: "3.65000000", settlementRate: "3.75000000",
          realizedGainAmount: "10.0000", realizedLossAmount: "0.0000",
          realizedFxJournalEntryId: "journal-1",
        })] },
      }),
    }));
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "POST", entityType: "RealizedFxSettlement", entityId: "allocation-1",
        after: expect.objectContaining({
          paymentId: "payment-1", documentId: "invoice-1", realizedGainAmount: "10.0000",
          realizedLossAmount: "0.0000", journalEntryId: "journal-1",
        }),
      }),
      tx,
    );
    expect(auditLog.log.mock.calls.filter(([entry]) => entry.entityType === "RealizedFxSettlement")).toHaveLength(1);
  });

  it("fails closed when the created direct payment omits included allocation audit evidence", async () => {
    const tx = makeForeignCreateTransactionMock();
    tx.customerPayment.create.mockResolvedValueOnce({
      id: "payment-1", paymentNumber: "PAY-000001", status: CustomerPaymentStatus.POSTED, journalEntryId: "journal-1",
    } as any);
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const auditLog = { log: jest.fn() };
    const fxContext = { resolve: jest.fn().mockResolvedValue({
      currency: "USD", baseCurrency: "AED", exchangeRate: "3.75000000",
      rateDate: new Date("2026-07-11T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate",
    }) };
    const service = new CustomerPaymentService(
      prisma as never, auditLog as never,
      { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") } as never,
      undefined, undefined, undefined, undefined, fxContext as never,
    );

    await expect(service.create("org-1", "user-1", {
      ...basePaymentDto, currency: "USD", exchangeRate: "3.75000000", rateDate: "2026-07-11",
      rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate",
    })).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(auditLog.log).not.toHaveBeenCalled();
  });

  it("freezes a direct foreign customer payment with zero realized FX in the payment transaction", async () => {
    const tx = makeForeignCreateTransactionMock();
    tx.salesInvoice.findMany.mockResolvedValueOnce([{
      id: "invoice-1", customerId: "customer-1", status: SalesInvoiceStatus.FINALIZED,
      currency: "USD", baseCurrency: "AED", exchangeRate: "3.75000000",
      rateDate: new Date("2026-07-01T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL,
      rateSnapshotId: "invoice-rate", balanceDue: "375.0000", transactionBalanceDue: "100.0000",
    }]);
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const auditLog = { log: jest.fn() };
    const fxContext = { resolve: jest.fn().mockResolvedValue({
      currency: "USD", baseCurrency: "AED", exchangeRate: "3.75000000",
      rateDate: new Date("2026-07-11T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate",
    }) };
    const service = new CustomerPaymentService(
      prisma as never, auditLog as never,
      { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") } as never,
      undefined, undefined, undefined, undefined, fxContext as never,
    );

    await service.create("org-1", "user-1", {
      ...basePaymentDto, currency: "USD", exchangeRate: "3.75000000", rateDate: "2026-07-11",
      rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate",
    });

    expect(auditLog.log).not.toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "RealizedFxSettlement" }),
      tx,
    );
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "FREEZE_FX_RATE",
        entityType: "CustomerPayment",
        entityId: "payment-1",
        after: {
          currency: "USD",
          baseCurrency: "AED",
          exchangeRate: "3.75000000",
          rateDate: "2026-07-11",
          rateSource: CurrencyRateSource.MANUAL,
          rateSnapshotId: "payment-rate",
          journalEntryId: "journal-1",
          paymentNumber: "PAY-000001",
        },
      }),
      tx,
    );
  });

  it("keeps a same-currency customer payment silent for FX freeze evidence", async () => {
    const tx = makeForeignCreateTransactionMock();
    tx.salesInvoice.findMany.mockResolvedValueOnce([{
      id: "invoice-1", customerId: "customer-1", status: SalesInvoiceStatus.FINALIZED,
      currency: "AED", baseCurrency: "AED", exchangeRate: "1.00000000",
      rateDate: new Date("2026-07-01T00:00:00.000Z"), rateSource: CurrencyRateSource.SYSTEM_RATE_1,
      rateSnapshotId: null, balanceDue: "100.0000", transactionBalanceDue: "100.0000",
    }]);
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const auditLog = { log: jest.fn() };
    const fxContext = { resolve: jest.fn().mockResolvedValue({
      currency: "AED", baseCurrency: "AED", exchangeRate: "1.00000000",
      rateDate: new Date("2026-07-11T00:00:00.000Z"), rateSource: CurrencyRateSource.SYSTEM_RATE_1, rateSnapshotId: null,
    }) };
    const service = new CustomerPaymentService(
      prisma as never, auditLog as never,
      { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") } as never,
      undefined, undefined, undefined, undefined, fxContext as never,
    );

    await service.create("org-1", "user-1", { ...basePaymentDto, currency: "AED" });

    expect(auditLog.log).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "FREEZE_FX_RATE", entityType: "CustomerPayment" }),
      tx,
    );
  });

  it("settles a revalued receivable against adjusted carrying basis and preserves source basis", async () => {
    const tx = makeForeignCreateTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const fxContext = { resolve: jest.fn().mockResolvedValue({
      currency: "USD", baseCurrency: "AED", exchangeRate: "3.80000000",
      rateDate: new Date("2026-07-12T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate",
    }) };
    const carrying = {
      resolveCustomerBasis: jest.fn().mockResolvedValue({
        monetaryBalanceId: "balance-1", carryingBaseOpenAmount: "375.0000", sourceBaseOpenAmount: "365.0000",
        carryingRate: "3.75000000", carryingRateSnapshotId: "closing-rate", carryingRevaluationLineId: "revaluation-line-1",
        useProportionalCarryingBasis: true,
      }),
      applySettlement: jest.fn(),
    };
    const service = new CustomerPaymentService(
      prisma as never, { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") } as never,
      undefined, undefined, undefined, undefined, fxContext as never, carrying as never,
    );

    await service.create("org-1", "user-1", {
      ...basePaymentDto, currency: "USD", amountReceived: "40.0000", allocations: [{ invoiceId: "invoice-1", amountApplied: "40.0000" }],
      exchangeRate: "3.80000000", rateDate: "2026-07-12", rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate",
    });

    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ balanceDue: { gte: "146.0000" }, transactionBalanceDue: { gte: "40.0000" } }),
      data: { balanceDue: { decrement: "146.0000" }, transactionBalanceDue: { decrement: "40.0000" } },
    }));
    expect(carrying.applySettlement).toHaveBeenCalledWith("org-1", expect.objectContaining({ carryingRevaluationLineId: "revaluation-line-1" }), {
      transactionAmount: "40.0000", carryingBaseAmount: "150.0000", sourceBaseAmount: "146.0000",
    }, tx);
    expect(tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      totalDebit: "152.0000", totalCredit: "152.0000",
      lines: { create: expect.arrayContaining([
        expect.objectContaining({ credit: "150.0000", transactionCredit: "40.0000", exchangeRate: "3.75000000", rateSnapshot: { connect: { organizationId_id: { organizationId: "org-1", id: "closing-rate" } } } }),
        expect.objectContaining({ account: { connect: { id: "fx-gain" } }, credit: "2.0000" }),
      ]) },
    }) }));
    expect(tx.customerPayment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ allocations: { create: [expect.objectContaining({
      documentBaseAmountApplied: "150.0000", sourceBaseAmountApplied: "146.0000", carryingRate: "3.75000000",
      carryingRevaluationLine: { connect: { organizationId_id: { organizationId: "org-1", id: "revaluation-line-1" } } },
    })] } }) }));
  });

  it("reconciles direct multi-allocation settlement rounding to the exact payment base total", async () => {
    const tx = makeForeignCreateTransactionMock();
    tx.salesInvoice.findMany.mockResolvedValue([
      { id: "invoice-1", customerId: "customer-1", status: SalesInvoiceStatus.FINALIZED, currency: "USD", baseCurrency: "AED", exchangeRate: "3.67250000", rateDate: new Date("2026-07-01"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "rate-1", balanceDue: "0.0735", transactionBalanceDue: "0.0200" },
      { id: "invoice-2", customerId: "customer-1", status: SalesInvoiceStatus.FINALIZED, currency: "USD", baseCurrency: "AED", exchangeRate: "3.67250000", rateDate: new Date("2026-07-01"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "rate-2", balanceDue: "3.5991", transactionBalanceDue: "0.9800" },
    ]);
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const fxContext = { resolve: jest.fn().mockResolvedValue({ currency: "USD", baseCurrency: "AED", exchangeRate: "3.67250000", rateDate: new Date("2026-07-11"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate" }) };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValueOnce("PAY-1").mockResolvedValueOnce("JE-1") } as never, undefined, undefined, undefined, undefined, fxContext as never);

    await service.create("org-1", "user-1", { ...basePaymentDto, currency: "USD", exchangeRate: "3.67250000", rateDate: "2026-07-11", rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate", amountReceived: "1.0000", allocations: [{ invoiceId: "invoice-1", amountApplied: "0.0200" }, { invoiceId: "invoice-2", amountApplied: "0.9800" }] });

    expect(tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalDebit: "3.6726", totalCredit: "3.6726" }) }));
    expect(tx.customerPayment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      amountReceived: "3.6725",
      allocations: { create: [
        expect.objectContaining({ settlementBaseAmountApplied: "0.0735", realizedLossAmount: "0.0000" }),
        expect.objectContaining({ settlementBaseAmountApplied: "3.5990", realizedLossAmount: "0.0001" }),
      ] },
    }) }));
  });

  it("posts four tiny customer allocations after the settlement base residual is exhausted", async () => {
    const tx = makeForeignCreateTransactionMock();
    tx.salesInvoice.findMany.mockResolvedValue(Array.from({ length: 4 }, (_, index) => ({ id: `invoice-${index + 1}`, customerId: "customer-1", status: SalesInvoiceStatus.FINALIZED, currency: "USD", baseCurrency: "AED", exchangeRate: "0.50000000", rateDate: new Date("2026-07-01"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: `rate-${index + 1}`, balanceDue: "0.0001", transactionBalanceDue: "0.0001" })));
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const fxContext = { resolve: jest.fn().mockResolvedValue({ currency: "USD", baseCurrency: "AED", exchangeRate: "0.50000000", rateDate: new Date("2026-07-11"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate" }) };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValueOnce("PAY-1").mockResolvedValueOnce("JE-1") } as never, undefined, undefined, undefined, undefined, fxContext as never);

    await service.create("org-1", "user-1", { ...basePaymentDto, currency: "USD", exchangeRate: "0.50000000", rateDate: "2026-07-11", rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate", amountReceived: "0.0004", allocations: Array.from({ length: 4 }, (_, index) => ({ invoiceId: `invoice-${index + 1}`, amountApplied: "0.0001" })) });

    const createdAllocations = tx.customerPayment.create.mock.calls[0]?.[0].data.allocations.create;
    expect(createdAllocations.map((allocation: { settlementBaseAmountApplied: string }) => allocation.settlementBaseAmountApplied)).toEqual(["0.0001", "0.0001", "0.0000", "0.0000"]);
    expect(tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalDebit: "0.0004", totalCredit: "0.0004" }) }));
  });

  it("posts zero-base unapplied customer transaction evidence after direct allocations consume the base residual", async () => {
    const tx = makeForeignCreateTransactionMock();
    tx.salesInvoice.findMany.mockResolvedValue(Array.from({ length: 2 }, (_, index) => ({ id: `invoice-${index + 1}`, customerId: "customer-1", status: SalesInvoiceStatus.FINALIZED, currency: "USD", baseCurrency: "AED", exchangeRate: "0.50000000", rateDate: new Date("2026-07-01"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: `rate-${index + 1}`, balanceDue: "0.0001", transactionBalanceDue: "0.0001" })));
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const fxContext = { resolve: jest.fn().mockResolvedValue({ currency: "USD", baseCurrency: "AED", exchangeRate: "0.50000000", rateDate: new Date("2026-07-11"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate" }) };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValueOnce("PAY-1").mockResolvedValueOnce("JE-1") } as never, undefined, undefined, undefined, undefined, fxContext as never);

    await service.create("org-1", "user-1", { ...basePaymentDto, currency: "USD", exchangeRate: "0.50000000", rateDate: "2026-07-11", rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "payment-rate", amountReceived: "0.0004", allocations: [{ invoiceId: "invoice-1", amountApplied: "0.0001" }, { invoiceId: "invoice-2", amountApplied: "0.0001" }] });

    expect(tx.customerPayment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ unappliedAmount: "0.0000", transactionUnappliedAmount: "0.0002" }) }));
    expect(tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      totalDebit: "0.0002", totalCredit: "0.0002",
      lines: { create: expect.arrayContaining([expect.objectContaining({ debit: "0.0000", credit: "0.0000", transactionCredit: "0.0002", currency: "USD" })]) },
    }) }));
  });

  it("applies foreign unapplied credit with one frozen realized-FX adjustment journal", async () => {
    const tx = makeForeignApplyUnappliedTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const auditLog = { log: jest.fn() };
    const service = new CustomerPaymentService(
      prisma as never, auditLog as never,
      { next: jest.fn().mockResolvedValue("JE-FX-1") } as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);

    await expect(service.applyUnapplied("org-1", "user-1", "payment-1", {
      invoiceId: "invoice-1", amountApplied: "100.0000",
    })).resolves.toMatchObject({ id: "payment-1" });

    expect(tx.customerPayment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ unappliedAmount: { gte: "375.0000" }, transactionUnappliedAmount: { gte: "100.0000" } }),
      data: { unappliedAmount: { decrement: "375.0000" }, transactionUnappliedAmount: { decrement: "100.0000" } },
    }));
    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ balanceDue: { gte: "365.0000" }, transactionBalanceDue: { gte: "100.0000" } }),
      data: { balanceDue: { decrement: "365.0000" }, transactionBalanceDue: { decrement: "100.0000" } },
    }));
    expect(tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      entryNumber: "JE-FX-1", currency: "AED", totalDebit: "10.0000", totalCredit: "10.0000",
      lines: { create: expect.arrayContaining([
        expect.objectContaining({ account: { connect: { id: "ar-1" } }, debit: "10.0000", functionalCurrencyOnly: true }),
        expect.objectContaining({ account: { connect: { id: "fx-gain" } }, credit: "10.0000", functionalCurrencyOnly: true }),
      ]) },
    }) }));
    expect(tx.customerPaymentUnappliedAllocation.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      amountApplied: "365.0000", transactionAmountApplied: "100.0000",
      documentBaseAmountApplied: "365.0000", settlementBaseAmountApplied: "375.0000",
      realizedGainAmount: "10.0000", realizedFxJournalEntry: { connect: { organizationId_id: { organizationId: "org-1", id: "fx-journal-1" } } },
    }) });
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "POST", entityType: "RealizedFxSettlement", entityId: "unapplied-allocation-1",
        after: expect.objectContaining({ paymentId: "payment-1", documentId: "invoice-1", journalEntryId: "fx-journal-1" }),
      }),
      tx,
    );
  });

  it("consumes the exact final unapplied settlement residual", async () => {
    const tx = makeForeignApplyUnappliedTransactionMock();
    tx.customerPayment.findFirst.mockResolvedValue({ id: "payment-1", paymentNumber: "PAY-1", customerId: "customer-1", status: CustomerPaymentStatus.POSTED, currency: "USD", baseCurrency: "AED", exchangeRate: "3.67250000", rateSnapshotId: "payment-rate", amountReceived: "3.6725", unappliedAmount: "3.5990", transactionAmountReceived: "1.0000", transactionUnappliedAmount: "0.9800", voidReversalJournalEntryId: null });
    tx.salesInvoice.findFirst.mockResolvedValue({ id: "invoice-1", invoiceNumber: "INV-1", customerId: "customer-1", status: SalesInvoiceStatus.FINALIZED, currency: "USD", baseCurrency: "AED", exchangeRate: "3.67250000", rateSnapshotId: "invoice-rate", balanceDue: "3.5991", transactionBalanceDue: "0.9800" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValue("JE-FX-1") } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);

    await service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "0.9800" });

    expect(tx.customerPayment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { unappliedAmount: { decrement: "3.5990" }, transactionUnappliedAmount: { decrement: "0.9800" } } }));
    expect(tx.customerPaymentUnappliedAllocation.create).toHaveBeenCalledWith({ data: expect.objectContaining({ settlementBaseAmountApplied: "3.5990", documentBaseAmountApplied: "3.5991", realizedLossAmount: "0.0001" }) });
  });

  it("applies customer transaction credit after its settlement base residual reaches zero", async () => {
    const tx = makeForeignApplyUnappliedTransactionMock();
    tx.customerPayment.findFirst.mockResolvedValue({ id: "payment-1", paymentNumber: "PAY-1", customerId: "customer-1", status: CustomerPaymentStatus.POSTED, currency: "USD", baseCurrency: "AED", exchangeRate: "0.50000000", rateSnapshotId: "payment-rate", amountReceived: "0.0002", unappliedAmount: "0.0000", transactionAmountReceived: "0.0004", transactionUnappliedAmount: "0.0002", voidReversalJournalEntryId: null });
    tx.salesInvoice.findFirst.mockResolvedValue({ id: "invoice-1", invoiceNumber: "INV-1", customerId: "customer-1", status: SalesInvoiceStatus.FINALIZED, currency: "USD", baseCurrency: "AED", exchangeRate: "0.50000000", rateSnapshotId: "invoice-rate", balanceDue: "0.0001", transactionBalanceDue: "0.0001" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValue("JE-FX-1") } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);

    await service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "0.0001" });

    expect(tx.customerPaymentUnappliedAllocation.create).toHaveBeenCalledWith({ data: expect.objectContaining({ settlementBaseAmountApplied: "0.0000", documentBaseAmountApplied: "0.0001", realizedLossAmount: "0.0001" }) });
  });

  it("replays an idempotent unapplied allocation without changing balances or creating another journal", async () => {
    const tx = makeForeignApplyUnappliedTransactionMock();
    tx.customerPaymentUnappliedAllocation.findUnique.mockResolvedValue({
      paymentId: "payment-1", invoiceId: "invoice-1", transactionAmountApplied: "100.0000", reversedAt: null,
    });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);
    await expect(service.applyUnapplied("org-1", "user-1", "payment-1", {
      invoiceId: "invoice-1", amountApplied: "100.0000", idempotencyKey: "apply-1",
    })).resolves.toMatchObject({ id: "payment-1" });
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("reverses a foreign unapplied allocation, its FX journal, and both open-balance currencies once", async () => {
    const tx = makeForeignReverseUnappliedTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const auditLog = { log: jest.fn() };
    const service = new CustomerPaymentService(
      prisma as never, auditLog as never,
      { next: jest.fn().mockResolvedValue("JE-FX-REV-1") } as never,
    );
    await expect(service.reverseUnappliedAllocation(
      "org-1", "user-1", "payment-1", "unapplied-allocation-1", { reason: "Correction" },
    )).resolves.toMatchObject({ id: "payment-1" });

    expect(tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      entryNumber: "JE-FX-REV-1", reversalOfId: "fx-journal-1", currency: "AED",
      totalDebit: "10.0000", totalCredit: "10.0000",
    }) }));
    expect(tx.customerPayment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { unappliedAmount: { increment: "375.0000" }, transactionUnappliedAmount: { increment: "100.0000" } },
    }));
    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { balanceDue: { increment: "365.0000" }, transactionBalanceDue: { increment: "100.0000" } },
    }));
    expect(tx.customerPaymentUnappliedAllocation.update).toHaveBeenCalledWith({
      where: { id: "unapplied-allocation-1" },
      data: { realizedFxReversalJournalEntry: { connect: { organizationId_id: { organizationId: "org-1", id: "fx-reversal-1" } } } },
    });
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "REVERSE", entityType: "RealizedFxSettlement", entityId: "unapplied-allocation-1",
        after: expect.objectContaining({ journalEntryId: "fx-reversal-1", reversedJournalEntryId: "fx-journal-1" }),
      }),
      tx,
    );
  });

  it("builds a reproducible foreign customer settlement with realized gain", () => {
    const lines = buildCustomerPaymentJournalLines({
      paidThroughAccountId: "bank",
      accountsReceivableAccountId: "ar",
      realizedGainAccountId: "fx-gain",
      realizedLossAccountId: "fx-loss",
      paymentNumber: "PAY-USD-1",
      customerName: "Customer",
      currency: "USD",
      baseCurrency: "AED",
      exchangeRate: "3.75000000",
      rateSnapshotId: "payment-rate",
      transactionAmountReceived: "100.0000",
      settlementBaseAmountReceived: "375.0000",
      allocations: [{
        transactionAmountApplied: "100.0000",
        documentBaseAmountApplied: "365.0000",
        recognitionRate: "3.65000000",
        rateSnapshotId: "invoice-rate",
      }],
      transactionUnappliedAmount: "0.0000",
      unappliedBaseAmount: "0.0000",
      realizedGainAmount: "10.0000",
      realizedLossAmount: "0.0000",
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountId: "bank", debit: "375.0000", transactionDebit: "100.0000", currency: "USD", exchangeRate: "3.75000000" }),
      expect.objectContaining({ accountId: "ar", credit: "365.0000", transactionCredit: "100.0000", currency: "USD", exchangeRate: "3.65000000" }),
      expect.objectContaining({ accountId: "fx-gain", credit: "10.0000", currency: "AED", exchangeRate: "1" }),
    ]);
    expect(() => assertBalancedJournal(lines)).not.toThrow();
    expect(() => assertJournalFxContext(lines, "AED")).not.toThrow();
  });

  it("posts foreign unapplied customer credit at the payment rate and requires configured FX accounts", () => {
    const lines = buildCustomerPaymentJournalLines({
      paidThroughAccountId: "bank",
      accountsReceivableAccountId: "ar",
      paymentNumber: "PAY-USD-2",
      customerName: "Customer",
      currency: "USD",
      baseCurrency: "AED",
      exchangeRate: "3.75000000",
      transactionAmountReceived: "100.0000",
      settlementBaseAmountReceived: "375.0000",
      allocations: [],
      transactionUnappliedAmount: "100.0000",
      unappliedBaseAmount: "375.0000",
      realizedGainAmount: "0.0000",
      realizedLossAmount: "0.0000",
    });
    expect(lines).toEqual([
      expect.objectContaining({ accountId: "bank", debit: "375.0000", transactionDebit: "100.0000" }),
      expect.objectContaining({ accountId: "ar", credit: "375.0000", transactionCredit: "100.0000", exchangeRate: "3.75000000" }),
    ]);

    expect(() => buildCustomerPaymentJournalLines({
      paidThroughAccountId: "bank", accountsReceivableAccountId: "ar", paymentNumber: "PAY-USD-3", customerName: "Customer",
      currency: "USD", baseCurrency: "AED", exchangeRate: "3.75000000", transactionAmountReceived: "100.0000",
      settlementBaseAmountReceived: "375.0000", allocations: [{ transactionAmountApplied: "100.0000", documentBaseAmountApplied: "365.0000", recognitionRate: "3.65000000" }],
      transactionUnappliedAmount: "0.0000", unappliedBaseAmount: "0.0000", realizedGainAmount: "10.0000", realizedLossAmount: "0.0000",
    })).toThrow("Realized FX gain account is required");
  });

  it("rejects non-positive payment and allocation amounts", async () => {
    const service = new CustomerPaymentService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", { ...basePaymentDto, amountReceived: "0.0000" })).rejects.toThrow(BadRequestException);
    await expect(
      service.create("org-1", "user-1", {
        ...basePaymentDto,
        allocations: [{ invoiceId: "invoice-1", amountApplied: "0.0000" }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("validates positive customer payment amounts at the DTO boundary", () => {
    const dto = plainToInstance(CreateCustomerPaymentDto, {
      customerId: "11111111-1111-1111-1111-111111111111",
      paymentDate: "2026-05-06T00:00:00.000Z",
      currency: "SAR",
      amountReceived: "0.0000",
      accountId: "22222222-2222-2222-2222-222222222222",
      allocations: [{ invoiceId: "33333333-3333-3333-3333-333333333333", amountApplied: "-1.0000" }],
    });

    const messages = flattenValidationMessages(validateSync(dto));

    expect(messages).toContain("amountReceived must be a positive decimal with up to 4 decimal places.");
    expect(messages).toContain("amountApplied must be a positive decimal with up to 4 decimal places.");
  });

  it("rejects cross-tenant or invalid customer, account, and invoice references", async () => {
    let tx = makeCreateTransactionMock({ customer: null });
    let prisma = makeCreatePrismaMock({ tx });
    let service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", basePaymentDto)).rejects.toThrow("Customer must be an active customer contact");

    tx = makeCreateTransactionMock({ paidThroughAccount: null });
    prisma = makeCreatePrismaMock({ tx });
    service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    await expect(service.create("org-1", "user-1", basePaymentDto)).rejects.toThrow("Paid-through account must be");

    tx = makeCreateTransactionMock();
    tx.salesInvoice.findMany.mockResolvedValueOnce([]);
    prisma = makeCreatePrismaMock({ tx });
    service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    await expect(service.create("org-1", "user-1", basePaymentDto)).rejects.toThrow("Allocations must reference finalized");
  });

  it("rejects allocation amounts above invoice balance due", async () => {
    const prisma = makeCreatePrismaMock({ invoiceBalanceDue: "50.0000" });
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", basePaymentDto)).rejects.toThrow("Allocation amount cannot exceed invoice balance due.");
  });

  it("rejects cross-currency invoice allocations until realized FX accounting exists", async () => {
    const tx = makeCreateTransactionMock({ invoiceCurrency: "SAR" });
    const prisma = makeCreatePrismaMock({ tx });
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", { ...basePaymentDto, currency: "USD" })).rejects.toThrow(
      "Customer payment and invoice transaction/base currencies must match",
    );
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("rejects stale concurrent allocations without creating payment records", async () => {
    const tx = makeCreateTransactionMock({ allocationUpdateCount: 0 });
    const prisma = makeCreatePrismaMock({ tx });
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", basePaymentDto)).rejects.toThrow("Allocation amount cannot exceed invoice balance due.");
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.customerPayment.create).not.toHaveBeenCalled();
  });

  it("rejects allocations above amount received", async () => {
    const service = new CustomerPaymentService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(
      service.create("org-1", "user-1", {
        ...basePaymentDto,
        amountReceived: "50.0000",
        allocations: [{ invoiceId: "invoice-1", amountApplied: "60.0000" }],
      }),
    ).rejects.toThrow("Total allocations cannot exceed amount received.");
  });

  it("does not consume payment numbers when allocation claim fails", async () => {
    const tx = makeCreateTransactionMock({ allocationUpdateCount: 0 });
    const prisma = makeCreatePrismaMock({ tx });
    const numberSequence = { next: jest.fn() };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, numberSequence as never);

    await expect(service.create("org-1", "user-1", basePaymentDto)).rejects.toThrow("Allocation amount cannot exceed invoice balance due.");
    expect(numberSequence.next).not.toHaveBeenCalled();
  });

  it("rolls back invoice, payment, allocation, journal, and sequence state when creation fails after invoice validation", async () => {
    const rollback = makeCreateRollbackHarness({ arAccountAvailable: false });
    const auditLog = { log: jest.fn() };
    const service = new CustomerPaymentService(
      rollback.prisma as never,
      auditLog as never,
      new NumberSequenceService({} as never) as never,
    );

    await expect(service.create("org-1", "user-1", basePaymentDto)).rejects.toThrow("Required posting account 120 was not found.");

    expect(rollback.snapshot()).toEqual({
      invoiceBalanceDue: "100.0000",
      customerPaymentCount: 0,
      customerPaymentAllocationCount: 0,
      journalEntryCount: 0,
      paymentNextNumber: 1,
      journalEntryNextNumber: 1,
    });
    expect(auditLog.log).not.toHaveBeenCalled();

    rollback.state.arAccountAvailable = true;
    await expect(service.create("org-1", "user-1", basePaymentDto)).resolves.toMatchObject({
      paymentNumber: "PAY-000001",
      journalEntryId: "journal-1",
    });
    expect(rollback.snapshot()).toEqual({
      invoiceBalanceDue: "0.0000",
      customerPaymentCount: 1,
      customerPaymentAllocationCount: 1,
      journalEntryCount: 1,
      paymentNextNumber: 2,
      journalEntryNextNumber: 2,
    });
  });

  it("rejects duplicate invoice allocations without payment creation side effects", async () => {
    const rollback = makeCreateRollbackHarness();
    const service = new CustomerPaymentService(
      rollback.prisma as never,
      { log: jest.fn() } as never,
      new NumberSequenceService({} as never) as never,
    );

    await expect(
      service.create("org-1", "user-1", {
        ...basePaymentDto,
        amountReceived: "60.0000",
        allocations: [
          { invoiceId: "invoice-1", amountApplied: "40.0000" },
          { invoiceId: "invoice-1", amountApplied: "20.0000" },
        ],
      }),
    ).rejects.toThrow("Each invoice can only appear once in a payment.");

    expect(rollback.snapshot()).toEqual({
      invoiceBalanceDue: "100.0000",
      customerPaymentCount: 0,
      customerPaymentAllocationCount: 0,
      journalEntryCount: 0,
      paymentNextNumber: 1,
      journalEntryNextNumber: 1,
    });
  });

  it("rejects allocations above amount received before transaction side effects", async () => {
    const rollback = makeCreateRollbackHarness();
    const service = new CustomerPaymentService(
      rollback.prisma as never,
      { log: jest.fn() } as never,
      new NumberSequenceService({} as never) as never,
    );

    await expect(
      service.create("org-1", "user-1", {
        ...basePaymentDto,
        amountReceived: "50.0000",
        allocations: [{ invoiceId: "invoice-1", amountApplied: "60.0000" }],
      }),
    ).rejects.toThrow("Total allocations cannot exceed amount received.");

    expect(rollback.prisma.$transaction).not.toHaveBeenCalled();
    expect(rollback.snapshot()).toEqual({
      invoiceBalanceDue: "100.0000",
      customerPaymentCount: 0,
      customerPaymentAllocationCount: 0,
      journalEntryCount: 0,
      paymentNextNumber: 1,
      journalEntryNextNumber: 1,
    });
  });

  it("rejects allocations above invoice balance due without payment creation side effects", async () => {
    const rollback = makeCreateRollbackHarness({ invoiceBalanceDue: "50.0000" });
    const service = new CustomerPaymentService(
      rollback.prisma as never,
      { log: jest.fn() } as never,
      new NumberSequenceService({} as never) as never,
    );

    await expect(
      service.create("org-1", "user-1", {
        ...basePaymentDto,
        amountReceived: "60.0000",
        allocations: [{ invoiceId: "invoice-1", amountApplied: "60.0000" }],
      }),
    ).rejects.toThrow("Allocation amount cannot exceed invoice balance due.");

    expect(rollback.snapshot()).toEqual({
      invoiceBalanceDue: "50.0000",
      customerPaymentCount: 0,
      customerPaymentAllocationCount: 0,
      journalEntryCount: 0,
      paymentNextNumber: 1,
      journalEntryNextNumber: 1,
    });
  });

  it("creates a posted payment journal and reduces invoice balance due", async () => {
    const tx = makeCreateTransactionMock();
    const prisma = makeCreatePrismaMock({ tx });
    const numberSequence = { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, numberSequence as never);

    await expect(service.create("org-1", "user-1", basePaymentDto)).resolves.toMatchObject({
      id: "payment-1",
      status: CustomerPaymentStatus.POSTED,
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
    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith({
      where: {
        id: "invoice-1",
        organizationId: "org-1",
        customerId: "customer-1",
        status: SalesInvoiceStatus.FINALIZED,
        balanceDue: { gte: "100.0000" },
        transactionBalanceDue: { gte: "100.0000" },
      },
      data: { balanceDue: { decrement: "100.0000" }, transactionBalanceDue: { decrement: "100.0000" } },
    });
  });

  it("filters listed payments to the active organization and optional allocated invoice branch", async () => {
    const prisma = {
      customerPayment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await service.list("org-1", " branch-1 ");

    expect(prisma.customerPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          OR: [
            { allocations: { some: { organizationId: "org-1", invoice: { is: { organizationId: "org-1", branchId: "branch-1" } } } } },
            { unappliedAllocations: { some: { organizationId: "org-1", invoice: { is: { organizationId: "org-1", branchId: "branch-1" } } } } },
          ],
        },
      }),
    );
  });

  it("blocks customer payment posting in a closed fiscal period", async () => {
    const tx = makeCreateTransactionMock();
    const prisma = makeCreatePrismaMock({ tx });
    const guard = { assertPostingDateAllowed: jest.fn().mockRejectedValue(new Error("Posting date falls in a closed fiscal period.")) };
    const service = new CustomerPaymentService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      undefined,
      undefined,
      guard as never,
    );

    await expect(service.create("org-1", "user-1", basePaymentDto)).rejects.toThrow("Posting date falls in a closed fiscal period.");

    expect(guard.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", new Date("2026-05-06T00:00:00.000Z"), tx);
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.customerPayment.create).not.toHaveBeenCalled();
  });

  it("supports partial allocation and records unapplied amount", async () => {
    const tx = makeCreateTransactionMock();
    const prisma = makeCreatePrismaMock({ tx, invoiceBalanceDue: "100.0000" });
    const numberSequence = { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, numberSequence as never);

    await service.create("org-1", "user-1", {
      ...basePaymentDto,
      amountReceived: "100.0000",
      allocations: [{ invoiceId: "invoice-1", amountApplied: "60.0000" }],
    });

    expect(tx.customerPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountReceived: "100.0000",
          unappliedAmount: "40.0000",
        }),
      }),
    );
    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith({
      where: {
        id: "invoice-1",
        organizationId: "org-1",
        customerId: "customer-1",
        status: SalesInvoiceStatus.FINALIZED,
        balanceDue: { gte: "60.0000" },
        transactionBalanceDue: { gte: "60.0000" },
      },
      data: { balanceDue: { decrement: "60.0000" }, transactionBalanceDue: { decrement: "60.0000" } },
    });
  });

  it("rejects direct payment allocations to another organization's invoice without side effects", async () => {
    const harness = makeCreateRollbackHarness();
    harness.state.invoices["invoice-other-org"] = {
      id: "invoice-other-org",
      organizationId: "org-2",
      customerId: "customer-1",
      currency: "SAR",
      status: SalesInvoiceStatus.FINALIZED,
      balanceDue: "100.0000",
    };
    const service = new CustomerPaymentService(
      harness.prisma as never,
      { log: jest.fn() } as never,
      new NumberSequenceService({} as never) as never,
    );
    const before = harness.snapshot();

    await expect(
      service.create("org-1", "user-1", {
        ...basePaymentDto,
        allocations: [{ invoiceId: "invoice-other-org", amountApplied: "100.0000" }],
      }),
    ).rejects.toThrow("Allocations must reference finalized, non-voided invoices for the selected customer.");

    expect(harness.snapshot()).toEqual(before);
  });

  it.each(["0", "0.0000", "-1.0000"])("rejects non-positive unapplied payment application amount %s", async (amountApplied) => {
    const prisma = { $transaction: jest.fn() };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    const getSpy = jest.spyOn(service, "get");

    await expect(service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied })).rejects.toThrow(
      "Amount applied must be greater than zero.",
    );

    expect(getSpy).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("applies unapplied payment credit to an open invoice without posting another journal", async () => {
    const tx = makeApplyUnappliedTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const guard = { assertPostingDateAllowed: jest.fn() };
    const auditLog = { log: jest.fn() };
    const service = new CustomerPaymentService(
      prisma as never,
      auditLog as never,
      { next: jest.fn() } as never,
      undefined,
      undefined,
      guard as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED, unappliedAmount: "100.0000" } as never);

    await expect(
      service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "40.0000" }),
    ).resolves.toMatchObject({ id: "payment-1", unappliedAmount: "60.0000" });

    expect(tx.customerPayment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "payment-1",
        organizationId: "org-1",
        status: CustomerPaymentStatus.POSTED,
        voidReversalJournalEntryId: null,
        unappliedAmount: { gte: "40.0000" },
        transactionUnappliedAmount: { gte: "40.0000" },
      },
      data: { unappliedAmount: { decrement: "40.0000" }, transactionUnappliedAmount: { decrement: "40.0000" } },
    });
    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith({
      where: {
        id: "invoice-1",
        organizationId: "org-1",
        customerId: "customer-1",
        status: SalesInvoiceStatus.FINALIZED,
        balanceDue: { gte: "40.0000" },
        transactionBalanceDue: { gte: "40.0000" },
      },
      data: { balanceDue: { decrement: "40.0000" }, transactionBalanceDue: { decrement: "40.0000" } },
    });
    expect(tx.customerPaymentUnappliedAllocation.create).toHaveBeenCalledWith(
      {
        data: expect.objectContaining({
          organization: { connect: { id: "org-1" } },
          payment: { connect: { organizationId_id: { organizationId: "org-1", id: "payment-1" } } },
          invoice: { connect: { organizationId_id: { organizationId: "org-1", id: "invoice-1" } } },
          amountApplied: "40.0000",
          transactionAmountApplied: "40.0000",
          documentBaseAmountApplied: "40.0000",
          settlementBaseAmountApplied: "40.0000",
        }),
      },
    );
    expect(tx.customerPaymentUnappliedAllocation.create).toHaveBeenCalledTimes(1);
    expect(tx.customerPaymentAllocation.updateMany).not.toHaveBeenCalled();
    expect(tx.customerPaymentAllocation.update).not.toHaveBeenCalled();
    expect(tx.customerPaymentAllocation.deleteMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(guard.assertPostingDateAllowed).not.toHaveBeenCalled();
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_EVENTS.CUSTOMER_PAYMENT_UNAPPLIED_APPLIED,
        entityType: AUDIT_ENTITY_TYPES.CUSTOMER_PAYMENT,
        entityId: "payment-1",
      }),
    );
    expect(auditLog.log).not.toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "RealizedFxSettlement" }),
      expect.anything(),
    );
  });

  it("reverses direct realized FX evidence through the payment void transaction", async () => {
    const tx = makeVoidTransactionMock({ realizedFx: true });
    const prisma = {
      customerPayment: { findFirst: jest.fn().mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED, journalEntryId: "journal-1" }) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const auditLog = { log: jest.fn() };
    const service = new CustomerPaymentService(prisma as never, auditLog as never, { next: jest.fn().mockResolvedValue("JE-000002") } as never);

    await service.void("org-1", "user-1", "payment-1");

    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "REVERSE", entityType: "RealizedFxSettlement", entityId: "allocation-1",
        after: expect.objectContaining({ journalEntryId: "reversal-1", reversedJournalEntryId: "journal-1" }),
      }),
      tx,
    );
  });

  it("rejects applying unapplied customer payment credit across currencies until realized FX accounting exists", async () => {
    const tx = makeApplyUnappliedTransactionMock({ paymentCurrency: "USD", invoiceCurrency: "SAR" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);

    await expect(
      service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "40.0000" }),
    ).rejects.toThrow("Customer payment and invoice transaction/base currencies must match");

    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
    expect(tx.customerPaymentUnappliedAllocation.create).not.toHaveBeenCalled();
  });

  it.each([
    [SalesInvoiceStatus.DRAFT, "Unapplied customer payments can only be applied to finalized invoices."],
    [SalesInvoiceStatus.VOIDED, "Unapplied customer payments can only be applied to finalized invoices."],
  ])(
    "rejects applying unapplied payment credit to a %s invoice",
    async (invoiceStatus, expectedMessage) => {
      const tx = makeApplyUnappliedTransactionMock({ invoiceStatus });
      const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
      const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
      jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);

      await expect(
        service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "40.0000" }),
      ).rejects.toThrow(expectedMessage);

      expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
      expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
      expect(tx.customerPaymentUnappliedAllocation.create).not.toHaveBeenCalled();
      expect(tx.journalEntry.create).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid unapplied payment applications", async () => {
    let tx = makeApplyUnappliedTransactionMock({ paymentStatus: CustomerPaymentStatus.DRAFT });
    let prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    let service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.DRAFT } as never);

    await expect(service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "10.0000" })).rejects.toThrow(
      "Only posted customer payments can have unapplied amounts applied to invoices. Current payment status: DRAFT.",
    );
    expect(tx.customerPaymentUnappliedAllocation.create).not.toHaveBeenCalled();

    tx = makeApplyUnappliedTransactionMock({ paymentStatus: CustomerPaymentStatus.VOIDED });
    prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.VOIDED } as never);

    await expect(service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "10.0000" })).rejects.toThrow(
      "Voided customer payments cannot have unapplied allocation changes.",
    );
    expect(tx.customerPaymentUnappliedAllocation.create).not.toHaveBeenCalled();

    tx = makeApplyUnappliedTransactionMock({ paymentVoidReversalJournalEntryId: "void-reversal-1" });
    prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);

    await expect(service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "10.0000" })).rejects.toThrow(
      "Voided customer payments cannot have unapplied allocation changes.",
    );
    expect(tx.customerPaymentUnappliedAllocation.create).not.toHaveBeenCalled();

    tx = makeApplyUnappliedTransactionMock({ invoiceCustomerId: "customer-2" });
    prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);
    await expect(service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "10.0000" })).rejects.toThrow(
      "Customer payment and invoice must belong to the same customer.",
    );

    tx = makeApplyUnappliedTransactionMock({ unappliedAmount: "20.0000" });
    prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);
    await expect(service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "25.0000" })).rejects.toThrow(
      "Amount applied cannot exceed customer payment unapplied amount.",
    );

    tx = makeApplyUnappliedTransactionMock({ invoiceBalanceDue: "20.0000" });
    prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);
    await expect(service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "25.0000" })).rejects.toThrow(
      "Amount applied cannot exceed invoice balance due.",
    );
  });

  it("returns stable API errors for unapplied payment application failures", async () => {
    let prisma = {
      customerPayment: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    };
    let service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expectMutationError(
      service.applyUnapplied("org-1", "user-1", "missing-payment", { invoiceId: "invoice-1", amountApplied: "10.0000" }),
      NotFoundException,
      "Customer payment not found.",
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();

    let tx = makeApplyUnappliedTransactionMock();
    tx.salesInvoice.findFirst.mockResolvedValueOnce(null);
    let txPrisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CustomerPaymentService(txPrisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);

    await expectMutationError(
      service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "missing-invoice", amountApplied: "10.0000" }),
      NotFoundException,
      "Sales invoice not found.",
    );
    expect(tx.customerPaymentUnappliedAllocation.create).not.toHaveBeenCalled();

    tx = makeApplyUnappliedTransactionMock({ invoiceCustomerId: "customer-2" });
    txPrisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CustomerPaymentService(txPrisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);

    await expectMutationError(
      service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "10.0000" }),
      BadRequestException,
      "Customer payment and invoice must belong to the same customer.",
    );
    expect(tx.customerPaymentUnappliedAllocation.create).not.toHaveBeenCalled();
  });

  it("rejects applying an organization-scoped payment to another organization's invoice", async () => {
    const tx = makeApplyUnappliedTransactionMock();
    tx.salesInvoice.findFirst.mockResolvedValueOnce(null);
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", organizationId: "org-1", status: CustomerPaymentStatus.POSTED } as never);

    await expect(
      service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-org-2", amountApplied: "10.0000" }),
    ).rejects.toThrow("Sales invoice not found.");

    expect(tx.salesInvoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invoice-org-2", organizationId: "org-1" },
      }),
    );
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
    expect(tx.customerPaymentUnappliedAllocation.create).not.toHaveBeenCalled();
  });

  it("rejects stale concurrent unapplied payment application claims cleanly", async () => {
    let tx = makeApplyUnappliedTransactionMock({ paymentUpdateCount: 0 });
    let prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    let service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);

    await expect(service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "40.0000" })).rejects.toThrow(
      "Amount applied cannot exceed customer payment unapplied amount.",
    );
    expect(tx.customerPaymentUnappliedAllocation.create).not.toHaveBeenCalled();

    tx = makeApplyUnappliedTransactionMock({ invoiceUpdateCount: 0 });
    prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED } as never);

    await expect(service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "40.0000" })).rejects.toThrow(
      "Amount applied cannot exceed invoice balance due.",
    );
    expect(tx.customerPaymentUnappliedAllocation.create).not.toHaveBeenCalled();
  });

  it("reverses historical cross-currency unapplied payment allocations without a journal", async () => {
    const tx = makeReverseUnappliedTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const auditLog = { log: jest.fn() };
    const service = new CustomerPaymentService(prisma as never, auditLog as never, { next: jest.fn() } as never);

    await expect(
      service.reverseUnappliedAllocation("org-1", "user-1", "payment-1", "unapplied-allocation-1", { reason: "Corrected matching" }),
    ).resolves.toMatchObject({ id: "payment-1", unappliedAmount: "100.0000" });

    expect(tx.customerPaymentUnappliedAllocation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "unapplied-allocation-1", paymentId: "payment-1", organizationId: "org-1", reversedAt: null },
        data: expect.objectContaining({ reversedById: "user-1", reversalReason: "Corrected matching" }),
      }),
    );
    expect(tx.customerPayment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "payment-1",
        organizationId: "org-1",
        status: CustomerPaymentStatus.POSTED,
        voidReversalJournalEntryId: null,
        unappliedAmount: { lte: "60.0000" },
        transactionUnappliedAmount: { lte: "60.0000" },
      },
      data: { unappliedAmount: { increment: "40.0000" }, transactionUnappliedAmount: { increment: "40.0000" } },
    });
    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith({
      where: {
        id: "invoice-1",
        organizationId: "org-1",
        status: SalesInvoiceStatus.FINALIZED,
        balanceDue: { lte: "60.0000" },
        transactionBalanceDue: { lte: "60.0000" },
      },
      data: { balanceDue: { increment: "40.0000" }, transactionBalanceDue: { increment: "40.0000" } },
    });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.journalEntry.update).not.toHaveBeenCalled();
    expect(tx.journalEntry.delete).not.toHaveBeenCalled();
    expect(tx.journalEntry.deleteMany).not.toHaveBeenCalled();
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_EVENTS.CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED,
        entityType: AUDIT_ENTITY_TYPES.CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION,
        entityId: "unapplied-allocation-1",
      }),
    );
  });

  it("rejects reversing an unapplied allocation that belongs to another payment", async () => {
    const tx = makeReverseUnappliedTransactionMock();
    tx.customerPaymentUnappliedAllocation.findFirst.mockResolvedValueOnce(null);
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.reverseUnappliedAllocation("org-1", "user-1", "payment-2", "unapplied-allocation-1", {})).rejects.toThrow(
      "Customer payment unapplied allocation not found.",
    );

    expect(tx.customerPaymentUnappliedAllocation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "unapplied-allocation-1", paymentId: "payment-2", organizationId: "org-1" },
      }),
    );
    expect(tx.customerPaymentUnappliedAllocation.updateMany).not.toHaveBeenCalled();
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("rejects reversing unapplied allocations for voided customer payments", async () => {
    let tx = makeReverseUnappliedTransactionMock({ paymentStatus: CustomerPaymentStatus.VOIDED });
    let prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    let service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.reverseUnappliedAllocation("org-1", "user-1", "payment-1", "unapplied-allocation-1", {})).rejects.toThrow(
      "Voided customer payments cannot have unapplied allocation changes.",
    );
    expect(tx.customerPaymentUnappliedAllocation.updateMany).not.toHaveBeenCalled();
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();

    tx = makeReverseUnappliedTransactionMock({ paymentVoidReversalJournalEntryId: "reversal-1" });
    prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.reverseUnappliedAllocation("org-1", "user-1", "payment-1", "unapplied-allocation-1", {})).rejects.toThrow(
      "Voided customer payments cannot have unapplied allocation changes.",
    );
    expect(tx.customerPaymentUnappliedAllocation.updateMany).not.toHaveBeenCalled();
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("rejects reversing unapplied allocations when restoring invoice balance would exceed invoice total", async () => {
    const tx = makeReverseUnappliedTransactionMock({ amountApplied: "40.0000", invoiceBalanceDue: "70.0000" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.reverseUnappliedAllocation("org-1", "user-1", "payment-1", "unapplied-allocation-1", {})).rejects.toThrow(
      "Invoice balance due cannot exceed invoice total after reversal.",
    );
    expect(tx.customerPaymentUnappliedAllocation.updateMany).not.toHaveBeenCalled();
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("rejects double and stale unapplied payment allocation reversals cleanly", async () => {
    let tx = makeReverseUnappliedTransactionMock({ reversedAt: new Date("2026-05-12T00:00:00.000Z") });
    let prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    let service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.reverseUnappliedAllocation("org-1", "user-1", "payment-1", "unapplied-allocation-1", {})).rejects.toThrow(
      "Customer payment unapplied allocation has already been reversed.",
    );
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();

    tx = makeReverseUnappliedTransactionMock({ allocationUpdateCount: 0 });
    prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.reverseUnappliedAllocation("org-1", "user-1", "payment-1", "unapplied-allocation-1", {})).rejects.toThrow(
      "Customer payment unapplied allocation has already been reversed.",
    );
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
  });

  it("returns stable API errors for unapplied allocation reversal failures", async () => {
    let tx = makeReverseUnappliedTransactionMock({ reversedAt: new Date("2026-05-12T00:00:00.000Z") });
    let prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    let service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expectMutationError(
      service.reverseUnappliedAllocation("org-1", "user-1", "payment-1", "unapplied-allocation-1", {}),
      BadRequestException,
      "Customer payment unapplied allocation has already been reversed.",
    );
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();

    tx = makeReverseUnappliedTransactionMock({ paymentStatus: CustomerPaymentStatus.VOIDED });
    prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expectMutationError(
      service.reverseUnappliedAllocation("org-1", "user-1", "payment-1", "unapplied-allocation-1", {}),
      BadRequestException,
      "Voided customer payments cannot have unapplied allocation changes.",
    );
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
  });

  it("rejects stale unapplied payment restoration guards cleanly", async () => {
    let tx = makeReverseUnappliedTransactionMock({ paymentUpdateCount: 0 });
    let prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    let service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.reverseUnappliedAllocation("org-1", "user-1", "payment-1", "unapplied-allocation-1", {})).rejects.toThrow(
      "Payment unapplied amount could not be restored",
    );
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();

    tx = makeReverseUnappliedTransactionMock({ invoiceUpdateCount: 0 });
    prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.reverseUnappliedAllocation("org-1", "user-1", "payment-1", "unapplied-allocation-1", {})).rejects.toThrow(
      "Invoice balance due could not be restored",
    );
  });

  it("voids a posted payment once and restores allocated invoice balances", async () => {
    const tx = makeVoidTransactionMock();
    const prisma = {
      customerPayment: {
        findFirst: jest.fn().mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED, journalEntryId: "journal-1" }),
      },
      generatedDocument: {
        create: jest.fn().mockRejectedValue(new Error("Customer payment lifecycle mutations must not create generated documents.")),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const auditLog = { log: jest.fn() };
    const numberSequence = { next: jest.fn().mockResolvedValue("JE-000002") };
    const service = new CustomerPaymentService(prisma as never, auditLog as never, numberSequence as never);

    await expect(service.void("org-1", "user-1", "payment-1")).resolves.toMatchObject({
      id: "payment-1",
      status: CustomerPaymentStatus.VOIDED,
      voidReversalJournalEntryId: "reversal-1",
    });

    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          entryNumber: "JE-000002",
          status: JournalEntryStatus.POSTED,
          reference: "PAY-000001",
          reversalOfId: "journal-1",
        }),
      }),
    );
    expect(tx.journalEntry.update).toHaveBeenCalledWith({
      where: { id: "journal-1" },
      data: { status: JournalEntryStatus.REVERSED },
    });
    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith({
      where: { id: "invoice-1", organizationId: "org-1", status: SalesInvoiceStatus.FINALIZED },
      data: {
        balanceDue: { increment: "60.0000" },
        transactionBalanceDue: { increment: "60.0000" },
      },
    });
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_EVENTS.CUSTOMER_PAYMENT_VOIDED,
        entityType: AUDIT_ENTITY_TYPES.CUSTOMER_PAYMENT,
        entityId: "payment-1",
        before: expect.objectContaining({ id: "payment-1", status: CustomerPaymentStatus.POSTED }),
        after: expect.objectContaining({ id: "payment-1", status: CustomerPaymentStatus.VOIDED }),
      }),
    );

    prisma.customerPayment.findFirst.mockResolvedValueOnce({
      id: "payment-1",
      status: CustomerPaymentStatus.VOIDED,
      voidReversalJournalEntryId: "reversal-1",
    });
    await expect(service.void("org-1", "user-1", "payment-1")).resolves.toMatchObject({ status: CustomerPaymentStatus.VOIDED });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("blocks voiding payments with posted customer refunds", async () => {
    const tx = makeVoidTransactionMock({ refundCount: 1 });
    const prisma = {
      customerPayment: {
        findFirst: jest.fn().mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED, journalEntryId: "journal-1" }),
      },
      generatedDocument: {
        create: jest.fn().mockRejectedValue(new Error("Customer payment lifecycle mutations must not create generated documents.")),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.void("org-1", "user-1", "payment-1")).rejects.toThrow("Cannot void customer payment with posted refunds. Void refunds first.");
    expect(tx.customerRefund.count).toHaveBeenCalledWith({
      where: { organizationId: "org-1", sourcePaymentId: "payment-1", status: CustomerRefundStatus.POSTED },
    });
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
  });

  it("blocks voiding payments with active unapplied allocations but allows reversed allocations", async () => {
    const tx = makeVoidTransactionMock({ unappliedAllocationCount: 1 });
    const prisma = {
      customerPayment: {
        findFirst: jest.fn().mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED, journalEntryId: "journal-1" }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.void("org-1", "user-1", "payment-1")).rejects.toThrow(
      "Cannot void customer payment with active unapplied allocations. Reverse unapplied allocations first.",
    );
    expect(tx.customerPaymentUnappliedAllocation.count).toHaveBeenCalledWith({
      where: { organizationId: "org-1", paymentId: "payment-1", reversedAt: null },
    });
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();

    const reversedTx = makeVoidTransactionMock({ unappliedAllocationCount: 0 });
    const reversedPrisma = {
      customerPayment: {
        findFirst: jest.fn().mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED, journalEntryId: "journal-1" }),
      },
      $transaction: jest.fn((callback: (client: typeof reversedTx) => Promise<unknown>) => callback(reversedTx)),
    };
    const reversedService = new CustomerPaymentService(reversedPrisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValue("JE-000002") } as never);

    await expect(reversedService.void("org-1", "user-1", "payment-1")).resolves.toMatchObject({ status: CustomerPaymentStatus.VOIDED });
    expect(reversedTx.journalEntry.create).toHaveBeenCalledTimes(1);
  });

  it("does not create a second reversal when an existing reversal is linked", async () => {
    const tx = makeVoidTransactionMock({ reversedById: "existing-reversal" });
    const prisma = {
      customerPayment: {
        findFirst: jest.fn().mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED, journalEntryId: "journal-1" }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await service.void("org-1", "user-1", "payment-1");

    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.customerPayment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: CustomerPaymentStatus.VOIDED,
        }),
      }),
    );
    expect(tx.customerPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          voidReversalJournalEntryId: "existing-reversal",
        }),
      }),
    );
  });

  it("returns existing voided payment when a competing void already claimed it", async () => {
    const tx = makeVoidTransactionMock({ voidClaimCount: 0 });
    tx.customerPayment.findUniqueOrThrow.mockResolvedValueOnce({
      id: "payment-1",
      status: CustomerPaymentStatus.VOIDED,
      voidReversalJournalEntryId: "reversal-1",
    });
    const prisma = {
      customerPayment: {
        findFirst: jest.fn().mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED, journalEntryId: "journal-1" }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.void("org-1", "user-1", "payment-1")).resolves.toMatchObject({ status: CustomerPaymentStatus.VOIDED });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
  });

  it("rejects voiding non-posted payments", async () => {
    const prisma = {
      customerPayment: { findFirst: jest.fn().mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.DRAFT, journalEntryId: null }) },
    };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.void("org-1", "user-1", "payment-1")).rejects.toThrow("Only posted customer payments can be voided.");
  });

  it("returns receipt data with invoice allocations", async () => {
    const prisma = {
      customerPayment: {
        findFirst: jest.fn().mockResolvedValue({
          id: "payment-1",
          paymentNumber: "PAY-000001",
          paymentDate: new Date("2026-05-06T00:00:00.000Z"),
          customer: { id: "customer-1", name: "Customer", displayName: "Customer", email: null, phone: null, taxNumber: null },
          organization: { id: "org-1", name: "Org", legalName: null, taxNumber: null, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
          amountReceived: "375.0000",
          unappliedAmount: "0.0000",
          transactionAmountReceived: "100.0000",
          transactionUnappliedAmount: "0.0000",
          currency: "USD",
          account: { id: "bank-1", code: "112", name: "Bank Account", type: "ASSET" },
          journalEntry: { id: "journal-1", entryNumber: "JE-000001", status: JournalEntryStatus.POSTED, totalDebit: "115.0000", totalCredit: "115.0000" },
          allocations: [
            {
              invoiceId: "invoice-1",
              amountApplied: "365.0000",
              transactionAmountApplied: "100.0000",
              invoice: {
                id: "invoice-1",
                invoiceNumber: "INV-000001",
                issueDate: new Date("2026-05-06T00:00:00.000Z"),
                total: "365.0000",
                balanceDue: "0.0000",
                transactionTotal: "100.0000",
                transactionBalanceDue: "0.0000",
              },
            },
          ],
          unappliedAllocations: [],
          status: CustomerPaymentStatus.POSTED,
        }),
      },
    };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.receiptData("org-1", "payment-1")).resolves.toMatchObject({
      receiptNumber: "PAY-000001",
      amountReceived: "100.0000",
      allocations: [{ invoiceId: "invoice-1", invoiceNumber: "INV-000001", amountApplied: "100.0000", invoiceTotal: "100.0000" }],
    });
    expect(prisma.customerPayment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "payment-1", organizationId: "org-1" } }));
  });

  it("returns receipt PDF data with payment details and allocations", async () => {
    const prisma = {
      customerPayment: {
        findFirst: jest.fn().mockResolvedValue({
          id: "payment-1",
          paymentNumber: "PAY-000001",
          paymentDate: new Date("2026-05-06T00:00:00.000Z"),
          status: CustomerPaymentStatus.POSTED,
          currency: "SAR",
          amountReceived: "115.0000",
          unappliedAmount: "0.0000",
          description: "Payment received",
          organization: { id: "org-1", name: "Org", legalName: null, taxNumber: null, countryCode: "SA" },
          customer: {
            id: "customer-1",
            name: "Customer",
            displayName: "Customer",
            email: null,
            phone: null,
            taxNumber: null,
            addressLine1: null,
            addressLine2: null,
            city: null,
            postalCode: null,
            countryCode: "SA",
          },
          account: { id: "bank-1", code: "112", name: "Bank Account" },
          journalEntry: { id: "journal-1", entryNumber: "JE-000001", status: JournalEntryStatus.POSTED },
          allocations: [
            {
              invoiceId: "invoice-1",
              amountApplied: "115.0000",
              invoice: {
                id: "invoice-1",
                invoiceNumber: "INV-000001",
                issueDate: new Date("2026-05-06T00:00:00.000Z"),
                total: "115.0000",
                balanceDue: "0.0000",
              },
            },
          ],
          unappliedAllocations: [],
        }),
      },
    };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.receiptPdfData("org-1", "payment-1")).resolves.toMatchObject({
      payment: {
        id: "payment-1",
        paymentNumber: "PAY-000001",
        amountReceived: "115.0000",
      },
      allocations: [{ invoiceNumber: "INV-000001", amountApplied: "115.0000" }],
      unappliedAllocations: [],
      journalEntry: { entryNumber: "JE-000001" },
    });
  });

  it("archives generated receipt PDFs", async () => {
    const archivePdf = jest.fn().mockResolvedValue({ id: "doc-1" });
    const service = new CustomerPaymentService(
      {} as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      { receiptRenderSettings: jest.fn().mockResolvedValue({ title: "Receipt" }) } as never,
      { archivePdf } as never,
    );
    jest.spyOn(service, "receiptPdfData").mockResolvedValue({
      organization: { id: "org-1", name: "Org", legalName: null, taxNumber: null, countryCode: "SA" },
      customer: { id: "customer-1", name: "Customer", displayName: "Customer", taxNumber: null, email: null, phone: null },
      payment: {
        id: "payment-1",
        paymentNumber: "PAY-000001",
        paymentDate: "2026-05-06T00:00:00.000Z",
        status: CustomerPaymentStatus.POSTED,
        currency: "SAR",
        amountReceived: "115.0000",
        unappliedAmount: "0.0000",
        description: null,
      },
      paidThroughAccount: { id: "bank-1", code: "112", name: "Bank Account" },
      allocations: [
        {
          invoiceId: "invoice-1",
          invoiceNumber: "INV-000001",
          invoiceDate: "2026-05-06T00:00:00.000Z",
          invoiceTotal: "115.0000",
          amountApplied: "115.0000",
          invoiceBalanceDue: "0.0000",
        },
      ],
      unappliedAllocations: [],
      journalEntry: { id: "journal-1", entryNumber: "JE-000001", status: JournalEntryStatus.POSTED },
      generatedAt: new Date("2026-05-06T00:00:00.000Z"),
    });

    const result = await service.receiptPdf("org-1", "user-1", "payment-1");

    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(result.filename).toBe("receipt-PAY-000001.pdf");
    expect(archivePdf).toHaveBeenCalledWith(expect.objectContaining({
      documentType: DocumentType.CUSTOMER_PAYMENT_RECEIPT,
      sourceType: "CustomerPayment",
      sourceId: "payment-1",
      documentNumber: "PAY-000001",
      generatedById: "user-1",
    }));
  });

  it("does not archive receipt PDFs when creating customer payments", async () => {
    const tx = makeCreateTransactionMock();
    const prisma = makeCreatePrismaMock({ tx });
    const numberSequence = { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") };
    const generatedDocuments = makeGeneratedDocumentArchiveGuard();
    const service = new CustomerPaymentService(
      prisma as never,
      { log: jest.fn() } as never,
      numberSequence as never,
      undefined,
      generatedDocuments as never,
    );

    await expect(service.create("org-1", "user-1", basePaymentDto)).resolves.toMatchObject({ id: "payment-1" });

    expect(tx.customerPayment.create).toHaveBeenCalledTimes(1);
    expect(tx.generatedDocument.create).not.toHaveBeenCalled();
    expect(prisma.generatedDocument.create).not.toHaveBeenCalled();
    expect(generatedDocuments.archivePdf).not.toHaveBeenCalled();
  });

  it("does not archive receipt PDFs when applying unapplied payment credit", async () => {
    const tx = makeApplyUnappliedTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const generatedDocuments = makeGeneratedDocumentArchiveGuard();
    const service = new CustomerPaymentService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      undefined,
      generatedDocuments as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED, unappliedAmount: "100.0000" } as never);

    await expect(
      service.applyUnapplied("org-1", "user-1", "payment-1", { invoiceId: "invoice-1", amountApplied: "40.0000" }),
    ).resolves.toMatchObject({ id: "payment-1", unappliedAmount: "60.0000" });

    expect(tx.customerPaymentUnappliedAllocation.create).toHaveBeenCalledTimes(1);
    expect(tx.generatedDocument.create).not.toHaveBeenCalled();
    expect(generatedDocuments.archivePdf).not.toHaveBeenCalled();
  });

  it("does not archive receipt PDFs when reversing unapplied allocations", async () => {
    const tx = makeReverseUnappliedTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const generatedDocuments = makeGeneratedDocumentArchiveGuard();
    const service = new CustomerPaymentService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      undefined,
      generatedDocuments as never,
    );

    await expect(service.reverseUnappliedAllocation("org-1", "user-1", "payment-1", "unapplied-allocation-1", {})).resolves.toMatchObject({
      id: "payment-1",
      unappliedAmount: "100.0000",
    });

    expect(tx.customerPaymentUnappliedAllocation.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.generatedDocument.create).not.toHaveBeenCalled();
    expect(generatedDocuments.archivePdf).not.toHaveBeenCalled();
  });

  it("does not archive receipt PDFs when voiding customer payments", async () => {
    const tx = makeVoidTransactionMock();
    const prisma = {
      customerPayment: {
        findFirst: jest.fn().mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED, journalEntryId: "journal-1" }),
      },
      generatedDocument: {
        create: jest.fn().mockRejectedValue(new Error("Customer payment lifecycle mutations must not create generated documents.")),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const generatedDocuments = makeGeneratedDocumentArchiveGuard();
    const service = new CustomerPaymentService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000002") } as never,
      undefined,
      generatedDocuments as never,
    );

    await expect(service.void("org-1", "user-1", "payment-1")).resolves.toMatchObject({ id: "payment-1", status: CustomerPaymentStatus.VOIDED });

    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
    expect(tx.generatedDocument.create).not.toHaveBeenCalled();
    expect(prisma.generatedDocument.create).not.toHaveBeenCalled();
    expect(generatedDocuments.archivePdf).not.toHaveBeenCalled();
  });

  it("keeps receipt PDF generation on explicit controller output routes", async () => {
    const paymentService = {
      create: jest.fn().mockResolvedValue({ id: "payment-1" }),
      applyUnapplied: jest.fn().mockResolvedValue({ id: "payment-1" }),
      reverseUnappliedAllocation: jest.fn().mockResolvedValue({ id: "payment-1" }),
      void: jest.fn().mockResolvedValue({ id: "payment-1" }),
      receiptData: jest.fn().mockResolvedValue({ receiptNumber: "PAY-000001" }),
      receiptPdfData: jest.fn().mockResolvedValue({ payment: { paymentNumber: "PAY-000001" } }),
      receiptPdf: jest.fn().mockResolvedValue({ buffer: Buffer.from("%PDF receipt"), filename: "receipt-PAY-000001.pdf" }),
      generateReceiptPdf: jest.fn().mockResolvedValue({ id: "doc-1" }),
    };
    const controller = new CustomerPaymentController(paymentService as never);
    const user = { id: "user-1" };

    await controller.create("org-1", user as never, basePaymentDto);
    await controller.applyUnapplied("org-1", user as never, "payment-1", { invoiceId: "invoice-1", amountApplied: "40.0000" });
    await controller.reverseUnappliedAllocation("org-1", user as never, "payment-1", "unapplied-allocation-1", {});
    await controller.void("org-1", user as never, "payment-1");

    expect(paymentService.receiptPdf).not.toHaveBeenCalled();
    expect(paymentService.generateReceiptPdf).not.toHaveBeenCalled();
    expect(paymentService.receiptData).not.toHaveBeenCalled();
    expect(paymentService.receiptPdfData).not.toHaveBeenCalled();

    const response = { set: jest.fn() };
    await controller.receiptData("org-1", "payment-1");
    await controller.receiptPdfData("org-1", "payment-1");
    await controller.receiptPdf("org-1", user as never, "payment-1", response as never);
    await controller.generateReceiptPdf("org-1", user as never, "payment-1");

    expect(paymentService.receiptData).toHaveBeenCalledWith("org-1", "payment-1");
    expect(paymentService.receiptPdfData).toHaveBeenCalledWith("org-1", "payment-1");
    expect(paymentService.receiptPdf).toHaveBeenCalledWith("org-1", "user-1", "payment-1");
    expect(paymentService.generateReceiptPdf).toHaveBeenCalledWith("org-1", "user-1", "payment-1");
    expect(response.set).toHaveBeenCalledWith(expect.objectContaining({ "Content-Type": "application/pdf" }));
  });
});

function makeCreatePrismaMock(options: { tx?: ReturnType<typeof makeCreateTransactionMock>; invoiceBalanceDue?: string } = {}) {
  const tx = options.tx ?? makeCreateTransactionMock({ invoiceBalanceDue: options.invoiceBalanceDue });
  return {
    generatedDocument: {
      create: jest.fn().mockRejectedValue(new Error("Customer payment lifecycle mutations must not create generated documents.")),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
}

function makeForeignCreateTransactionMock() {
  return {
    contact: { findFirst: jest.fn().mockResolvedValue({ id: "customer-1", name: "Customer", displayName: null }) },
    account: {
      findFirst: jest.fn(({ where }: { where: { id?: string; code?: string } }) => {
        if (where.id === "bank-1") return { id: "bank-1" };
        if (where.code === "120") return { id: "ar-1" };
        if (where.id === "fx-gain") return { id: "fx-gain" };
        if (where.id === "fx-loss") return { id: "fx-loss" };
        return null;
      }),
    },
    fxAccountConfiguration: {
      findUnique: jest.fn().mockResolvedValue({ realizedGainAccountId: "fx-gain", realizedLossAccountId: "fx-loss" }),
    },
    salesInvoice: {
      findMany: jest.fn().mockResolvedValue([{
        id: "invoice-1", customerId: "customer-1", status: SalesInvoiceStatus.FINALIZED,
        currency: "USD", baseCurrency: "AED", exchangeRate: "3.65000000",
        rateDate: new Date("2026-07-01T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL,
        rateSnapshotId: "invoice-rate", balanceDue: "365.0000", transactionBalanceDue: "100.0000",
      }]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    journalEntry: { create: jest.fn().mockResolvedValue({ id: "journal-1" }) },
    customerPayment: {
      create: jest.fn(({ data }: any) => Promise.resolve({
        id: "payment-1", paymentNumber: "PAY-000001", status: CustomerPaymentStatus.POSTED, journalEntryId: "journal-1",
        allocations: data.allocations.create.map((allocation: any, index: number) => ({
          id: `allocation-${index + 1}`,
          invoiceId: allocation.invoice.connect.organizationId_id.id,
          realizedGainAmount: allocation.realizedGainAmount,
          realizedLossAmount: allocation.realizedLossAmount,
          realizedFxJournalEntryId: allocation.realizedFxJournalEntryId,
        })),
      })),
    },
  };
}

function makeForeignApplyUnappliedTransactionMock() {
  return {
    customerPayment: {
      findFirst: jest.fn().mockResolvedValue({
        id: "payment-1", paymentNumber: "PAY-1", customerId: "customer-1", status: CustomerPaymentStatus.POSTED,
        currency: "USD", baseCurrency: "AED", exchangeRate: "3.75000000", rateSnapshotId: "payment-rate",
        amountReceived: "375.0000", unappliedAmount: "375.0000", transactionAmountReceived: "100.0000",
        transactionUnappliedAmount: "100.0000", voidReversalJournalEntryId: null,
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "payment-1", unappliedAmount: "0.0000", transactionUnappliedAmount: "0.0000" }),
    },
    salesInvoice: {
      findFirst: jest.fn().mockResolvedValue({
        id: "invoice-1", invoiceNumber: "INV-1", customerId: "customer-1", status: SalesInvoiceStatus.FINALIZED,
        currency: "USD", baseCurrency: "AED", exchangeRate: "3.65000000", rateSnapshotId: "invoice-rate",
        balanceDue: "365.0000", transactionBalanceDue: "100.0000",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    fxAccountConfiguration: { findUnique: jest.fn().mockResolvedValue({ realizedGainAccountId: "fx-gain", realizedLossAccountId: "fx-loss" }) },
    account: { findFirst: jest.fn(({ where }: { where: { id?: string; code?: string } }) => {
      if (where.code === "120") return { id: "ar-1" };
      if (where.id === "fx-gain") return { id: "fx-gain" };
      if (where.id === "fx-loss") return { id: "fx-loss" };
      return null;
    }) },
    journalEntry: { create: jest.fn().mockResolvedValue({ id: "fx-journal-1" }) },
    customerPaymentUnappliedAllocation: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "unapplied-allocation-1" }),
    },
  };
}

function makeForeignReverseUnappliedTransactionMock() {
  return {
    customerPaymentUnappliedAllocation: {
      findFirst: jest.fn().mockResolvedValue({
        id: "unapplied-allocation-1", organizationId: "org-1", paymentId: "payment-1", invoiceId: "invoice-1",
        amountApplied: "365.0000", transactionAmountApplied: "100.0000", documentBaseAmountApplied: "365.0000",
        settlementBaseAmountApplied: "375.0000", realizedFxJournalEntryId: "fx-journal-1",
        realizedFxReversalJournalEntryId: null, reversedAt: null,
        payment: {
          id: "payment-1", status: CustomerPaymentStatus.POSTED, amountReceived: "375.0000", unappliedAmount: "0.0000",
          transactionAmountReceived: "100.0000", transactionUnappliedAmount: "0.0000", voidReversalJournalEntryId: null,
        },
        invoice: {
          id: "invoice-1", status: SalesInvoiceStatus.FINALIZED, total: "365.0000", balanceDue: "0.0000",
          transactionTotal: "100.0000", transactionBalanceDue: "0.0000",
        },
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    customerPayment: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "payment-1", unappliedAmount: "375.0000", transactionUnappliedAmount: "100.0000" }),
    },
    salesInvoice: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    journalEntry: {
      findFirst: jest.fn().mockResolvedValue({
        id: "fx-journal-1", entryNumber: "JE-FX-1", reference: "PAY-1/INV-1", currency: "AED",
        description: "Realized FX adjustment", reversedBy: null,
        lines: [
          { accountId: "ar-1", debit: "10.0000", credit: "0.0000", description: "FX clear", currency: "AED", exchangeRate: "1", transactionDebit: null, transactionCredit: null, rateSnapshotId: null, fxRoundingComponentCount: 1, functionalCurrencyOnly: true, taxRateId: null },
          { accountId: "fx-gain", debit: "0.0000", credit: "10.0000", description: "FX gain", currency: "AED", exchangeRate: "1", transactionDebit: null, transactionCredit: null, rateSnapshotId: null, fxRoundingComponentCount: 1, functionalCurrencyOnly: true, taxRateId: null },
        ],
      }),
      create: jest.fn().mockResolvedValue({ id: "fx-reversal-1" }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function makeGeneratedDocumentArchiveGuard() {
  return {
    archivePdf: jest.fn().mockRejectedValue(new Error("Customer payment lifecycle mutations must not archive receipt PDFs.")),
  };
}

async function expectMutationError<TError extends Error>(
  promise: Promise<unknown>,
  expectedType: new (...args: never[]) => TError,
  expectedMessage: string,
) {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(expectedType);
  expect(caught).toMatchObject({ message: expectedMessage });
}

const PAYMENT_SEQUENCE_SCOPE = NumberSequenceScope.PAYMENT;
const JOURNAL_ENTRY_SEQUENCE_SCOPE = NumberSequenceScope.JOURNAL_ENTRY;

type RollbackSequenceScope = typeof PAYMENT_SEQUENCE_SCOPE | typeof JOURNAL_ENTRY_SEQUENCE_SCOPE;

interface CreateRollbackState {
  arAccountAvailable: boolean;
  invoices: Record<
    string,
    { id: string; organizationId: string; customerId: string; currency: string; status: SalesInvoiceStatus; balanceDue: string }
  >;
  customerPayments: Array<{ id: string; paymentNumber: string; status: CustomerPaymentStatus; journalEntryId: string }>;
  customerPaymentAllocations: Array<{ id: string; paymentId: string; invoiceId: string; amountApplied: string }>;
  journalEntries: Array<{ id: string; entryNumber: string; status: JournalEntryStatus }>;
  sequences: Record<RollbackSequenceScope, { prefix: string; nextNumber: number; padding: number }>;
}

function makeCreateRollbackHarness(options: { invoiceBalanceDue?: string; arAccountAvailable?: boolean } = {}) {
  const state: CreateRollbackState = {
    arAccountAvailable: options.arAccountAvailable ?? true,
    invoices: {
      "invoice-1": {
        id: "invoice-1",
        organizationId: "org-1",
        customerId: "customer-1",
        currency: "SAR",
        status: SalesInvoiceStatus.FINALIZED,
        balanceDue: options.invoiceBalanceDue ?? "100.0000",
      },
    },
    customerPayments: [],
    customerPaymentAllocations: [],
    journalEntries: [],
    sequences: {
      [NumberSequenceScope.PAYMENT]: { prefix: "PAY-", nextNumber: 1, padding: 6 },
      [NumberSequenceScope.JOURNAL_ENTRY]: { prefix: "JE-", nextNumber: 1, padding: 6 },
    },
  };

  const prisma = {
    $transaction: jest.fn(async (callback: (client: ReturnType<typeof makeCreateRollbackTransaction>) => Promise<unknown>) => {
      const draft = cloneCreateRollbackState(state);
      try {
        const result = await callback(makeCreateRollbackTransaction(draft));
        commitCreateRollbackState(state, draft);
        return result;
      } catch (error) {
        throw error;
      }
    }),
  };

  return {
    prisma,
    state,
    snapshot: () => ({
      invoiceBalanceDue: state.invoices["invoice-1"]!.balanceDue,
      customerPaymentCount: state.customerPayments.length,
      customerPaymentAllocationCount: state.customerPaymentAllocations.length,
      journalEntryCount: state.journalEntries.length,
      paymentNextNumber: state.sequences[PAYMENT_SEQUENCE_SCOPE]!.nextNumber,
      journalEntryNextNumber: state.sequences[JOURNAL_ENTRY_SEQUENCE_SCOPE]!.nextNumber,
    }),
  };
}

function makeCreateRollbackTransaction(state: CreateRollbackState) {
  return {
    contact: {
      findFirst: jest.fn(async ({ where }: { where: { id: string; organizationId: string } }) =>
        where.id === "customer-1" && where.organizationId === "org-1"
          ? { id: "customer-1", name: "Customer", displayName: null }
          : null,
      ),
    },
    account: {
      findFirst: jest.fn(async ({ where }: { where: { id?: string; code?: string; organizationId: string } }) => {
        if (where.id === "bank-1" && where.organizationId === "org-1") {
          return { id: "bank-1" };
        }
        if (where.code === "120" && where.organizationId === "org-1" && state.arAccountAvailable) {
          return { id: "ar-1" };
        }
        return null;
      }),
    },
    salesInvoice: {
      findMany: jest.fn(async ({ where }: { where: { organizationId: string; id: { in: string[] }; customerId: string; status: SalesInvoiceStatus } }) =>
        Object.values(state.invoices)
          .filter(
            (invoice) =>
              invoice.organizationId === where.organizationId &&
              invoice.customerId === where.customerId &&
              invoice.status === where.status &&
              where.id.in.includes(invoice.id),
          )
          .map((invoice) => ({ id: invoice.id, balanceDue: invoice.balanceDue, currency: invoice.currency })),
      ),
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: {
            id: string;
            organizationId: string;
            customerId: string;
            status: SalesInvoiceStatus;
            balanceDue: { gte: string };
          };
          data: { balanceDue: { decrement: string } };
        }) => {
          const invoice = state.invoices[where.id];
          if (
            !invoice ||
            invoice.organizationId !== where.organizationId ||
            invoice.customerId !== where.customerId ||
            invoice.status !== where.status ||
            Number(invoice.balanceDue) < Number(where.balanceDue.gte)
          ) {
            return { count: 0 };
          }

          invoice.balanceDue = formatTestMoney(Number(invoice.balanceDue) - Number(data.balanceDue.decrement));
          return { count: 1 };
        },
      ),
    },
    numberSequence: {
      upsert: jest.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { organizationId_scope: { organizationId: string; scope: RollbackSequenceScope } };
          create: { prefix: string; nextNumber: number; padding: number };
          update: { nextNumber: { increment: number } };
        }) => {
          const scope = where.organizationId_scope.scope;
          const sequence = state.sequences[scope];
          if (sequence) {
            sequence.nextNumber += update.nextNumber.increment;
          } else {
            state.sequences[scope] = { prefix: create.prefix, nextNumber: create.nextNumber, padding: create.padding };
          }

          return {
            id: `sequence-${scope}`,
            organizationId: where.organizationId_scope.organizationId,
            scope,
            ...state.sequences[scope]!,
            createdAt: new Date("2026-05-06T00:00:00.000Z"),
            updatedAt: new Date("2026-05-06T00:00:00.000Z"),
          };
        },
      ),
    },
    journalEntry: {
      create: jest.fn(async ({ data }: { data: { entryNumber: string; status: JournalEntryStatus } }) => {
        const journalEntry = {
          id: `journal-${state.journalEntries.length + 1}`,
          entryNumber: data.entryNumber,
          status: data.status,
        };
        state.journalEntries.push(journalEntry);
        return journalEntry;
      }),
    },
    customerPayment: {
      create: jest.fn(
        async ({
          data,
        }: {
          data: {
            paymentNumber: string;
            status: CustomerPaymentStatus;
            journalEntryId: string;
            allocations: { create: Array<{ invoice: { connect: { id: string } }; amountApplied: string }> };
          };
        }) => {
          const payment = {
            id: `payment-${state.customerPayments.length + 1}`,
            paymentNumber: data.paymentNumber,
            status: data.status,
            journalEntryId: data.journalEntryId,
          };
          state.customerPayments.push(payment);
          const createdAllocations = data.allocations.create.map((allocation: any, index) => ({
              id: `allocation-${state.customerPaymentAllocations.length + index + 1}`,
              paymentId: payment.id,
              invoiceId: allocation.invoice.connect.organizationId_id.id,
              amountApplied: allocation.amountApplied,
              realizedGainAmount: allocation.realizedGainAmount,
              realizedLossAmount: allocation.realizedLossAmount,
              realizedFxJournalEntryId: allocation.realizedFxJournalEntryId,
            }));
          state.customerPaymentAllocations.push(...createdAllocations);
          return { ...payment, allocations: createdAllocations };
        },
      ),
    },
  };
}

function cloneCreateRollbackState(state: CreateRollbackState): CreateRollbackState {
  return {
    arAccountAvailable: state.arAccountAvailable,
    invoices: Object.fromEntries(Object.entries(state.invoices).map(([id, invoice]) => [id, { ...invoice }])),
    customerPayments: state.customerPayments.map((payment) => ({ ...payment })),
    customerPaymentAllocations: state.customerPaymentAllocations.map((allocation) => ({ ...allocation })),
    journalEntries: state.journalEntries.map((journalEntry) => ({ ...journalEntry })),
    sequences: {
      [PAYMENT_SEQUENCE_SCOPE]: { ...state.sequences[PAYMENT_SEQUENCE_SCOPE]! },
      [JOURNAL_ENTRY_SEQUENCE_SCOPE]: { ...state.sequences[JOURNAL_ENTRY_SEQUENCE_SCOPE]! },
    },
  };
}

function commitCreateRollbackState(target: CreateRollbackState, source: CreateRollbackState): void {
  target.arAccountAvailable = source.arAccountAvailable;
  target.invoices = source.invoices;
  target.customerPayments = source.customerPayments;
  target.customerPaymentAllocations = source.customerPaymentAllocations;
  target.journalEntries = source.journalEntries;
  target.sequences = source.sequences;
}

function formatTestMoney(value: number): string {
  return value.toFixed(4);
}

function flattenValidationMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [...Object.values(error.constraints ?? {}), ...flattenValidationMessages(error.children ?? [])]);
}

  function makeCreateTransactionMock(
  options: {
    customer?: { id: string; name: string; displayName: string | null } | null;
    paidThroughAccount?: { id: string } | null;
    invoiceBalanceDue?: string;
    invoiceCurrency?: string;
    allocationUpdateCount?: number;
  } = {},
) {
  const accountFindFirst = jest.fn();
  accountFindFirst.mockResolvedValueOnce(options.paidThroughAccount === undefined ? { id: "bank-1" } : options.paidThroughAccount);
  accountFindFirst.mockResolvedValue({ id: "ar-1" });

  return {
    contact: { findFirst: jest.fn().mockResolvedValue(options.customer === undefined ? { id: "customer-1", name: "Customer", displayName: null } : options.customer) },
    account: { findFirst: accountFindFirst },
    journalEntry: { create: jest.fn().mockResolvedValue({ id: "journal-1" }) },
    generatedDocument: {
      create: jest.fn().mockRejectedValue(new Error("Customer payment lifecycle mutations must not create generated documents.")),
    },
    customerPayment: {
      create: jest.fn(({ data }: any) => Promise.resolve({
        id: "payment-1",
        paymentNumber: "PAY-000001",
        status: CustomerPaymentStatus.POSTED,
        journalEntryId: "journal-1",
        allocations: data.allocations.create.map((allocation: any, index: number) => ({
          id: `allocation-${index + 1}`,
          invoiceId: allocation.invoice.connect.organizationId_id.id,
          realizedGainAmount: allocation.realizedGainAmount,
          realizedLossAmount: allocation.realizedLossAmount,
          realizedFxJournalEntryId: allocation.realizedFxJournalEntryId,
        })),
      })),
    },
    salesInvoice: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "invoice-1",
          balanceDue: options.invoiceBalanceDue ?? "100.0000",
          currency: options.invoiceCurrency ?? "SAR",
          status: SalesInvoiceStatus.FINALIZED,
        },
      ]),
      updateMany: jest.fn().mockResolvedValue({ count: options.allocationUpdateCount ?? 1 }),
    },
  };
}

function makeApplyUnappliedTransactionMock(
  options: {
    paymentStatus?: CustomerPaymentStatus;
    unappliedAmount?: string;
    invoiceCustomerId?: string;
    invoiceStatus?: SalesInvoiceStatus;
    invoiceBalanceDue?: string;
    paymentUpdateCount?: number;
    invoiceUpdateCount?: number;
    paymentVoidReversalJournalEntryId?: string | null;
    paymentCurrency?: string;
    invoiceCurrency?: string;
  } = {},
) {
  return {
    customerPayment: {
      findFirst: jest.fn().mockResolvedValue({
        id: "payment-1",
        customerId: "customer-1",
        status: options.paymentStatus ?? CustomerPaymentStatus.POSTED,
        amountReceived: "100.0000",
        unappliedAmount: options.unappliedAmount ?? "100.0000",
        voidReversalJournalEntryId: options.paymentVoidReversalJournalEntryId ?? null,
        currency: options.paymentCurrency ?? "SAR",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: options.paymentUpdateCount ?? 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "payment-1",
        status: CustomerPaymentStatus.POSTED,
        amountReceived: "100.0000",
        unappliedAmount: "60.0000",
      }),
    },
    salesInvoice: {
      findFirst: jest.fn().mockResolvedValue({
        id: "invoice-1",
        customerId: options.invoiceCustomerId ?? "customer-1",
        status: options.invoiceStatus ?? SalesInvoiceStatus.FINALIZED,
        balanceDue: options.invoiceBalanceDue ?? "100.0000",
        currency: options.invoiceCurrency ?? "SAR",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: options.invoiceUpdateCount ?? 1 }),
    },
    customerPaymentUnappliedAllocation: {
      create: jest.fn().mockResolvedValue({ id: "unapplied-allocation-1" }),
    },
    customerPaymentAllocation: {
      updateMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    journalEntry: {
      create: jest.fn(),
    },
    generatedDocument: {
      create: jest.fn().mockRejectedValue(new Error("Customer payment lifecycle mutations must not create generated documents.")),
    },
  };
}

function makeReverseUnappliedTransactionMock(
  options: {
    reversedAt?: Date | null;
    paymentStatus?: CustomerPaymentStatus;
    invoiceStatus?: SalesInvoiceStatus;
    amountApplied?: string;
    paymentUnappliedAmount?: string;
    invoiceBalanceDue?: string;
    allocationUpdateCount?: number;
    paymentUpdateCount?: number;
    invoiceUpdateCount?: number;
    paymentVoidReversalJournalEntryId?: string | null;
  } = {},
) {
  const allocation = {
    id: "unapplied-allocation-1",
    organizationId: "org-1",
    paymentId: "payment-1",
    invoiceId: "invoice-1",
    amountApplied: options.amountApplied ?? "40.0000",
    reversedAt: options.reversedAt ?? null,
    payment: {
      id: "payment-1",
      currency: "USD",
      status: options.paymentStatus ?? CustomerPaymentStatus.POSTED,
      amountReceived: "100.0000",
      unappliedAmount: options.paymentUnappliedAmount ?? "60.0000",
      voidReversalJournalEntryId: options.paymentVoidReversalJournalEntryId ?? null,
    },
    invoice: {
      id: "invoice-1",
      currency: "SAR",
      status: options.invoiceStatus ?? SalesInvoiceStatus.FINALIZED,
      total: "100.0000",
      balanceDue: options.invoiceBalanceDue ?? "60.0000",
    },
  };

  return {
    customerPaymentUnappliedAllocation: {
      findFirst: jest.fn().mockResolvedValue(allocation),
      updateMany: jest.fn().mockResolvedValue({ count: options.allocationUpdateCount ?? 1 }),
    },
    customerPayment: {
      updateMany: jest.fn().mockResolvedValue({ count: options.paymentUpdateCount ?? 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "payment-1",
        status: CustomerPaymentStatus.POSTED,
        amountReceived: "100.0000",
        unappliedAmount: "100.0000",
      }),
    },
    salesInvoice: {
      updateMany: jest.fn().mockResolvedValue({ count: options.invoiceUpdateCount ?? 1 }),
    },
    journalEntry: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    generatedDocument: {
      create: jest.fn().mockRejectedValue(new Error("Customer payment lifecycle mutations must not create generated documents.")),
    },
  };
}

function makeVoidTransactionMock(options: { reversedById?: string; voidClaimCount?: number; refundCount?: number; unappliedAllocationCount?: number; realizedFx?: boolean } = {}) {
  return {
    customerPayment: {
      findFirst: jest.fn().mockResolvedValue({
        id: "payment-1",
        paymentNumber: "PAY-000001",
        paymentDate: new Date("2026-05-06T00:00:00.000Z"),
        currency: "SAR",
        status: CustomerPaymentStatus.POSTED,
        allocations: [{
          id: "allocation-1", invoiceId: "invoice-1", amountApplied: "60.0000",
          realizedGainAmount: options.realizedFx ? "10.0000" : "0.0000",
          realizedLossAmount: "0.0000", realizedFxJournalEntryId: options.realizedFx ? "journal-1" : null,
        }],
        journalEntry: {
          id: "journal-1",
          entryNumber: "JE-000001",
          description: "Customer payment PAY-000001 - Customer",
          reversedBy: options.reversedById ? { id: options.reversedById } : null,
          lines: [
            {
              accountId: "bank-1",
              debit: "60.0000",
              credit: "0.0000",
              description: "Customer payment PAY-000001 - Customer",
              currency: "SAR",
              exchangeRate: "1.00000000",
              taxRateId: null,
            },
            {
              accountId: "ar-1",
              debit: "0.0000",
              credit: "60.0000",
              description: "Accounts receivable cleared by PAY-000001 - Customer",
              currency: "SAR",
              exchangeRate: "1.00000000",
              taxRateId: null,
            },
          ],
        },
      }),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: options.voidClaimCount ?? 1 }),
      update: jest.fn().mockResolvedValue({
        id: "payment-1",
        status: CustomerPaymentStatus.VOIDED,
        voidReversalJournalEntryId: options.reversedById ?? "reversal-1",
      }),
    },
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: "reversal-1" }),
      update: jest.fn(),
    },
    customerRefund: {
      count: jest.fn().mockResolvedValue(options.refundCount ?? 0),
    },
    customerPaymentUnappliedAllocation: {
      count: jest.fn().mockResolvedValue(options.unappliedAllocationCount ?? 0),
    },
    salesInvoice: { updateMany: jest.fn() },
    generatedDocument: {
      create: jest.fn().mockRejectedValue(new Error("Customer payment lifecycle mutations must not create generated documents.")),
    },
  };
}
