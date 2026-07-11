export interface DocumentFxFormValue {
  currency: string;
  exchangeRate: string;
  rateDate: string;
  rateSource: "MANUAL" | "IMPORT" | "SYSTEM_RATE_1";
  rateSnapshotId: string | null;
}

export interface StoredDocumentFxContext {
  currency: string;
  baseCurrency?: string | null;
  exchangeRate?: string | null;
  rateDate?: string | null;
  rateSource?: "MANUAL" | "IMPORT" | "SYSTEM_RATE_1" | "FUTURE_PROVIDER_DISABLED" | null;
  rateSnapshotId?: string | null;
}

export const INCOMPLETE_DOCUMENT_FX_CONTEXT_MESSAGE =
  "Complete the exchange rate, rate date, and rate source before finalizing this document.";

export function isForeignCurrencyDocument(document: { currency: string; baseCurrency?: string | null }): boolean {
  const baseCurrency = document.baseCurrency?.trim().toUpperCase();
  return Boolean(baseCurrency && document.currency.trim().toUpperCase() !== baseCurrency);
}

export function documentFxPostingIsReady(document: StoredDocumentFxContext): boolean {
  const currency = document.currency.trim().toUpperCase();
  const baseCurrency = document.baseCurrency?.trim().toUpperCase();
  if (!currency || !baseCurrency || !document.exchangeRate || !document.rateSource) return false;
  if (currency === baseCurrency) {
    return isRateOne(document.exchangeRate) && document.rateSource === "SYSTEM_RATE_1" && !document.rateSnapshotId;
  }
  return (
    isPositiveRate(document.exchangeRate) &&
    Boolean(document.rateDate && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(document.rateDate)) &&
    (document.rateSource === "MANUAL" || document.rateSource === "IMPORT")
  );
}

export function documentFxRateEvidence(document: StoredDocumentFxContext): string | null {
  if (!isForeignCurrencyDocument(document) || !documentFxPostingIsReady(document)) return null;
  const source = document.rateSource === "MANUAL" ? "Manual" : "Import";
  return `1 ${document.currency.trim().toUpperCase()} = ${document.exchangeRate} ${document.baseCurrency?.trim().toUpperCase()} · ${document.rateDate?.slice(0, 10)} · ${source}`;
}

export function selectableDocumentRateSnapshots<T extends { source: string }>(rates: T[]): T[] {
  return rates.filter((rate) => rate.source === "MANUAL" || rate.source === "IMPORT");
}

export function transactionDocumentDisplayTotals(document: {
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  transactionSubtotal?: string;
  transactionDiscountTotal?: string;
  transactionTaxableTotal?: string;
  transactionTaxTotal?: string;
  transactionTotal?: string;
}) {
  return {
    subtotal: document.transactionSubtotal ?? document.subtotal,
    discountTotal: document.transactionDiscountTotal ?? document.discountTotal,
    taxableTotal: document.transactionTaxableTotal ?? document.taxableTotal,
    taxTotal: document.transactionTaxTotal ?? document.taxTotal,
    total: document.transactionTotal ?? document.total,
  };
}

export function transactionLineDisplayAmounts(line: {
  lineGrossAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
  transactionLineGrossAmount?: string;
  transactionDiscountAmount?: string;
  transactionTaxableAmount?: string;
  transactionTaxAmount?: string;
  transactionLineTotal?: string;
}) {
  return {
    lineGrossAmount: line.transactionLineGrossAmount ?? line.lineGrossAmount,
    discountAmount: line.transactionDiscountAmount ?? line.discountAmount,
    taxableAmount: line.transactionTaxableAmount ?? line.taxableAmount,
    taxAmount: line.transactionTaxAmount ?? line.taxAmount,
    lineTotal: line.transactionLineTotal ?? line.lineTotal,
  };
}

export function documentFxIsComplete(value: DocumentFxFormValue, baseCurrency: string): boolean {
  if (value.currency === baseCurrency) {
    return isRateOne(value.exchangeRate) && value.rateSource === "SYSTEM_RATE_1" && !value.rateSnapshotId;
  }
  return isPositiveRate(value.exchangeRate) && /^\d{4}-\d{2}-\d{2}$/.test(value.rateDate) && (value.rateSource === "MANUAL" || value.rateSource === "IMPORT");
}

function isPositiveRate(value: string): boolean {
  return /^\d{1,10}(?:\.\d{1,8})?$/.test(value) && !/^0+(?:\.0+)?$/.test(value);
}

function isRateOne(value: string): boolean {
  return /^0*1(?:\.0+)?$/.test(value.trim());
}

export function convertTransactionToBasePreview(amount: string, rate: string): string | null {
  const amountParts = decimalParts(amount, 4);
  const rateParts = decimalParts(rate, 8);
  if (!amountParts || !rateParts || /^0+$/.test(rateParts.units)) return null;
  const product = multiplyIntegerStrings(amountParts.units, rateParts.units).padStart(9, "0");
  const discarded = product.slice(-8);
  let roundedUnits = product.slice(0, -8).replace(/^0+(?=\d)/, "") || "0";
  if ((discarded[0] ?? "0") >= "5") roundedUnits = incrementIntegerString(roundedUnits);
  const padded = roundedUnits.padStart(5, "0");
  return `${padded.slice(0, -4)}.${padded.slice(-4)}`;
}

export interface RealizedFxPreviewAllocation {
  transactionAmountApplied: string;
  transactionBalanceDue: string;
  baseBalanceDue: string;
  recognitionRate: string;
}

export interface RealizedFxSettlementPreview {
  gain: string;
  loss: string;
  net: string;
}

export function realizedFxSettlementPreview(
  party: "customer" | "supplier",
  settlementRate: string,
  allocations: RealizedFxPreviewAllocation[],
  settlementTransactionTotal?: string,
): RealizedFxSettlementPreview | null {
  const allocatedTransactionUnits = allocations.reduce((sum, allocation) => sum + (moneyUnits(allocation.transactionAmountApplied) ?? 0), 0);
  let settlementTransactionRemaining = settlementTransactionTotal === undefined
    ? allocatedTransactionUnits
    : moneyUnits(settlementTransactionTotal);
  if (settlementTransactionRemaining === null || settlementTransactionRemaining < allocatedTransactionUnits) return null;
  const settlementBaseTotal = convertTransactionToBasePreview(formatMoneyUnits(settlementTransactionRemaining), settlementRate);
  let settlementBaseRemaining = settlementBaseTotal ? moneyUnits(settlementBaseTotal) : null;
  if (settlementBaseRemaining === null) return null;
  let gainUnits = 0;
  let lossUnits = 0;
  for (const allocation of allocations) {
    const transactionUnits = moneyUnits(allocation.transactionAmountApplied);
    const openTransactionUnits = moneyUnits(allocation.transactionBalanceDue);
    if (transactionUnits === null || openTransactionUnits === null || transactionUnits < 0 || transactionUnits > openTransactionUnits) return null;
    if (transactionUnits === 0) continue;
    if (transactionUnits > settlementTransactionRemaining) return null;
    const proportionalSettlementBase = convertTransactionToBasePreview(allocation.transactionAmountApplied, settlementRate);
    const proportionalSettlementUnits = proportionalSettlementBase ? moneyUnits(proportionalSettlementBase) : null;
    if (proportionalSettlementUnits === null) return null;
    const settlementUnits = transactionUnits === settlementTransactionRemaining
      ? settlementBaseRemaining
      : Math.min(proportionalSettlementUnits, settlementBaseRemaining);
    const carryingBase = transactionUnits === openTransactionUnits
      ? normalizeMoney(allocation.baseBalanceDue)
      : convertTransactionToBasePreview(allocation.transactionAmountApplied, allocation.recognitionRate);
    const carryingUnits = carryingBase ? moneyUnits(carryingBase) : null;
    if (carryingUnits === null) return null;
    settlementTransactionRemaining -= transactionUnits;
    settlementBaseRemaining -= settlementUnits;
    if (settlementBaseRemaining < 0) return null;
    const difference = party === "customer" ? settlementUnits - carryingUnits : carryingUnits - settlementUnits;
    if (difference > 0) gainUnits += difference;
    if (difference < 0) lossUnits += -difference;
  }
  return {
    gain: formatMoneyUnits(gainUnits),
    loss: formatMoneyUnits(lossUnits),
    net: formatMoneyUnits(gainUnits - lossUnits),
  };
}

function normalizeMoney(value: string): string | null {
  const units = moneyUnits(value);
  return units === null ? null : formatMoneyUnits(units);
}

function moneyUnits(value: string): number | null {
  const match = value.trim().match(/^([+-]?)(\d+)(?:\.(\d{1,4}))?$/);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const whole = Number.parseInt(match[2] ?? "0", 10);
  const fraction = Number.parseInt((match[3] ?? "").padEnd(4, "0") || "0", 10);
  if (!Number.isSafeInteger(whole) || whole > Math.floor(Number.MAX_SAFE_INTEGER / 10_000)) return null;
  return sign * (whole * 10_000 + fraction);
}

function formatMoneyUnits(units: number): string {
  const sign = units < 0 ? "-" : "";
  const absolute = Math.abs(units);
  return `${sign}${Math.floor(absolute / 10_000)}.${String(absolute % 10_000).padStart(4, "0")}`;
}

function decimalParts(value: string, scale: number): { units: string } | null {
  const match = value.trim().match(/^\+?(\d+)(?:\.(\d+))?$/);
  if (!match || (match[2]?.length ?? 0) > scale) return null;
  const fraction = (match[2] ?? "").padEnd(scale, "0");
  return { units: `${match[1] ?? "0"}${fraction}`.replace(/^0+(?=\d)/, "") };
}

function multiplyIntegerStrings(left: string, right: string): string {
  const result = Array<number>(left.length + right.length).fill(0);
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      const position = i + j + 1;
      const product = Number(left[i]) * Number(right[j]) + (result[position] ?? 0);
      result[position] = product % 10;
      result[position - 1] = (result[position - 1] ?? 0) + Math.floor(product / 10);
    }
  }
  return result.join("").replace(/^0+(?=\d)/, "");
}

function incrementIntegerString(value: string): string {
  const digits = value.split("");
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    if (digits[index] !== "9") {
      digits[index] = String(Number(digits[index]) + 1);
      return digits.join("");
    }
    digits[index] = "0";
  }
  return `1${digits.join("")}`;
}
