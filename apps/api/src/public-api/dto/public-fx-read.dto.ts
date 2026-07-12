import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";
import { SUPPORTED_CURRENCY_CODES } from "@ledgerbyte/shared";

export class PublicFxRateQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toUpperCase() : value))
  @IsString()
  @IsIn(SUPPORTED_CURRENCY_CODES)
  transactionCurrency?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  rateDate?: string;
}

export interface PublicCurrencyItemDto {
  code: string;
  name: string;
  decimals: number;
  isBaseCurrency: boolean;
}

export interface PublicCurrencyListDto {
  baseCurrency: string;
  items: PublicCurrencyItemDto[];
  liveRateProviderEnabled: false;
}

export interface PublicFxRateDto {
  id: string;
  transactionCurrency: string;
  baseCurrency: string;
  rate: string;
  rateDate: string;
  source: string;
  sourceReference: string | null;
  capturedAt: string;
}

export interface PublicFxRateListDto {
  items: PublicFxRateDto[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

type CurrencyCatalogSource = {
  baseCurrency: string;
  supportedCurrencies: ReadonlyArray<{ code: string; name: string }>;
};

type FxRateSource = {
  id: string;
  transactionCurrency: string;
  baseCurrency: string;
  rate: { toFixed(decimalPlaces: number): string } | string;
  rateDate: Date | string;
  source: string;
  sourceReference: string | null;
  createdAt: Date | string;
};

const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "KWD", "OMR"]);

export function mapPublicCurrencyList(source: CurrencyCatalogSource): PublicCurrencyListDto {
  return {
    baseCurrency: source.baseCurrency,
    items: source.supportedCurrencies.map((currency) => ({
      code: currency.code,
      name: currency.name,
      decimals: THREE_DECIMAL_CURRENCIES.has(currency.code) ? 3 : 2,
      isBaseCurrency: currency.code === source.baseCurrency,
    })),
    liveRateProviderEnabled: false,
  };
}

export function mapPublicFxRate(source: FxRateSource): PublicFxRateDto {
  return {
    id: source.id,
    transactionCurrency: source.transactionCurrency,
    baseCurrency: source.baseCurrency,
    rate: typeof source.rate === "string" ? source.rate : source.rate.toFixed(8),
    rateDate: serializeDateOnly(source.rateDate),
    source: source.source,
    sourceReference: source.sourceReference,
    capturedAt: serializeTimestamp(source.createdAt),
  };
}

function serializeDateOnly(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

function serializeTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
