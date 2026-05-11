import { BadRequestException, NotFoundException } from "@nestjs/common";
import { assertBalancedJournal } from "@ledgerbyte/accounting-core";
import {
  CreditNoteStatus,
  CustomerPaymentStatus,
  CustomerRefundSourceType,
  CustomerRefundStatus,
  DocumentType,
  JournalEntryStatus,
} from "@prisma/client";
import { buildCustomerRefundJournalLines } from "./customer-refund-accounting";
import { CustomerRefundService } from "./customer-refund.service";
import type { CreateCustomerRefundDto } from "./dto/create-customer-refund.dto";

const basePaymentRefundDto: CreateCustomerRefundDto = {
  customerId: "customer-1",
  sourceType: CustomerRefundSourceType.CUSTOMER_PAYMENT,
  sourcePaymentId: "payment-1",
  refundDate: "2026-05-12T00:00:00.000Z",
  currency: "SAR",
  amountRefunded: "25.0000",
  accountId: "bank-1",
  description: "Manual refund",
};

const baseCreditNoteRefundDto: CreateCustomerRefundDto = {
  customerId: "customer-1",
  sourceType: CustomerRefundSourceType.CREDIT_NOTE,
  sourceCreditNoteId: "credit-note-1",
  refundDate: "2026-05-12T00:00:00.000Z",
  currency: "SAR",
  amountRefunded: "25.0000",
  accountId: "bank-1",
  description: "Credit refund",
};

describe("customer refund rules", () => {
  it("builds a balanced refund journal that debits AR and credits the paid-from account", () => {
    const lines = buildCustomerRefundJournalLines({
      accountsReceivableAccountId: "ar",
      paidFromAccountId: "bank",
      refundNumber: "REF-000001",
      customerName: "Customer",
      currency: "SAR",
      amountRefunded: "100.0000",
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountId: "ar", debit: "100.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "bank", debit: "0.0000", credit: "100.0000" }),
    ]);
    expect(() => assertBalancedJournal(lines)).not.toThrow();
  });

  it("refunds customer payment unapplied amount and creates a posted journal", async () => {
    const tx = makeCreateTransactionMock();
    const prisma = makeTransactionPrisma(tx);
    const numberSequence = { next: jest.fn().mockResolvedValueOnce("REF-000001").mockResolvedValueOnce("JE-000001") };
    const service = new CustomerRefundService(prisma as never, { log: jest.fn() } as never, numberSequence as never);

    await expect(service.create("org-1", "user-1", basePaymentRefundDto)).resolves.toMatchObject({
      id: "refund-1",
      refundNumber: "REF-000001",
      status: CustomerRefundStatus.POSTED,
      journalEntryId: "journal-1",
    });

    expect(tx.customerPayment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "payment-1",
        organizationId: "org-1",
        customerId: "customer-1",
        status: CustomerPaymentStatus.POSTED,
        unappliedAmount: { gte: "25.0000" },
      },
      data: { unappliedAmount: { decrement: "25.0000" } },
    });
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          totalDebit: "25.0000",
          totalCredit: "25.0000",
        }),
      }),
    );
  });

  it("refunds credit note unapplied amount", async () => {
    const tx = makeCreateTransactionMock();
    const prisma = makeTransactionPrisma(tx);
    const numberSequence = { next: jest.fn().mockResolvedValueOnce("REF-000001").mockResolvedValueOnce("JE-000001") };
    const service = new CustomerRefundService(prisma as never, { log: jest.fn() } as never, numberSequence as never);

    await service.create("org-1", "user-1", baseCreditNoteRefundDto);

    expect(tx.creditNote.updateMany).toHaveBeenCalledWith({
      where: {
        id: "credit-note-1",
        organizationId: "org-1",
        customerId: "customer-1",
        status: CreditNoteStatus.FINALIZED,
        unappliedAmount: { gte: "25.0000" },
      },
      data: { unappliedAmount: { decrement: "25.0000" } },
    });
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
  });

  it("rejects refunds above source unapplied amount", async () => {
    const tx = makeCreateTransactionMock({ paymentUnappliedAmount: "10.0000" });
    const service = new CustomerRefundService(makeTransactionPrisma(tx) as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", basePaymentRefundDto)).rejects.toThrow("Amount refunded cannot exceed the payment unapplied amount.");
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
  });

  it("rejects voided payment and credit note sources", async () => {
    let tx = makeCreateTransactionMock({ paymentStatus: CustomerPaymentStatus.VOIDED });
    let service = new CustomerRefundService(makeTransactionPrisma(tx) as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    await expect(service.create("org-1", "user-1", basePaymentRefundDto)).rejects.toThrow("Refund source payment must be posted");

    tx = makeCreateTransactionMock({ creditNoteStatus: CreditNoteStatus.VOIDED });
    service = new CustomerRefundService(makeTransactionPrisma(tx) as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    await expect(service.create("org-1", "user-1", baseCreditNoteRefundDto)).rejects.toThrow("Refund source credit note must be finalized");
  });

  it("rejects source records for a different customer", async () => {
    const tx = makeCreateTransactionMock({ paymentCustomerId: "customer-2" });
    const service = new CustomerRefundService(makeTransactionPrisma(tx) as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", basePaymentRefundDto)).rejects.toThrow("Refund source payment must belong to the selected customer.");
  });

  it("rejects stale concurrent source claim failures cleanly", async () => {
    const tx = makeCreateTransactionMock({ paymentClaimCount: 0 });
    const service = new CustomerRefundService(makeTransactionPrisma(tx) as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", basePaymentRefundDto)).rejects.toThrow(
      "Refund source payment unapplied amount is no longer sufficient.",
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.customerRefund.create).not.toHaveBeenCalled();
  });

  it("tenant-scopes refund lookup", async () => {
    const prisma = { customerRefund: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new CustomerRefundService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.get("org-1", "refund-1")).rejects.toThrow(NotFoundException);
    expect(prisma.customerRefund.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "refund-1", organizationId: "org-1" } }));
  });

  it("voids a refund once and restores payment unapplied amount", async () => {
    const tx = makeVoidTransactionMock({ sourceType: CustomerRefundSourceType.CUSTOMER_PAYMENT });
    const prisma = makeVoidPrisma(tx);
    const service = new CustomerRefundService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000002") } as never,
    );

    await expect(service.void("org-1", "user-1", "refund-1")).resolves.toMatchObject({
      id: "refund-1",
      status: CustomerRefundStatus.VOIDED,
      voidReversalJournalEntryId: "reversal-1",
    });
    expect(tx.customerPayment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "payment-1",
        organizationId: "org-1",
        status: CustomerPaymentStatus.POSTED,
        unappliedAmount: { lte: "75.0000" },
      },
      data: { unappliedAmount: { increment: "25.0000" } },
    });
    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);

    prisma.customerRefund.findFirst.mockResolvedValueOnce({ id: "refund-1", status: CustomerRefundStatus.VOIDED });
    await expect(service.void("org-1", "user-1", "refund-1")).resolves.toMatchObject({ status: CustomerRefundStatus.VOIDED });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("voids a credit note refund and restores credit note unapplied amount", async () => {
    const tx = makeVoidTransactionMock({ sourceType: CustomerRefundSourceType.CREDIT_NOTE });
    const service = new CustomerRefundService(
      makeVoidPrisma(tx) as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000002") } as never,
    );

    await service.void("org-1", "user-1", "refund-1");

    expect(tx.creditNote.updateMany).toHaveBeenCalledWith({
      where: {
        id: "credit-note-1",
        organizationId: "org-1",
        status: CreditNoteStatus.FINALIZED,
        unappliedAmount: { lte: "75.0000" },
      },
      data: { unappliedAmount: { increment: "25.0000" } },
    });
    expect(tx.customerPayment.updateMany).not.toHaveBeenCalled();
  });

  it("rejects stale refund void restoration guards cleanly", async () => {
    const tx = makeVoidTransactionMock({ paymentRestoreCount: 0 });
    const service = new CustomerRefundService(makeVoidPrisma(tx) as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.void("org-1", "user-1", "refund-1")).rejects.toThrow("Payment unapplied amount could not be restored safely.");
  });

  it("archives generated customer refund PDFs", async () => {
    const archivePdf = jest.fn().mockResolvedValue({ id: "doc-1" });
    const service = new CustomerRefundService(
      {} as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      { receiptRenderSettings: jest.fn().mockResolvedValue({ title: "Customer Refund" }) } as never,
      { archivePdf } as never,
    );
    jest.spyOn(service, "pdfData").mockResolvedValue({
      organization: { id: "org-1", name: "Org", legalName: null, taxNumber: null, countryCode: "SA" },
      customer: { id: "customer-1", name: "Customer", displayName: "Customer", taxNumber: null, email: null, phone: null },
      refund: {
        id: "refund-1",
        refundNumber: "REF-000001",
        refundDate: "2026-05-12T00:00:00.000Z",
        status: CustomerRefundStatus.POSTED,
        currency: "SAR",
        amountRefunded: "25.0000",
        description: "Manual refund",
      },
      source: {
        type: CustomerRefundSourceType.CUSTOMER_PAYMENT,
        id: "payment-1",
        number: "PAY-000001",
        date: "2026-05-11T00:00:00.000Z",
        status: CustomerPaymentStatus.POSTED,
        originalAmount: "100.0000",
        remainingUnappliedAmount: "75.0000",
      },
      paidFromAccount: { id: "bank-1", code: "112", name: "Bank Account" },
      journalEntry: { id: "journal-1", entryNumber: "JE-000001", status: JournalEntryStatus.POSTED },
      voidReversalJournalEntry: null,
      generatedAt: new Date("2026-05-12T00:00:00.000Z"),
    });

    const result = await service.pdf("org-1", "user-1", "refund-1");

    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(result.filename).toBe("customer-refund-REF-000001.pdf");
    expect(archivePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: DocumentType.CUSTOMER_REFUND,
        sourceType: "CustomerRefund",
        sourceId: "refund-1",
        generatedById: "user-1",
      }),
    );
  });
});

function makeTransactionPrisma(tx: ReturnType<typeof makeCreateTransactionMock>) {
  return {
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
}

function makeCreateTransactionMock(
  options: {
    paymentCustomerId?: string;
    paymentStatus?: CustomerPaymentStatus;
    paymentUnappliedAmount?: string;
    paymentClaimCount?: number;
    creditNoteStatus?: CreditNoteStatus;
    creditNoteUnappliedAmount?: string;
    creditNoteClaimCount?: number;
  } = {},
) {
  return {
    contact: {
      findFirst: jest.fn().mockResolvedValue({ id: "customer-1", name: "Customer", displayName: null }),
    },
    account: {
      findFirst: jest.fn(({ where }: { where: { code?: string } }) =>
        Promise.resolve({ id: where.code === "120" ? "ar-1" : "bank-1" }),
      ),
    },
    customerPayment: {
      findFirst: jest.fn().mockResolvedValue({
        id: "payment-1",
        customerId: options.paymentCustomerId ?? "customer-1",
        status: options.paymentStatus ?? CustomerPaymentStatus.POSTED,
        unappliedAmount: options.paymentUnappliedAmount ?? "100.0000",
        currency: "SAR",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: options.paymentClaimCount ?? 1 }),
    },
    creditNote: {
      findFirst: jest.fn().mockResolvedValue({
        id: "credit-note-1",
        customerId: "customer-1",
        status: options.creditNoteStatus ?? CreditNoteStatus.FINALIZED,
        unappliedAmount: options.creditNoteUnappliedAmount ?? "100.0000",
        currency: "SAR",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: options.creditNoteClaimCount ?? 1 }),
    },
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: "journal-1" }),
    },
    customerRefund: {
      create: jest.fn().mockResolvedValue({
        id: "refund-1",
        refundNumber: "REF-000001",
        status: CustomerRefundStatus.POSTED,
        journalEntryId: "journal-1",
      }),
    },
  };
}

function makeVoidPrisma(tx: ReturnType<typeof makeVoidTransactionMock>) {
  return {
    customerRefund: {
      findFirst: jest.fn().mockResolvedValue({ id: "refund-1", status: CustomerRefundStatus.POSTED, journalEntryId: "journal-1" }),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
}

function makeVoidTransactionMock(
  options: {
    sourceType?: CustomerRefundSourceType;
    paymentRestoreCount?: number;
    creditNoteRestoreCount?: number;
  } = {},
) {
  const sourceType = options.sourceType ?? CustomerRefundSourceType.CUSTOMER_PAYMENT;
  return {
    customerRefund: {
      findFirst: jest.fn().mockResolvedValue({
        id: "refund-1",
        refundNumber: "REF-000001",
        refundDate: new Date("2026-05-12T00:00:00.000Z"),
        currency: "SAR",
        status: CustomerRefundStatus.POSTED,
        sourceType,
        sourcePaymentId: sourceType === CustomerRefundSourceType.CUSTOMER_PAYMENT ? "payment-1" : null,
        sourceCreditNoteId: sourceType === CustomerRefundSourceType.CREDIT_NOTE ? "credit-note-1" : null,
        amountRefunded: "25.0000",
        sourcePayment:
          sourceType === CustomerRefundSourceType.CUSTOMER_PAYMENT
            ? { id: "payment-1", status: CustomerPaymentStatus.POSTED, amountReceived: "100.0000", unappliedAmount: "50.0000" }
            : null,
        sourceCreditNote:
          sourceType === CustomerRefundSourceType.CREDIT_NOTE
            ? { id: "credit-note-1", status: CreditNoteStatus.FINALIZED, total: "100.0000", unappliedAmount: "50.0000" }
            : null,
        journalEntry: {
          id: "journal-1",
          entryNumber: "JE-000001",
          description: "Customer refund REF-000001",
          reversedBy: null,
          lines: [
            {
              accountId: "ar-1",
              debit: "25.0000",
              credit: "0.0000",
              description: "AR restored",
              currency: "SAR",
              exchangeRate: "1",
              taxRateId: null,
            },
            {
              accountId: "bank-1",
              debit: "0.0000",
              credit: "25.0000",
              description: "Cash refunded",
              currency: "SAR",
              exchangeRate: "1",
              taxRateId: null,
            },
          ],
        },
      }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "refund-1", status: CustomerRefundStatus.VOIDED, voidReversalJournalEntryId: "reversal-1" }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({ id: "refund-1", status: CustomerRefundStatus.VOIDED, voidReversalJournalEntryId: "reversal-1" }),
    },
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: "reversal-1" }),
      update: jest.fn().mockResolvedValue({}),
    },
    customerPayment: {
      updateMany: jest.fn().mockResolvedValue({ count: options.paymentRestoreCount ?? 1 }),
    },
    creditNote: {
      updateMany: jest.fn().mockResolvedValue({ count: options.creditNoteRestoreCount ?? 1 }),
    },
  };
}
