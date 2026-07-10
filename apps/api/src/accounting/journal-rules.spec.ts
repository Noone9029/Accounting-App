import {
  AccountingRuleError,
  assertBalancedJournal,
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
        taxRateId: null,
        costCenterId: null,
        projectId: null,
      },
    ]);
    expect(() => assertBalancedJournal(reversal)).not.toThrow();
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
