import {
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  BankRuleActionType,
  BankRuleApplicationStatus,
  BankRuleDirection,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  Prisma,
} from "@prisma/client";
import { BankRulesService } from "./bank-rules.service";

describe("BankRulesService", () => {
  const transaction = {
    id: "row-1",
    organizationId: "org-1",
    importId: "import-1",
    bankAccountProfileId: "bank-1",
    transactionDate: new Date("2026-06-01T00:00:00.000Z"),
    description: "Monthly bank fee",
    reference: "FEE-001",
    type: BankStatementTransactionType.DEBIT,
    amount: new Prisma.Decimal("25.0000"),
    status: BankStatementTransactionStatus.UNMATCHED,
    rawData: { normalized: { bankReference: "BANK-REF-001", counterparty: "Sample Bank", currency: "SAR" } },
    import: { sourceType: "CSV" },
    bankAccountProfile: { id: "bank-1", currency: "SAR" },
  };

  function rule(overrides: Record<string, unknown> = {}) {
    return {
      id: "rule-1",
      organizationId: "org-1",
      bankAccountProfileId: "bank-1",
      name: "Bank fees",
      enabled: true,
      priority: 10,
      direction: BankRuleDirection.DEBIT,
      descriptionContains: "bank fee",
      descriptionRegex: null,
      referenceContains: null,
      bankReferenceContains: null,
      counterpartyContains: null,
      amountEquals: null,
      amountMin: null,
      amountMax: null,
      currencyEquals: "SAR",
      sourceFormat: null,
      startDate: null,
      endDate: null,
      actionType: BankRuleActionType.SUGGEST_CATEGORIZE,
      categorizeAccountId: "expense-1",
      ignoreReason: null,
      autoApply: false,
      lastDryRunAt: null,
      lastAppliedAt: null,
      createdById: "user-1",
      updatedById: "user-1",
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      ...overrides,
    };
  }

  function makeService() {
    const prisma = {
      bankRule: {
        findMany: jest.fn().mockResolvedValue([rule()]),
        findFirst: jest.fn().mockResolvedValue(rule()),
        create: jest.fn(),
        update: jest.fn(),
      },
      bankRuleApplication: { create: jest.fn() },
      bankStatementTransaction: { findMany: jest.fn().mockResolvedValue([transaction]) },
      bankAccountProfile: { findFirst: jest.fn().mockResolvedValue({ id: "bank-1" }) },
      account: { findFirst: jest.fn().mockResolvedValue({ id: "expense-1" }) },
    } as any;
    const bankStatementService = {
      getTransaction: jest.fn().mockResolvedValue(transaction),
      matchCandidates: jest.fn().mockResolvedValue([{ journalLineId: "line-1" }]),
      categorizeTransaction: jest.fn().mockResolvedValue({ ...transaction, status: BankStatementTransactionStatus.CATEGORIZED }),
      ignoreTransaction: jest.fn().mockResolvedValue({ ...transaction, status: BankStatementTransactionStatus.IGNORED }),
      matchTransaction: jest.fn().mockResolvedValue({ ...transaction, status: BankStatementTransactionStatus.MATCHED }),
    } as any;
    return { service: new BankRulesService(prisma, bankStatementService), prisma, bankStatementService };
  }

  it("returns rule suggestions for unmatched statement transactions without mutating rows", async () => {
    const { service, prisma } = makeService();

    await expect(service.suggestionsForTransaction("org-1", "row-1")).resolves.toMatchObject({
      suggestions: [expect.objectContaining({ ruleId: "rule-1", actionType: BankRuleActionType.SUGGEST_CATEGORIZE })],
    });

    expect(prisma.bankRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          enabled: true,
          OR: [{ bankAccountProfileId: "bank-1" }, { bankAccountProfileId: null }],
        }),
      }),
    );
    expect(prisma.bankStatementTransaction.findMany).not.toHaveBeenCalled();
    expect(prisma.bankRuleApplication.create).not.toHaveBeenCalled();
  });

  it("dry-runs a rule against recent unmatched rows without writing application records", async () => {
    const { service, prisma } = makeService();

    await expect(service.dryRunRule("org-1", "rule-1", { limit: 10 })).resolves.toMatchObject({
      checkedCount: 1,
      suggestions: [expect.objectContaining({ suggestion: expect.objectContaining({ ruleId: "rule-1" }) })],
    });

    expect(prisma.bankStatementTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", bankAccountProfileId: "bank-1", status: BankStatementTransactionStatus.UNMATCHED }),
        take: 10,
      }),
    );
    expect(prisma.bankRule.update).not.toHaveBeenCalled();
    expect(prisma.bankRuleApplication.create).not.toHaveBeenCalled();
  });

  it("applies categorize suggestions by reusing the existing categorize behavior", async () => {
    const { service, prisma, bankStatementService } = makeService();
    prisma.bankRule.update.mockResolvedValue(rule({ lastAppliedAt: new Date() }));

    await expect(service.applySuggestion("org-1", "user-1", "row-1", { ruleId: "rule-1" })).resolves.toMatchObject({
      applied: true,
      transaction: expect.objectContaining({ status: BankStatementTransactionStatus.CATEGORIZED }),
    });

    expect(bankStatementService.categorizeTransaction).toHaveBeenCalledWith("org-1", "user-1", "row-1", {
      accountId: "expense-1",
      description: undefined,
    });
    expect(prisma.bankRuleApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: BankRuleApplicationStatus.APPLIED,
          actionType: BankRuleActionType.SUGGEST_CATEGORIZE,
        }),
      }),
    );
  });

  it("requires an explicit ignore reason and reuses existing ignore behavior", async () => {
    const { service, prisma, bankStatementService } = makeService();
    prisma.bankRule.findFirst.mockResolvedValue(rule({ actionType: BankRuleActionType.SUGGEST_IGNORE, categorizeAccountId: null, ignoreReason: "Duplicate import" }));
    prisma.bankRule.update.mockResolvedValue(rule({ lastAppliedAt: new Date() }));

    await expect(service.applySuggestion("org-1", "user-1", "row-1", { ruleId: "rule-1" })).resolves.toMatchObject({
      transaction: expect.objectContaining({ status: BankStatementTransactionStatus.IGNORED }),
    });
    expect(bankStatementService.ignoreTransaction).toHaveBeenCalledWith("org-1", "user-1", "row-1", { reason: "Duplicate import" });

    prisma.bankRule.findFirst.mockResolvedValue(rule({ actionType: BankRuleActionType.SUGGEST_IGNORE, categorizeAccountId: null, ignoreReason: null }));
    await expect(service.applySuggestion("org-1", "user-1", "row-1", { ruleId: "rule-1" })).rejects.toThrow("Ignore rule application requires a reason.");
  });

  it("rejects unsafe regex and enforces bank account profile scope", async () => {
    const { service, prisma } = makeService();
    await expect(
      service.createRule("org-1", "user-1", {
        name: "Unsafe",
        descriptionRegex: "(a+)+",
        actionType: BankRuleActionType.SUGGEST_MATCH_CANDIDATES,
      }),
    ).rejects.toThrow(BadRequestException);

    prisma.bankRule.findFirst.mockResolvedValue(rule({ bankAccountProfileId: "other-bank" }));
    await expect(service.applySuggestion("org-1", "user-1", "row-1", { ruleId: "rule-1" })).rejects.toThrow(
      "Bank rule does not apply to this bank account profile.",
    );
  });

  it("does not expose rules across organizations", async () => {
    const { service, prisma } = makeService();
    prisma.bankRule.findFirst.mockResolvedValue(null);

    await expect(service.updateRule("other-org", "user-1", "rule-1", { name: "No access" })).rejects.toThrow(NotFoundException);
    expect(prisma.bankRule.findFirst).toHaveBeenCalledWith({ where: { id: "rule-1", organizationId: "other-org" }, include: expect.any(Object) });
  });
});
