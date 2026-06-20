import { PERMISSIONS } from "@ledgerbyte/shared";
import { buildBankingExceptionInboxPolicy, BANKING_EXCEPTION_INBOX_BOUNDARY } from "./banking-exception-inbox-policy";

describe("banking exception inbox policy", () => {
  it("queues unmatched statement rows for review with reconcile actions when permissions allow", () => {
    const policy = buildBankingExceptionInboxPolicy({
      organizationId: "org-1",
      bankAccountProfileId: "bank-1",
      statementTransactionId: "txn-1",
      statementTransactionStatus: "UNMATCHED",
      statementType: "CREDIT",
      amount: "250.0000",
      currency: "SAR",
      transactionDate: "2026-06-20",
      description: "Customer receipt INV-1001",
      matchSuggestionCount: 2,
      ruleSuggestionCount: 1,
      actorPermissions: [PERMISSIONS.bankStatements.view, PERMISSIONS.bankStatements.reconcile],
    });

    expect(policy).toMatchObject({
      status: "PLANNING_ONLY",
      eligible: true,
      queueKey: "bank-statement-transaction:txn-1",
      priority: "HIGH",
      source: {
        type: "bank-statement-transaction",
        organizationId: "org-1",
        bankAccountProfileId: "bank-1",
        id: "txn-1",
        status: "UNMATCHED",
      },
      review: {
        summary: "Customer receipt INV-1001",
        amount: "250.0000",
        currency: "SAR",
        transactionDate: "2026-06-20",
        suggestionCounts: {
          match: 2,
          rule: 1,
        },
      },
      requiredPermissions: [PERMISSIONS.bankStatements.view, PERMISSIONS.bankStatements.reconcile],
      availableActions: ["review", "match-existing-journal", "categorize-with-journal-preview", "ignore-as-non-reconciling"],
      keyboardHints: ["next", "previous", "open", "resolve"],
      blockers: [],
      boundary: BANKING_EXCEPTION_INBOX_BOUNDARY,
    });
    expect(Object.values(policy.boundary).every((value) => value === false)).toBe(true);
  });

  it("filters resolution actions when the actor can view but cannot reconcile", () => {
    const policy = buildBankingExceptionInboxPolicy({
      organizationId: "org-1",
      bankAccountProfileId: "bank-1",
      statementTransactionId: "txn-1",
      statementTransactionStatus: "UNMATCHED",
      statementType: "DEBIT",
      amount: "15.5000",
      currency: "SAR",
      transactionDate: "2026-06-20",
      actorPermissions: [PERMISSIONS.bankStatements.view],
    });

    expect(policy.eligible).toBe(true);
    expect(policy.availableActions).toEqual(["review"]);
    expect(policy.blockers).toContain("Resolution actions require bank statement reconciliation permission.");
  });

  it("keeps locked rows visible but blocks resolution and batch selection", () => {
    const policy = buildBankingExceptionInboxPolicy({
      organizationId: "org-1",
      bankAccountProfileId: "bank-1",
      statementTransactionId: "txn-locked",
      statementTransactionStatus: "UNMATCHED",
      statementType: "DEBIT",
      amount: "99.0000",
      currency: "SAR",
      transactionDate: "2026-05-31",
      lockedByClosedReconciliation: true,
      actorPermissions: [PERMISSIONS.bankStatements.view, PERMISSIONS.bankStatements.reconcile],
    });

    expect(policy.eligible).toBe(true);
    expect(policy.availableActions).toEqual(["review"]);
    expect(policy.batchSelectionEligible).toBe(false);
    expect(policy.blockers).toContain("Statement row is inside a closed reconciliation period.");
  });

  it("marks already resolved rows as ineligible for the exception queue", () => {
    const policy = buildBankingExceptionInboxPolicy({
      organizationId: "org-1",
      bankAccountProfileId: "bank-1",
      statementTransactionId: "txn-matched",
      statementTransactionStatus: "MATCHED",
      statementType: "CREDIT",
      amount: "250.0000",
      currency: "SAR",
      transactionDate: "2026-06-20",
      actorPermissions: [PERMISSIONS.bankStatements.view, PERMISSIONS.bankStatements.reconcile],
    });

    expect(policy.eligible).toBe(false);
    expect(policy.availableActions).toEqual(["review"]);
    expect(policy.batchSelectionEligible).toBe(false);
    expect(policy.blockers).toContain("Only unmatched statement rows enter the banking exception inbox.");
  });

  it("rejects unsupported status values and blank identifiers", () => {
    expect(() =>
      buildBankingExceptionInboxPolicy({
        organizationId: " ",
        bankAccountProfileId: "bank-1",
        statementTransactionId: "txn-1",
        statementTransactionStatus: "UNMATCHED",
        statementType: "CREDIT",
        amount: "250.0000",
        currency: "SAR",
        transactionDate: "2026-06-20",
      }),
    ).toThrow("Organization ID is required.");

    expect(() =>
      buildBankingExceptionInboxPolicy({
        organizationId: "org-1",
        bankAccountProfileId: "bank-1",
        statementTransactionId: "txn-1",
        statementTransactionStatus: "READY" as never,
        statementType: "CREDIT",
        amount: "250.0000",
        currency: "SAR",
        transactionDate: "2026-06-20",
      }),
    ).toThrow("Unsupported banking exception source status: READY");
  });
});
