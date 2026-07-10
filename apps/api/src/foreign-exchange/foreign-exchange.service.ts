import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountType, CurrencyRateSource, Prisma } from "@prisma/client";
import { convertTransactionToBaseAmount } from "@ledgerbyte/accounting-core";
import {
  normalizeSupportedCurrencyCode,
  SUPPORTED_CURRENCIES,
  SUPPORTED_CURRENCY_CODES,
} from "@ledgerbyte/shared";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCurrencyRateSnapshotDto } from "./dto/create-currency-rate-snapshot.dto";
import { CurrencyRateQueryDto } from "./dto/currency-rate-query.dto";
import { UpdateFxAccountConfigurationDto } from "./dto/update-fx-account-configuration.dto";

const ACCOUNT_SELECT = {
  id: true,
  code: true,
  name: true,
  type: true,
  isActive: true,
  allowPosting: true,
} as const;

const CONFIG_INCLUDE = {
  realizedGainAccount: { select: ACCOUNT_SELECT },
  realizedLossAccount: { select: ACCOUNT_SELECT },
  unrealizedGainAccount: { select: ACCOUNT_SELECT },
  unrealizedLossAccount: { select: ACCOUNT_SELECT },
} as const;

type ConfigAccount = {
  type: AccountType;
  isActive: boolean;
  allowPosting: boolean;
} | null;

@Injectable()
export class ForeignExchangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async currencies(organizationId: string) {
    const baseCurrency = await this.baseCurrency(organizationId);
    return {
      baseCurrency,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      manualRateEntryEnabled: true,
      liveRateProviderEnabled: false,
      providerState: "DISABLED" as const,
    };
  }

  async listRates(organizationId: string, query: CurrencyRateQueryDto) {
    const baseCurrency = await this.baseCurrency(organizationId);
    const transactionCurrency = query.transactionCurrency
      ? this.supportedCurrency(query.transactionCurrency, "Transaction currency is unsupported.")
      : undefined;
    return this.prisma.currencyRateSnapshot.findMany({
      where: {
        organizationId,
        baseCurrency,
        transactionCurrency,
        rateDate: query.rateDate ? this.dateOnly(query.rateDate) : undefined,
      },
      orderBy: [{ rateDate: "desc" }, { createdAt: "desc" }],
    });
  }

  async createRate(
    organizationId: string,
    actorUserId: string,
    dto: CreateCurrencyRateSnapshotDto,
  ) {
    const baseCurrency = await this.baseCurrency(organizationId);
    const transactionCurrency = this.supportedCurrency(
      dto.transactionCurrency,
      "Transaction currency is unsupported.",
    );
    if (transactionCurrency === baseCurrency) {
      throw new BadRequestException("Transaction currency must differ from the organization base currency.");
    }

    const rate = this.exchangeRate(dto.rate);
    const snapshot = await this.prisma.currencyRateSnapshot.create({
      data: {
        organizationId,
        transactionCurrency,
        baseCurrency,
        rate,
        rateDate: this.dateOnly(dto.rateDate),
        source: CurrencyRateSource.MANUAL,
        sourceReference: this.optionalText(dto.sourceReference),
      },
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "CurrencyRateSnapshot",
      entityId: snapshot.id,
      after: snapshot,
    });
    return snapshot;
  }

  getAccountConfiguration(organizationId: string) {
    return this.prisma.fxAccountConfiguration.findUnique({
      where: { organizationId },
      include: CONFIG_INCLUDE,
    });
  }

  async updateAccountConfiguration(
    organizationId: string,
    actorUserId: string,
    dto: UpdateFxAccountConfigurationDto,
  ) {
    const selections = [
      ["realizedGainAccountId", dto.realizedGainAccountId, AccountType.REVENUE],
      ["realizedLossAccountId", dto.realizedLossAccountId, AccountType.EXPENSE],
      ["unrealizedGainAccountId", dto.unrealizedGainAccountId, AccountType.REVENUE],
      ["unrealizedLossAccountId", dto.unrealizedLossAccountId, AccountType.EXPENSE],
    ] as const;
    const ids = [...new Set(selections.flatMap(([, id]) => (id ? [id] : [])))];
    const accounts = ids.length
      ? await this.prisma.account.findMany({
          where: { organizationId, id: { in: ids } },
          select: ACCOUNT_SELECT,
        })
      : [];
    const accountById = new Map(accounts.map((account) => [account.id, account]));
    const invalid = selections.some(([, id, expectedType]) => {
      if (!id) return false;
      const account = accountById.get(id);
      return !account || account.type !== expectedType || !account.isActive || !account.allowPosting;
    });
    if (invalid || accounts.length !== ids.length) {
      throw new BadRequestException("One or more FX accounts are invalid for this organization.");
    }

    const before = await this.getAccountConfiguration(organizationId);
    const data = {
      realizedGainAccountId: dto.realizedGainAccountId,
      realizedLossAccountId: dto.realizedLossAccountId,
      unrealizedGainAccountId: dto.unrealizedGainAccountId,
      unrealizedLossAccountId: dto.unrealizedLossAccountId,
    };
    const configuration = await this.prisma.fxAccountConfiguration.upsert({
      where: { organizationId },
      create: { organizationId, ...data },
      update: data,
      include: CONFIG_INCLUDE,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: before ? "UPDATE" : "CREATE",
      entityType: "FxAccountConfiguration",
      entityId: configuration.id,
      before: before ?? undefined,
      after: configuration,
    });
    return configuration;
  }

  async readiness(organizationId: string) {
    const baseCurrency = await this.baseCurrency(organizationId);
    const configuration = await this.getAccountConfiguration(organizationId);
    const accountConfigurationComplete = Boolean(
      configuration &&
        this.readyAccount(configuration.realizedGainAccount, AccountType.REVENUE) &&
        this.readyAccount(configuration.realizedLossAccount, AccountType.EXPENSE) &&
        this.readyAccount(configuration.unrealizedGainAccount, AccountType.REVENUE) &&
        this.readyAccount(configuration.unrealizedLossAccount, AccountType.EXPENSE),
    );
    const blockers = [
      ...(accountConfigurationComplete
        ? []
        : ["Configure active posting accounts for realized and unrealized FX gains and losses."]),
      "Foreign-currency document posting remains disabled until document, posting, settlement, and report controls are complete.",
    ];
    return {
      status: "BLOCKED" as const,
      baseCurrency,
      supportedCurrencyCodes: SUPPORTED_CURRENCY_CODES,
      manualRateEntryEnabled: true,
      liveRateProviderEnabled: false,
      providerState: "DISABLED" as const,
      accountConfigurationComplete,
      foreignDocumentPostingEnabled: false,
      blockers,
    };
  }

  private async baseCurrency(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });
    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }
    return this.supportedCurrency(organization.baseCurrency, "Organization base currency is unsupported.");
  }

  private supportedCurrency(value: string, message: string) {
    const currency = normalizeSupportedCurrencyCode(value);
    if (!currency) throw new BadRequestException(message);
    return currency;
  }

  private exchangeRate(value: string): Prisma.Decimal {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!/^\d{1,10}(?:\.\d{1,8})?$/.test(normalized)) {
      throw new BadRequestException("Exchange rate must be a positive plain decimal with at most eight decimal places.");
    }
    try {
      convertTransactionToBaseAmount("0", normalized);
      return new Prisma.Decimal(normalized);
    } catch {
      throw new BadRequestException("Exchange rate must be a positive plain decimal with at most eight decimal places.");
    }
  }

  private dateOnly(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException("Rate date must use YYYY-MM-DD.");
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException("Rate date must be a valid calendar date.");
    }
    return date;
  }

  private optionalText(value: string | undefined): string | null {
    const normalized = value?.trim();
    return normalized || null;
  }

  private readyAccount(account: ConfigAccount, expectedType: AccountType): boolean {
    return Boolean(account && account.type === expectedType && account.isActive && account.allowPosting);
  }
}
