import { assertBalancedJournal, calculateSalesInvoiceTotals } from "@ledgerbyte/accounting-core";
import { NotFoundException } from "@nestjs/common";
import { JournalEntryStatus, PurchaseBillStatus, PurchaseDebitNoteStatus } from "@prisma/client";
import { buildSupplierLedgerRows } from "../contacts/contact-ledger.service";
import { buildPurchaseDebitNoteJournalLines } from "./purchase-debit-note-accounting";
import { PurchaseDebitNoteService } from "./purchase-debit-note.service";

describe("purchase debit note rules", () => {
  it("calculates debit note totals using purchase bill semantics", () => {
    const result = calculateSalesInvoiceTotals([
      { quantity: "2.0000", unitPrice: "100.0000", discountRate: "10.0000", taxRate: "15.0000" },
    ]);

    expect(result).toMatchObject({
      subtotal: "200.0000",
      discountTotal: "20.0000",
      taxableTotal: "180.0000",
      taxTotal: "27.0000",
      total: "207.0000",
    });
  });

  it("builds balanced AP reversal journal lines", () => {
    const lines = buildPurchaseDebitNoteJournalLines({
      accountsPayableAccountId: "ap",
      vatReceivableAccountId: "vat-receivable",
      debitNoteNumber: "PDN-000001",
      supplierName: "Supplier",
      currency: "SAR",
      total: "115.0000",
      taxTotal: "15.0000",
      lines: [{ accountId: "expense", description: "Returned services", taxableAmount: "100.0000" }],
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountId: "ap", debit: "115.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "expense", debit: "0.0000", credit: "100.0000" }),
      expect.objectContaining({ accountId: "vat-receivable", debit: "0.0000", credit: "15.0000" }),
    ]);
    expect(() => assertBalancedJournal(lines)).not.toThrow();
  });

  it("does not post again when finalizing an already finalized debit note", async () => {
    const finalizedDebitNote = { id: "debit-note-1", status: PurchaseDebitNoteStatus.FINALIZED, journalEntryId: "journal-1" };
    const prisma = { $transaction: jest.fn() };
    const service = new PurchaseDebitNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue(finalizedDebitNote as never);

    await expect(service.finalize("org-1", "user-1", "debit-note-1")).resolves.toBe(finalizedDebitNote);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("prevents updates to finalized debit notes", async () => {
    const service = new PurchaseDebitNoteService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "debit-note-1", status: PurchaseDebitNoteStatus.FINALIZED } as never);

    await expect(service.update("org-1", "user-1", "debit-note-1", {})).rejects.toThrow("Only draft purchase debit notes can be edited.");
  });

  it("returns not found when a debit note is outside the organization scope", async () => {
    const prisma = { purchaseDebitNote: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new PurchaseDebitNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.get("org-1", "debit-note-from-other-org")).rejects.toThrow(NotFoundException);
    expect(prisma.purchaseDebitNote.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "debit-note-from-other-org", organizationId: "org-1" } }),
    );
  });

  it("finalization creates a balanced posted AP reversal journal", async () => {
    const tx = makeFinalizeTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseDebitNoteService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000001") } as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "debit-note-1", status: PurchaseDebitNoteStatus.DRAFT, journalEntryId: null } as never);

    await expect(service.finalize("org-1", "user-1", "debit-note-1")).resolves.toMatchObject({
      status: PurchaseDebitNoteStatus.FINALIZED,
      journalEntryId: "journal-1",
    });
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          totalDebit: "115.0000",
          totalCredit: "115.0000",
          lines: {
            create: [
              expect.objectContaining({ debit: "115.0000", credit: "0.0000" }),
              expect.objectContaining({ debit: "0.0000", credit: "100.0000" }),
              expect.objectContaining({ debit: "0.0000", credit: "15.0000" }),
            ],
          },
        }),
      }),
    );
  });

  it("applies a finalized debit note to an open bill without creating a journal", async () => {
    const tx = makeApplyTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseDebitNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "debit-note-1", status: PurchaseDebitNoteStatus.FINALIZED } as never);

    await expect(
      service.apply("org-1", "user-1", "debit-note-1", { billId: "bill-1", amountApplied: "25.0000" }),
    ).resolves.toMatchObject({ id: "debit-note-1" });

    expect(tx.purchaseDebitNote.updateMany).toHaveBeenCalledWith({
      where: {
        id: "debit-note-1",
        organizationId: "org-1",
        status: PurchaseDebitNoteStatus.FINALIZED,
        unappliedAmount: { gte: "25.0000" },
      },
      data: { unappliedAmount: { decrement: "25.0000" } },
    });
    expect(tx.purchaseBill.updateMany).toHaveBeenCalledWith({
      where: {
        id: "bill-1",
        organizationId: "org-1",
        supplierId: "supplier-1",
        status: PurchaseBillStatus.FINALIZED,
        balanceDue: { gte: "25.0000" },
      },
      data: { balanceDue: { decrement: "25.0000" } },
    });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("rejects applying draft debit notes", async () => {
    const tx = makeApplyTransactionMock({ debitNoteStatus: PurchaseDebitNoteStatus.DRAFT });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseDebitNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "debit-note-1", status: PurchaseDebitNoteStatus.DRAFT } as never);

    await expect(service.apply("org-1", "user-1", "debit-note-1", { billId: "bill-1", amountApplied: "25.0000" })).rejects.toThrow(
      "Only finalized purchase debit notes can be applied to bills.",
    );
  });

  it("rejects applying above debit note unapplied amount", async () => {
    const tx = makeApplyTransactionMock({ debitNoteUnappliedAmount: "20.0000" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseDebitNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "debit-note-1", status: PurchaseDebitNoteStatus.FINALIZED } as never);

    await expect(service.apply("org-1", "user-1", "debit-note-1", { billId: "bill-1", amountApplied: "25.0000" })).rejects.toThrow(
      "Amount applied cannot exceed purchase debit note unapplied amount.",
    );
  });

  it("rejects applying above bill balance due", async () => {
    const tx = makeApplyTransactionMock({ billBalanceDue: "20.0000" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseDebitNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "debit-note-1", status: PurchaseDebitNoteStatus.FINALIZED } as never);

    await expect(service.apply("org-1", "user-1", "debit-note-1", { billId: "bill-1", amountApplied: "25.0000" })).rejects.toThrow(
      "Amount applied cannot exceed bill balance due.",
    );
  });

  it("requires linked original bills to match the selected supplier", async () => {
    const service = new PurchaseDebitNoteService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    const validateOriginalBillReference = (
      service as unknown as {
        validateOriginalBillReference: (
          organizationId: string,
          supplierId: string,
          originalBillId: string,
          debitNoteTotal: string,
          excludeDebitNoteId: string | undefined,
          executor: unknown,
        ) => Promise<void>;
      }
    ).validateOriginalBillReference.bind(service);
    const executor = {
      purchaseBill: {
        findFirst: jest.fn().mockResolvedValue({
          id: "bill-1",
          supplierId: "supplier-2",
          status: PurchaseBillStatus.FINALIZED,
          total: "100.0000",
        }),
      },
      purchaseDebitNote: { aggregate: jest.fn() },
    };

    await expect(validateOriginalBillReference("org-1", "supplier-1", "bill-1", "10.0000", undefined, executor)).rejects.toThrow(
      "Original purchase bill must belong to the selected supplier.",
    );
  });

  it("reverses an active debit allocation and restores bill/debit note balances", async () => {
    const tx = makeReverseTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseDebitNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(
      service.reverseAllocation("org-1", "user-1", "debit-note-1", "allocation-1", { reason: "Correction" }),
    ).resolves.toMatchObject({ id: "debit-note-1" });

    expect(tx.purchaseDebitNoteAllocation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "allocation-1", debitNoteId: "debit-note-1", organizationId: "org-1", reversedAt: null },
      }),
    );
    expect(tx.purchaseDebitNote.updateMany).toHaveBeenCalledWith({
      where: {
        id: "debit-note-1",
        organizationId: "org-1",
        status: PurchaseDebitNoteStatus.FINALIZED,
        unappliedAmount: { lte: "75.0000" },
      },
      data: { unappliedAmount: { increment: "25.0000" } },
    });
    expect(tx.purchaseBill.updateMany).toHaveBeenCalledWith({
      where: {
        id: "bill-1",
        organizationId: "org-1",
        status: PurchaseBillStatus.FINALIZED,
        balanceDue: { lte: "75.0000" },
      },
      data: { balanceDue: { increment: "25.0000" } },
    });
  });

  it("rejects double allocation reversal", async () => {
    const tx = makeReverseTransactionMock({ reversedAt: new Date("2026-05-12T00:00:00.000Z") });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseDebitNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.reverseAllocation("org-1", "user-1", "debit-note-1", "allocation-1", {})).rejects.toThrow(
      "Purchase debit note allocation has already been reversed.",
    );
  });

  it("blocks voiding finalized debit notes with active allocations", async () => {
    const tx = makeVoidTransactionMock({ activeAllocationCount: 1 });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseDebitNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "debit-note-1", status: PurchaseDebitNoteStatus.FINALIZED, journalEntryId: "journal-1" } as never);

    await expect(service.void("org-1", "user-1", "debit-note-1")).rejects.toThrow(
      "Cannot void purchase debit note with active allocations. Reverse allocations first.",
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("supplier ledger includes debit note and neutral allocation/reversal rows", () => {
    const rows = buildSupplierLedgerRows({
      bills: [
        {
          id: "bill-1",
          billNumber: "BILL-000001",
          billDate: "2026-05-12T00:00:00.000Z",
          total: "115.0000",
          balanceDue: "100.0000",
          status: PurchaseBillStatus.FINALIZED,
          journalEntryId: "journal-bill",
          createdAt: "2026-05-12T00:00:00.000Z",
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
      ],
      debitNotes: [
        {
          id: "debit-note-1",
          debitNoteNumber: "PDN-000001",
          issueDate: "2026-05-13T00:00:00.000Z",
          total: "15.0000",
          unappliedAmount: "15.0000",
          status: PurchaseDebitNoteStatus.FINALIZED,
          journalEntryId: "journal-debit",
          originalBillId: "bill-1",
          finalizedAt: "2026-05-13T00:00:00.000Z",
          createdAt: "2026-05-13T00:00:00.000Z",
          updatedAt: "2026-05-13T00:00:00.000Z",
        },
      ],
      debitNoteAllocations: [
        {
          id: "allocation-1",
          debitNoteId: "debit-note-1",
          billId: "bill-1",
          amountApplied: "5.0000",
          createdAt: "2026-05-13T01:00:00.000Z",
          reversedAt: "2026-05-13T02:00:00.000Z",
          reversalReason: "Correction",
          debitNote: {
            id: "debit-note-1",
            debitNoteNumber: "PDN-000001",
            issueDate: "2026-05-13T00:00:00.000Z",
            total: "15.0000",
            unappliedAmount: "15.0000",
            status: PurchaseDebitNoteStatus.FINALIZED,
          },
          bill: {
            id: "bill-1",
            billNumber: "BILL-000001",
            billDate: "2026-05-12T00:00:00.000Z",
            total: "115.0000",
            balanceDue: "100.0000",
            status: PurchaseBillStatus.FINALIZED,
          },
        },
      ],
      payments: [],
    });

    expect(rows.map((row) => row.type)).toEqual([
      "PURCHASE_BILL",
      "PURCHASE_DEBIT_NOTE",
      "PURCHASE_DEBIT_NOTE_ALLOCATION",
      "PURCHASE_DEBIT_NOTE_ALLOCATION_REVERSAL",
    ]);
    expect(rows.find((row) => row.type === "PURCHASE_DEBIT_NOTE")).toMatchObject({ debit: "15.0000", credit: "0.0000", balance: "100.0000" });
    expect(rows.find((row) => row.type === "PURCHASE_DEBIT_NOTE_ALLOCATION")).toMatchObject({
      debit: "0.0000",
      credit: "0.0000",
      balance: "100.0000",
    });
    expect(rows.at(-1)).toMatchObject({ type: "PURCHASE_DEBIT_NOTE_ALLOCATION_REVERSAL", balance: "100.0000" });
  });
});

function makeFinalizeTransactionMock() {
  const debitNote = {
    id: "debit-note-1",
    debitNoteNumber: "PDN-000001",
    supplierId: "supplier-1",
    originalBillId: "bill-1",
    status: PurchaseDebitNoteStatus.DRAFT,
    issueDate: new Date("2026-05-12T00:00:00.000Z"),
    currency: "SAR",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    journalEntryId: null,
    supplier: { id: "supplier-1", name: "Supplier", displayName: "Supplier" },
    lines: [
      {
        accountId: "expense",
        description: "Returned services",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        account: { id: "expense" },
      },
    ],
  };

  return {
    purchaseDebitNote: {
      findFirst: jest.fn().mockResolvedValue(debitNote),
      aggregate: jest.fn().mockResolvedValue({ _sum: { total: "0.0000" } }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ ...debitNote, status: PurchaseDebitNoteStatus.FINALIZED, journalEntryId: "journal-existing" }),
      update: jest.fn().mockResolvedValue({ ...debitNote, status: PurchaseDebitNoteStatus.FINALIZED, journalEntryId: "journal-1" }),
    },
    purchaseBill: {
      findFirst: jest.fn().mockResolvedValue({ id: "bill-1", supplierId: "supplier-1", status: PurchaseBillStatus.FINALIZED, total: "115.0000" }),
    },
    account: {
      findFirst: jest.fn(({ where }: { where: { code: string } }) => Promise.resolve({ id: where.code === "210" ? "ap" : "vat-receivable" })),
    },
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: "journal-1" }),
    },
  };
}

function makeApplyTransactionMock(
  options: { debitNoteStatus?: PurchaseDebitNoteStatus; debitNoteUnappliedAmount?: string; billBalanceDue?: string } = {},
) {
  return {
    purchaseDebitNote: {
      findFirst: jest.fn().mockResolvedValue({
        id: "debit-note-1",
        supplierId: "supplier-1",
        status: options.debitNoteStatus ?? PurchaseDebitNoteStatus.FINALIZED,
        total: "100.0000",
        unappliedAmount: options.debitNoteUnappliedAmount ?? "50.0000",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "debit-note-1", status: PurchaseDebitNoteStatus.FINALIZED }),
    },
    purchaseBill: {
      findFirst: jest.fn().mockResolvedValue({
        id: "bill-1",
        supplierId: "supplier-1",
        status: PurchaseBillStatus.FINALIZED,
        balanceDue: options.billBalanceDue ?? "75.0000",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    purchaseDebitNoteAllocation: {
      create: jest.fn().mockResolvedValue({ id: "allocation-1" }),
    },
    journalEntry: { create: jest.fn() },
  };
}

function makeReverseTransactionMock(options: { reversedAt?: Date | null } = {}) {
  return {
    purchaseDebitNoteAllocation: {
      findFirst: jest.fn().mockResolvedValue({
        id: "allocation-1",
        debitNoteId: "debit-note-1",
        billId: "bill-1",
        amountApplied: "25.0000",
        reversedAt: options.reversedAt ?? null,
        debitNote: {
          id: "debit-note-1",
          status: PurchaseDebitNoteStatus.FINALIZED,
          total: "100.0000",
          unappliedAmount: "25.0000",
        },
        bill: {
          id: "bill-1",
          status: PurchaseBillStatus.FINALIZED,
          total: "100.0000",
          balanceDue: "50.0000",
        },
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    purchaseDebitNote: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "debit-note-1", status: PurchaseDebitNoteStatus.FINALIZED }),
    },
    purchaseBill: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
}

function makeVoidTransactionMock(options: { activeAllocationCount?: number } = {}) {
  return {
    purchaseDebitNote: {
      findFirst: jest.fn().mockResolvedValue({
        id: "debit-note-1",
        status: PurchaseDebitNoteStatus.FINALIZED,
        journalEntryId: "journal-1",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "debit-note-1", status: PurchaseDebitNoteStatus.VOIDED }),
      update: jest.fn().mockResolvedValue({ id: "debit-note-1", status: PurchaseDebitNoteStatus.VOIDED, reversalJournalEntryId: "reversal-1" }),
    },
    purchaseDebitNoteAllocation: {
      count: jest.fn().mockResolvedValue(options.activeAllocationCount ?? 0),
    },
    journalEntry: {
      findFirst: jest.fn().mockResolvedValue({
        id: "journal-1",
        entryNumber: "JE-000001",
        reference: "PDN-000001",
        currency: "SAR",
        description: "Purchase debit note PDN-000001",
        reversedBy: null,
        lines: [
          { accountId: "ap", debit: "100.0000", credit: "0.0000", description: "AP", currency: "SAR", exchangeRate: "1", taxRateId: null },
          { accountId: "expense", debit: "0.0000", credit: "100.0000", description: "Expense", currency: "SAR", exchangeRate: "1", taxRateId: null },
        ],
      }),
      create: jest.fn().mockResolvedValue({ id: "reversal-1" }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}
