export const SUPPORTED_CURRENCIES = [
  { code: "SAR", name: "Saudi Riyal" },
  { code: "AED", name: "UAE Dirham" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "OMR", name: "Omani Rial" },
  { code: "QAR", name: "Qatari Riyal" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];
export const SUPPORTED_CURRENCY_CODES: CurrencyCode[] = SUPPORTED_CURRENCIES.map((currency) => currency.code);
export const DEFAULT_BASE_CURRENCY: CurrencyCode = "SAR";

export function isSupportedCurrencyCode(value: string): value is CurrencyCode {
  return SUPPORTED_CURRENCY_CODES.includes(value as CurrencyCode);
}

export function normalizeSupportedCurrencyCode(value: string | null | undefined): CurrencyCode | null {
  const normalized = value?.trim().toUpperCase();
  return normalized && isSupportedCurrencyCode(normalized) ? normalized : null;
}
