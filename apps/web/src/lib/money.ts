export interface MoneyTotals {
  debitUnits: number;
  creditUnits: number;
  debit: string;
  credit: string;
  balanced: boolean;
}

export interface AmountLine {
  debit: string;
  credit: string;
}

export interface InvoicePreviewLineInput {
  quantity: string;
  unitPrice: string;
  discountRate?: string;
  taxRate?: string;
}

export interface InvoicePreviewLine {
  quantityUnits: number;
  unitPriceUnits: number;
  discountRateUnits: number;
  taxRateUnits: number;
  discountAmountUnits: number;
  taxAmountUnits: number;
  lineSubtotalUnits: number;
  lineTotalUnits: number;
  valid: boolean;
}

export interface InvoicePreviewTotals {
  lines: InvoicePreviewLine[];
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  valid: boolean;
}

const MONEY_SCALE = 4;
const MONEY_FACTOR = 10 ** MONEY_SCALE;

export function parseDecimalToUnits(value: string, scale = 4): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  const sign = trimmed.startsWith("-") ? -1 : 1;
  const unsigned = trimmed.replace(/^[+-]/, "");
  const [wholeRaw = "0", fractionRaw = ""] = unsigned.split(".");
  const whole = wholeRaw.replace(/\D/g, "") || "0";
  const fraction = fractionRaw.replace(/\D/g, "").padEnd(scale, "0").slice(0, scale);

  return sign * (Number.parseInt(whole, 10) * 10 ** scale + Number.parseInt(fraction || "0", 10));
}

export function formatUnits(units: number, scale = 4): string {
  const sign = units < 0 ? "-" : "";
  const absolute = Math.abs(units);
  const divisor = 10 ** scale;
  const whole = Math.floor(absolute / divisor);
  const fraction = String(absolute % divisor).padStart(scale, "0");

  return `${sign}${whole}.${fraction}`;
}

export function calculateTotals(lines: AmountLine[]): MoneyTotals {
  const debitUnits = lines.reduce((sum, line) => sum + parseDecimalToUnits(line.debit), 0);
  const creditUnits = lines.reduce((sum, line) => sum + parseDecimalToUnits(line.credit), 0);

  return {
    debitUnits,
    creditUnits,
    debit: formatUnits(debitUnits),
    credit: formatUnits(creditUnits),
    balanced: debitUnits === creditUnits && debitUnits > 0,
  };
}

export function calculateInvoicePreview(lines: InvoicePreviewLineInput[]): InvoicePreviewTotals {
  const previewLines = lines.map(calculateInvoicePreviewLine);
  const subtotalUnits = previewLines.reduce((sum, line) => sum + line.lineSubtotalUnits, 0);
  const discountTotalUnits = previewLines.reduce((sum, line) => sum + line.discountAmountUnits, 0);
  const taxTotalUnits = previewLines.reduce((sum, line) => sum + line.taxAmountUnits, 0);
  const totalUnits = previewLines.reduce((sum, line) => sum + line.lineTotalUnits, 0);

  return {
    lines: previewLines,
    subtotal: formatUnits(subtotalUnits),
    discountTotal: formatUnits(discountTotalUnits),
    taxTotal: formatUnits(taxTotalUnits),
    total: formatUnits(totalUnits),
    valid: lines.length > 0 && previewLines.every((line) => line.valid),
  };
}

export function formatMoneyAmount(value: string | number, currency = "SAR"): string {
  const amount = typeof value === "number" ? value / MONEY_FACTOR : parseDecimalToUnits(value) / MONEY_FACTOR;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function calculateInvoicePreviewLine(line: InvoicePreviewLineInput): InvoicePreviewLine {
  const quantityUnits = parseDecimalToUnits(line.quantity);
  const unitPriceUnits = parseDecimalToUnits(line.unitPrice);
  const discountRateUnits = parseDecimalToUnits(line.discountRate ?? "0");
  const taxRateUnits = parseDecimalToUnits(line.taxRate ?? "0");
  const grossUnits = roundDiv(quantityUnits * unitPriceUnits, MONEY_FACTOR);
  const discountAmountUnits = roundDiv(grossUnits * discountRateUnits, 100 * MONEY_FACTOR);
  const lineSubtotalUnits = grossUnits - discountAmountUnits;
  const taxAmountUnits = roundDiv(lineSubtotalUnits * taxRateUnits, 100 * MONEY_FACTOR);
  const lineTotalUnits = lineSubtotalUnits + taxAmountUnits;

  return {
    quantityUnits,
    unitPriceUnits,
    discountRateUnits,
    taxRateUnits,
    discountAmountUnits,
    taxAmountUnits,
    lineSubtotalUnits,
    lineTotalUnits,
    valid: quantityUnits > 0 && unitPriceUnits > 0 && discountRateUnits >= 0 && discountRateUnits <= 100 * MONEY_FACTOR,
  };
}

function roundDiv(value: number, divisor: number): number {
  return Math.round(value / divisor);
}
