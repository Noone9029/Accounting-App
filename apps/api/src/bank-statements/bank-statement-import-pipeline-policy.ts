export type BankStatementImportPipelineStatus = "BLOCKED" | "REVIEW_READY";
export type BankStatementImportPipelineStageKey =
  | "normalize"
  | "dedupe"
  | "closed-period-guard"
  | "match-suggestions"
  | "rule-suggestions"
  | "proposal-review"
  | "exception-inbox";

export interface BankStatementImportPipelineInput {
  sourceRowCount: number;
  invalidRowCount?: number | null;
  duplicateRowCount?: number | null;
  closedPeriodRowCount?: number | null;
  matchSuggestionCount?: number | null;
  ruleSuggestionCount?: number | null;
  proposalReviewEnabled?: boolean | null;
}

export interface BankStatementImportPipelineBoundary {
  automaticImportEnabled: false;
  automaticMatchingEnabled: false;
  automaticCategorizationEnabled: false;
  automaticPostingEnabled: false;
  batchResolutionEnabled: false;
  providerMutationEnabled: false;
  storageMutationEnabled: false;
  aiAutonomyEnabled: false;
}

export interface BankStatementImportPipelineStage {
  key: BankStatementImportPipelineStageKey;
  label: string;
  enabled: boolean;
  completed: boolean;
  reason: string;
}

export interface BankStatementImportPipelinePolicy {
  status: BankStatementImportPipelineStatus;
  sourceRowCount: number;
  nextStageKey: BankStatementImportPipelineStageKey;
  blockers: string[];
  stages: BankStatementImportPipelineStage[];
  boundary: BankStatementImportPipelineBoundary;
}

export const BANK_STATEMENT_IMPORT_PIPELINE_BOUNDARY: BankStatementImportPipelineBoundary = {
  automaticImportEnabled: false,
  automaticMatchingEnabled: false,
  automaticCategorizationEnabled: false,
  automaticPostingEnabled: false,
  batchResolutionEnabled: false,
  providerMutationEnabled: false,
  storageMutationEnabled: false,
  aiAutonomyEnabled: false,
};

export function buildBankStatementImportPipelinePolicy(input: BankStatementImportPipelineInput): BankStatementImportPipelinePolicy {
  const sourceRowCount = safeCount(input.sourceRowCount);
  const invalidRowCount = safeCount(input.invalidRowCount);
  const duplicateRowCount = safeCount(input.duplicateRowCount);
  const closedPeriodRowCount = safeCount(input.closedPeriodRowCount);
  const matchSuggestionCount = safeCount(input.matchSuggestionCount);
  const ruleSuggestionCount = safeCount(input.ruleSuggestionCount);
  const proposalReviewEnabled = Boolean(input.proposalReviewEnabled);
  const blockers = pipelineBlockers({ invalidRowCount, duplicateRowCount, closedPeriodRowCount });
  const guardPassed = blockers.length === 0;
  const nextStageKey = nextPipelineStage({
    guardPassed,
    matchSuggestionCount,
    ruleSuggestionCount,
    proposalReviewEnabled,
  });

  return {
    status: guardPassed ? "REVIEW_READY" : "BLOCKED",
    sourceRowCount,
    nextStageKey,
    blockers,
    stages: [
      {
        key: "normalize",
        label: "Normalize statement rows",
        enabled: true,
        completed: invalidRowCount === 0,
        reason: invalidRowCount === 0 ? "Rows are normalized for deterministic review." : "Invalid statement rows remain.",
      },
      {
        key: "dedupe",
        label: "Review duplicate rows",
        enabled: invalidRowCount === 0,
        completed: duplicateRowCount === 0,
        reason: duplicateRowCount === 0 ? "No duplicate blockers remain." : "Duplicate statement rows require review.",
      },
      {
        key: "closed-period-guard",
        label: "Check closed reconciliation periods",
        enabled: invalidRowCount === 0 && duplicateRowCount === 0,
        completed: closedPeriodRowCount === 0,
        reason:
          closedPeriodRowCount === 0
            ? "No rows are blocked by closed reconciliation periods."
            : "Closed reconciliation period rows must not be imported.",
      },
      {
        key: "match-suggestions",
        label: "Rank posted-ledger match suggestions",
        enabled: guardPassed,
        completed: guardPassed && matchSuggestionCount === 0,
        reason:
          matchSuggestionCount > 0
            ? `${matchSuggestionCount} deterministic match suggestion${matchSuggestionCount === 1 ? "" : "s"} require review.`
            : "No deterministic match suggestions are available.",
      },
      {
        key: "rule-suggestions",
        label: "Evaluate bank rule suggestions",
        enabled: guardPassed,
        completed: guardPassed && ruleSuggestionCount === 0,
        reason:
          ruleSuggestionCount > 0
            ? `${ruleSuggestionCount} bank rule suggestion${ruleSuggestionCount === 1 ? "" : "s"} require review.`
            : "No bank rule suggestions are available.",
      },
      {
        key: "proposal-review",
        label: "Hold automation proposals for review",
        enabled: guardPassed && proposalReviewEnabled,
        completed: !proposalReviewEnabled,
        reason: proposalReviewEnabled
          ? "Proposal review is enabled but remains non-posting until explicit confirmation."
          : "Proposal review is disabled for this pipeline plan.",
      },
      {
        key: "exception-inbox",
        label: "Send unresolved rows to exception inbox",
        enabled: guardPassed,
        completed: false,
        reason: "Rows that remain unresolved stay available for manual review.",
      },
    ],
    boundary: BANK_STATEMENT_IMPORT_PIPELINE_BOUNDARY,
  };
}

function pipelineBlockers(input: { invalidRowCount: number; duplicateRowCount: number; closedPeriodRowCount: number }): string[] {
  const blockers: string[] = [];
  if (input.invalidRowCount > 0) {
    blockers.push("Invalid statement rows must be fixed or explicitly skipped before import.");
  }
  if (input.duplicateRowCount > 0) {
    blockers.push("Duplicate statement rows must be reviewed before import.");
  }
  if (input.closedPeriodRowCount > 0) {
    blockers.push("Rows inside closed reconciliation periods cannot enter the review pipeline.");
  }
  return blockers;
}

function nextPipelineStage(input: {
  guardPassed: boolean;
  matchSuggestionCount: number;
  ruleSuggestionCount: number;
  proposalReviewEnabled: boolean;
}): BankStatementImportPipelineStageKey {
  if (!input.guardPassed) {
    return "normalize";
  }
  if (input.matchSuggestionCount > 0) {
    return "match-suggestions";
  }
  if (input.ruleSuggestionCount > 0) {
    return "rule-suggestions";
  }
  if (input.proposalReviewEnabled) {
    return "proposal-review";
  }
  return "exception-inbox";
}

function safeCount(value: number | null | undefined): number {
  if (!Number.isFinite(value) || value === undefined || value === null) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}
