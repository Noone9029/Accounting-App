import {
  AccountType,
  InventoryVarianceProposalAction,
  InventoryVarianceProposalSourceType,
  InventoryVarianceProposalStatus,
  InventoryVarianceReason,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
} from "@prisma/client";
import { InventoryVarianceProposalService } from "./inventory-variance-proposal.service";

describe("InventoryVarianceProposalService", () => {
  const debitAccount = account("loss-1", "615", "Inventory Variance Loss", AccountType.EXPENSE);
  const creditAccount = account("clearing-1", "240", "Inventory Clearing", AccountType.LIABILITY);
  const gainAccount = account("gain-1", "490", "Inventory Variance Gain", AccountType.REVENUE);
  const supplier = { id: "supplier-1", name: "Supplier", displayName: "Supplier Co" };
  const purchaseBill = {
    id: "bill-1",
    billNumber: "BILL-000001",
    billDate: new Date("2026-05-01T00:00:00.000Z"),
    status: "FINALIZED",
    inventoryPostingMode: "INVENTORY_CLEARING",
    total: new Prisma.Decimal("10.0000"),
    currency: "SAR",
  };
  const purchaseReceipt = {
    id: "receipt-1",
    receiptNumber: "PRC-000001",
    receiptDate: new Date("2026-05-02T00:00:00.000Z"),
    status: "POSTED",
    inventoryAssetJournalEntryId: "journal-receipt-1",
    inventoryAssetReversalJournalEntryId: null,
  };

  function proposal(overrides: Record<string, unknown> = {}) {
    return {
      id: "proposal-1",
      organizationId: "org-1",
      proposalNumber: "IVP-000001",
      sourceType: InventoryVarianceProposalSourceType.CLEARING_VARIANCE,
      reason: InventoryVarianceReason.PRICE_DIFFERENCE,
      status: InventoryVarianceProposalStatus.DRAFT,
      purchaseBillId: purchaseBill.id,
      purchaseReceiptId: purchaseReceipt.id,
      supplierId: supplier.id,
      proposalDate: new Date("2026-05-03T00:00:00.000Z"),
      amount: new Prisma.Decimal("2.0000"),
      description: "Inventory clearing variance",
      debitAccountId: debitAccount.id,
      creditAccountId: creditAccount.id,
      createdById: "user-1",
      submittedById: null,
      approvedById: null,
      postedById: null,
      reversedById: null,
      voidedById: null,
      submittedAt: null,
      approvedAt: null,
      postedAt: null,
      reversedAt: null,
      voidedAt: null,
      journalEntryId: null,
      reversalJournalEntryId: null,
      approvalNotes: null,
      reversalReason: null,
      voidReason: null,
      createdAt: new Date("2026-05-03T00:00:00.000Z"),
      updatedAt: new Date("2026-05-03T00:00:00.000Z"),
      purchaseBill,
      purchaseReceipt,
      supplier,
      debitAccount,
      creditAccount,
      createdBy: null,
      submittedBy: null,
      approvedBy: null,
      postedBy: null,
      reversedBy: null,
      voidedBy: null,
      journalEntry: null,
      reversalJournalEntry: null,
      ...overrides,
    };
  }

  function makeService(overrides: Record<string, unknown> = {}) {
    const tx = makeTx();
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      inventoryVarianceProposal: {
        findMany: jest.fn().mockResolvedValue([proposal()]),
        findFirst: jest.fn().mockResolvedValue(proposal()),
      },
      inventoryVarianceProposalEvent: { findMany: jest.fn().mockResolvedValue([]) },
      inventorySettings: {
        findUnique: jest.fn().mockResolvedValue({
          enableInventoryAccounting: true,
          inventoryClearingAccount: creditAccount,
          inventoryAdjustmentGainAccount: gainAccount,
          inventoryAdjustmentLossAccount: debitAccount,
        }),
      },
      account: { findFirst: jest.fn().mockResolvedValue(debitAccount) },
      journalEntry: { create: jest.fn() },
      ...overrides,
    };
    const audit = { log: jest.fn() };
    const numbers = {
      next: jest.fn((_organizationId: string, scope: NumberSequenceScope) =>
        Promise.resolve(scope === NumberSequenceScope.JOURNAL_ENTRY ? "JE-000001" : "IVP-000001"),
      ),
    };
    const reports = {
      clearingVarianceReport: jest.fn().mockResolvedValue({
        rows: [
          {
            status: "VARIANCE",
            purchaseBill,
            receipt: purchaseReceipt,
            supplier,
            varianceAmount: "2.0000",
            varianceReason: "Inventory clearing debit and receipt clearing credit do not match.",
            recommendedAction: "Review unit cost difference between bill and receipt.",
            warnings: [],
          },
        ],
      }),
      clearingReconciliationReport: jest.fn().mockResolvedValue({
        rows: [
          {
            status: "VARIANCE",
            purchaseBill,
            receipts: [purchaseReceipt],
            netClearingDifference: "2.0000",
          },
        ],
      }),
    };
    const fiscal = { assertPostingDateAllowed: jest.fn() };
    return {
      service: new InventoryVarianceProposalService(prisma as never, audit as never, numbers as never, reports as never, fiscal as never),
      prisma,
      tx,
      audit,
      numbers,
      reports,
      fiscal,
    };
  }

  function makeTx(overrides: Record<string, unknown> = {}) {
    return {
      inventoryVarianceProposal: {
        create: jest.fn().mockResolvedValue(proposal()),
        update: jest.fn().mockResolvedValue(proposal({ status: InventoryVarianceProposalStatus.PENDING_APPROVAL })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(proposal()),
        findUniqueOrThrow: jest.fn().mockResolvedValue(proposal({ status: InventoryVarianceProposalStatus.POSTED, journalEntryId: "journal-1" })),
      },
      inventoryVarianceProposalEvent: { create: jest.fn().mockResolvedValue({ id: "event-1" }) },
      account: { findFirst: jest.fn().mockResolvedValue(debitAccount) },
      journalEntry: {
        create: jest.fn().mockResolvedValue({ id: "journal-1", entryNumber: "JE-000001" }),
        update: jest.fn().mockResolvedValue({ id: "journal-1" }),
      },
      ...overrides,
    };
  }

  it("creates a draft proposal from a clearing variance without creating a journal", async () => {
    const { service, tx, reports, numbers } = makeService();

    const created = await service.createFromClearingVariance("org-1", "user-1", {
      purchaseBillId: purchaseBill.id,
      purchaseReceiptId: purchaseReceipt.id,
      reason: InventoryVarianceReason.PRICE_DIFFERENCE,
    });

    expect(created).toMatchObject({ proposalNumber: "IVP-000001", status: InventoryVarianceProposalStatus.DRAFT });
    expect(reports.clearingVarianceReport).toHaveBeenCalledWith("org-1", {
      purchaseBillId: purchaseBill.id,
      purchaseReceiptId: purchaseReceipt.id,
    });
    expect(numbers.next).toHaveBeenCalledWith("org-1", NumberSequenceScope.INVENTORY_VARIANCE_PROPOSAL, tx);
    expect(tx.inventoryVarianceProposal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: "2.0000",
          debitAccountId: debitAccount.id,
          creditAccountId: creditAccount.id,
        }),
      }),
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.inventoryVarianceProposalEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: InventoryVarianceProposalAction.CREATE }) }),
    );
  });

  it("rejects clearing variance proposal creation when no variance exists", async () => {
    const { service, reports } = makeService();
    reports.clearingVarianceReport.mockResolvedValueOnce({ rows: [] });

    await expect(
      service.createFromClearingVariance("org-1", "user-1", {
        purchaseBillId: purchaseBill.id,
        reason: InventoryVarianceReason.PRICE_DIFFERENCE,
      }),
    ).rejects.toThrow("No clearing variance found for the selected source.");
  });

  it("validates manual proposal amount and account pair", async () => {
    const { service } = makeService();

    await expect(
      service.createManual("org-1", "user-1", {
        reason: InventoryVarianceReason.MANUAL_ADJUSTMENT,
        proposalDate: "2026-05-03",
        amount: "0",
        debitAccountId: debitAccount.id,
        creditAccountId: creditAccount.id,
      }),
    ).rejects.toThrow("Variance proposal amount must be greater than zero.");
    await expect(
      service.createManual("org-1", "user-1", {
        reason: InventoryVarianceReason.MANUAL_ADJUSTMENT,
        proposalDate: "2026-05-03",
        amount: "2.0000",
        debitAccountId: debitAccount.id,
        creditAccountId: debitAccount.id,
      }),
    ).rejects.toThrow("Debit and credit accounts must be different.");
  });

  it("submits and approves proposals with events", async () => {
    const tx = makeTx({
      inventoryVarianceProposal: {
        ...makeTx().inventoryVarianceProposal,
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(proposal({ status: InventoryVarianceProposalStatus.DRAFT }))
          .mockResolvedValueOnce(proposal({ status: InventoryVarianceProposalStatus.PENDING_APPROVAL })),
        update: jest
          .fn()
          .mockResolvedValueOnce(proposal({ status: InventoryVarianceProposalStatus.PENDING_APPROVAL }))
          .mockResolvedValueOnce(proposal({ status: InventoryVarianceProposalStatus.APPROVED })),
      },
    });
    const { service } = makeService({
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      inventoryVarianceProposal: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(proposal({ status: InventoryVarianceProposalStatus.DRAFT }))
          .mockResolvedValueOnce(proposal({ status: InventoryVarianceProposalStatus.PENDING_APPROVAL })),
      },
    });

    await service.submit("org-1", "user-1", "proposal-1", { notes: "Ready" });
    await service.approve("org-1", "user-2", "proposal-1", { approvalNotes: "Approved" });

    expect(tx.inventoryVarianceProposalEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: InventoryVarianceProposalAction.SUBMIT }) }),
    );
    expect(tx.inventoryVarianceProposalEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: InventoryVarianceProposalAction.APPROVE }) }),
    );
  });

  it("returns posting preview without creating a journal", async () => {
    const { service, prisma } = makeService({
      inventoryVarianceProposal: {
        findFirst: jest.fn().mockResolvedValue(proposal({ status: InventoryVarianceProposalStatus.APPROVED })),
      },
      journalEntry: { create: jest.fn() },
    });

    const preview = await service.accountingPreview("org-1", "proposal-1");

    expect(preview).toMatchObject({
      canPost: true,
      amount: "2.0000",
      journalEntryId: null,
      journal: expect.objectContaining({ totalDebit: "2.0000", totalCredit: "2.0000" }),
    });
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  it("posts an approved proposal into a balanced journal", async () => {
    const approved = proposal({ status: InventoryVarianceProposalStatus.APPROVED });
    const tx = makeTx({
      inventoryVarianceProposal: {
        ...makeTx().inventoryVarianceProposal,
        findFirst: jest.fn().mockResolvedValue(approved),
      },
    });
    const { service, fiscal } = makeService({
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      inventoryVarianceProposal: { findFirst: jest.fn().mockResolvedValue(approved) },
    });

    await service.post("org-1", "user-1", "proposal-1");

    expect(fiscal.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", approved.proposalDate, tx);
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          totalDebit: "2.0000",
          totalCredit: "2.0000",
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ debit: "2.0000", credit: "0" }),
              expect.objectContaining({ debit: "0", credit: "2.0000" }),
            ]),
          }),
        }),
      }),
    );
    expect(tx.inventoryVarianceProposal.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: InventoryVarianceProposalStatus.APPROVED, journalEntryId: null }),
      }),
    );
  });

  it("rejects posting twice", async () => {
    const alreadyPosted = proposal({ status: InventoryVarianceProposalStatus.APPROVED, journalEntryId: "journal-1" });
    const tx = makeTx({
      inventoryVarianceProposal: {
        ...makeTx().inventoryVarianceProposal,
        findFirst: jest.fn().mockResolvedValue(alreadyPosted),
      },
    });
    const { service } = makeService({
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      inventoryVarianceProposal: { findFirst: jest.fn().mockResolvedValue(alreadyPosted) },
    });

    await expect(service.post("org-1", "user-1", "proposal-1")).rejects.toThrow("Variance proposal has already been posted.");
  });

  it("reverses a posted proposal journal once", async () => {
    const posted = proposal({
      status: InventoryVarianceProposalStatus.POSTED,
      journalEntryId: "journal-1",
      journalEntry: {
        id: "journal-1",
        entryNumber: "JE-000001",
        status: JournalEntryStatus.POSTED,
        currency: "SAR",
        reversedBy: null,
        lines: [
          { accountId: debitAccount.id, debit: new Prisma.Decimal("2.0000"), credit: new Prisma.Decimal("0.0000"), description: "Loss", currency: "SAR", exchangeRate: new Prisma.Decimal("1") },
          { accountId: creditAccount.id, debit: new Prisma.Decimal("0.0000"), credit: new Prisma.Decimal("2.0000"), description: "Clearing", currency: "SAR", exchangeRate: new Prisma.Decimal("1") },
        ],
      },
    });
    const tx = makeTx({
      inventoryVarianceProposal: {
        ...makeTx().inventoryVarianceProposal,
        findFirst: jest.fn().mockResolvedValue(posted),
      },
    });
    const { service, fiscal } = makeService({
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      inventoryVarianceProposal: { findFirst: jest.fn().mockResolvedValue(posted) },
    });

    await service.reverse("org-1", "user-1", "proposal-1", { reason: "Reviewed" });

    expect(fiscal.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", expect.any(Date), tx);
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reversalOfId: "journal-1",
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ account: { connect: { id: debitAccount.id } }, debit: "0.0000", credit: "2.0000" }),
              expect.objectContaining({ account: { connect: { id: creditAccount.id } }, debit: "2.0000", credit: "0.0000" }),
            ]),
          }),
        }),
      }),
    );
    expect(tx.inventoryVarianceProposal.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InventoryVarianceProposalStatus.REVERSED }),
      }),
    );
  });

  it("rejects voiding posted proposals until reversed", async () => {
    const posted = proposal({ status: InventoryVarianceProposalStatus.POSTED, journalEntryId: "journal-1" });
    const { service } = makeService({ inventoryVarianceProposal: { findFirst: jest.fn().mockResolvedValue(posted) } });

    await expect(service.void("org-1", "user-1", "proposal-1", { reason: "Cancel" })).rejects.toThrow(
      "Reverse variance proposal journal before voiding this proposal.",
    );
  });

  it("scopes proposal lookup by organization", async () => {
    const { service, prisma } = makeService();

    await service.get("org-2", "proposal-1");

    expect(prisma.inventoryVarianceProposal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "proposal-1", organizationId: "org-2" } }),
    );
  });
});

function account(id: string, code: string, name: string, type: AccountType) {
  return { id, code, name, type, allowPosting: true, isActive: true };
}
