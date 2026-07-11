import {
  AccountingRuleError,
  assertBalancedJournal,
  assertJournalFxContext,
  assertDraftEditable,
  createReversalLines,
  getJournalTotals,
} from "@ledgerbyte/accounting-core";
import { JournalEntryStatus } from "@prisma/client";
import { AccountingService } from "./accounting.service";

const balancedLines = [
  { accountId: "cash", debit: "100.00", credit: "0.00", currency: "SAR" },
  { accountId: "sales", debit: "0.00", credit: "100.00", currency: "SAR" },
];

describe("journal accounting rules", () => {
  it("accepts balanced journal entries", () => {
    expect(() => assertBalancedJournal(balancedLines)).not.toThrow();
    expect(getJournalTotals(balancedLines)).toEqual({ debit: "100.0000", credit: "100.0000" });
  });

  it("rejects unbalanced journal entries before posting", () => {
    expect(() =>
      assertBalancedJournal([
        { accountId: "cash", debit: "100.00", credit: "0.00", currency: "SAR" },
        { accountId: "sales", debit: "0.00", credit: "99.99", currency: "SAR" },
      ]),
    ).toThrow(AccountingRuleError);
  });

  it("prevents editing non-draft journal entries", () => {
    expect(() => assertDraftEditable("POSTED")).toThrow(AccountingRuleError);
    expect(() => assertDraftEditable("REVERSED")).toThrow(AccountingRuleError);
  });

  it("creates balanced opposite lines for reversal", () => {
    const reversal = createReversalLines([
      { ...balancedLines[0]!, costCenterId: "cost-center-1", projectId: "project-1" },
      { ...balancedLines[1]!, costCenterId: null, projectId: null },
    ]);
    expect(reversal).toEqual([
      {
        accountId: "cash",
        debit: "0.0000",
        credit: "100.0000",
        description: "Reversal",
        currency: "SAR",
        exchangeRate: "1",
        transactionDebit: "0.0000",
        transactionCredit: "100.0000",
        fxRoundingComponentCount: 1,
        rateSnapshotId: null,
        taxRateId: null,
        costCenterId: "cost-center-1",
        projectId: "project-1",
      },
      {
        accountId: "sales",
        debit: "100.0000",
        credit: "0.0000",
        description: "Reversal",
        currency: "SAR",
        exchangeRate: "1",
        transactionDebit: "100.0000",
        transactionCredit: "0.0000",
        fxRoundingComponentCount: 1,
        rateSnapshotId: null,
        taxRateId: null,
        costCenterId: null,
        projectId: null,
      },
    ]);
    expect(() => assertBalancedJournal(reversal)).not.toThrow();
  });

  it("preserves transaction/base FX evidence and dimensions in reversal lines", () => {
    const reversal = createReversalLines([
      {
        accountId: "ar",
        debit: "367.2500",
        credit: "0.0000",
        transactionDebit: "100.0000",
        transactionCredit: "0.0000",
        currency: "USD",
        exchangeRate: "3.67250000",
        rateSnapshotId: "11111111-1111-4111-8111-111111111111",
        fxRoundingComponentCount: 4,
        costCenterId: "cost-center-1",
        projectId: "project-1",
      },
      {
        accountId: "revenue",
        debit: "0.0000",
        credit: "367.2500",
        transactionDebit: "0.0000",
        transactionCredit: "100.0000",
        currency: "USD",
        exchangeRate: "3.67250000",
        rateSnapshotId: "11111111-1111-4111-8111-111111111111",
      },
    ]);

    expect(reversal[0]).toMatchObject({
      debit: "0.0000",
      credit: "367.2500",
      transactionDebit: "0.0000",
      transactionCredit: "100.0000",
      currency: "USD",
      exchangeRate: "3.67250000",
      rateSnapshotId: "11111111-1111-4111-8111-111111111111",
      fxRoundingComponentCount: 4,
      costCenterId: "cost-center-1",
      projectId: "project-1",
    });
    expect(reversal[1]).toMatchObject({
      debit: "367.2500",
      credit: "0.0000",
      transactionDebit: "100.0000",
      transactionCredit: "0.0000",
    });
  });

  it("requires balanced transaction amounts by currency and identity rates for base lines", () => {
    expect(() => assertJournalFxContext([
      { accountId: "ar", debit: "367.2500", credit: "0", transactionDebit: "100", transactionCredit: "0", currency: "USD", exchangeRate: "3.6725" },
      { accountId: "sales", debit: "0", credit: "367.2500", transactionDebit: "0", transactionCredit: "100", currency: "USD", exchangeRate: "3.6725" },
    ], "AED")).not.toThrow();

    expect(() => assertJournalFxContext([
      { accountId: "cash", debit: "100", credit: "0", transactionDebit: "99", transactionCredit: "0", currency: "AED", exchangeRate: "1" },
      { accountId: "sales", debit: "0", credit: "100", transactionDebit: "0", transactionCredit: "99", currency: "AED", exchangeRate: "1" },
    ], "AED")).toThrow(AccountingRuleError);

    expect(() => assertJournalFxContext([
      { accountId: "ar", debit: "367.2500", credit: "0", transactionDebit: "100", transactionCredit: "0", currency: "USD", exchangeRate: "3.6725" },
      { accountId: "sales", debit: "0", credit: "367.2500", transactionDebit: "0", transactionCredit: "99.9999", currency: "USD", exchangeRate: "3.6725" },
    ], "AED")).toThrow(AccountingRuleError);
  });

  it("rejects foreign base amounts that do not match the captured rate while allowing one 4dp residual unit", () => {
    expect(() => assertJournalFxContext([
      { accountId: "ar", debit: "100.0000", credit: "0", transactionDebit: "100", transactionCredit: "0", currency: "USD", exchangeRate: "3.6725" },
      { accountId: "sales", debit: "0", credit: "100.0000", transactionDebit: "0", transactionCredit: "100", currency: "USD", exchangeRate: "3.6725" },
    ], "AED")).toThrow(expect.objectContaining({ code: "JOURNAL_FX_RATE_MISMATCH" }));

    expect(() => assertJournalFxContext([
      { accountId: "ar", debit: "367.2501", credit: "0", transactionDebit: "100", transactionCredit: "0", currency: "USD", exchangeRate: "3.6725" },
      { accountId: "sales", debit: "0", credit: "367.2501", transactionDebit: "0", transactionCredit: "100", currency: "USD", exchangeRate: "3.6725" },
    ], "AED")).not.toThrow();

    expect(() => assertJournalFxContext([
      { accountId: "ar", debit: "367.2502", credit: "0", transactionDebit: "100", transactionCredit: "0", currency: "USD", exchangeRate: "3.6725" },
      { accountId: "sales", debit: "0", credit: "367.2502", transactionDebit: "0", transactionCredit: "100", currency: "USD", exchangeRate: "3.6725" },
    ], "AED")).toThrow(expect.objectContaining({ code: "JOURNAL_FX_RATE_MISMATCH" }));
  });

  it("bounds aggregate rounding residuals by persisted source-component evidence", () => {
    const lines = [
      { accountId: "ar", debit: "0.0004", credit: "0", transactionDebit: "0.0004", transactionCredit: "0", currency: "USD", exchangeRate: "0.5", fxRoundingComponentCount: 4 },
      { accountId: "sales", debit: "0", credit: "0.0004", transactionDebit: "0", transactionCredit: "0.0004", currency: "USD", exchangeRate: "0.5", fxRoundingComponentCount: 4 },
    ];
    expect(() => assertJournalFxContext(lines, "AED")).not.toThrow();
    expect(() => assertJournalFxContext(lines.map((line) => ({ ...line, fxRoundingComponentCount: 1 })), "AED")).toThrow(
      expect.objectContaining({ code: "JOURNAL_FX_RATE_MISMATCH" }),
    );
  });

  it("rejects duplicate service reversals cleanly when the reversal unique key is already claimed", async () => {
    const existing = makePostedJournal();
    const tx = {
      journalEntry: {
        findFirst: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockRejectedValue({ code: "P2002" }),
        update: jest.fn(),
      },
    };
    const prisma = {
      journalEntry: { findFirst: jest.fn().mockResolvedValue(existing) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new AccountingService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValue("JE-000002") } as never);

    await expect(service.reverse("org-1", "user-1", "journal-1")).rejects.toThrow("Journal entry has already been reversed.");
    expect(tx.journalEntry.update).not.toHaveBeenCalled();
  });

  it("counts journal entries with organization scoping for smoke count checks", async () => {
    const prisma = {
      journalEntry: {
        count: jest.fn().mockResolvedValue(12),
      },
    };
    const service = new AccountingService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.count("org-1")).resolves.toBe(12);
    expect(prisma.journalEntry.count).toHaveBeenCalledWith({ where: { organizationId: "org-1" } });
  });

  it("blocks posting draft journals in closed periods before status changes", async () => {
    const prisma = {
      journalEntry: {
        update: jest.fn(),
      },
    };
    const guard = { assertPostingDateAllowed: jest.fn().mockRejectedValue(new Error("Posting date falls in a closed fiscal period.")) };
    const service = new AccountingService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, guard as never);
    jest.spyOn(service, "get").mockResolvedValue({
      ...makePostedJournal(),
      status: JournalEntryStatus.DRAFT,
      entryDate: new Date("2026-01-15T00:00:00.000Z"),
    } as never);

    await expect(service.post("org-1", "user-1", "journal-1")).rejects.toThrow("Posting date falls in a closed fiscal period.");
    expect(guard.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", new Date("2026-01-15T00:00:00.000Z"), undefined);
    expect(prisma.journalEntry.update).not.toHaveBeenCalled();
  });

  it("blocks draft journals with foreign lines or non-one rates before status changes", async () => {
    const prisma = { journalEntry: { update: jest.fn() } };
    const postingGuard = {
      assertJournalPostingAllowed: jest.fn().mockRejectedValue(new Error("Foreign-currency posting is disabled.")),
    };
    const service = new AccountingService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      undefined,
      postingGuard as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({
      ...makePostedJournal(),
      status: JournalEntryStatus.DRAFT,
      currency: "AED",
      lines: [
        { ...makePostedJournal().lines[0], currency: "USD" },
        { ...makePostedJournal().lines[1], currency: "AED", exchangeRate: "1.10000000" },
      ],
    } as never);

    await expect(service.post("org-1", "user-1", "journal-1")).rejects.toThrow(
      "Foreign-currency posting is disabled.",
    );
    expect(postingGuard.assertJournalPostingAllowed).toHaveBeenCalledWith(
      "org-1",
      "AED",
      [
        expect.objectContaining({ currency: "USD", exchangeRate: "1.00000000" }),
        expect.objectContaining({ currency: "AED", exchangeRate: "1.10000000" }),
      ],
    );
    expect(prisma.journalEntry.update).not.toHaveBeenCalled();
  });
});

function makePostedJournal() {
  return {
    id: "journal-1",
    organizationId: "org-1",
    entryNumber: "JE-000001",
    description: "Posted journal",
    reference: "JE-000001",
    currency: "SAR",
    status: JournalEntryStatus.POSTED,
    reversedBy: null,
    reversalOf: null,
    lines: [
      {
        accountId: "cash",
        debit: "100.0000",
        credit: "0.0000",
        description: "Cash",
        currency: "SAR",
        exchangeRate: "1.00000000",
        taxRateId: null,
      },
      {
        accountId: "sales",
        debit: "0.0000",
        credit: "100.0000",
        description: "Sales",
        currency: "SAR",
        exchangeRate: "1.00000000",
        taxRateId: null,
      },
    ],
  };
}
