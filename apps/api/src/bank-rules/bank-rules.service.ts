import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  BankRule,
  BankRuleActionType,
  BankRuleApplicationStatus,
  BankRuleApplicationType,
  BankRuleDirection,
  BankStatementTransactionStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { BankStatementService } from "../bank-statements/bank-statement.service";
import { ApplyBankRuleSuggestionDto, CreateBankRuleDto, DryRunBankRuleDto, UpdateBankRuleDto } from "./dto/bank-rule.dto";
import {
  evaluateBankRule,
  evaluateBankRules,
  isSafeBankRuleRegex,
  type BankRuleEvaluationRule,
  type BankRuleEvaluationTransaction,
  type BankRuleSuggestion,
} from "./bank-rule-evaluator";

const bankRuleInclude = {
  bankAccountProfile: { select: { id: true, displayName: true, currency: true } },
  categorizeAccount: { select: { id: true, code: true, name: true, type: true } },
};

type BankRuleWithInclude = BankRule & {
  bankAccountProfile?: { id: string; displayName: string; currency: string } | null;
  categorizeAccount?: { id: string; code: string; name: string; type: string } | null;
};

@Injectable()
export class BankRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bankStatementService: BankStatementService,
  ) {}

  async listRules(organizationId: string, bankAccountProfileId?: string) {
    return this.prisma.bankRule.findMany({
      where: {
        organizationId,
        ...(bankAccountProfileId ? { OR: [{ bankAccountProfileId }, { bankAccountProfileId: null }] } : {}),
      },
      orderBy: [{ priority: "asc" }, { name: "asc" }, { createdAt: "asc" }],
      include: bankRuleInclude,
    });
  }

  async createRule(organizationId: string, actorUserId: string, dto: CreateBankRuleDto) {
    await this.validateRuleReferences(organizationId, dto);
    this.validateRuleDefinition(dto);

    return this.prisma.bankRule.create({
      data: this.ruleCreateData(organizationId, actorUserId, dto),
      include: bankRuleInclude,
    });
  }

  async updateRule(organizationId: string, actorUserId: string, id: string, dto: UpdateBankRuleDto) {
    const existing = await this.findRule(organizationId, id);
    const merged = { ...this.ruleToDto(existing), ...dto };
    await this.validateRuleReferences(organizationId, merged);
    this.validateRuleDefinition(merged);

    return this.prisma.bankRule.update({
      where: { id },
      data: this.ruleUpdateData(actorUserId, dto),
      include: bankRuleInclude,
    });
  }

  async disableRule(organizationId: string, actorUserId: string, id: string) {
    await this.findRule(organizationId, id);
    return this.prisma.bankRule.update({
      where: { id },
      data: { enabled: false, updatedById: actorUserId },
      include: bankRuleInclude,
    });
  }

  async dryRunRule(organizationId: string, id: string, dto: DryRunBankRuleDto) {
    const rule = await this.findRule(organizationId, id);
    const bankAccountProfileId = dto.bankAccountProfileId ?? rule.bankAccountProfileId;
    const rows = await this.prisma.bankStatementTransaction.findMany({
      where: {
        organizationId,
        ...(bankAccountProfileId ? { bankAccountProfileId } : {}),
        status: BankStatementTransactionStatus.UNMATCHED,
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: dto.limit ?? 25,
      include: {
        import: { select: { sourceType: true } },
        bankAccountProfile: { select: { id: true, currency: true } },
      },
    });

    const normalizedRule = this.toEvaluationRule(rule);
    return {
      rule,
      checkedCount: rows.length,
      suggestions: rows
        .map((row) => {
          const suggestion = evaluateBankRule(this.toEvaluationTransaction(row), normalizedRule);
          return suggestion ? { transaction: row, suggestion } : null;
        })
        .filter((result): result is { transaction: (typeof rows)[number]; suggestion: BankRuleSuggestion } => result !== null),
    };
  }

  async suggestionsForTransaction(organizationId: string, transactionId: string) {
    const transaction = await this.bankStatementService.getTransaction(organizationId, transactionId);
    if (transaction.status !== BankStatementTransactionStatus.UNMATCHED) {
      return { transaction, suggestions: [] };
    }
    const rules = await this.prisma.bankRule.findMany({
      where: {
        organizationId,
        enabled: true,
        OR: [{ bankAccountProfileId: transaction.bankAccountProfileId }, { bankAccountProfileId: null }],
      },
      orderBy: [{ priority: "asc" }, { name: "asc" }, { createdAt: "asc" }],
      include: bankRuleInclude,
    });

    return {
      transaction,
      suggestions: evaluateBankRules(this.toEvaluationTransaction(transaction), rules.map((rule) => this.toEvaluationRule(rule))),
    };
  }

  async applySuggestion(organizationId: string, actorUserId: string, transactionId: string, dto: ApplyBankRuleSuggestionDto) {
    const rule = await this.findRule(organizationId, dto.ruleId);
    const transaction = await this.bankStatementService.getTransaction(organizationId, transactionId);
    if (rule.bankAccountProfileId && rule.bankAccountProfileId !== transaction.bankAccountProfileId) {
      throw new BadRequestException("Bank rule does not apply to this bank account profile.");
    }
    const suggestion = evaluateBankRule(this.toEvaluationTransaction(transaction), this.toEvaluationRule(rule));
    if (!suggestion) {
      throw new BadRequestException("Bank rule no longer matches this statement transaction.");
    }
    const actionType = dto.actionType ?? rule.actionType;
    const matchedReasons = suggestion.matchedReasons;

    try {
      const result = await this.applyRuleAction(organizationId, actorUserId, transactionId, rule, actionType, dto);
      await this.prisma.bankRuleApplication.create({
        data: {
          organizationId,
          bankRuleId: rule.id,
          bankStatementTransactionId: transactionId,
          bankAccountProfileId: transaction.bankAccountProfileId,
          actionType,
          evaluationType: BankRuleApplicationType.APPLIED,
          status: BankRuleApplicationStatus.APPLIED,
          matchedReasons: matchedReasons as Prisma.InputJsonValue,
          result: { transactionStatus: result.status } as Prisma.InputJsonValue,
          appliedById: actorUserId,
        },
      });
      await this.prisma.bankRule.update({ where: { id: rule.id }, data: { lastAppliedAt: new Date() } });
      return { transaction: result, suggestion: { ...suggestion, actionType }, applied: true };
    } catch (error) {
      await this.prisma.bankRuleApplication.create({
        data: {
          organizationId,
          bankRuleId: rule.id,
          bankStatementTransactionId: transactionId,
          bankAccountProfileId: transaction.bankAccountProfileId,
          actionType,
          evaluationType: BankRuleApplicationType.APPLIED,
          status: BankRuleApplicationStatus.FAILED,
          matchedReasons: matchedReasons as Prisma.InputJsonValue,
          result: { error: error instanceof Error ? error.message : "Rule application failed." } as Prisma.InputJsonValue,
          appliedById: actorUserId,
        },
      });
      throw error;
    }
  }

  private async applyRuleAction(
    organizationId: string,
    actorUserId: string,
    transactionId: string,
    rule: BankRule,
    actionType: BankRuleActionType,
    dto: ApplyBankRuleSuggestionDto,
  ) {
    if (actionType === BankRuleActionType.SUGGEST_CATEGORIZE || actionType === BankRuleActionType.CATEGORIZE) {
      const accountId = dto.accountId ?? rule.categorizeAccountId;
      if (!accountId) {
        throw new BadRequestException("Categorize rule application requires an account.");
      }
      return this.bankStatementService.categorizeTransaction(organizationId, actorUserId, transactionId, {
        accountId,
        description: dto.description,
      });
    }
    if (actionType === BankRuleActionType.SUGGEST_IGNORE || actionType === BankRuleActionType.IGNORE) {
      const reason = dto.reason ?? rule.ignoreReason;
      if (!reason?.trim()) {
        throw new BadRequestException("Ignore rule application requires a reason.");
      }
      return this.bankStatementService.ignoreTransaction(organizationId, actorUserId, transactionId, { reason });
    }
    if (actionType === BankRuleActionType.SUGGEST_MATCH_CANDIDATES) {
      if (!dto.journalLineId) {
        return {
          ...(await this.bankStatementService.getTransaction(organizationId, transactionId)),
          matchCandidates: await this.bankStatementService.matchCandidates(organizationId, transactionId),
        };
      }
      return this.bankStatementService.matchTransaction(organizationId, actorUserId, transactionId, { journalLineId: dto.journalLineId });
    }
    throw new BadRequestException("Unsupported bank rule action.");
  }

  private async findRule(organizationId: string, id: string): Promise<BankRuleWithInclude> {
    const rule = await this.prisma.bankRule.findFirst({ where: { id, organizationId }, include: bankRuleInclude });
    if (!rule) {
      throw new NotFoundException("Bank rule not found.");
    }
    return rule;
  }

  private async validateRuleReferences(organizationId: string, dto: Partial<CreateBankRuleDto>) {
    if (dto.bankAccountProfileId) {
      const profile = await this.prisma.bankAccountProfile.findFirst({
        where: { id: dto.bankAccountProfileId, organizationId },
        select: { id: true },
      });
      if (!profile) {
        throw new BadRequestException("Bank account profile must belong to this organization.");
      }
    }
    if (dto.categorizeAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.categorizeAccountId, organizationId, isActive: true, allowPosting: true },
        select: { id: true },
      });
      if (!account) {
        throw new BadRequestException("Categorize account must be an active posting account in this organization.");
      }
    }
  }

  private validateRuleDefinition(dto: Partial<CreateBankRuleDto>) {
    if (dto.descriptionRegex && !isSafeBankRuleRegex(dto.descriptionRegex)) {
      throw new BadRequestException("Description regex is invalid or too complex.");
    }
    if (
      (dto.actionType === BankRuleActionType.CATEGORIZE || dto.actionType === BankRuleActionType.SUGGEST_CATEGORIZE) &&
      !dto.categorizeAccountId
    ) {
      throw new BadRequestException("Categorize rules require a categorize account.");
    }
    if ((dto.actionType === BankRuleActionType.IGNORE || dto.actionType === BankRuleActionType.SUGGEST_IGNORE) && !dto.ignoreReason?.trim()) {
      throw new BadRequestException("Ignore rules require an ignore reason.");
    }
    if (dto.autoApply) {
      throw new BadRequestException("Bank rules cannot auto-apply in this controlled-beta workflow.");
    }
  }

  private ruleCreateData(organizationId: string, actorUserId: string, dto: CreateBankRuleDto): Prisma.BankRuleCreateInput {
    return {
      organization: { connect: { id: organizationId } },
      bankAccountProfile: dto.bankAccountProfileId ? { connect: { id: dto.bankAccountProfileId } } : undefined,
      name: dto.name.trim(),
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 100,
      direction: dto.direction ?? BankRuleDirection.ANY,
      descriptionContains: clean(dto.descriptionContains),
      descriptionRegex: clean(dto.descriptionRegex),
      referenceContains: clean(dto.referenceContains),
      bankReferenceContains: clean(dto.bankReferenceContains),
      counterpartyContains: clean(dto.counterpartyContains),
      amountEquals: dto.amountEquals,
      amountMin: dto.amountMin,
      amountMax: dto.amountMax,
      currencyEquals: clean(dto.currencyEquals)?.toUpperCase(),
      sourceFormat: clean(dto.sourceFormat)?.toUpperCase(),
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      actionType: dto.actionType,
      categorizeAccount: dto.categorizeAccountId ? { connect: { id: dto.categorizeAccountId } } : undefined,
      ignoreReason: clean(dto.ignoreReason),
      autoApply: false,
      createdBy: { connect: { id: actorUserId } },
      updatedBy: { connect: { id: actorUserId } },
    };
  }

  private ruleUpdateData(actorUserId: string, dto: UpdateBankRuleDto): Prisma.BankRuleUpdateInput {
    return {
      name: dto.name === undefined ? undefined : dto.name.trim(),
      bankAccountProfile:
        dto.bankAccountProfileId === undefined
          ? undefined
          : dto.bankAccountProfileId
            ? { connect: { id: dto.bankAccountProfileId } }
            : { disconnect: true },
      enabled: dto.enabled,
      priority: dto.priority,
      direction: dto.direction,
      descriptionContains: dto.descriptionContains === undefined ? undefined : clean(dto.descriptionContains),
      descriptionRegex: dto.descriptionRegex === undefined ? undefined : clean(dto.descriptionRegex),
      referenceContains: dto.referenceContains === undefined ? undefined : clean(dto.referenceContains),
      bankReferenceContains: dto.bankReferenceContains === undefined ? undefined : clean(dto.bankReferenceContains),
      counterpartyContains: dto.counterpartyContains === undefined ? undefined : clean(dto.counterpartyContains),
      amountEquals: dto.amountEquals,
      amountMin: dto.amountMin,
      amountMax: dto.amountMax,
      currencyEquals: dto.currencyEquals === undefined ? undefined : clean(dto.currencyEquals)?.toUpperCase(),
      sourceFormat: dto.sourceFormat === undefined ? undefined : clean(dto.sourceFormat)?.toUpperCase(),
      startDate: dto.startDate === undefined ? undefined : new Date(dto.startDate),
      endDate: dto.endDate === undefined ? undefined : new Date(dto.endDate),
      actionType: dto.actionType,
      categorizeAccount:
        dto.categorizeAccountId === undefined
          ? undefined
          : dto.categorizeAccountId
            ? { connect: { id: dto.categorizeAccountId } }
            : { disconnect: true },
      ignoreReason: dto.ignoreReason === undefined ? undefined : clean(dto.ignoreReason),
      autoApply: false,
      updatedBy: { connect: { id: actorUserId } },
    };
  }

  private ruleToDto(rule: BankRuleWithInclude): CreateBankRuleDto {
    return {
      name: rule.name,
      bankAccountProfileId: rule.bankAccountProfileId ?? undefined,
      enabled: rule.enabled,
      priority: rule.priority,
      direction: rule.direction,
      descriptionContains: rule.descriptionContains ?? undefined,
      descriptionRegex: rule.descriptionRegex ?? undefined,
      referenceContains: rule.referenceContains ?? undefined,
      bankReferenceContains: rule.bankReferenceContains ?? undefined,
      counterpartyContains: rule.counterpartyContains ?? undefined,
      amountEquals: rule.amountEquals?.toString(),
      amountMin: rule.amountMin?.toString(),
      amountMax: rule.amountMax?.toString(),
      currencyEquals: rule.currencyEquals ?? undefined,
      sourceFormat: rule.sourceFormat ?? undefined,
      startDate: rule.startDate?.toISOString(),
      endDate: rule.endDate?.toISOString(),
      actionType: rule.actionType,
      categorizeAccountId: rule.categorizeAccountId ?? undefined,
      ignoreReason: rule.ignoreReason ?? undefined,
      autoApply: rule.autoApply,
    };
  }

  private toEvaluationRule(rule: BankRule): BankRuleEvaluationRule {
    return {
      ...rule,
      amountEquals: rule.amountEquals?.toString(),
      amountMin: rule.amountMin?.toString(),
      amountMax: rule.amountMax?.toString(),
    };
  }

  private toEvaluationTransaction(transaction: any): BankRuleEvaluationTransaction {
    return {
      id: transaction.id,
      bankAccountProfileId: transaction.bankAccountProfileId,
      transactionDate: transaction.transactionDate,
      description: transaction.description,
      reference: transaction.reference,
      bankReference: readRaw(transaction.rawData, "bankReference"),
      counterparty: readRaw(transaction.rawData, "counterparty"),
      currency: readRaw(transaction.rawData, "currency") ?? transaction.bankAccountProfile?.currency,
      sourceFormat: transaction.import?.sourceType,
      type: transaction.type,
      amount: transaction.amount?.toString?.() ?? transaction.amount,
      status: transaction.status,
    };
  }
}

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readRaw(rawData: unknown, key: string): string | null {
  if (!rawData || typeof rawData !== "object") {
    return null;
  }
  const raw = rawData as { normalized?: Record<string, unknown>; [key: string]: unknown };
  const value = raw.normalized?.[key] ?? raw[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
