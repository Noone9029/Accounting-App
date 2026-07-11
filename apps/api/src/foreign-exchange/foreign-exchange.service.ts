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
import {
  evaluateFxAccountReadiness,
  FX_ACCOUNT_READINESS_ACCOUNT_SELECT as ACCOUNT_SELECT,
  FX_ACCOUNT_READINESS_CONFIG_INCLUDE as CONFIG_INCLUDE,
} from "./fx-account-readiness";

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
    const page = this.boundedInteger(query.page, 1, 1_000_000, 1);
    const limit = this.boundedInteger(query.limit, 1, 100, 50);
    const where = {
      organizationId,
      baseCurrency,
      transactionCurrency,
      rateDate: query.rateDate ? this.dateOnly(query.rateDate) : undefined,
    };
    const [rows, totalItems] = await Promise.all([
      this.prisma.currencyRateSnapshot.findMany({
        where,
        orderBy: [{ rateDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit + 1,
      }),
      this.prisma.currencyRateSnapshot.count({ where }),
    ]);
    return {
      data: rows.slice(0, limit),
      pagination: { page, limit, hasMore: rows.length > limit, totalItems },
    };
  }

  async getRate(organizationId: string, id: string) {
    const snapshot = await this.prisma.currencyRateSnapshot.findFirst({
      where: { id, organizationId },
    });
    if (!snapshot) {
      throw new NotFoundException("FX rate snapshot not found.");
    }
    return snapshot;
  }

  async createRate(
    organizationId: string,
    actorUserId: string,
    dto: CreateCurrencyRateSnapshotDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const baseCurrency = await this.baseCurrency(organizationId, tx);
        const transactionCurrency = this.supportedCurrency(
          dto.transactionCurrency,
          "Transaction currency is unsupported.",
        );
        if (transactionCurrency === baseCurrency) {
          throw new BadRequestException("Transaction currency must differ from the organization base currency.");
        }

        const rate = this.exchangeRate(dto.rate);
        const snapshot = await tx.currencyRateSnapshot.create({
          data: {
            organizationId,
            transactionCurrency,
            baseCurrency,
            rate,
            rateDate: this.dateOnly(dto.rateDate),
            source: CurrencyRateSource.MANUAL,
            sourceReference: this.optionalText(dto.sourceReference),
            createdByUserId: actorUserId,
          },
        });

        await this.auditLogService.log(
          {
            organizationId,
            actorUserId,
            action: "CREATE",
            entityType: "CurrencyRateSnapshot",
            entityId: snapshot.id,
            after: {
              ...snapshot,
              rate: snapshot.rate.toFixed(8),
              rateDate: snapshot.rateDate.toISOString().slice(0, 10),
            },
          },
          tx,
        );
        return snapshot;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  getAccountConfiguration(organizationId: string) {
    return this.accountConfiguration(this.prisma, organizationId);
  }

  private accountConfiguration(
    executor: Pick<Prisma.TransactionClient, "fxAccountConfiguration">,
    organizationId: string,
  ) {
    return executor.fxAccountConfiguration.findUnique({
      where: { organizationId },
      include: CONFIG_INCLUDE,
    });
  }

  async updateAccountConfiguration(
    organizationId: string,
    actorUserId: string,
    dto: UpdateFxAccountConfigurationDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const selections = [
        ["realizedGainAccountId", dto.realizedGainAccountId, AccountType.REVENUE],
        ["realizedLossAccountId", dto.realizedLossAccountId, AccountType.EXPENSE],
        ["unrealizedGainAccountId", dto.unrealizedGainAccountId, AccountType.REVENUE],
        ["unrealizedLossAccountId", dto.unrealizedLossAccountId, AccountType.EXPENSE],
      ] as const;
      const ids = [...new Set(selections.flatMap(([, id]) => (id ? [id] : [])))];
      const accounts = ids.length
        ? await tx.account.findMany({
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

      const before = await this.accountConfiguration(tx, organizationId);
      const data = {
        realizedGainAccountId: dto.realizedGainAccountId,
        realizedLossAccountId: dto.realizedLossAccountId,
        unrealizedGainAccountId: dto.unrealizedGainAccountId,
        unrealizedLossAccountId: dto.unrealizedLossAccountId,
      };
      const configuration = await tx.fxAccountConfiguration.upsert({
        where: { organizationId },
        create: { organizationId, ...data },
        update: data,
        include: CONFIG_INCLUDE,
      });

      await this.auditLogService.log(
        {
          organizationId,
          actorUserId,
          action: before ? "UPDATE" : "CREATE",
          entityType: "FxAccountConfiguration",
          entityId: configuration.id,
          before: before ?? undefined,
          after: configuration,
        },
        tx,
      );
      return configuration;
    });
  }

  async readiness(organizationId: string) {
    const [baseCurrency, configuration, controlAccounts] = await Promise.all([
      this.baseCurrency(organizationId),
      this.getAccountConfiguration(organizationId),
      this.prisma.account.findMany({
        where: { organizationId, code: { in: ["120", "210"] }, isActive: true, allowPosting: true },
        select: { code: true, type: true, isActive: true, allowPosting: true },
      }),
    ]);
    const { accountConfigurationComplete, controlAccountsComplete } = evaluateFxAccountReadiness({ configuration, controlAccounts });
    const fxRevaluationEnabled = accountConfigurationComplete && controlAccountsComplete;
    const blockers = [
      ...(accountConfigurationComplete ? [] : ["Configure active posting accounts for realized and unrealized FX gains and losses."]),
      ...(controlAccountsComplete ? [] : ["Active AR (120) and AP (210) control accounts are required for FX revaluation."]),
    ];
    return {
      status: fxRevaluationEnabled ? ("READY" as const) : ("BLOCKED" as const),
      baseCurrency,
      supportedCurrencyCodes: SUPPORTED_CURRENCY_CODES,
      manualRateEntryEnabled: true,
      liveRateProviderEnabled: false,
      providerState: "DISABLED" as const,
      accountConfigurationComplete,
      controlAccountsComplete,
      foreignDocumentPostingEnabled: true,
      fxRevaluationEnabled,
      blockers,
    };
  }

  private async baseCurrency(
    organizationId: string,
    executor: Pick<Prisma.TransactionClient, "organization"> = this.prisma,
  ) {
    const organization = await executor.organization.findUnique({
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

  private boundedInteger(value: number | undefined, min: number, max: number, fallback: number): number {
    return Number.isInteger(value) ? Math.min(Math.max(value as number, min), max) : fallback;
  }
}
