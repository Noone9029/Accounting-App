import { formatMoneyAmount, parseDecimalToUnits } from "./money";

export function formatLedgerBalance(value: string, currency = "SAR"): string {
  const units = parseDecimalToUnits(value);
  if (units === 0) {
    return normalizeCurrencySpacing(formatMoneyAmount("0.0000", currency));
  }

  return `${normalizeCurrencySpacing(formatMoneyAmount(Math.abs(units), currency))} ${units > 0 ? "Dr" : "Cr"}`;
}

export function defaultStatementFromDate(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);
}

export function defaultStatementToDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function normalizeCurrencySpacing(value: string): string {
  return value.replace(/\u00a0/g, " ");
}
