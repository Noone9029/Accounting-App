import { assertBalancedJournal } from "@ledgerbyte/accounting-core";
import { JournalEntryStatus, PurchaseBillStatus, SupplierPaymentStatus } from "@prisma/client";
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
      },
      data: { balanceDue: { decrement: "100.0000" } },
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
      },
      data: { balanceDue: { increment: "60.0000" } },
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
      },
      data: { unappliedAmount: { decrement: "25.0000" } },
    });
    expect(tx.purchaseBill.updateMany).toHaveBeenCalledWith({
      where: {
        id: "bill-2",
        organizationId: "org-1",
        supplierId: "supplier-1",
        status: PurchaseBillStatus.FINALIZED,
        balanceDue: { gte: "25.0000" },
      },
      data: { balanceDue: { decrement: "25.0000" } },
    });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("reverses unapplied supplier payment allocation and restores balances", async () => {
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
      },
      data: { unappliedAmount: { increment: "25.0000" } },
    });
    expect(tx.purchaseBill.updateMany).toHaveBeenCalledWith({
      where: {
        id: "bill-2",
        organizationId: "org-1",
        status: PurchaseBillStatus.FINALIZED,
        balanceDue: { lte: "75.0000" },
      },
      data: { balanceDue: { increment: "25.0000" } },
    });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });
});

function makeCreateTransactionMock() {
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

function makeApplyUnappliedTransactionMock() {
  return {
    supplierPayment: {
      findFirst: jest.fn().mockResolvedValue({
        id: "payment-1",
        supplierId: "supplier-1",
        status: SupplierPaymentStatus.POSTED,
        amountPaid: "100.0000",
        unappliedAmount: "40.0000",
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
          status: SupplierPaymentStatus.POSTED,
          amountPaid: "100.0000",
          unappliedAmount: "15.0000",
        },
        bill: {
          id: "bill-2",
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
