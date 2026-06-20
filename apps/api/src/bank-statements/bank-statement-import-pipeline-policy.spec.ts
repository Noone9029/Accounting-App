import {
  BANK_STATEMENT_IMPORT_PIPELINE_BOUNDARY,
  buildBankStatementImportPipelinePolicy,
} from "./bank-statement-import-pipeline-policy";

describe("bank statement import pipeline policy", () => {
  it("orders deterministic review stages before proposal review and exception inbox handoff", () => {
    const policy = buildBankStatementImportPipelinePolicy({
      sourceRowCount: 12,
      invalidRowCount: 0,
      duplicateRowCount: 0,
      closedPeriodRowCount: 0,
      matchSuggestionCount: 3,
      ruleSuggestionCount: 2,
      proposalReviewEnabled: true,
    });

    expect(policy.status).toBe("REVIEW_READY");
    expect(policy.stages.map((stage) => stage.key)).toEqual([
      "normalize",
      "dedupe",
      "closed-period-guard",
      "match-suggestions",
      "rule-suggestions",
      "proposal-review",
      "exception-inbox",
    ]);
    expect(policy.nextStageKey).toBe("match-suggestions");
    expect(policy.boundary).toEqual(BANK_STATEMENT_IMPORT_PIPELINE_BOUNDARY);
    expect(Object.values(policy.boundary).every((value) => value === false)).toBe(true);
  });

  it("blocks rows before suggestions when validation, duplicates, or closed-period guards fail", () => {
    const policy = buildBankStatementImportPipelinePolicy({
      sourceRowCount: 4,
      invalidRowCount: 1,
      duplicateRowCount: 1,
      closedPeriodRowCount: 1,
      matchSuggestionCount: 5,
      ruleSuggestionCount: 5,
      proposalReviewEnabled: true,
    });

    expect(policy.status).toBe("BLOCKED");
    expect(policy.nextStageKey).toBe("normalize");
    expect(policy.blockers).toEqual([
      "Invalid statement rows must be fixed or explicitly skipped before import.",
      "Duplicate statement rows must be reviewed before import.",
      "Rows inside closed reconciliation periods cannot enter the review pipeline.",
    ]);
    expect(policy.stages.find((stage) => stage.key === "match-suggestions")).toMatchObject({ enabled: false });
    expect(policy.stages.find((stage) => stage.key === "proposal-review")).toMatchObject({ enabled: false });
  });

  it("uses exception inbox as the next stage when no deterministic suggestions are present", () => {
    const policy = buildBankStatementImportPipelinePolicy({
      sourceRowCount: 2,
      invalidRowCount: 0,
      duplicateRowCount: 0,
      closedPeriodRowCount: 0,
      matchSuggestionCount: 0,
      ruleSuggestionCount: 0,
      proposalReviewEnabled: false,
    });

    expect(policy.status).toBe("REVIEW_READY");
    expect(policy.nextStageKey).toBe("exception-inbox");
    expect(policy.stages.find((stage) => stage.key === "proposal-review")).toMatchObject({
      enabled: false,
      reason: "Proposal review is disabled for this pipeline plan.",
    });
  });

  it("normalizes negative and non-finite counts to zero", () => {
    const policy = buildBankStatementImportPipelinePolicy({
      sourceRowCount: Number.NaN,
      invalidRowCount: -1,
      duplicateRowCount: Number.POSITIVE_INFINITY,
      closedPeriodRowCount: -5,
      matchSuggestionCount: -2,
      ruleSuggestionCount: -3,
      proposalReviewEnabled: true,
    });

    expect(policy.sourceRowCount).toBe(0);
    expect(policy.blockers).toEqual([]);
    expect(policy.nextStageKey).toBe("proposal-review");
  });
});
