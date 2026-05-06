export type JournalStatus = "DRAFT" | "POSTED" | "VOIDED" | "REVERSED";
export type InvoiceStatus = "DRAFT" | "FINALIZED" | "VOIDED";

export interface JournalLineInput {
  accountId: string;
  debit: string | number;
  credit: string | number;
  description?: string;
  currency: string;
  exchangeRate?: string | number;
  taxRateId?: string | null;
}

export interface JournalTotals {
  debit: string;
  credit: string;
}

export interface SalesInvoiceLineInput {
  quantity: string | number;
  unitPrice: string | number;
  discountRate?: string | number | null;
  taxRate?: string | number | null;
}

export interface CalculatedSalesInvoiceLine {
  quantity: string;
  unitPrice: string;
  discountRate: string;
  lineGrossAmount: string;
  discountAmount: string;
  taxRate: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
}

export interface SalesInvoiceTotals {
  lines: CalculatedSalesInvoiceLine[];
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
}

export class AccountingRuleError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

import { Decimal } from "decimal.js";

const ZERO = new Decimal(0);

export function toMoney(value: Decimal.Value | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") {
    return ZERO;
  }

  return new Decimal(value);
}

export function getJournalTotals(lines: JournalLineInput[]): JournalTotals {
  const totals = lines.reduce(
    (acc, line) => {
      acc.debit = acc.debit.plus(toMoney(line.debit));
      acc.credit = acc.credit.plus(toMoney(line.credit));
      return acc;
    },
    { debit: ZERO, credit: ZERO },
  );

  return {
    debit: totals.debit.toFixed(4),
    credit: totals.credit.toFixed(4),
  };
}

export function assertValidJournalLines(lines: JournalLineInput[]): void {
  if (lines.length < 2) {
    throw new AccountingRuleError("A journal entry requires at least two lines.", "JOURNAL_REQUIRES_TWO_LINES");
  }

  for (const [index, line] of lines.entries()) {
    const debit = toMoney(line.debit);
    const credit = toMoney(line.credit);

    if (!line.accountId) {
      throw new AccountingRuleError(`Line ${index + 1} requires an account.`, "JOURNAL_LINE_ACCOUNT_REQUIRED");
    }

    if (!line.currency) {
      throw new AccountingRuleError(`Line ${index + 1} requires a currency.`, "JOURNAL_LINE_CURRENCY_REQUIRED");
    }

    if (debit.isNegative() || credit.isNegative()) {
      throw new AccountingRuleError(`Line ${index + 1} cannot contain negative amounts.`, "JOURNAL_LINE_NEGATIVE_AMOUNT");
    }

    if (debit.gt(0) && credit.gt(0)) {
      throw new AccountingRuleError(`Line ${index + 1} cannot contain both debit and credit.`, "JOURNAL_LINE_BOTH_SIDES");
    }

    if (debit.eq(0) && credit.eq(0)) {
      throw new AccountingRuleError(`Line ${index + 1} must contain a debit or credit amount.`, "JOURNAL_LINE_ZERO_AMOUNT");
    }

    if (line.exchangeRate !== undefined && toMoney(line.exchangeRate).lte(0)) {
      throw new AccountingRuleError(`Line ${index + 1} exchange rate must be greater than zero.`, "JOURNAL_LINE_INVALID_EXCHANGE_RATE");
    }
  }
}

export function assertBalancedJournal(lines: JournalLineInput[]): void {
  assertValidJournalLines(lines);

  const totals = getJournalTotals(lines);
  if (!toMoney(totals.debit).eq(toMoney(totals.credit))) {
    throw new AccountingRuleError(
      `Journal entry is not balanced. Debits ${totals.debit} do not equal credits ${totals.credit}.`,
      "JOURNAL_NOT_BALANCED",
    );
  }
}

export function assertDraftEditable(status: JournalStatus): void {
  if (status !== "DRAFT") {
    throw new AccountingRuleError("Only draft journal entries can be edited.", "JOURNAL_NOT_EDITABLE");
  }
}

export function createReversalLines(lines: JournalLineInput[]): JournalLineInput[] {
  return lines.map((line) => ({
    accountId: line.accountId,
    debit: toMoney(line.credit).toFixed(4),
    credit: toMoney(line.debit).toFixed(4),
    description: line.description ? `Reversal: ${line.description}` : "Reversal",
    currency: line.currency,
    exchangeRate: line.exchangeRate ?? "1",
    taxRateId: line.taxRateId ?? null,
  }));
}

export function calculateSalesInvoiceLine(line: SalesInvoiceLineInput, lineIndex = 0): CalculatedSalesInvoiceLine {
  const quantity = toMoney(line.quantity);
  const unitPrice = toMoney(line.unitPrice);
  const discountRate = toMoney(line.discountRate);
  const taxRate = toMoney(line.taxRate);

  if (quantity.lte(0)) {
    throw new AccountingRuleError(`Invoice line ${lineIndex + 1} quantity must be greater than zero.`, "INVOICE_LINE_INVALID_QUANTITY");
  }

  if (unitPrice.lt(0)) {
    throw new AccountingRuleError(`Invoice line ${lineIndex + 1} unit price cannot be negative.`, "INVOICE_LINE_INVALID_UNIT_PRICE");
  }

  if (discountRate.lt(0)) {
    throw new AccountingRuleError(`Invoice line ${lineIndex + 1} discount cannot be negative.`, "INVOICE_LINE_NEGATIVE_DISCOUNT");
  }

  if (discountRate.gt(100)) {
    throw new AccountingRuleError(`Invoice line ${lineIndex + 1} discount cannot exceed 100%.`, "INVOICE_LINE_DISCOUNT_TOO_HIGH");
  }

  if (taxRate.lt(0)) {
    throw new AccountingRuleError(`Invoice line ${lineIndex + 1} tax rate cannot be negative.`, "INVOICE_LINE_NEGATIVE_TAX");
  }

  const lineGrossAmount = roundMoney(quantity.mul(unitPrice));
  const discountAmount = roundMoney(lineGrossAmount.mul(discountRate).div(100));
  const taxableAmount = roundMoney(lineGrossAmount.minus(discountAmount));
  const taxAmount = roundMoney(taxableAmount.mul(taxRate).div(100));
  const lineTotal = roundMoney(taxableAmount.plus(taxAmount));

  if (taxableAmount.lt(0) || lineTotal.lt(0)) {
    throw new AccountingRuleError(`Invoice line ${lineIndex + 1} total cannot be negative.`, "INVOICE_LINE_NEGATIVE_TOTAL");
  }

  return {
    quantity: quantity.toFixed(4),
    unitPrice: unitPrice.toFixed(4),
    discountRate: discountRate.toFixed(4),
    lineGrossAmount: lineGrossAmount.toFixed(4),
    discountAmount: discountAmount.toFixed(4),
    taxRate: taxRate.toFixed(4),
    taxableAmount: taxableAmount.toFixed(4),
    taxAmount: taxAmount.toFixed(4),
    lineTotal: lineTotal.toFixed(4),
  };
}

export function calculateSalesInvoiceTotals(lines: SalesInvoiceLineInput[]): SalesInvoiceTotals {
  if (lines.length === 0) {
    throw new AccountingRuleError("An invoice requires at least one line.", "INVOICE_REQUIRES_LINES");
  }

  const calculatedLines = lines.map((line, index) => calculateSalesInvoiceLine(line, index));
  const totals = calculatedLines.reduce(
    (acc, line) => {
      acc.subtotal = acc.subtotal.plus(line.lineGrossAmount);
      acc.discountTotal = acc.discountTotal.plus(line.discountAmount);
      acc.taxableTotal = acc.taxableTotal.plus(line.taxableAmount);
      acc.taxTotal = acc.taxTotal.plus(line.taxAmount);
      acc.total = acc.total.plus(line.lineTotal);
      return acc;
    },
    { subtotal: ZERO, discountTotal: ZERO, taxableTotal: ZERO, taxTotal: ZERO, total: ZERO },
  );

  return {
    lines: calculatedLines,
    subtotal: roundMoney(totals.subtotal).toFixed(4),
    discountTotal: roundMoney(totals.discountTotal).toFixed(4),
    taxableTotal: roundMoney(totals.taxableTotal).toFixed(4),
    taxTotal: roundMoney(totals.taxTotal).toFixed(4),
    total: roundMoney(totals.total).toFixed(4),
  };
}

export function assertFinalizableSalesInvoice(totals: SalesInvoiceTotals): void {
  if (toMoney(totals.total).lt(0)) {
    throw new AccountingRuleError("Invoice total cannot be negative.", "INVOICE_TOTAL_NEGATIVE");
  }

  if (toMoney(totals.total).lte(0)) {
    throw new AccountingRuleError("Finalized invoices must have a total greater than zero.", "INVOICE_TOTAL_MUST_BE_POSITIVE");
  }

  if (!totals.lines.some((line) => toMoney(line.lineTotal).gt(0))) {
    throw new AccountingRuleError("Finalized invoices require at least one line with a positive total.", "INVOICE_REQUIRES_POSITIVE_LINE");
  }
}

export function assertDraftInvoiceEditable(status: InvoiceStatus): void {
  if (status !== "DRAFT") {
    throw new AccountingRuleError("Only draft invoices can be edited.", "INVOICE_NOT_EDITABLE");
  }
}

function roundMoney(value: Decimal): Decimal {
  return value.toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
}
