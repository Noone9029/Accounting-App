import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from "@ledgerbyte/shared";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS, standardizeAuditAction } from "../audit-log/audit-events";

describe("recurring transaction policy contracts", () => {
  it("defines the minimum recurring permission surface", () => {
    expect(PERMISSIONS.recurringTransactions).toEqual({
      read: "recurringTransactions.read",
      manage: "recurringTransactions.manage",
      run: "recurringTransactions.run",
      review: "recurringTransactions.review",
    });
  });

  it("gives accountants the full recurring review workflow and viewers read-only access", () => {
    for (const permission of Object.values(PERMISSIONS.recurringTransactions)) {
      expect(DEFAULT_ROLE_PERMISSIONS.Accountant).toContain(permission);
    }
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).toContain(PERMISSIONS.recurringTransactions.read);
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).not.toContain(PERMISSIONS.recurringTransactions.manage);
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).not.toContain(PERMISSIONS.recurringTransactions.run);
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).not.toContain(PERMISSIONS.recurringTransactions.review);
  });

  it.each([
    ["RecurringTransactionTemplate", "CREATE", "RECURRING_TRANSACTION_TEMPLATE_CREATED"],
    ["RecurringTransactionTemplate", "UPDATE", "RECURRING_TRANSACTION_TEMPLATE_UPDATED"],
    ["RecurringTransactionTemplate", "SCHEDULE_CHANGE", "RECURRING_TRANSACTION_SCHEDULE_CHANGED"],
    ["RecurringTransactionTemplate", "ACTIVATE", "RECURRING_TRANSACTION_TEMPLATE_ACTIVATED"],
    ["RecurringTransactionTemplate", "PAUSE", "RECURRING_TRANSACTION_TEMPLATE_PAUSED"],
    ["RecurringTransactionTemplate", "RESUME", "RECURRING_TRANSACTION_TEMPLATE_RESUMED"],
    ["RecurringTransactionTemplate", "ARCHIVE", "RECURRING_TRANSACTION_TEMPLATE_ARCHIVED"],
    ["RecurringTransactionRun", "REQUEST_MANUAL", "RECURRING_TRANSACTION_RUN_MANUALLY_REQUESTED"],
    ["RecurringTransactionRun", "CLAIM", "RECURRING_TRANSACTION_RUN_CLAIMED"],
    ["RecurringTransactionRun", "GENERATE", "RECURRING_TRANSACTION_RUN_GENERATED"],
    ["RecurringTransactionRun", "BLOCK", "RECURRING_TRANSACTION_RUN_BLOCKED"],
    ["RecurringTransactionRun", "SKIP", "RECURRING_TRANSACTION_RUN_SKIPPED"],
    ["RecurringTransactionRun", "FAIL", "RECURRING_TRANSACTION_RUN_FAILED"],
    ["RecurringTransactionRun", "RETRY", "RECURRING_TRANSACTION_RUN_RETRIED"],
    ["RecurringExpenseProposal", "REVIEW", "RECURRING_EXPENSE_PROPOSAL_REVIEWED"],
    ["RecurringTransactionRun", "LINK_TARGET", "RECURRING_TRANSACTION_GENERATED_ENTITY_LINKED"],
  ] as const)("standardizes %s:%s to %s", (entityType, action, event) => {
    expect(standardizeAuditAction(action, entityType)).toBe(event);
    expect(Object.values(AUDIT_EVENTS)).toContain(event);
  });

  it("exposes stable recurring entity names", () => {
    expect(AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_TEMPLATE).toBe("RecurringTransactionTemplate");
    expect(AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_RUN).toBe("RecurringTransactionRun");
    expect(AUDIT_ENTITY_TYPES.RECURRING_EXPENSE_PROPOSAL).toBe("RecurringExpenseProposal");
  });
});
