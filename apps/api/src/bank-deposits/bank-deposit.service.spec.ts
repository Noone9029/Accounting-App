import {
  AccountType,
  BankAccountStatus,
  BankDepositBatchLineSourceType,
  BankDepositBatchStatus,
  BankStatementMatchType,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  CustomerPaymentStatus,
  Prisma,
} from "@prisma/client";
import { BankDepositService } from "./bank-deposit.service";

describe("BankDepositService", () => {
  const profile = {
    id: "bank-1",
    organizationId: "org-1",
    accountId: "cash-bank-account",
    displayName: "Main bank",
    status: BankAccountStatus.ACTIVE,
    currency: "SAR",
    account: { id: "cash-bank-account", type: AccountType.ASSET, allowPosting: true, isActive: true },
  };

  function batch(overrides: Record<string, unknown> = {}) {
    return {
      id: "dep-1",
      organizationId: "org-1",
      bankAccountProfileId: "bank-1",
      depositDate: new Date("2026-06-10T00:00:00.000Z"),
      currency: "SAR",
      status: BankDepositBatchStatus.DRAFT,
      memo: null,
      totalAmount: new Prisma.Decimal("0.0000"),
      statementTransactionId: null,
      createdById: "user-1",
      updatedById: "user-1",
      postedAt: null,
      matchedAt: null,
      voidedAt: null,
      createdAt: new Date("2026-06-10T00:00:00.000Z"),
      updatedAt: new Date("2026-06-10T00:00:00.000Z"),
      bankAccountProfile: profile,
      statementTransaction: null,
      createdBy: null,
      updatedBy: null,
      lines: [],
      ...overrides,
    } as any;
  }

  function statement(overrides: Record<string, unknown> = {}) {
    return {
      id: "stmt-1",
      organizationId: "org-1",
      bankAccountProfileId: "bank-1",
      transactionDate: new Date("2026-06-10T00:00:00.000Z"),
      description: "Grouped deposit",
      reference: "DEP",
      type: BankStatementTransactionType.CREDIT,
      amount: new Prisma.Decimal("300.0000"),
      status: BankStatementTransactionStatus.UNMATCHED,
      bankAccountProfile: { id: "bank-1", currency: "SAR" },
      ...overrides,
    } as any;
  }

  function makeService() {
    const prisma = {
      bankAccountProfile: { findFirst: jest.fn().mockResolvedValue(profile) },
      bankDepositBatch: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(batch()),
        create: jest.fn().mockResolvedValue(batch()),
        update: jest.fn().mockResolvedValue(batch()),
      },
      bankDepositBatchLine: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        delete: jest.fn(),
      },
      bankStatementTransaction: {
        findMany: jest.fn().mockResolvedValue([statement()]),
        findFirst: jest.fn().mockResolvedValue(statement()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
      bankReconciliation: { findFirst: jest.fn().mockResolvedValue(null) },
      customerPayment: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({
          id: "pay-1",
          organizationId: "org-1",
          paymentNumber: "PAY-1",
          status: CustomerPaymentStatus.POSTED,
          voidReversalJournalEntryId: null,
          currency: "SAR",
          amountReceived: new Prisma.Decimal("300.0000"),
          customer: { name: "Customer A", displayName: "Customer A" },
        }),
      },
      $transaction: jest.fn((callback: (tx: any) => unknown) => callback(prisma)),
    } as any;
    const auditLogService = { log: jest.fn() } as any;
    return { service: new BankDepositService(prisma, auditLogService), prisma, auditLogService };
  }

  it("creates draft deposit batches with selected bank account currency", async () => {
    const { service, prisma } = makeService();

    await expect(
      service.create("org-1", "user-1", {
        bankAccountProfileId: "bank-1",
        depositDate: "2026-06-10",
        currency: "SAR",
        memo: "Cash drawer deposit",
      }),
    ).resolves.toMatchObject({ id: "dep-1", status: BankDepositBatchStatus.DRAFT });

    expect(prisma.bankDepositBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          bankAccountProfileId: "bank-1",
          currency: "SAR",
          status: BankDepositBatchStatus.DRAFT,
          totalAmount: "0.0000",
        }),
      }),
    );
  });

  it("adds manual lines and recalculates totals without posting a journal", async () => {
    const { service, prisma } = makeService();
    prisma.bankDepositBatchLine.findMany.mockResolvedValue([{ amount: new Prisma.Decimal("125.0000") }, { amount: new Prisma.Decimal("175.0000") }]);
    prisma.bankDepositBatch.update.mockResolvedValue(batch({ totalAmount: new Prisma.Decimal("300.0000") }));

    await expect(
      service.addLine("org-1", "user-1", "dep-1", {
        sourceType: BankDepositBatchLineSourceType.MANUAL_CASH_RECEIPT,
        amount: "125.0000",
        currency: "SAR",
        reference: "CASH-1",
      }),
    ).resolves.toMatchObject({ totalAmount: new Prisma.Decimal("300.0000") });

    expect(prisma.bankDepositBatchLine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: BankDepositBatchLineSourceType.MANUAL_CASH_RECEIPT,
          amount: "125.0000",
          currency: "SAR",
        }),
      }),
    );
    expect(prisma.bankDepositBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalAmount: "300.0000" }) }),
    );
  });

  it("validates positive amounts, currency, and source reuse", async () => {
    const { service, prisma } = makeService();
    await expect(
      service.addLine("org-1", "user-1", "dep-1", {
        sourceType: BankDepositBatchLineSourceType.MANUAL_CASH_RECEIPT,
        amount: "0",
        currency: "SAR",
      }),
    ).rejects.toThrow("Deposit line amount must be greater than zero.");

    await expect(
      service.addLine("org-1", "user-1", "dep-1", {
        sourceType: BankDepositBatchLineSourceType.MANUAL_CASH_RECEIPT,
        amount: "10.0000",
        currency: "USD",
      }),
    ).rejects.toThrow("Deposit line currency must match the batch currency.");

    prisma.bankDepositBatchLine.findFirst.mockResolvedValueOnce({ id: "line-used" });
    await expect(
      service.addLine("org-1", "user-1", "dep-1", {
        sourceType: BankDepositBatchLineSourceType.CUSTOMER_PAYMENT,
        sourceId: "pay-1",
        amount: "300.0000",
        currency: "SAR",
      }),
    ).rejects.toThrow("Deposit source is already linked to an active deposit batch.");
  });

  it("posts only a non-empty draft batch as operational status", async () => {
    const { service, prisma } = makeService();
    prisma.bankDepositBatch.findFirst.mockResolvedValueOnce(batch({ totalAmount: new Prisma.Decimal("300.0000"), lines: [{ id: "line-1" }] }));
    prisma.bankDepositBatch.update.mockResolvedValueOnce(batch({ status: BankDepositBatchStatus.POSTED, totalAmount: new Prisma.Decimal("300.0000") }));

    await expect(service.post("org-1", "user-1", "dep-1")).resolves.toMatchObject({ status: BankDepositBatchStatus.POSTED });
    expect(prisma.bankDepositBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BankDepositBatchStatus.POSTED }),
      }),
    );
  });

  it("finds same-account credit statement match candidates for posted deposits", async () => {
    const { service, prisma } = makeService();
    prisma.bankDepositBatch.findFirst.mockResolvedValueOnce(
      batch({ status: BankDepositBatchStatus.POSTED, totalAmount: new Prisma.Decimal("300.0000") }),
    );

    await expect(service.matchCandidates("org-1", "dep-1")).resolves.toHaveLength(1);
    expect(prisma.bankStatementTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bankAccountProfileId: "bank-1",
          status: BankStatementTransactionStatus.UNMATCHED,
          type: BankStatementTransactionType.CREDIT,
          amount: "300.0000",
        }),
      }),
    );
  });

  it("blocks debit, wrong-account, amount mismatch, and closed-period matches", async () => {
    const { service, prisma } = makeService();
    prisma.bankDepositBatch.findFirst.mockResolvedValue(batch({ status: BankDepositBatchStatus.POSTED, totalAmount: new Prisma.Decimal("300.0000") }));

    prisma.bankStatementTransaction.findFirst.mockResolvedValueOnce(statement({ type: BankStatementTransactionType.DEBIT }));
    await expect(service.matchStatementTransaction("org-1", "user-1", "dep-1", { statementTransactionId: "stmt-1" })).rejects.toThrow(
      "Deposit batch can only match a credit statement row.",
    );

    prisma.bankStatementTransaction.findFirst.mockResolvedValueOnce(statement({ bankAccountProfileId: "other-bank" }));
    await expect(service.matchStatementTransaction("org-1", "user-1", "dep-1", { statementTransactionId: "stmt-1" })).rejects.toThrow(
      "Deposit batch can only match statement rows from the same bank account.",
    );

    prisma.bankStatementTransaction.findFirst.mockResolvedValueOnce(statement({ amount: new Prisma.Decimal("299.0000") }));
    await expect(service.matchStatementTransaction("org-1", "user-1", "dep-1", { statementTransactionId: "stmt-1" })).rejects.toThrow(
      "Deposit batch total must match the statement row amount.",
    );

    prisma.bankReconciliation.findFirst.mockResolvedValueOnce({ id: "rec-1", reconciliationNumber: "REC-1" });
    prisma.bankStatementTransaction.findFirst.mockResolvedValueOnce(statement());
    await expect(service.matchStatementTransaction("org-1", "user-1", "dep-1", { statementTransactionId: "stmt-1" })).rejects.toThrow(
      "Statement transaction belongs to closed reconciliation REC-1.",
    );
  });

  it("explicitly matches and unmatches a posted deposit batch", async () => {
    const { service, prisma } = makeService();
    prisma.bankDepositBatch.findFirst
      .mockResolvedValueOnce(batch({ status: BankDepositBatchStatus.POSTED, totalAmount: new Prisma.Decimal("300.0000") }))
      .mockResolvedValueOnce(
        batch({
          status: BankDepositBatchStatus.MATCHED,
          totalAmount: new Prisma.Decimal("300.0000"),
          statementTransactionId: "stmt-1",
          statementTransaction: statement({ status: BankStatementTransactionStatus.MATCHED, matchType: BankStatementMatchType.OTHER }),
        }),
      );
    prisma.bankDepositBatch.update
      .mockResolvedValueOnce(batch({ status: BankDepositBatchStatus.MATCHED, statementTransactionId: "stmt-1" }))
      .mockResolvedValueOnce(batch({ status: BankDepositBatchStatus.POSTED, statementTransactionId: null }));

    await expect(service.matchStatementTransaction("org-1", "user-1", "dep-1", { statementTransactionId: "stmt-1" })).resolves.toMatchObject({
      status: BankDepositBatchStatus.MATCHED,
    });
    expect(prisma.bankStatementTransaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BankStatementTransactionStatus.MATCHED, matchType: BankStatementMatchType.OTHER }),
      }),
    );

    await expect(service.unmatchStatementTransaction("org-1", "user-1", "dep-1")).resolves.toMatchObject({
      status: BankDepositBatchStatus.POSTED,
    });
    expect(prisma.bankStatementTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BankStatementTransactionStatus.UNMATCHED, matchType: null }),
      }),
    );
  });

  it("enforces organization scoping by lookup predicates", async () => {
    const { service, prisma } = makeService();
    prisma.bankDepositBatch.findFirst.mockResolvedValueOnce(null);

    await expect(service.get("other-org", "dep-1")).rejects.toThrow("Bank deposit batch not found.");
    expect(prisma.bankDepositBatch.findFirst).toHaveBeenCalledWith({
      where: { id: "dep-1", organizationId: "other-org" },
      include: expect.any(Object),
    });
  });
});
