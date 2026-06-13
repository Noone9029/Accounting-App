import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { getJournalTotals, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";
import {
  AccountType,
  BankDepositBatchLineSourceType,
  BankDepositBatchStatus,
  BankReconciliationStatus,
  CardSettlementStatus,
  CardSettlementType,
  ChequeInstrumentStatus,
  ChequeInstrumentType,
  CustomerPaymentStatus,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateBankingClearingAccountConfigDto } from "./dto/banking-clearing-account-config.dto";

const accountSelect = { id: true, code: true, name: true, type: true, allowPosting: true, isActive: true } satisfies Prisma.AccountSelect;

const configInclude = {
  undepositedFundsAccount: { select: accountSelect },
  chequeInHandAccount: { select: accountSelect },
  outstandingChequesAccount: { select: accountSelect },
  cardClearingAccount: { select: accountSelect },
  creditCardLiabilityAccount: { select: accountSelect },
  prepaidCardAssetAccount: { select: accountSelect },
  updatedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.BankingClearingAccountConfigInclude;

const depositInclude = {
  bankAccountProfile: {
    select: {
      id: true,
      displayName: true,
      currency: true,
      accountId: true,
      account: { select: accountSelect },
    },
  },
  statementTransaction: { select: { id: true, transactionDate: true, bankAccountProfileId: true } },
  postedJournalEntry: { select: { id: true, entryNumber: true, status: true } },
  lines: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.BankDepositBatchInclude;

const cardInclude = {
  fundingBankAccountProfile: {
    select: {
      id: true,
      displayName: true,
      currency: true,
      accountId: true,
      account: { select: accountSelect },
    },
  },
  cardAccountProfile: {
    select: {
      id: true,
      displayName: true,
      currency: true,
      accountId: true,
      account: { select: accountSelect },
    },
  },
  statementTransaction: { select: { id: true, transactionDate: true, bankAccountProfileId: true } },
  postedJournalEntry: { select: { id: true, entryNumber: true, status: true } },
} satisfies Prisma.CardSettlementInclude;

const chequeInclude = {
  bankAccountProfile: { select: { id: true, displayName: true, currency: true, accountId: true, account: { select: accountSelect } } },
  depositBatch: { select: { id: true, status: true, postedJournalEntryId: true } },
  statementTransaction: { select: { id: true, transactionDate: true, bankAccountProfileId: true } },
  postedJournalEntry: { select: { id: true, entryNumber: true, status: true } },
} satisfies Prisma.ChequeInstrumentInclude;

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type Config = Prisma.BankingClearingAccountConfigGetPayload<{ include: typeof configInclude }>;
type Deposit = Prisma.BankDepositBatchGetPayload<{ include: typeof depositInclude }>;
type CardSettlement = Prisma.CardSettlementGetPayload<{ include: typeof cardInclude }>;
type Cheque = Prisma.ChequeInstrumentGetPayload<{ include: typeof chequeInclude }>;
type PostingAccount = { id: string; code: string; name: string; type: AccountType; allowPosting: boolean; isActive: boolean };

type JournalPreviewLine = {
  side: "DEBIT" | "CREDIT";
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: string;
  description: string;
};

type Preflight = {
  status: "READY" | "BLOCKED" | "POSTED" | "OPERATIONAL_ONLY";
  ready: boolean;
  reasons: string[];
  warnings: string[];
  journalEntryId?: string | null;
  journalEntryNumber?: string | null;
  journalPreview?: {
    entryDate: Date;
    description: string;
    reference: string;
    currency: string;
    totalDebit: string;
    totalCredit: string;
    lines: JournalPreviewLine[];
  };
  journalLines?: JournalLineInput[];
};

@Injectable()
export class BankingAccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly fiscalPeriodGuardService: FiscalPeriodGuardService,
  ) {}

  async getConfig(organizationId: string) {
    const config = await this.prisma.bankingClearingAccountConfig.findUnique({ where: { organizationId }, include: configInclude });
    return {
      config,
      validation: config ? this.validateConfigObject(config) : this.emptyConfigValidation(),
      warnings: [
        "Manual banking remains manual-only. No live bank feed, bank API, bank credential storage, or payment initiation is enabled by this configuration.",
        "Existing operational deposit, card, and cheque records are not silently converted or posted.",
      ],
    };
  }

  async updateConfig(organizationId: string, actorUserId: string, dto: UpdateBankingClearingAccountConfigDto) {
    await this.validateAccountIds(organizationId, dto);
    const existing = await this.prisma.bankingClearingAccountConfig.findUnique({ where: { organizationId }, include: configInclude });
    const data = this.cleanConfigDto(dto);
    const config = await this.prisma.bankingClearingAccountConfig.upsert({
      where: { organizationId },
      create: { organizationId, ...data, createdById: actorUserId, updatedById: actorUserId },
      update: { ...data, updatedById: actorUserId },
      include: configInclude,
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.BANKING_CLEARING_ACCOUNT_CONFIG_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.BANKING_CLEARING_ACCOUNT_CONFIG,
      entityId: config.id,
      before: existing,
      after: config,
    });
    return { config, validation: this.validateConfigObject(config) };
  }

  async validateConfig(organizationId: string, dto: UpdateBankingClearingAccountConfigDto) {
    const accounts = await this.validateAccountIds(organizationId, dto);
    const reasons: string[] = [];
    const warnings: string[] = [];
    for (const result of accounts) {
      if (!result.valid) {
        reasons.push(result.reason);
      }
    }
    if (dto.enabled && reasons.length > 0) {
      warnings.push("Config can be saved, but posting remains blocked for invalid or missing account paths.");
    }
    return { valid: reasons.length === 0, reasons, warnings, accounts };
  }

  async depositPreflight(organizationId: string, id: string): Promise<Omit<Preflight, "journalLines">> {
    return this.stripInternalLines(await this.buildDepositPreflight(organizationId, id));
  }

  async cardSettlementPreflight(organizationId: string, id: string): Promise<Omit<Preflight, "journalLines">> {
    return this.stripInternalLines(await this.buildCardSettlementPreflight(organizationId, id));
  }

  async chequePreflight(organizationId: string, id: string): Promise<Omit<Preflight, "journalLines">> {
    const cheque = await this.findCheque(organizationId, id);
    if (cheque.postedJournalEntryId) {
      return {
        status: "POSTED",
        ready: false,
        reasons: ["Cheque already has a linked journal entry."],
        warnings: [],
        journalEntryId: cheque.postedJournalEntryId,
        journalEntryNumber: cheque.postedJournalEntry?.entryNumber ?? null,
      };
    }
    return {
      status: "OPERATIONAL_ONLY",
      ready: false,
      reasons: [
        cheque.chequeType === ChequeInstrumentType.RECEIVED
          ? "Direct received-cheque journal posting remains deferred because source recognition would require an explicit receivable/customer-payment policy."
          : "Direct issued-cheque journal posting remains deferred because outstanding-cheque recognition would require an explicit bill/payment source policy.",
      ],
      warnings: [
        "Cheque matching, deposit links, clearing, bounce, and void remain operational-only unless a later accountant-reviewed source-accounting policy is added.",
      ],
      journalEntryId: null,
      journalEntryNumber: null,
    };
  }

  async postDepositJournal(organizationId: string, actorUserId: string, id: string) {
    const preflight = await this.buildDepositPreflight(organizationId, id);
    this.assertReady(preflight);
    const journalEntry = await this.prisma.$transaction(async (tx) => {
      await this.fiscalPeriodGuardService.assertPostingDateAllowed(organizationId, preflight.journalPreview!.entryDate, tx);
      const entry = await this.createPostedJournal(organizationId, actorUserId, preflight, tx);
      const claim = await tx.bankDepositBatch.updateMany({
        where: { id, organizationId, postedJournalEntryId: null, status: { in: [BankDepositBatchStatus.POSTED, BankDepositBatchStatus.MATCHED] } },
        data: { postedJournalEntryId: entry.id },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Deposit batch journal posting could not be claimed safely.");
      }
      return entry;
    });
    const posted = await this.prisma.bankDepositBatch.findFirstOrThrow({ where: { id, organizationId }, include: depositInclude });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.BANK_DEPOSIT_BATCH_JOURNAL_POSTED,
      entityType: AUDIT_ENTITY_TYPES.BANK_DEPOSIT_BATCH,
      entityId: id,
      after: posted,
    });
    return { record: posted, journalEntry };
  }

  async postCardSettlementJournal(organizationId: string, actorUserId: string, id: string) {
    const preflight = await this.buildCardSettlementPreflight(organizationId, id);
    this.assertReady(preflight);
    const journalEntry = await this.prisma.$transaction(async (tx) => {
      await this.fiscalPeriodGuardService.assertPostingDateAllowed(organizationId, preflight.journalPreview!.entryDate, tx);
      const entry = await this.createPostedJournal(organizationId, actorUserId, preflight, tx);
      const claim = await tx.cardSettlement.updateMany({
        where: { id, organizationId, postedJournalEntryId: null, status: { in: [CardSettlementStatus.POSTED, CardSettlementStatus.MATCHED] } },
        data: { postedJournalEntryId: entry.id },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Card settlement journal posting could not be claimed safely.");
      }
      return entry;
    });
    const posted = await this.prisma.cardSettlement.findFirstOrThrow({ where: { id, organizationId }, include: cardInclude });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CARD_SETTLEMENT_JOURNAL_POSTED,
      entityType: AUDIT_ENTITY_TYPES.CARD_SETTLEMENT,
      entityId: id,
      after: posted,
    });
    return { record: posted, journalEntry };
  }

  async postChequeJournal(organizationId: string, _actorUserId: string, id: string) {
    const preflight = await this.chequePreflight(organizationId, id);
    throw new BadRequestException(preflight.reasons.join(" "));
  }

  private async buildDepositPreflight(organizationId: string, id: string): Promise<Preflight> {
    const batch = await this.findDeposit(organizationId, id);
    if (batch.postedJournalEntryId) {
      return this.alreadyPosted(batch.postedJournalEntryId, batch.postedJournalEntry?.entryNumber);
    }
    const reasons: string[] = [];
    const warnings: string[] = ["Deposit journal posting is explicit and does not allocate invoices, create revenue, match statement rows, or reconcile records."];
    const configResult = await this.getConfigForPreflight(organizationId);
    if (configResult.reason) {
      reasons.push(configResult.reason);
    }

    const depositPostableStatuses: BankDepositBatchStatus[] = [BankDepositBatchStatus.POSTED, BankDepositBatchStatus.MATCHED];
    if (!depositPostableStatuses.includes(batch.status)) {
      reasons.push("Only posted or matched deposit batches can be journal-posted.");
    }
    if (toMoney(batch.totalAmount).lte(0) || batch.lines.length === 0) {
      reasons.push("Deposit batch must have at least one positive line.");
    }
    this.addAccountReason(reasons, batch.bankAccountProfile.account, AccountType.ASSET, "Deposit bank account");
    if (batch.status === BankDepositBatchStatus.MATCHED && batch.statementTransaction) {
      await this.addClosedReconciliationReason(reasons, organizationId, batch.statementTransaction.bankAccountProfileId, batch.statementTransaction.transactionDate);
    }

    const credits: JournalLineInput[] = [];
    for (const line of batch.lines) {
      const amount = this.money(line.amount);
      if (amount.lte(0)) {
        reasons.push(`Deposit line ${line.reference ?? line.id} must be greater than zero.`);
        continue;
      }
      if (line.currency !== batch.currency) {
        reasons.push(`Deposit line ${line.reference ?? line.id} currency does not match the batch currency.`);
        continue;
      }
      const creditAccount = configResult.config
        ? await this.resolveDepositCreditAccount(organizationId, line, batch, configResult.config, reasons, warnings)
        : null;
      if (!creditAccount) {
        continue;
      }
      credits.push({
        accountId: creditAccount.id,
        debit: "0.0000",
        credit: amount.toFixed(4),
        description: `Deposit source ${line.reference ?? line.sourceType}`,
        currency: batch.currency,
        exchangeRate: "1",
      });
    }

    const journalLines: JournalLineInput[] = [
      {
        accountId: batch.bankAccountProfile.accountId,
        debit: this.money(batch.totalAmount).toFixed(4),
        credit: "0.0000",
        description: `Bank deposit ${this.dateLabel(batch.depositDate)}`,
        currency: batch.currency,
        exchangeRate: "1",
      },
      ...credits,
    ];
    return this.preflightFromLines({
      reasons,
      warnings,
      journalLines,
      entryDate: batch.depositDate,
      description: `Bank deposit clearing journal - ${batch.bankAccountProfile.displayName}`,
      reference: `BANK-DEPOSIT-${batch.id}`,
      currency: batch.currency,
      accountLookup: await this.accountLookup(organizationId, journalLines.map((line) => line.accountId)),
    });
  }

  private async buildCardSettlementPreflight(organizationId: string, id: string): Promise<Preflight> {
    const settlement = await this.findCardSettlement(organizationId, id);
    if (settlement.postedJournalEntryId) {
      return this.alreadyPosted(settlement.postedJournalEntryId, settlement.postedJournalEntry?.entryNumber);
    }
    const reasons: string[] = [];
    const warnings: string[] = ["Card settlement journal posting is explicit and does not create expenses, reverse expenses, or change AP/AR allocations."];
    const configResult = await this.getConfigForPreflight(organizationId);
    if (configResult.reason) {
      reasons.push(configResult.reason);
    }
    const cardPostableStatuses: CardSettlementStatus[] = [CardSettlementStatus.POSTED, CardSettlementStatus.MATCHED];
    if (!cardPostableStatuses.includes(settlement.status)) {
      reasons.push("Only posted or matched card settlements can be journal-posted.");
    }
    if (toMoney(settlement.amount).lte(0)) {
      reasons.push("Card settlement amount must be greater than zero.");
    }
    if (settlement.status === CardSettlementStatus.MATCHED && settlement.statementTransaction) {
      await this.addClosedReconciliationReason(reasons, organizationId, settlement.statementTransaction.bankAccountProfileId, settlement.statementTransaction.transactionDate);
    }
    if (settlement.settlementType === CardSettlementType.CREDIT_CARD_CREDIT) {
      reasons.push("Credit-card credits/refunds remain operational-only until a safe offset or clearing policy is confirmed.");
    }
    if (!settlement.fundingBankAccountProfile && settlement.settlementType !== CardSettlementType.CREDIT_CARD_CREDIT) {
      reasons.push("Funding bank account is required for card paydowns and prepaid top-ups.");
    }
    if (settlement.fundingBankAccountProfile) {
      this.addAccountReason(reasons, settlement.fundingBankAccountProfile.account, AccountType.ASSET, "Funding bank account");
    }

    let debitAccount: PostingAccount | null = null;
    if (configResult.config && settlement.settlementType === CardSettlementType.CREDIT_CARD_PAYDOWN) {
      debitAccount = this.configAccount(configResult.config.creditCardLiabilityAccount, AccountType.LIABILITY, "Credit-card liability account", reasons);
    }
    if (configResult.config && settlement.settlementType === CardSettlementType.PREPAID_CARD_TOP_UP) {
      debitAccount = this.configAccount(configResult.config.prepaidCardAssetAccount, AccountType.ASSET, "Prepaid-card asset account", reasons);
    }
    const fundingAccount = settlement.fundingBankAccountProfile?.account;
    const journalLines: JournalLineInput[] =
      debitAccount && fundingAccount
        ? [
            {
              accountId: debitAccount.id,
              debit: this.money(settlement.amount).toFixed(4),
              credit: "0.0000",
              description: this.cardSettlementLineDescription(settlement),
              currency: settlement.currency,
              exchangeRate: "1",
            },
            {
              accountId: fundingAccount.id,
              debit: "0.0000",
              credit: this.money(settlement.amount).toFixed(4),
              description: `Funding bank account ${settlement.fundingBankAccountProfile!.displayName}`,
              currency: settlement.currency,
              exchangeRate: "1",
            },
          ]
        : [];

    return this.preflightFromLines({
      reasons,
      warnings,
      journalLines,
      entryDate: settlement.settlementDate,
      description: `Card settlement clearing journal - ${settlement.cardAccountProfile.displayName}`,
      reference: `CARD-SETTLEMENT-${settlement.id}`,
      currency: settlement.currency,
      accountLookup: await this.accountLookup(organizationId, journalLines.map((line) => line.accountId)),
    });
  }

  private async resolveDepositCreditAccount(
    organizationId: string,
    line: Deposit["lines"][number],
    batch: Deposit,
    config: Config,
    reasons: string[],
    warnings: string[],
  ): Promise<PostingAccount | null> {
    if (line.sourceType === BankDepositBatchLineSourceType.CUSTOMER_PAYMENT) {
      if (!line.sourceId) {
        reasons.push("Customer payment deposit line is missing its source id.");
        return null;
      }
      const payment = await this.prisma.customerPayment.findFirst({
        where: { id: line.sourceId, organizationId },
        select: {
          id: true,
          paymentNumber: true,
          status: true,
          amountReceived: true,
          currency: true,
          voidReversalJournalEntryId: true,
          accountId: true,
          account: { select: accountSelect },
        },
      });
      if (!payment) {
        reasons.push(`Customer payment source ${line.sourceId} does not belong to this organization.`);
        return null;
      }
      if (payment.status !== CustomerPaymentStatus.POSTED || payment.voidReversalJournalEntryId) {
        reasons.push(`Customer payment ${payment.paymentNumber} must be posted and non-voided.`);
      }
      if (payment.currency !== batch.currency || !this.money(payment.amountReceived).eq(line.amount)) {
        reasons.push(`Customer payment ${payment.paymentNumber} amount and currency must match the deposit line.`);
      }
      if (payment.accountId === batch.bankAccountProfile.accountId) {
        reasons.push(`Customer payment ${payment.paymentNumber} is already posted to this bank account; moving it again would duplicate bank activity.`);
        return null;
      }
      this.addAccountReason(reasons, payment.account, AccountType.ASSET, `Customer payment ${payment.paymentNumber} paid-through account`);
      return payment.account;
    }
    if (line.sourceType === BankDepositBatchLineSourceType.CHEQUE_PLACEHOLDER) {
      const cheque = line.sourceId
        ? await this.prisma.chequeInstrument.findFirst({
            where: { id: line.sourceId, organizationId },
            select: { id: true, chequeNumber: true, status: true, postedJournalEntryId: true, chequeType: true },
          })
        : null;
      if (!cheque || cheque.chequeType !== ChequeInstrumentType.RECEIVED) {
        reasons.push(`Cheque line ${line.reference ?? line.id} must reference a received cheque in this organization.`);
        return null;
      }
      if (!cheque.postedJournalEntryId) {
        reasons.push(`Cheque ${cheque.chequeNumber} has not been recognized into cheque-in-hand, so deposit accounting remains operational-only.`);
        return null;
      }
      return this.configAccount(config.chequeInHandAccount, AccountType.ASSET, "Cheque-in-hand account", reasons);
    }
    warnings.push(`Deposit line ${line.reference ?? line.sourceType} uses configured undeposited funds because it has no source-specific posting account.`);
    return this.configAccount(config.undepositedFundsAccount, AccountType.ASSET, "Undeposited funds account", reasons);
  }

  private async getConfigForPreflight(organizationId: string): Promise<{ config: Config | null; reason: string | null }> {
    const config = await this.prisma.bankingClearingAccountConfig.findUnique({ where: { organizationId }, include: configInclude });
    if (!config) {
      return { config: null, reason: "Banking clearing-account config is missing." };
    }
    if (!config.enabled) {
      return { config: null, reason: "Banking clearing-account config is disabled." };
    }
    return { config, reason: null };
  }

  private async findDeposit(organizationId: string, id: string): Promise<Deposit> {
    const batch = await this.prisma.bankDepositBatch.findFirst({ where: { id, organizationId }, include: depositInclude });
    if (!batch) {
      throw new NotFoundException("Bank deposit batch not found.");
    }
    return batch;
  }

  private async findCardSettlement(organizationId: string, id: string): Promise<CardSettlement> {
    const settlement = await this.prisma.cardSettlement.findFirst({ where: { id, organizationId }, include: cardInclude });
    if (!settlement) {
      throw new NotFoundException("Card settlement not found.");
    }
    return settlement;
  }

  private async findCheque(organizationId: string, id: string): Promise<Cheque> {
    const cheque = await this.prisma.chequeInstrument.findFirst({ where: { id, organizationId }, include: chequeInclude });
    if (!cheque) {
      throw new NotFoundException("Cheque not found.");
    }
    return cheque;
  }

  private async validateAccountIds(organizationId: string, dto: UpdateBankingClearingAccountConfigDto) {
    const checks = [
      ["undepositedFundsAccountId", dto.undepositedFundsAccountId, [AccountType.ASSET], "Undeposited funds account"],
      ["chequeInHandAccountId", dto.chequeInHandAccountId, [AccountType.ASSET], "Cheque-in-hand account"],
      ["outstandingChequesAccountId", dto.outstandingChequesAccountId, [AccountType.LIABILITY], "Outstanding cheques account"],
      ["cardClearingAccountId", dto.cardClearingAccountId, [AccountType.ASSET, AccountType.LIABILITY], "Card clearing account"],
      ["creditCardLiabilityAccountId", dto.creditCardLiabilityAccountId, [AccountType.LIABILITY], "Credit-card liability account"],
      ["prepaidCardAssetAccountId", dto.prepaidCardAssetAccountId, [AccountType.ASSET], "Prepaid-card asset account"],
    ] as const;
    const results = [];
    for (const [field, accountId, allowedTypes, label] of checks) {
      if (!accountId) {
        results.push({ field, accountId: null, valid: true, reason: "" });
        continue;
      }
      const account = await this.prisma.account.findFirst({ where: { id: accountId, organizationId }, select: accountSelect });
      const reason = this.accountValidationReason(account, [...allowedTypes], label);
      results.push({ field, accountId, valid: !reason, reason, account });
    }
    return results;
  }

  private cleanConfigDto(dto: UpdateBankingClearingAccountConfigDto) {
    return {
      enabled: dto.enabled ?? false,
      undepositedFundsAccountId: dto.undepositedFundsAccountId ?? null,
      chequeInHandAccountId: dto.chequeInHandAccountId ?? null,
      outstandingChequesAccountId: dto.outstandingChequesAccountId ?? null,
      cardClearingAccountId: dto.cardClearingAccountId ?? null,
      creditCardLiabilityAccountId: dto.creditCardLiabilityAccountId ?? null,
      prepaidCardAssetAccountId: dto.prepaidCardAssetAccountId ?? null,
    };
  }

  private validateConfigObject(config: Config) {
    const reasons = [
      this.accountValidationReason(config.undepositedFundsAccount, [AccountType.ASSET], "Undeposited funds account"),
      this.accountValidationReason(config.chequeInHandAccount, [AccountType.ASSET], "Cheque-in-hand account"),
      this.accountValidationReason(config.outstandingChequesAccount, [AccountType.LIABILITY], "Outstanding cheques account"),
      this.accountValidationReason(config.cardClearingAccount, [AccountType.ASSET, AccountType.LIABILITY], "Card clearing account"),
      this.accountValidationReason(config.creditCardLiabilityAccount, [AccountType.LIABILITY], "Credit-card liability account"),
      this.accountValidationReason(config.prepaidCardAssetAccount, [AccountType.ASSET], "Prepaid-card asset account"),
    ].filter(Boolean);
    return { valid: reasons.length === 0, enabled: config.enabled, reasons };
  }

  private emptyConfigValidation() {
    return { valid: false, enabled: false, reasons: ["Banking clearing-account config has not been saved."] };
  }

  private accountValidationReason(account: PostingAccount | null | undefined, allowedTypes: AccountType[], label: string) {
    if (!account) {
      return `${label} is not configured.`;
    }
    if (!account.isActive || !account.allowPosting) {
      return `${label} must be an active posting account.`;
    }
    if (!allowedTypes.includes(account.type)) {
      return `${label} must be ${allowedTypes.join(" or ")}.`;
    }
    return "";
  }

  private addAccountReason(reasons: string[], account: PostingAccount, expectedType: AccountType, label: string) {
    const reason = this.accountValidationReason(account, [expectedType], label);
    if (reason) {
      reasons.push(reason);
    }
  }

  private configAccount(account: PostingAccount | null | undefined, expectedType: AccountType, label: string, reasons: string[]) {
    const reason = this.accountValidationReason(account, [expectedType], label);
    if (reason) {
      reasons.push(reason);
      return null;
    }
    return account!;
  }

  private preflightFromLines(input: {
    reasons: string[];
    warnings: string[];
    journalLines: JournalLineInput[];
    entryDate: Date;
    description: string;
    reference: string;
    currency: string;
    accountLookup: Map<string, PostingAccount>;
  }): Preflight {
    if (input.journalLines.length < 2) {
      input.reasons.push("Journal preview requires at least two lines.");
    }
    const totals = getJournalTotals(input.journalLines);
    if (!this.money(totals.debit).eq(totals.credit)) {
      input.reasons.push("Journal preview is not balanced.");
    }
    const previewLines: JournalPreviewLine[] = input.journalLines.map((line) => {
      const account = input.accountLookup.get(line.accountId);
      const side: JournalPreviewLine["side"] = this.money(line.debit).gt(0) ? "DEBIT" : "CREDIT";
      return {
        side,
        accountId: line.accountId,
        accountCode: account?.code ?? "",
        accountName: account?.name ?? "",
        amount: this.money(line.debit).gt(0) ? this.money(line.debit).toFixed(4) : this.money(line.credit).toFixed(4),
        description: line.description ?? "",
      };
    });
    return {
      status: input.reasons.length === 0 ? "READY" : "BLOCKED",
      ready: input.reasons.length === 0,
      reasons: input.reasons,
      warnings: input.warnings,
      journalLines: input.journalLines,
      journalPreview: {
        entryDate: input.entryDate,
        description: input.description,
        reference: input.reference,
        currency: input.currency,
        totalDebit: this.money(totals.debit).toFixed(4),
        totalCredit: this.money(totals.credit).toFixed(4),
        lines: previewLines,
      },
    };
  }

  private async accountLookup(organizationId: string, accountIds: string[]) {
    const uniqueIds = [...new Set(accountIds)];
    if (uniqueIds.length === 0) {
      return new Map<string, PostingAccount>();
    }
    const accounts = await this.prisma.account.findMany({ where: { organizationId, id: { in: uniqueIds } }, select: accountSelect });
    return new Map(accounts.map((account) => [account.id, account]));
  }

  private async createPostedJournal(
    organizationId: string,
    actorUserId: string,
    preflight: Preflight,
    tx: Prisma.TransactionClient,
  ) {
    const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
    return tx.journalEntry.create({
      data: {
        organizationId,
        entryNumber,
        status: JournalEntryStatus.POSTED,
        entryDate: preflight.journalPreview!.entryDate,
        description: preflight.journalPreview!.description,
        reference: preflight.journalPreview!.reference,
        currency: preflight.journalPreview!.currency,
        totalDebit: preflight.journalPreview!.totalDebit,
        totalCredit: preflight.journalPreview!.totalCredit,
        postedAt: new Date(),
        postedById: actorUserId,
        createdById: actorUserId,
        lines: { create: this.toJournalLineCreateMany(organizationId, preflight.journalLines!) },
      },
      select: { id: true, entryNumber: true, status: true, totalDebit: true, totalCredit: true },
    });
  }

  private toJournalLineCreateMany(organizationId: string, lines: JournalLineInput[]): Prisma.JournalLineCreateWithoutJournalEntryInput[] {
    return lines.map((line, index) => ({
      organization: { connect: { id: organizationId } },
      account: { connect: { id: line.accountId } },
      lineNumber: index + 1,
      description: line.description,
      debit: String(line.debit),
      credit: String(line.credit),
      currency: line.currency,
      exchangeRate: line.exchangeRate === undefined ? "1" : String(line.exchangeRate),
    }));
  }

  private async addClosedReconciliationReason(reasons: string[], organizationId: string, bankAccountProfileId: string, transactionDate?: Date | null) {
    if (!transactionDate) {
      reasons.push("Statement transaction date is required for reconciliation lock checks.");
      return;
    }
    const closed = await this.prisma.bankReconciliation.findFirst({
      where: {
        organizationId,
        bankAccountProfileId,
        status: BankReconciliationStatus.CLOSED,
        periodStart: { lte: transactionDate },
        periodEnd: { gte: transactionDate },
      },
      select: { reconciliationNumber: true },
    });
    if (closed) {
      reasons.push(`Statement transaction belongs to closed reconciliation ${closed.reconciliationNumber}.`);
    }
  }

  private alreadyPosted(journalEntryId: string, journalEntryNumber?: string | null): Preflight {
    return {
      status: "POSTED",
      ready: false,
      reasons: ["Record already has a linked journal entry."],
      warnings: [],
      journalEntryId,
      journalEntryNumber: journalEntryNumber ?? null,
    };
  }

  private assertReady(preflight: Preflight) {
    if (!preflight.ready) {
      throw new BadRequestException(preflight.reasons.join(" "));
    }
  }

  private stripInternalLines(preflight: Preflight): Omit<Preflight, "journalLines"> {
    const { journalLines: _journalLines, ...publicPreflight } = preflight;
    return publicPreflight;
  }

  private cardSettlementLineDescription(settlement: CardSettlement) {
    if (settlement.settlementType === CardSettlementType.CREDIT_CARD_PAYDOWN) {
      return `Credit-card paydown ${settlement.reference ?? settlement.id}`;
    }
    return `Prepaid-card top-up ${settlement.reference ?? settlement.id}`;
  }

  private money(value: unknown) {
    return toMoney(String(value ?? "0"));
  }

  private dateLabel(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
