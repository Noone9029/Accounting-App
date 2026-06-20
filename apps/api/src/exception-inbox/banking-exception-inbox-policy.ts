import { PERMISSIONS } from "@ledgerbyte/shared";

export type BankingExceptionInboxPolicyStatus = "PLANNING_ONLY";
export type BankingExceptionInboxSourceType = "bank-statement-transaction";
export type BankingExceptionInboxStatementType = "CREDIT" | "DEBIT";
export type BankingExceptionInboxSourceStatus = "UNMATCHED" | "MATCHED" | "CATEGORIZED" | "IGNORED" | "VOIDED";
export type BankingExceptionInboxPriority = "NORMAL" | "HIGH";
export type BankingExceptionInboxAction =
  | "review"
  | "match-existing-journal"
  | "categorize-with-journal-preview"
  | "ignore-as-non-reconciling";
export type BankingExceptionInboxKeyboardHint = "next" | "previous" | "open" | "resolve";

export interface BankingExceptionInboxInput {
  organizationId: string;
  bankAccountProfileId: string;
  statementTransactionId: string;
  statementTransactionStatus: BankingExceptionInboxSourceStatus;
  statementType: BankingExceptionInboxStatementType;
  amount: string;
  currency: string;
  transactionDate: string;
  description?: string | null;
  matchSuggestionCount?: number | null;
  ruleSuggestionCount?: number | null;
  lockedByClosedReconciliation?: boolean | null;
  actorPermissions?: string[] | null;
}

export interface BankingExceptionInboxBoundary {
  routeEnabled: false;
  persistenceEnabled: false;
  automaticPostingEnabled: false;
  batchMutationEnabled: false;
  ruleCreationEnabled: false;
  aiProposalEnabled: false;
  providerMutationEnabled: false;
  emailSendingEnabled: false;
  storageMutationEnabled: false;
  complianceSubmissionEnabled: false;
}

export interface BankingExceptionInboxPolicy {
  status: BankingExceptionInboxPolicyStatus;
  eligible: boolean;
  queueKey: string;
  priority: BankingExceptionInboxPriority;
  source: {
    type: BankingExceptionInboxSourceType;
    organizationId: string;
    bankAccountProfileId: string;
    id: string;
    status: BankingExceptionInboxSourceStatus;
    statementType: BankingExceptionInboxStatementType;
  };
  review: {
    summary: string;
    amount: string;
    currency: string;
    transactionDate: string;
    suggestionCounts: {
      match: number;
      rule: number;
    };
  };
  requiredPermissions: string[];
  availableActions: BankingExceptionInboxAction[];
  keyboardHints: BankingExceptionInboxKeyboardHint[];
  batchSelectionEligible: boolean;
  blockers: string[];
  boundary: BankingExceptionInboxBoundary;
}

export const BANKING_EXCEPTION_INBOX_BOUNDARY: BankingExceptionInboxBoundary = {
  routeEnabled: false,
  persistenceEnabled: false,
  automaticPostingEnabled: false,
  batchMutationEnabled: false,
  ruleCreationEnabled: false,
  aiProposalEnabled: false,
  providerMutationEnabled: false,
  emailSendingEnabled: false,
  storageMutationEnabled: false,
  complianceSubmissionEnabled: false,
};

const SOURCE_STATUSES: BankingExceptionInboxSourceStatus[] = ["UNMATCHED", "MATCHED", "CATEGORIZED", "IGNORED", "VOIDED"];
const STATEMENT_TYPES: BankingExceptionInboxStatementType[] = ["CREDIT", "DEBIT"];
const RESOLUTION_ACTIONS: BankingExceptionInboxAction[] = [
  "match-existing-journal",
  "categorize-with-journal-preview",
  "ignore-as-non-reconciling",
];

export function buildBankingExceptionInboxPolicy(input: BankingExceptionInboxInput): BankingExceptionInboxPolicy {
  const organizationId = requiredText(input.organizationId, "Organization ID");
  const bankAccountProfileId = requiredText(input.bankAccountProfileId, "Bank account profile ID");
  const statementTransactionId = requiredText(input.statementTransactionId, "Statement transaction ID");
  const status = supportedStatus(input.statementTransactionStatus);
  const statementType = supportedStatementType(input.statementType);
  const amount = requiredText(input.amount, "Amount");
  const currency = requiredText(input.currency, "Currency").toUpperCase();
  const transactionDate = requiredText(input.transactionDate, "Transaction date");
  const matchSuggestionCount = safeCount(input.matchSuggestionCount);
  const ruleSuggestionCount = safeCount(input.ruleSuggestionCount);
  const actorPermissions = new Set(input.actorPermissions ?? []);
  const canView = actorPermissions.has(PERMISSIONS.bankStatements.view);
  const canReconcile = actorPermissions.has(PERMISSIONS.bankStatements.reconcile);
  const lockedByClosedReconciliation = Boolean(input.lockedByClosedReconciliation);

  const blockers: string[] = [];
  if (!canView) {
    blockers.push("Review requires bank statement view permission.");
  }
  if (!canReconcile) {
    blockers.push("Resolution actions require bank statement reconciliation permission.");
  }
  if (status !== "UNMATCHED") {
    blockers.push("Only unmatched statement rows enter the banking exception inbox.");
  }
  if (lockedByClosedReconciliation) {
    blockers.push("Statement row is inside a closed reconciliation period.");
  }

  const eligible = status === "UNMATCHED" && canView;
  const resolutionEligible = eligible && canReconcile && !lockedByClosedReconciliation;
  const availableActions: BankingExceptionInboxAction[] = canView
    ? ["review", ...(resolutionEligible ? RESOLUTION_ACTIONS : [])]
    : [];

  return {
    status: "PLANNING_ONLY",
    eligible,
    queueKey: `bank-statement-transaction:${statementTransactionId}`,
    priority: matchSuggestionCount > 0 || ruleSuggestionCount > 0 ? "HIGH" : "NORMAL",
    source: {
      type: "bank-statement-transaction",
      organizationId,
      bankAccountProfileId,
      id: statementTransactionId,
      status,
      statementType,
    },
    review: {
      summary: cleanSummary(input.description),
      amount,
      currency,
      transactionDate,
      suggestionCounts: {
        match: matchSuggestionCount,
        rule: ruleSuggestionCount,
      },
    },
    requiredPermissions: [PERMISSIONS.bankStatements.view, PERMISSIONS.bankStatements.reconcile],
    availableActions,
    keyboardHints: canView ? ["next", "previous", "open", ...(resolutionEligible ? ["resolve" as const] : [])] : [],
    batchSelectionEligible: resolutionEligible,
    blockers,
    boundary: BANKING_EXCEPTION_INBOX_BOUNDARY,
  };
}

function requiredText(value: string | null | undefined, label: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

function supportedStatus(value: BankingExceptionInboxSourceStatus): BankingExceptionInboxSourceStatus {
  if (!SOURCE_STATUSES.includes(value)) {
    throw new Error(`Unsupported banking exception source status: ${value}`);
  }
  return value;
}

function supportedStatementType(value: BankingExceptionInboxStatementType): BankingExceptionInboxStatementType {
  if (!STATEMENT_TYPES.includes(value)) {
    throw new Error(`Unsupported banking exception statement type: ${value}`);
  }
  return value;
}

function safeCount(value: number | null | undefined): number {
  if (value === undefined || value === null) {
    return 0;
  }
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function cleanSummary(value: string | null | undefined): string {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed || "Bank statement row requires review.";
}
