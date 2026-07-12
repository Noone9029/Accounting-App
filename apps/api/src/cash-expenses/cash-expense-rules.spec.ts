import { assertBalancedJournal, assertJournalFxContext, calculateSalesInvoiceTotals } from "@ledgerbyte/accounting-core";
import { CashExpenseStatus, ContactType, CurrencyRateSource, JournalEntryStatus, Prisma } from "@prisma/client";
import { buildSupplierLedgerRows } from "../contacts/contact-ledger.service";
import { buildCashExpenseJournalLines } from "./cash-expense-accounting";
import { CashExpenseService } from "./cash-expense.service";

describe("cash expense rules", () => {
  it("calculates cash expense totals using invoice semantics", () => {
    const result = calculateSalesInvoiceTotals([
      { quantity: "2.0000", unitPrice: "50.0000", discountRate: "10.0000", taxRate: "15.0000" },
    ]);

    expect(result).toMatchObject({
      subtotal: "100.0000",
      discountTotal: "10.0000",
      taxableTotal: "90.0000",
      taxTotal: "13.5000",
      total: "103.5000",
    });
  });

  it("builds a balanced cash expense journal with VAT receivable and paid-through credit", () => {
    const lines = buildCashExpenseJournalLines({
      paidThroughAccountId: "bank",
      vatReceivableAccountId: "vat-receivable",
      expenseNumber: "EXP-000001",
      currency: "SAR",
      total: "115.0000",
      taxTotal: "15.0000",
      lines: [{ accountId: "expense", description: "Office supplies", taxableAmount: "100.0000" }],
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountId: "expense", debit: "100.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "vat-receivable", debit: "15.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "bank", debit: "0.0000", credit: "115.0000" }),
    ]);
    expect(() => assertBalancedJournal(lines)).not.toThrow();
  });

  it("builds a foreign cash-expense journal without losing transaction evidence", () => {
    const lines = buildCashExpenseJournalLines({
      paidThroughAccountId: "bank", vatReceivableAccountId: "vat-receivable", expenseNumber: "EXP-USD-1",
      currency: "USD", baseCurrency: "SAR", exchangeRate: "3.75000000", rateSnapshotId: null,
      total: "431.2500", transactionTotal: "115.0000", taxTotal: "56.2500", transactionTaxTotal: "15.0000",
      lines: [{ accountId: "expense", description: "Office supplies", taxableAmount: "375.0000", transactionTaxableAmount: "100.0000" }],
    });
    expect(lines).toEqual([
      expect.objectContaining({ accountId: "expense", debit: "375.0000", transactionDebit: "100.0000" }),
      expect.objectContaining({ accountId: "vat-receivable", debit: "56.2500", transactionDebit: "15.0000" }),
      expect.objectContaining({ accountId: "bank", credit: "431.2500", transactionCredit: "115.0000" }),
    ]);
    expect(() => assertJournalFxContext(lines, "SAR")).not.toThrow();
  });

  it("creates posted cash expenses with a balanced journal and PDF archive support", async () => {
    const tx = makeCreateTransactionMock();
    tx.$queryRaw.mockResolvedValueOnce([{ id: "cost-1" }]).mockResolvedValueOnce([{ id: "project-1" }]);
    const prisma = {
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: {
        findMany: jest.fn().mockResolvedValue([{ id: "expense" }]),
        findFirst: jest.fn(({ where }: { where: { id?: string; code?: string } }) => {
          if (where.id === "bank") {
            return Promise.resolve({ id: "bank" });
          }
          return Promise.resolve({ id: "vat-receivable" });
        }),
      },
      taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-1", rate: "15.0000" }]) },
      contact: { findFirst: jest.fn().mockResolvedValue({ id: "supplier-1" }) },
      branch: { findFirst: jest.fn().mockResolvedValue({ id: "branch-1" }) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const archivePdf = jest.fn().mockResolvedValue({ id: "doc-1" });
    const auditLog = { log: jest.fn() };
    const service = new CashExpenseService(
      prisma as never,
      auditLog as never,
      { next: jest.fn().mockResolvedValueOnce("EXP-000001").mockResolvedValueOnce("JE-000001") } as never,
      { receiptRenderSettings: jest.fn().mockResolvedValue({ title: "Cash Expense" }) } as never,
      { archivePdf } as never,
    );

    const expense = await service.create("org-1", "user-1", {
      contactId: "supplier-1",
      branchId: "branch-1",
      expenseDate: "2026-05-12T00:00:00.000Z",
      currency: "SAR",
      paidThroughAccountId: "bank",
      description: "Office cash expense",
      lines: [
        {
          description: "Office supplies",
          accountId: "expense",
          quantity: "1.0000",
          unitPrice: "100.0000",
          discountRate: "0.0000",
          taxRateId: "tax-1",
          costCenterId: "cost-1",
          projectId: "project-1",
        },
      ],
    });

    expect(expense).toMatchObject({ id: "expense-1", status: CashExpenseStatus.POSTED, journalEntryId: "journal-1" });
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          totalDebit: "115.0000",
          totalCredit: "115.0000",
          lines: {
            create: [
              expect.objectContaining({ debit: "100.0000", credit: "0.0000" }),
              expect.objectContaining({ debit: "15.0000", credit: "0.0000" }),
              expect.objectContaining({ debit: "0.0000", credit: "115.0000" }),
            ],
          },
        }),
      }),
    );
    expect(tx.cashExpense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lines: {
            create: [
              expect.objectContaining({
                costCenter: { connect: { organizationId_id: { organizationId: "org-1", id: "cost-1" } } },
                project: { connect: { organizationId_id: { organizationId: "org-1", id: "project-1" } } },
              }),
            ],
          },
        }),
      }),
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(auditLog.log).not.toHaveBeenCalledWith(expect.objectContaining({ action: "FREEZE_FX_RATE" }), expect.anything());
  });

  it("freezes foreign cash-expense rate evidence through the posted create transaction", async () => {
    const tx = makeCreateTransactionMock();
    const prisma = {
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: {
        findMany: jest.fn().mockResolvedValue([{ id: "expense" }]),
        findFirst: jest.fn(({ where }: { where: { id?: string; code?: string } }) => Promise.resolve({ id: where.id === "bank" ? "bank" : "vat-receivable" })),
      },
      taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-1", rate: "15.0000" }]) },
      contact: { findFirst: jest.fn().mockResolvedValue({ id: "supplier-1" }) },
      branch: { findFirst: jest.fn() },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const auditLog = { log: jest.fn() };
    const fxContext = { resolve: jest.fn().mockResolvedValue({
      currency: "USD", baseCurrency: "SAR", exchangeRate: new Prisma.Decimal("3.75000000"),
      rateDate: new Date("2026-07-11T00:00:00.000Z"), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "rate-1",
    }) };
    const service = new CashExpenseService(
      prisma as never, auditLog as never,
      { next: jest.fn().mockResolvedValueOnce("EXP-000001").mockResolvedValueOnce("JE-000001") } as never,
      undefined, undefined, undefined, undefined, fxContext as never,
    );

    await service.create("org-1", "user-1", {
      expenseDate: "2026-07-11", currency: "USD", exchangeRate: "3.75000000", rateDate: "2026-07-11",
      rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: "rate-1", paidThroughAccountId: "bank",
      lines: [{ description: "Services", accountId: "expense", quantity: "1", unitPrice: "100", taxRateId: "tax-1" }],
    });

    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "FREEZE_FX_RATE", entityType: "CashExpense", entityId: "expense-1",
        after: expect.objectContaining({ currency: "USD", baseCurrency: "SAR", exchangeRate: "3.75000000" }),
      }),
      tx,
    );
  });

  it("blocks cash expense posting in a closed fiscal period", async () => {
    const tx = makeCreateTransactionMock();
    const prisma = {
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: {
        findMany: jest.fn().mockResolvedValue([{ id: "expense" }]),
        findFirst: jest.fn(({ where }: { where: { id?: string; code?: string } }) => {
          if (where.id === "bank") {
            return Promise.resolve({ id: "bank" });
          }
          return Promise.resolve({ id: "vat-receivable" });
        }),
      },
      taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-1", rate: "15.0000" }]) },
      contact: { findFirst: jest.fn().mockResolvedValue({ id: "supplier-1" }) },
      branch: { findFirst: jest.fn().mockResolvedValue({ id: "branch-1" }) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const guard = { assertPostingDateAllowed: jest.fn().mockRejectedValue(new Error("Posting date falls in a closed fiscal period.")) };
    const numberSequence = { next: jest.fn() };
    const service = new CashExpenseService(
      prisma as never,
      { log: jest.fn() } as never,
      numberSequence as never,
      undefined,
      undefined,
      guard as never,
    );

    await expect(
      service.create("org-1", "user-1", {
        contactId: "supplier-1",
        branchId: "branch-1",
        expenseDate: "2026-05-12T00:00:00.000Z",
        currency: "SAR",
        paidThroughAccountId: "bank",
        lines: [
          {
            description: "Office supplies",
            accountId: "expense",
            quantity: "1.0000",
            unitPrice: "100.0000",
            discountRate: "0.0000",
            taxRateId: "tax-1",
          },
        ],
      }),
    ).rejects.toThrow("Posting date falls in a closed fiscal period.");

    expect(guard.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", new Date("2026-05-12T00:00:00.000Z"), tx);
    expect(numberSequence.next).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.cashExpense.create).not.toHaveBeenCalled();
  });

  it("rejects customer-only contacts for cash expenses", async () => {
    const prisma = {
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: {
        findMany: jest.fn().mockResolvedValue([{ id: "expense" }]),
        findFirst: jest.fn().mockResolvedValue({ id: "bank" }),
      },
      taxRate: { findMany: jest.fn().mockResolvedValue([]) },
      contact: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new CashExpenseService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(
      service.create("org-1", "user-1", {
        contactId: "customer-only",
        expenseDate: "2026-05-12T00:00:00.000Z",
        paidThroughAccountId: "bank",
        lines: [{ accountId: "expense", quantity: "1.0000", unitPrice: "10.0000" }],
      }),
    ).rejects.toThrow("Cash expense contact must be an active supplier contact in this organization.");
    expect(prisma.contact.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: { in: [ContactType.SUPPLIER, ContactType.BOTH] },
        }),
      }),
    );
  });

  it("voiding posted cash expenses creates a reversal once", async () => {
    const tx = makeVoidTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CashExpenseService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000002") } as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "expense-1", status: CashExpenseStatus.POSTED, journalEntryId: "journal-1" } as never);

    await expect(service.void("org-1", "user-1", "expense-1")).resolves.toMatchObject({
      status: CashExpenseStatus.VOIDED,
      voidReversalJournalEntryId: "reversal-1",
    });
    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
  });

  it("adds neutral supplier ledger rows for linked cash expenses", () => {
    const rows = buildSupplierLedgerRows({
      bills: [],
      payments: [],
      cashExpenses: [
        {
          id: "expense-1",
          expenseNumber: "EXP-000001",
          expenseDate: "2026-05-12T00:00:00.000Z",
          status: CashExpenseStatus.POSTED,
          total: "115.0000",
          description: null,
          paidThroughAccountId: "bank",
          journalEntryId: "journal-1",
          postedAt: "2026-05-12T00:00:00.000Z",
          createdAt: "2026-05-12T00:00:00.000Z",
          updatedAt: "2026-05-12T00:00:00.000Z",
          paidThroughAccount: { id: "bank", code: "112", name: "Bank Account" },
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "CASH_EXPENSE",
      debit: "0.0000",
      credit: "0.0000",
      balance: "0.0000",
      description: "Cash expense EXP-000001 paid immediately",
      metadata: { total: "115.0000", paidThroughAccountCode: "112" },
    });
  });
});

function makeCreateTransactionMock() {
  return {
    $queryRaw: jest.fn(),
    organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "SAR" }) },
    currencyRateSnapshot: { findFirst: jest.fn() },
    account: {
      findFirst: jest.fn(({ where }: { where: { id?: string; code?: string } }) => {
        if (where.id === "bank") {
          return Promise.resolve({ id: "bank" });
        }
        return Promise.resolve({ id: "vat-receivable" });
      }),
    },
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: "journal-1" }),
    },
    cashExpense: {
      create: jest.fn().mockResolvedValue({ id: "expense-1", status: CashExpenseStatus.POSTED, journalEntryId: "journal-1" }),
    },
  };
}

function makeVoidTransactionMock() {
  return {
    cashExpense: {
      findFirst: jest.fn().mockResolvedValue({
        id: "expense-1",
        expenseNumber: "EXP-000001",
        status: CashExpenseStatus.POSTED,
        currency: "SAR",
        journalEntry: {
          id: "journal-1",
          entryNumber: "JE-000001",
          reference: "EXP-000001",
          currency: "SAR",
          description: "Cash expense EXP-000001",
          reversedBy: null,
          lines: [
            { accountId: "expense", debit: "100.0000", credit: "0.0000", description: "Expense", currency: "SAR", exchangeRate: "1", taxRateId: null },
            { accountId: "bank", debit: "0.0000", credit: "100.0000", description: "Bank", currency: "SAR", exchangeRate: "1", taxRateId: null },
          ],
        },
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "expense-1", status: CashExpenseStatus.VOIDED }),
      update: jest.fn().mockResolvedValue({ id: "expense-1", status: CashExpenseStatus.VOIDED, voidReversalJournalEntryId: "reversal-1" }),
    },
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: "reversal-1" }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}
