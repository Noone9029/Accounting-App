import { ConflictException, NotFoundException } from "@nestjs/common";
import { CurrencyRateSource, RecurringExpenseProposalStatus } from "@prisma/client";
import { RecurringExpenseProposalService } from "./recurring-expense-proposal.service";

function makeHarness() {
  const proposal = {
    id: "proposal-1",
    organizationId: "org-1",
    status: RecurringExpenseProposalStatus.DRAFT,
    proposedDate: new Date("2026-07-12T00:00:00.000Z"),
    contactId: "supplier-1",
    branchId: "branch-1",
    paidThroughAccountId: "bank-1",
    currency: "USD",
    baseCurrency: "AED",
    exchangeRate: "3.67250000",
    rateDate: new Date("2026-07-12T00:00:00.000Z"),
    rateSource: CurrencyRateSource.MANUAL,
    rateSnapshotId: null,
    description: "Monthly expense",
    notes: "Review first",
    reviewIdempotencyKey: null,
    reviewedCashExpenseId: null,
    reviewedCashExpense: null,
    lines: [{
      itemId: "item-1",
      accountId: "expense-1",
      taxRateId: "tax-1",
      costCenterId: "cost-1",
      projectId: "project-1",
      description: "Software",
      quantity: "1.0000",
      unitPrice: "100.0000",
      discountRate: "0.0000",
      sortOrder: 0,
    }],
  };
  const reviewed = {
    ...proposal,
    status: RecurringExpenseProposalStatus.REVIEWED,
    reviewIdempotencyKey: "review-key",
    reviewedCashExpenseId: "expense-1",
    reviewedCashExpense: { id: "expense-1", status: "POSTED" },
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: "proposal-1" }]),
    recurringExpenseProposal: {
      findFirst: jest.fn().mockResolvedValue(proposal),
      update: jest.fn().mockResolvedValue(reviewed),
    },
  };
  const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
  const cashExpenses = { createPostedInTransaction: jest.fn().mockResolvedValue({ id: "expense-1", status: "POSTED" }) };
  const auditLog = { log: jest.fn() };
  const service = new RecurringExpenseProposalService(prisma as never, cashExpenses as never, auditLog as never);
  return { service, prisma, tx, cashExpenses, auditLog, proposal, reviewed };
}

describe("RecurringExpenseProposalService", () => {
  it("reviews a proposal idempotently through the normal posted expense workflow", async () => {
    const { service, tx, cashExpenses, auditLog, reviewed } = makeHarness();

    await expect(service.review("org-1", "user-1", "proposal-1", "review-key")).resolves.toBe(reviewed);
    expect(cashExpenses.createPostedInTransaction).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      expect.objectContaining({
        contactId: "supplier-1",
        branchId: "branch-1",
        expenseDate: "2026-07-12",
        paidThroughAccountId: "bank-1",
        currency: "USD",
        exchangeRate: "3.67250000",
        rateDate: "2026-07-12",
        rateSource: CurrencyRateSource.MANUAL,
        lines: [expect.objectContaining({ costCenterId: "cost-1", projectId: "project-1" })],
      }),
      tx,
    );
    expect(tx.recurringExpenseProposal.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: RecurringExpenseProposalStatus.REVIEWED,
        reviewIdempotencyKey: "review-key",
        reviewedCashExpenseId: "expense-1",
        reviewedByUserId: "user-1",
      }),
    }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REVIEW" }), tx);
  });

  it("returns the prior reviewed result for the same idempotency key without another expense", async () => {
    const { service, tx, cashExpenses, reviewed } = makeHarness();
    tx.recurringExpenseProposal.findFirst.mockResolvedValue(reviewed);

    await expect(service.review("org-1", "user-1", "proposal-1", "review-key")).resolves.toBe(reviewed);
    expect(cashExpenses.createPostedInTransaction).not.toHaveBeenCalled();
    expect(tx.recurringExpenseProposal.update).not.toHaveBeenCalled();
  });

  it("rejects a different key after review and hides cross-tenant proposals", async () => {
    const { service, tx, reviewed } = makeHarness();
    tx.recurringExpenseProposal.findFirst.mockResolvedValueOnce(reviewed);
    await expect(service.review("org-1", "user-1", "proposal-1", "other-key")).rejects.toBeInstanceOf(ConflictException);

    tx.$queryRaw.mockResolvedValueOnce([]);
    await expect(service.review("org-other", "user-1", "proposal-1", "review-key")).rejects.toBeInstanceOf(NotFoundException);
  });
});
