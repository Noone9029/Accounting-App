export interface DocumentFxFormValue {
  currency: string;
  exchangeRate: string;
  rateDate: string;
  rateSource: "MANUAL" | "IMPORT" | "SYSTEM_RATE_1";
  rateSnapshotId: string | null;
}

export const FOREIGN_DOCUMENT_POSTING_BLOCKED_MESSAGE =
  "Foreign-currency posting is not enabled yet. Keep this document as a draft until FX journal posting is available.";

export function foreignDocumentPostingIsBlocked(document: { currency: string; baseCurrency?: string | null }): boolean {
  const baseCurrency = document.baseCurrency?.trim().toUpperCase();
  return Boolean(baseCurrency && document.currency.trim().toUpperCase() !== baseCurrency);
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
  if (value.currency === baseCurrency) return value.exchangeRate === "1";
  return /^\d{1,10}(?:\.\d{1,8})?$/.test(value.exchangeRate) && !/^0(?:\.0+)?$/.test(value.exchangeRate) && /^\d{4}-\d{2}-\d{2}$/.test(value.rateDate);
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
