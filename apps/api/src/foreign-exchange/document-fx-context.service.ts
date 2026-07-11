import { BadRequestException, Injectable } from "@nestjs/common";
import { CurrencyRateSource, Prisma } from "@prisma/client";
import { convertTransactionToBaseAmount } from "@ledgerbyte/accounting-core";
import { normalizeSupportedCurrencyCode } from "@ledgerbyte/shared";
import { PrismaService } from "../prisma/prisma.service";
import { resolveOrganizationBaseCurrency } from "./base-currency-posting-guard.service";

export interface DocumentFxContextInput {
  currency?: string;
  documentDate: string | Date;
  exchangeRate?: string;
  rateDate?: string | Date;
  rateSource?: CurrencyRateSource;
  rateSnapshotId?: string | null;
}

export interface ResolvedDocumentFxContext {
  currency: string;
  baseCurrency: string;
  exchangeRate: Prisma.Decimal;
  rateDate: Date;
  rateSource: CurrencyRateSource;
  rateSnapshotId: string | null;
}

export function documentFxArchiveContext(input: {
  currency: string;
  baseCurrency: string;
  exchangeRate: unknown;
  rateDate: Date | null;
  rateSource: CurrencyRateSource | null;
  rateSnapshotId: string | null;
}): Prisma.InputJsonObject {
  return {
    transactionCurrency: input.currency,
    baseCurrency: input.baseCurrency,
    exchangeRate: input.exchangeRate === null || input.exchangeRate === undefined ? null : String(input.exchangeRate),
    rateDate: input.rateDate?.toISOString().slice(0, 10) ?? null,
    rateSource: input.rateSource,
    rateSnapshotId: input.rateSnapshotId,
  };
}

type DocumentFxExecutor = Pick<Prisma.TransactionClient, "organization" | "currencyRateSnapshot">;

const INVALID_CONTEXT_MESSAGE = "A complete valid exchange-rate context is required for a foreign-currency document.";
const INVALID_SNAPSHOT_MESSAGE = "The selected FX rate is not valid for this document.";

@Injectable()
export class DocumentFxContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    organizationId: string,
    input: DocumentFxContextInput,
    executor: DocumentFxExecutor = this.prisma,
  ): Promise<ResolvedDocumentFxContext> {
    const baseCurrency = await resolveOrganizationBaseCurrency(organizationId, executor);
    const currency = normalizeSupportedCurrencyCode(input.currency ?? baseCurrency);
    if (!currency) {
      throw new BadRequestException("Document currency is unsupported.");
    }

    if (currency === baseCurrency) {
      if (input.rateSnapshotId || (input.exchangeRate !== undefined && !this.isRateOne(input.exchangeRate))) {
        throw new BadRequestException(INVALID_CONTEXT_MESSAGE);
      }
      return {
        currency,
        baseCurrency,
        exchangeRate: new Prisma.Decimal(1),
        rateDate: this.dateOnly(input.documentDate),
        rateSource: CurrencyRateSource.SYSTEM_RATE_1,
        rateSnapshotId: null,
      };
    }

    if (input.rateSnapshotId) {
      const snapshot = await executor.currencyRateSnapshot.findFirst({
        where: { id: input.rateSnapshotId, organizationId },
      });
      if (
        !snapshot ||
        snapshot.transactionCurrency !== currency ||
        snapshot.baseCurrency !== baseCurrency ||
        snapshot.source === CurrencyRateSource.FUTURE_PROVIDER_DISABLED
      ) {
        throw new BadRequestException(INVALID_SNAPSHOT_MESSAGE);
      }
      return {
        currency,
        baseCurrency,
        exchangeRate: snapshot.rate,
        rateDate: snapshot.rateDate,
        rateSource: snapshot.source,
        rateSnapshotId: snapshot.id,
      };
    }

    if (
      input.exchangeRate === undefined ||
      input.rateDate === undefined ||
      !input.rateSource ||
      (input.rateSource !== CurrencyRateSource.MANUAL && input.rateSource !== CurrencyRateSource.IMPORT)
    ) {
      throw new BadRequestException(INVALID_CONTEXT_MESSAGE);
    }

    return {
      currency,
      baseCurrency,
      exchangeRate: this.exchangeRate(input.exchangeRate),
      rateDate: this.dateOnly(input.rateDate),
      rateSource: input.rateSource,
      rateSnapshotId: null,
    };
  }

  private exchangeRate(value: string): Prisma.Decimal {
    const normalized = value.trim();
    if (!/^\d{1,10}(?:\.\d{1,8})?$/.test(normalized)) {
      throw new BadRequestException(INVALID_CONTEXT_MESSAGE);
    }
    try {
      convertTransactionToBaseAmount("0", normalized);
      return new Prisma.Decimal(normalized);
    } catch {
      throw new BadRequestException(INVALID_CONTEXT_MESSAGE);
    }
  }

  private isRateOne(value: string): boolean {
    try {
      return this.exchangeRate(value).eq(1);
    } catch {
      return false;
    }
  }

  private dateOnly(value: string | Date): Date {
    const text = value instanceof Date
      ? value.toISOString().slice(0, 10)
      : /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? value
        : this.isoDatePart(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      throw new BadRequestException("Rate date must use YYYY-MM-DD.");
    }
    const date = new Date(`${text}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
      throw new BadRequestException("Rate date must be a valid calendar date.");
    }
    return date;
  }

  private isoDatePart(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toISOString().slice(0, 10);
  }
}
