import {
  AccountType,
  BankAccountStatus,
  BankAccountType,
  BankReconciliationStatus,
  BankStatementImportStatus,
  BankStatementMatchType,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  JournalEntryStatus,
  Prisma,
} from "@prisma/client";
import { BankStatementService } from "./bank-statement.service";

describe("BankStatementService", () => {
  const account = {
    id: "bank-account",
    code: "112",
    name: "Bank Account",
    type: AccountType.ASSET,
    allowPosting: true,
    isActive: true,
  };
  const profile = {
    id: "profile-1",
    organizationId: "org-1",
    accountId: account.id,
    type: BankAccountType.BANK,
    status: BankAccountStatus.ACTIVE,
    displayName: "Operating Bank",
    currency: "SAR",
    account,
  };
  const statementTransaction = {
    id: "statement-transaction-1",
    organizationId: "org-1",
    importId: "import-1",
    bankAccountProfileId: profile.id,
    transactionDate: new Date("2026-05-13T00:00:00.000Z"),
    description: "Customer receipt",
    reference: "PAY-1",
    type: BankStatementTransactionType.CREDIT,
    amount: new Prisma.Decimal("50.0000"),
    status: BankStatementTransactionStatus.UNMATCHED,
    bankAccountProfile: profile,
  };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      bankAccountProfile: { findFirst: jest.fn().mockResolvedValue(profile) },
      bankStatementImport: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: "import-1", status: BankStatementImportStatus.IMPORTED }),
        update: jest.fn().mockResolvedValue({ id: "import-1", status: BankStatementImportStatus.RECONCILED }),
      },
      bankStatementTransaction: {
        findFirst: jest.fn().mockResolvedValue(statementTransaction),
        findMany: jest.fn().mockResolvedValue([{ status: BankStatementTransactionStatus.MATCHED }]),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn(),
      },
      bankReconciliation: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
      },
      journalLine: { findMany: jest.fn(), findFirst: jest.fn() },
      $transaction: jest.fn(),
    } as any;
    Object.assign(prisma, overrides);
    if (overrides.$transaction === undefined) {
      prisma.$transaction = jest.fn((callback: (client: Record<string, unknown>) => Promise<unknown>) => callback(prisma));
    }
    const audit = { log: jest.fn() };
    const numbers = { next: jest.fn().mockResolvedValue("JE-000001") };
    const fiscal = { assertPostingDateAllowed: jest.fn() };
    return { service: new BankStatementService(prisma as never, audit as never, numbers as never, fiscal as never), prisma, audit, numbers, fiscal };
  }

  it("imports a statement batch and normalizes debit and credit rows without posting journals", async () => {
    const createdImport = { id: "import-1", rowCount: 2, status: BankStatementImportStatus.IMPORTED };
    const tx = {
      bankStatementImport: { create: jest.fn().mockResolvedValue(createdImport) },
    };
    const { service, prisma, audit } = makeService({
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    });

    await expect(
      service.importStatement("org-1", "user-1", "profile-1", {
        filename: "bank.csv",
        rows: [
          { date: "2026-05-13", description: "Receipt", reference: "PAY-1", debit: "0.0000", credit: "50.0000" },
          { date: "2026-05-14", description: "Fee", reference: "FEE-1", debit: "5.0000", credit: "0.0000" },
        ],
        closingStatementBalance: "45.0000",
      }),
    ).resolves.toEqual(createdImport);

    expect(tx.bankStatementImport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          bankAccountProfileId: "profile-1",
          rowCount: 2,
          transactions: {
            create: [
              expect.objectContaining({ type: BankStatementTransactionType.CREDIT, amount: "50.0000" }),
              expect.objectContaining({ type: BankStatementTransactionType.DEBIT, amount: "5.0000" }),
            ],
          },
        }),
      }),
    );
    expect(prisma.journalLine.findMany).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "IMPORT", entityType: "BankStatementImport" }));
  });

  it("rejects bad import rows before creating the batch", async () => {
    const { service, prisma } = makeService();

    await expect(
      service.importStatement("org-1", "user-1", "profile-1", {
        filename: "bad.csv",
        rows: [{ date: "2026-05-13", description: "Bad", debit: "1.0000", credit: "1.0000" }],
      }),
    ).rejects.toThrow("Row 1 cannot contain both debit and credit.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("finds match candidates by amount, direction, account, and date window", async () => {
    const { service, prisma } = makeService();
    prisma.journalLine.findMany.mockResolvedValue([
      {
        id: "line-1",
        debit: new Prisma.Decimal("50.0000"),
        credit: new Prisma.Decimal("0.0000"),
        description: "Customer payment",
        journalEntry: {
          id: "journal-1",
          entryNumber: "JE-000001",
          entryDate: new Date("2026-05-13T00:00:00.000Z"),
          description: "Customer payment PAY-1",
          reference: "PAY-1",
        },
      },
    ]);

    await expect(service.matchCandidates("org-1", "statement-transaction-1")).resolves.toEqual([
      expect.objectContaining({ journalLineId: "line-1", score: 100, reason: "amount and direction match, same date, reference match" }),
    ]);
    expect(prisma.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          accountId: "bank-account",
          debit: "50.0000",
          credit: "0.0000",
        }),
      }),
    );
  });

  it("manually matches an unmatched statement transaction to a compatible journal line", async () => {
    const { service, prisma, audit } = makeService();
    prisma.journalLine.findFirst.mockResolvedValue({
      id: "line-1",
      accountId: "bank-account",
      journalEntryId: "journal-1",
      debit: new Prisma.Decimal("50.0000"),
      credit: new Prisma.Decimal("0.0000"),
      journalEntry: { id: "journal-1", status: JournalEntryStatus.POSTED },
    });
    prisma.bankStatementTransaction.update.mockResolvedValue({
      ...statementTransaction,
      status: BankStatementTransactionStatus.MATCHED,
      matchedJournalLineId: "line-1",
      matchedJournalEntryId: "journal-1",
      matchType: BankStatementMatchType.JOURNAL_LINE,
    });

    await expect(
      service.matchTransaction("org-1", "user-1", "statement-transaction-1", { journalLineId: "line-1" }),
    ).resolves.toMatchObject({ status: BankStatementTransactionStatus.MATCHED, matchedJournalLineId: "line-1" });
    expect(prisma.bankStatementTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: BankStatementTransactionStatus.MATCHED,
          matchedJournalLineId: "line-1",
          matchType: BankStatementMatchType.JOURNAL_LINE,
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "MATCH", entityType: "BankStatementTransaction" }));
  });

  it("blocks manual matching inside a closed reconciliation period", async () => {
    const { service, prisma } = makeService();
    prisma.bankReconciliation.findFirst.mockResolvedValue({ id: "reconciliation-1", status: BankReconciliationStatus.CLOSED });

    await expect(
      service.matchTransaction("org-1", "user-1", "statement-transaction-1", { journalLineId: "line-1" }),
    ).rejects.toThrow("Statement transaction belongs to a closed reconciliation period.");
    expect(prisma.journalLine.findFirst).not.toHaveBeenCalled();
  });

  it("categorizes an unmatched debit by posting a balanced journal", async () => {
    const debitTransaction = { ...statementTransaction, type: BankStatementTransactionType.DEBIT, amount: new Prisma.Decimal("12.0000") };
    const tx = {
      bankStatementTransaction: {
        findFirst: jest.fn().mockResolvedValue(debitTransaction),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...debitTransaction,
          status: BankStatementTransactionStatus.CATEGORIZED,
          createdJournalEntryId: "journal-1",
        }),
      },
      account: { findFirst: jest.fn().mockResolvedValue({ id: "expense-1", code: "520", name: "Bank fees" }) },
      journalEntry: { create: jest.fn().mockResolvedValue({ id: "journal-1" }) },
      bankReconciliation: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const { service, prisma, fiscal } = makeService({
      bankStatementTransaction: { ...makeService().prisma.bankStatementTransaction, findFirst: jest.fn().mockResolvedValue(debitTransaction) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    });

    await expect(
      service.categorizeTransaction("org-1", "user-1", "statement-transaction-1", {
        accountId: "expense-1",
        description: "Bank fee",
      }),
    ).resolves.toMatchObject({ status: BankStatementTransactionStatus.CATEGORIZED, createdJournalEntryId: "journal-1" });
    expect(fiscal.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", debitTransaction.transactionDate, tx);
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          totalDebit: "12.0000",
          totalCredit: "12.0000",
          lines: {
            create: [
              expect.objectContaining({ account: { connect: { id: "expense-1" } }, debit: "12.0000", credit: "0.0000" }),
              expect.objectContaining({ account: { connect: { id: "bank-account" } }, debit: "0.0000", credit: "12.0000" }),
            ],
          },
        }),
      }),
    );
    expect(prisma.bankStatementImport.update).toHaveBeenCalled();
  });

  it("blocks categorization inside a closed reconciliation period", async () => {
    const { service, prisma } = makeService();
    prisma.bankReconciliation.findFirst.mockResolvedValue({ id: "reconciliation-1", status: BankReconciliationStatus.CLOSED });

    await expect(
      service.categorizeTransaction("org-1", "user-1", "statement-transaction-1", { accountId: "income-1" }),
    ).rejects.toThrow("Statement transaction belongs to a closed reconciliation period.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("leaves the statement unmatched when fiscal guard blocks categorization", async () => {
    const tx = {
      bankStatementTransaction: { findFirst: jest.fn().mockResolvedValue(statementTransaction), updateMany: jest.fn() },
      account: { findFirst: jest.fn().mockResolvedValue({ id: "income-1", code: "410", name: "Income" }) },
      journalEntry: { create: jest.fn() },
      bankReconciliation: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const { service, fiscal } = makeService({
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    });
    fiscal.assertPostingDateAllowed.mockRejectedValue(new Error("Posting date falls in a closed fiscal period."));

    await expect(
      service.categorizeTransaction("org-1", "user-1", "statement-transaction-1", { accountId: "income-1" }),
    ).rejects.toThrow("Posting date falls in a closed fiscal period.");
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.bankStatementTransaction.updateMany).not.toHaveBeenCalled();
  });

  it("ignores unmatched transactions without creating journals", async () => {
    const { service, prisma } = makeService();
    prisma.bankStatementTransaction.update.mockResolvedValue({
      ...statementTransaction,
      status: BankStatementTransactionStatus.IGNORED,
      ignoredReason: "Duplicate bank memo",
    });

    await expect(
      service.ignoreTransaction("org-1", "user-1", "statement-transaction-1", { reason: "Duplicate bank memo" }),
    ).resolves.toMatchObject({ status: BankStatementTransactionStatus.IGNORED, ignoredReason: "Duplicate bank memo" });
    expect(prisma.journalLine.findMany).not.toHaveBeenCalled();
  });

  it("blocks ignore inside a closed reconciliation period", async () => {
    const { service, prisma } = makeService();
    prisma.bankReconciliation.findFirst.mockResolvedValue({ id: "reconciliation-1", status: BankReconciliationStatus.CLOSED });

    await expect(
      service.ignoreTransaction("org-1", "user-1", "statement-transaction-1", { reason: "Already reviewed" }),
    ).rejects.toThrow("Statement transaction belongs to a closed reconciliation period.");
    expect(prisma.bankStatementTransaction.update).not.toHaveBeenCalled();
  });

  it("blocks voiding an import that affects a closed reconciliation period", async () => {
    const tx = {
      bankStatementTransaction: {
        findMany: jest.fn().mockResolvedValue([{ bankAccountProfileId: "profile-1", transactionDate: statementTransaction.transactionDate }]),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
      bankReconciliation: { findFirst: jest.fn().mockResolvedValue({ id: "reconciliation-1" }) },
      bankStatementImport: { update: jest.fn() },
    };
    const { service } = makeService({
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    });

    await expect(service.voidImport("org-1", "user-1", "import-1")).rejects.toThrow(
      "Statement transaction belongs to a closed reconciliation period.",
    );
    expect(tx.bankStatementTransaction.updateMany).not.toHaveBeenCalled();
  });

  it("calculates reconciliation totals and difference", async () => {
    const { service, prisma } = makeService();
    prisma.bankStatementImport.findMany.mockResolvedValue([
      {
        id: "import-1",
        filename: "bank.csv",
        status: BankStatementImportStatus.PARTIALLY_RECONCILED,
        statementStartDate: new Date("2026-05-01T00:00:00.000Z"),
        statementEndDate: new Date("2026-05-31T00:00:00.000Z"),
        importedAt: new Date("2026-05-13T00:00:00.000Z"),
        closingStatementBalance: new Prisma.Decimal("80.0000"),
      },
    ]);
    prisma.bankStatementTransaction.findMany.mockResolvedValue([
      { status: BankStatementTransactionStatus.MATCHED, type: BankStatementTransactionType.CREDIT, amount: new Prisma.Decimal("100.0000") },
      { status: BankStatementTransactionStatus.UNMATCHED, type: BankStatementTransactionType.DEBIT, amount: new Prisma.Decimal("20.0000") },
    ]);
    prisma.journalLine.findMany.mockResolvedValue([
      { debit: new Prisma.Decimal("60.0000"), credit: new Prisma.Decimal("0.0000") },
      { debit: new Prisma.Decimal("0.0000"), credit: new Prisma.Decimal("5.0000") },
    ]);
    prisma.bankReconciliation.findFirst.mockResolvedValue({
      id: "rec-1",
      reconciliationNumber: "REC-000001",
      status: BankReconciliationStatus.CLOSED,
      periodEnd: new Date("2026-05-31T23:59:59.999Z"),
    });
    prisma.bankReconciliation.count.mockResolvedValue(1);
    prisma.bankStatementTransaction.count.mockResolvedValue(2);

    await expect(service.reconciliationSummary("org-1", "profile-1", {})).resolves.toMatchObject({
      ledgerBalance: "55.0000",
      statementClosingBalance: "80.0000",
      difference: "25.0000",
      statusSuggestion: "NEEDS_REVIEW",
      latestClosedReconciliation: { reconciliationNumber: "REC-000001" },
      hasOpenDraftReconciliation: true,
      unreconciledTransactionCount: 2,
      closedThroughDate: "2026-05-31T23:59:59.999Z",
      totals: {
        credits: { count: 1, total: "100.0000" },
        debits: { count: 1, total: "20.0000" },
        matched: { count: 1, total: "100.0000" },
        unmatched: { count: 1, total: "20.0000" },
      },
    });
  });

  it("keeps tenant isolation on profile-scoped list calls", async () => {
    const { service, prisma } = makeService();
    prisma.bankAccountProfile.findFirst.mockResolvedValue(null);

    await expect(service.listTransactions("org-2", "profile-1", {})).rejects.toThrow("Bank account profile not found.");
    expect(prisma.bankAccountProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "profile-1", organizationId: "org-2" } }),
    );
  });
});
