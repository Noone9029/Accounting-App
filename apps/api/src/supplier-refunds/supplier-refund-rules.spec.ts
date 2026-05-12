import { NotFoundException } from "@nestjs/common";
import { assertBalancedJournal } from "@ledgerbyte/accounting-core";
import {
  DocumentType,
  JournalEntryStatus,
  PurchaseDebitNoteStatus,
  SupplierPaymentStatus,
  SupplierRefundSourceType,
  SupplierRefundStatus,
} from "@prisma/client";
import { buildSupplierRefundJournalLines } from "./supplier-refund-accounting";
import { SupplierRefundService } from "./supplier-refund.service";
import type { CreateSupplierRefundDto } from "./dto/create-supplier-refund.dto";

const basePaymentRefundDto: CreateSupplierRefundDto = {
  supplierId: "supplier-1",
  sourceType: SupplierRefundSourceType.SUPPLIER_PAYMENT,
  sourcePaymentId: "payment-1",
  refundDate: "2026-05-12T00:00:00.000Z",
  currency: "SAR",
  amountRefunded: "25.0000",
  accountId: "bank-1",
  description: "Supplier returned credit",
};

const baseDebitNoteRefundDto: CreateSupplierRefundDto = {
  supplierId: "supplier-1",
  sourceType: SupplierRefundSourceType.PURCHASE_DEBIT_NOTE,
  sourceDebitNoteId: "debit-note-1",
  refundDate: "2026-05-12T00:00:00.000Z",
  currency: "SAR",
  amountRefunded: "25.0000",
  accountId: "bank-1",
  description: "Debit note refund",
};

describe("supplier refund rules", () => {
  it("builds a balanced supplier refund journal that debits bank and credits AP", () => {
    const lines = buildSupplierRefundJournalLines({
      accountsPayableAccountId: "ap",
      receivedIntoAccountId: "bank",
      refundNumber: "SRF-000001",
      supplierName: "Supplier",
      currency: "SAR",
      amountRefunded: "100.0000",
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountId: "bank", debit: "100.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "ap", debit: "0.0000", credit: "100.0000" }),
    ]);
    expect(() => assertBalancedJournal(lines)).not.toThrow();
  });

  it("refunds supplier payment unapplied amount and creates a posted journal", async () => {
    const tx = makeCreateTransactionMock();
    const numberSequence = { next: jest.fn().mockResolvedValueOnce("SRF-000001").mockResolvedValueOnce("JE-000001") };
    const service = new SupplierRefundService(makeTransactionPrisma(tx) as never, { log: jest.fn() } as never, numberSequence as never);

    await expect(service.create("org-1", "user-1", basePaymentRefundDto)).resolves.toMatchObject({
      id: "refund-1",
      refundNumber: "SRF-000001",
      status: SupplierRefundStatus.POSTED,
      journalEntryId: "journal-1",
    });

    expect(tx.supplierPayment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "payment-1",
        organizationId: "org-1",
        supplierId: "supplier-1",
        status: SupplierPaymentStatus.POSTED,
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

  it("refunds purchase debit note unapplied amount", async () => {
    const tx = makeCreateTransactionMock();
    const service = new SupplierRefundService(
      makeTransactionPrisma(tx) as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValueOnce("SRF-000001").mockResolvedValueOnce("JE-000001") } as never,
    );

    await service.create("org-1", "user-1", baseDebitNoteRefundDto);

    expect(tx.purchaseDebitNote.updateMany).toHaveBeenCalledWith({
      where: {
        id: "debit-note-1",
        organizationId: "org-1",
        supplierId: "supplier-1",
        status: PurchaseDebitNoteStatus.FINALIZED,
        unappliedAmount: { gte: "25.0000" },
      },
      data: { unappliedAmount: { decrement: "25.0000" } },
    });
    expect(tx.supplierPayment.updateMany).not.toHaveBeenCalled();
  });

  it("rejects refunds above source unapplied amount", async () => {
    const tx = makeCreateTransactionMock({ paymentUnappliedAmount: "10.0000" });
    const service = new SupplierRefundService(makeTransactionPrisma(tx) as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", basePaymentRefundDto)).rejects.toThrow(
      "Amount refunded cannot exceed the supplier payment unapplied amount.",
    );
    expect(tx.supplierPayment.updateMany).not.toHaveBeenCalled();
  });

  it("tenant-scopes supplier refund lookup", async () => {
    const prisma = { supplierRefund: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new SupplierRefundService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.get("org-1", "refund-1")).rejects.toThrow(NotFoundException);
    expect(prisma.supplierRefund.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "refund-1", organizationId: "org-1" } }));
  });

  it("voids a supplier refund and restores payment unapplied amount once", async () => {
    const tx = makeVoidTransactionMock({ sourceType: SupplierRefundSourceType.SUPPLIER_PAYMENT });
    const prisma = makeVoidPrisma(tx);
    const service = new SupplierRefundService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000002") } as never,
    );

    await expect(service.void("org-1", "user-1", "refund-1")).resolves.toMatchObject({
      id: "refund-1",
      status: SupplierRefundStatus.VOIDED,
      voidReversalJournalEntryId: "reversal-1",
    });
    expect(tx.supplierPayment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "payment-1",
        organizationId: "org-1",
        status: SupplierPaymentStatus.POSTED,
        unappliedAmount: { lte: "75.0000" },
      },
      data: { unappliedAmount: { increment: "25.0000" } },
    });
    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);

    prisma.supplierRefund.findFirst.mockResolvedValueOnce({ id: "refund-1", status: SupplierRefundStatus.VOIDED });
    await expect(service.void("org-1", "user-1", "refund-1")).resolves.toMatchObject({ status: SupplierRefundStatus.VOIDED });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("voids a purchase debit note refund and restores debit note unapplied amount", async () => {
    const tx = makeVoidTransactionMock({ sourceType: SupplierRefundSourceType.PURCHASE_DEBIT_NOTE });
    const service = new SupplierRefundService(
      makeVoidPrisma(tx) as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000002") } as never,
    );

    await service.void("org-1", "user-1", "refund-1");

    expect(tx.purchaseDebitNote.updateMany).toHaveBeenCalledWith({
      where: {
        id: "debit-note-1",
        organizationId: "org-1",
        status: PurchaseDebitNoteStatus.FINALIZED,
        unappliedAmount: { lte: "75.0000" },
      },
      data: { unappliedAmount: { increment: "25.0000" } },
    });
    expect(tx.supplierPayment.updateMany).not.toHaveBeenCalled();
  });

  it("archives generated supplier refund PDFs", async () => {
    const archivePdf = jest.fn().mockResolvedValue({ id: "doc-1" });
    const service = new SupplierRefundService(
      {} as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      { receiptRenderSettings: jest.fn().mockResolvedValue({ title: "Supplier Refund" }) } as never,
      { archivePdf } as never,
    );
    jest.spyOn(service, "pdfData").mockResolvedValue({
      organization: { id: "org-1", name: "Org", legalName: null, taxNumber: null, countryCode: "SA" },
      supplier: { id: "supplier-1", name: "Supplier", displayName: "Supplier", taxNumber: null, email: null, phone: null },
      refund: {
        id: "refund-1",
        refundNumber: "SRF-000001",
        refundDate: "2026-05-12T00:00:00.000Z",
        status: SupplierRefundStatus.POSTED,
        currency: "SAR",
        amountRefunded: "25.0000",
        description: "Supplier returned credit",
      },
      source: {
        type: SupplierRefundSourceType.SUPPLIER_PAYMENT,
        id: "payment-1",
        number: "PAY-000001",
        date: "2026-05-11T00:00:00.000Z",
        status: SupplierPaymentStatus.POSTED,
        originalAmount: "100.0000",
        remainingUnappliedAmount: "75.0000",
      },
      receivedIntoAccount: { id: "bank-1", code: "112", name: "Bank Account" },
      journalEntry: { id: "journal-1", entryNumber: "JE-000001", status: JournalEntryStatus.POSTED },
      voidReversalJournalEntry: null,
      generatedAt: new Date("2026-05-12T00:00:00.000Z"),
    });

    const result = await service.pdf("org-1", "user-1", "refund-1");

    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(result.filename).toBe("supplier-refund-SRF-000001.pdf");
    expect(archivePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: DocumentType.SUPPLIER_REFUND,
        sourceType: "SupplierRefund",
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
    paymentSupplierId?: string;
    paymentStatus?: SupplierPaymentStatus;
    paymentUnappliedAmount?: string;
    paymentClaimCount?: number;
    debitNoteStatus?: PurchaseDebitNoteStatus;
    debitNoteUnappliedAmount?: string;
    debitNoteClaimCount?: number;
  } = {},
) {
  return {
    contact: {
      findFirst: jest.fn().mockResolvedValue({ id: "supplier-1", name: "Supplier", displayName: null }),
    },
    account: {
      findFirst: jest.fn(({ where }: { where: { code?: string } }) =>
        Promise.resolve({ id: where.code === "210" ? "ap-1" : "bank-1" }),
      ),
    },
    supplierPayment: {
      findFirst: jest.fn().mockResolvedValue({
        id: "payment-1",
        supplierId: options.paymentSupplierId ?? "supplier-1",
        status: options.paymentStatus ?? SupplierPaymentStatus.POSTED,
        unappliedAmount: options.paymentUnappliedAmount ?? "100.0000",
        currency: "SAR",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: options.paymentClaimCount ?? 1 }),
    },
    purchaseDebitNote: {
      findFirst: jest.fn().mockResolvedValue({
        id: "debit-note-1",
        supplierId: "supplier-1",
        status: options.debitNoteStatus ?? PurchaseDebitNoteStatus.FINALIZED,
        unappliedAmount: options.debitNoteUnappliedAmount ?? "100.0000",
        currency: "SAR",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: options.debitNoteClaimCount ?? 1 }),
    },
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: "journal-1" }),
    },
    supplierRefund: {
      create: jest.fn().mockResolvedValue({
        id: "refund-1",
        refundNumber: "SRF-000001",
        status: SupplierRefundStatus.POSTED,
        journalEntryId: "journal-1",
      }),
    },
  };
}

function makeVoidPrisma(tx: ReturnType<typeof makeVoidTransactionMock>) {
  return {
    supplierRefund: {
      findFirst: jest.fn().mockResolvedValue({ id: "refund-1", status: SupplierRefundStatus.POSTED, journalEntryId: "journal-1" }),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
}

function makeVoidTransactionMock(
  options: {
    sourceType?: SupplierRefundSourceType;
    paymentRestoreCount?: number;
    debitNoteRestoreCount?: number;
  } = {},
) {
  const sourceType = options.sourceType ?? SupplierRefundSourceType.SUPPLIER_PAYMENT;
  return {
    supplierRefund: {
      findFirst: jest.fn().mockResolvedValue({
        id: "refund-1",
        refundNumber: "SRF-000001",
        refundDate: new Date("2026-05-12T00:00:00.000Z"),
        currency: "SAR",
        status: SupplierRefundStatus.POSTED,
        sourceType,
        sourcePaymentId: sourceType === SupplierRefundSourceType.SUPPLIER_PAYMENT ? "payment-1" : null,
        sourceDebitNoteId: sourceType === SupplierRefundSourceType.PURCHASE_DEBIT_NOTE ? "debit-note-1" : null,
        amountRefunded: "25.0000",
        sourcePayment:
          sourceType === SupplierRefundSourceType.SUPPLIER_PAYMENT
            ? { id: "payment-1", status: SupplierPaymentStatus.POSTED, amountPaid: "100.0000", unappliedAmount: "50.0000" }
            : null,
        sourceDebitNote:
          sourceType === SupplierRefundSourceType.PURCHASE_DEBIT_NOTE
            ? { id: "debit-note-1", status: PurchaseDebitNoteStatus.FINALIZED, total: "100.0000", unappliedAmount: "50.0000" }
            : null,
        journalEntry: {
          id: "journal-1",
          entryNumber: "JE-000001",
          description: "Supplier refund SRF-000001",
          reversedBy: null,
          lines: [
            {
              accountId: "bank-1",
              debit: "25.0000",
              credit: "0.0000",
              description: "Cash received",
              currency: "SAR",
              exchangeRate: "1",
              taxRateId: null,
            },
            {
              accountId: "ap-1",
              debit: "0.0000",
              credit: "25.0000",
              description: "AP restored",
              currency: "SAR",
              exchangeRate: "1",
              taxRateId: null,
            },
          ],
        },
      }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "refund-1", status: SupplierRefundStatus.VOIDED, voidReversalJournalEntryId: "reversal-1" }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({ id: "refund-1", status: SupplierRefundStatus.VOIDED, voidReversalJournalEntryId: "reversal-1" }),
    },
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: "reversal-1" }),
      update: jest.fn().mockResolvedValue({}),
    },
    supplierPayment: {
      updateMany: jest.fn().mockResolvedValue({ count: options.paymentRestoreCount ?? 1 }),
    },
    purchaseDebitNote: {
      updateMany: jest.fn().mockResolvedValue({ count: options.debitNoteRestoreCount ?? 1 }),
    },
  };
}
