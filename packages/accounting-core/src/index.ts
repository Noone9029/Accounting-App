export type JournalStatus = "DRAFT" | "POSTED" | "VOIDED" | "REVERSED";
export type InvoiceStatus = "DRAFT" | "FINALIZED" | "VOIDED";
export type SalesInvoiceTaxMode = "TAX_EXCLUSIVE" | "TAX_INCLUSIVE" | "NO_TAX";

export interface JournalLineInput {
  accountId: string;
  debit: string | number;
  credit: string | number;
  transactionDebit?: string | number;
  transactionCredit?: string | number;
  description?: string;
  currency: string;
  exchangeRate?: string | number;
  rateSnapshotId?: string | null;
  fxRoundingComponentCount?: number;
  functionalCurrencyOnly?: boolean;
  taxRateId?: string | null;
  costCenterId?: string | null;
  projectId?: string | null;
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
  taxMode?: SalesInvoiceTaxMode | null;
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
const FxDecimal = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });
const PLAIN_DECIMAL_PATTERN = /^\+?(?:\d+(?:\.\d+)?|\.\d+)$/;
const INVALID_TRANSACTION_AMOUNT_MESSAGE = "Transaction amount must be a non-negative finite decimal string or Decimal value.";
const INVALID_EXCHANGE_RATE_MESSAGE = "Exchange rate must be a positive finite decimal string or Decimal value.";

export type ExactDecimalInput = string | Decimal;

export interface TransactionDocumentLineAmounts {
  lineGrossAmount: ExactDecimalInput;
  discountAmount: ExactDecimalInput;
  taxableAmount: ExactDecimalInput;
  taxAmount: ExactDecimalInput;
  lineTotal: ExactDecimalInput;
}

export interface BaseDocumentLineAmounts {
  lineGrossAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
}

export interface BaseDocumentTotals {
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
}

export function convertTransactionToBaseAmount(
  transactionAmount: ExactDecimalInput,
  exchangeRate: ExactDecimalInput,
): string {
  const amount = parseExactDecimal(
    transactionAmount,
    INVALID_TRANSACTION_AMOUNT_MESSAGE,
    "FX_INVALID_TRANSACTION_AMOUNT",
  );
  if (amount.lt(0)) {
    throw new AccountingRuleError(INVALID_TRANSACTION_AMOUNT_MESSAGE, "FX_INVALID_TRANSACTION_AMOUNT");
  }

  const rate = parseExactDecimal(
    exchangeRate,
    INVALID_EXCHANGE_RATE_MESSAGE,
    "FX_INVALID_EXCHANGE_RATE",
  );
  if (rate.lte(0)) {
    throw new AccountingRuleError(INVALID_EXCHANGE_RATE_MESSAGE, "FX_INVALID_EXCHANGE_RATE");
  }

  return roundMoney(amount.mul(rate)).toFixed(4);
}

export type ForeignSettlementDirection = "CUSTOMER" | "SUPPLIER";

export interface ForeignSettlementAllocationInput {
  direction: ForeignSettlementDirection;
  transactionAmount: ExactDecimalInput;
  transactionOpenAmount: ExactDecimalInput;
  baseOpenAmount: ExactDecimalInput;
  recognitionRate: ExactDecimalInput;
  settlementRate: ExactDecimalInput;
  settlementTransactionOpenAmount?: ExactDecimalInput;
  settlementBaseOpenAmount?: ExactDecimalInput;
}

export interface ForeignSettlementAllocation {
  transactionAmount: string;
  documentBaseAmount: string;
  settlementBaseAmount: string;
  realizedGainAmount: string;
  realizedLossAmount: string;
  remainingTransactionAmount: string;
  remainingBaseAmount: string;
}

/**
 * Allocates a transaction-currency settlement without losing the document's
 * base-currency carrying value. A final allocation consumes the exact stored
 * base residual so repeated partial settlements cannot strand rounding dust.
 */
export function allocateForeignSettlement(
  input: ForeignSettlementAllocationInput,
): ForeignSettlementAllocation {
  const amount = parseExactDecimal(
    input.transactionAmount,
    "Settlement amount must be a positive finite decimal string or Decimal value.",
    "FX_INVALID_SETTLEMENT_AMOUNT",
  );
  const transactionOpen = parseExactDecimal(
    input.transactionOpenAmount,
    "Transaction open amount must be a non-negative finite decimal string or Decimal value.",
    "FX_INVALID_TRANSACTION_OPEN_AMOUNT",
  );
  const baseOpen = parseExactDecimal(
    input.baseOpenAmount,
    "Base open amount must be a non-negative finite decimal string or Decimal value.",
    "FX_INVALID_BASE_OPEN_AMOUNT",
  );
  const recognitionRate = parseExactDecimal(
    input.recognitionRate,
    INVALID_EXCHANGE_RATE_MESSAGE,
    "FX_INVALID_EXCHANGE_RATE",
  );
  const settlementRate = parseExactDecimal(
    input.settlementRate,
    INVALID_EXCHANGE_RATE_MESSAGE,
    "FX_INVALID_EXCHANGE_RATE",
  );
  const settlementTransactionOpen = parseExactDecimal(
    input.settlementTransactionOpenAmount ?? input.transactionOpenAmount,
    "Settlement transaction open amount must be a non-negative finite decimal string or Decimal value.",
    "FX_INVALID_SETTLEMENT_TRANSACTION_OPEN_AMOUNT",
  );
  const settlementBaseOpen = input.settlementBaseOpenAmount === undefined
    ? roundMoney(settlementTransactionOpen.mul(settlementRate))
    : parseExactDecimal(
        input.settlementBaseOpenAmount,
        "Settlement base open amount must be a non-negative finite decimal string or Decimal value.",
        "FX_INVALID_SETTLEMENT_BASE_OPEN_AMOUNT",
      );

  if (amount.lte(0)) {
    throw new AccountingRuleError(
      "Settlement amount must be greater than zero.",
      "FX_SETTLEMENT_AMOUNT_MUST_BE_POSITIVE",
    );
  }
  if (transactionOpen.lt(0) || baseOpen.lt(0) || settlementTransactionOpen.lt(0) || settlementBaseOpen.lt(0)) {
    throw new AccountingRuleError(
      "Settlement open balances cannot be negative.",
      "FX_SETTLEMENT_OPEN_BALANCE_NEGATIVE",
    );
  }
  if (recognitionRate.lte(0) || settlementRate.lte(0)) {
    throw new AccountingRuleError(INVALID_EXCHANGE_RATE_MESSAGE, "FX_INVALID_EXCHANGE_RATE");
  }
  if (amount.gt(transactionOpen)) {
    throw new AccountingRuleError(
      "Settlement amount cannot exceed the transaction open amount.",
      "FX_SETTLEMENT_EXCEEDS_OPEN_AMOUNT",
    );
  }
  if (amount.gt(settlementTransactionOpen)) {
    throw new AccountingRuleError(
      "Settlement amount cannot exceed the payment transaction open amount.",
      "FX_SETTLEMENT_EXCEEDS_PAYMENT_OPEN_AMOUNT",
    );
  }

  const transactionAmount = roundMoney(amount);
  const roundedTransactionOpen = roundMoney(transactionOpen);
  const roundedBaseOpen = roundMoney(baseOpen);
  const isFinalAllocation = transactionAmount.eq(roundedTransactionOpen);
  const isFinalSettlementAllocation = transactionAmount.eq(roundMoney(settlementTransactionOpen));
  const documentBaseAmount = isFinalAllocation
    ? roundedBaseOpen
    : roundMoney(transactionAmount.mul(recognitionRate));

  if (documentBaseAmount.gt(roundedBaseOpen)) {
    throw new AccountingRuleError(
      "Settlement carrying amount cannot exceed the base open amount.",
      "FX_SETTLEMENT_EXCEEDS_BASE_OPEN_AMOUNT",
    );
  }

  const roundedSettlementBaseOpen = roundMoney(settlementBaseOpen);
  const proportionalSettlementBaseAmount = roundMoney(transactionAmount.mul(settlementRate));
  const settlementBaseAmount = isFinalSettlementAllocation
    ? roundedSettlementBaseOpen
    : Decimal.min(proportionalSettlementBaseAmount, roundedSettlementBaseOpen);
  const difference = settlementBaseAmount.minus(documentBaseAmount);
  const customerGain = input.direction === "CUSTOMER" && difference.gt(0);
  const customerLoss = input.direction === "CUSTOMER" && difference.lt(0);
  const supplierGain = input.direction === "SUPPLIER" && difference.lt(0);
  const supplierLoss = input.direction === "SUPPLIER" && difference.gt(0);

  return {
    transactionAmount: transactionAmount.toFixed(4),
    documentBaseAmount: documentBaseAmount.toFixed(4),
    settlementBaseAmount: settlementBaseAmount.toFixed(4),
    realizedGainAmount: roundMoney(customerGain || supplierGain ? difference.abs() : ZERO).toFixed(4),
    realizedLossAmount: roundMoney(customerLoss || supplierLoss ? difference.abs() : ZERO).toFixed(4),
    remainingTransactionAmount: roundMoney(roundedTransactionOpen.minus(transactionAmount)).toFixed(4),
    remainingBaseAmount: isFinalAllocation
      ? "0.0000"
      : roundMoney(roundedBaseOpen.minus(documentBaseAmount)).toFixed(4),
  };
}

export function convertTransactionDocumentAmounts(
  lines: readonly TransactionDocumentLineAmounts[],
  exchangeRate: ExactDecimalInput,
): { lines: BaseDocumentLineAmounts[]; totals: BaseDocumentTotals } {
  const convertedLines = lines.map((line) => {
    const transactionGross = parseExactDecimal(line.lineGrossAmount, INVALID_TRANSACTION_AMOUNT_MESSAGE, "FX_INVALID_TRANSACTION_AMOUNT");
    const transactionDiscount = parseExactDecimal(line.discountAmount, INVALID_TRANSACTION_AMOUNT_MESSAGE, "FX_INVALID_TRANSACTION_AMOUNT");
    const transactionTotal = parseExactDecimal(line.lineTotal, INVALID_TRANSACTION_AMOUNT_MESSAGE, "FX_INVALID_TRANSACTION_AMOUNT");
    const taxInclusive = transactionGross.minus(transactionDiscount).eq(transactionTotal);

    const baseGross = new FxDecimal(convertTransactionToBaseAmount(line.lineGrossAmount, exchangeRate));
    const baseDiscount = new FxDecimal(convertTransactionToBaseAmount(line.discountAmount, exchangeRate));
    const baseTax = new FxDecimal(convertTransactionToBaseAmount(line.taxAmount, exchangeRate));

    // Preserve both accounting identities after four-place conversion without inventing a
    // discount. On inclusive-tax lines, gross less discount is the authoritative total and the
    // deterministic residual is assigned to taxable amount. On exclusive-tax lines, gross less
    // discount is the authoritative taxable amount and tax is added to produce the total.
    const baseTotal = taxInclusive
      ? roundMoney(baseGross.minus(baseDiscount))
      : roundMoney(baseGross.minus(baseDiscount).plus(baseTax));
    const baseTaxable = taxInclusive
      ? roundMoney(baseTotal.minus(baseTax))
      : roundMoney(baseGross.minus(baseDiscount));

    return {
      lineGrossAmount: baseGross.toFixed(4),
      discountAmount: baseDiscount.toFixed(4),
      taxableAmount: baseTaxable.toFixed(4),
      taxAmount: baseTax.toFixed(4),
      lineTotal: baseTotal.toFixed(4),
    };
  });

  const sum = (field: keyof BaseDocumentLineAmounts): string =>
    convertedLines.reduce((total, line) => total.plus(line[field]), ZERO).toFixed(4);

  return {
    lines: convertedLines,
    totals: {
      subtotal: sum("lineGrossAmount"),
      discountTotal: sum("discountAmount"),
      taxableTotal: sum("taxableAmount"),
      taxTotal: sum("taxAmount"),
      total: sum("lineTotal"),
    },
  };
}

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

    const transactionDebit = toMoney(line.transactionDebit);
    const transactionCredit = toMoney(line.transactionCredit);
    if (debit.eq(0) && credit.eq(0) && transactionDebit.eq(0) && transactionCredit.eq(0)) {
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

export function assertJournalFxContext(lines: JournalLineInput[], baseCurrency: string): void {
  const normalizedBaseCurrency = baseCurrency.trim().toUpperCase();
  const totalsByCurrency = new Map<string, { debit: Decimal; credit: Decimal }>();
  const totalsByCurrencyAndRate = new Map<string, {
    currency: string;
    rate: Decimal;
    baseDebit: Decimal;
    baseCredit: Decimal;
    transactionDebit: Decimal;
    transactionCredit: Decimal;
    debitComponentCount: number;
    creditComponentCount: number;
  }>();

  for (const [index, line] of lines.entries()) {
    const currency = line.currency.trim().toUpperCase();
    const rate = toMoney(line.exchangeRate ?? "1");
    const baseDebit = toMoney(line.debit);
    const baseCredit = toMoney(line.credit);
    const transactionDebit = line.transactionDebit === undefined ? baseDebit : toMoney(line.transactionDebit);
    const transactionCredit = line.transactionCredit === undefined ? baseCredit : toMoney(line.transactionCredit);

    if (!currency || rate.lte(0) || transactionDebit.lt(0) || transactionCredit.lt(0)) {
      throw new AccountingRuleError(`Line ${index + 1} has invalid FX context.`, "JOURNAL_FX_CONTEXT_INVALID");
    }
    if (line.functionalCurrencyOnly) {
      if (
        currency !== normalizedBaseCurrency ||
        !rate.eq(1) ||
        Boolean(line.rateSnapshotId) ||
        line.transactionDebit !== undefined ||
        line.transactionCredit !== undefined
      ) {
        throw new AccountingRuleError(
          `Line ${index + 1} has invalid functional-currency-only context.`,
          "JOURNAL_FX_CONTEXT_INVALID",
        );
      }
      continue;
    }
    const componentCount = line.fxRoundingComponentCount ?? 1;
    if (!Number.isInteger(componentCount) || componentCount < 1 || componentCount > 10_000) {
      throw new AccountingRuleError(`Line ${index + 1} has invalid FX rounding evidence.`, "JOURNAL_FX_CONTEXT_INVALID");
    }
    if (
      (transactionDebit.gt(0) && transactionCredit.gt(0)) ||
      (transactionDebit.eq(0) && transactionCredit.eq(0)) ||
      (baseDebit.gt(0) && !transactionDebit.gt(0)) ||
      (baseCredit.gt(0) && !transactionCredit.gt(0)) ||
      (transactionDebit.gt(0) && baseCredit.gt(0)) ||
      (transactionCredit.gt(0) && baseDebit.gt(0))
    ) {
      throw new AccountingRuleError(`Line ${index + 1} has inconsistent transaction and base sides.`, "JOURNAL_FX_CONTEXT_INVALID");
    }
    if (
      currency === normalizedBaseCurrency &&
      (!rate.eq(1) || !transactionDebit.eq(baseDebit) || !transactionCredit.eq(baseCredit) || Boolean(line.rateSnapshotId))
    ) {
      throw new AccountingRuleError(`Line ${index + 1} base-currency context must use rate one.`, "JOURNAL_FX_CONTEXT_INVALID");
    }
    if (currency !== normalizedBaseCurrency && (line.transactionDebit === undefined || line.transactionCredit === undefined)) {
      throw new AccountingRuleError(`Line ${index + 1} requires explicit foreign transaction amounts.`, "JOURNAL_FX_CONTEXT_INVALID");
    }

    const totals = totalsByCurrency.get(currency) ?? { debit: ZERO, credit: ZERO };
    totals.debit = totals.debit.plus(transactionDebit);
    totals.credit = totals.credit.plus(transactionCredit);
    totalsByCurrency.set(currency, totals);

    const rateKey = `${currency}\u0000${rate.toString()}`;
    const rateTotals = totalsByCurrencyAndRate.get(rateKey) ?? {
      currency,
      rate,
      baseDebit: ZERO,
      baseCredit: ZERO,
      transactionDebit: ZERO,
      transactionCredit: ZERO,
      debitComponentCount: 0,
      creditComponentCount: 0,
    };
    rateTotals.baseDebit = rateTotals.baseDebit.plus(baseDebit);
    rateTotals.baseCredit = rateTotals.baseCredit.plus(baseCredit);
    rateTotals.transactionDebit = rateTotals.transactionDebit.plus(transactionDebit);
    rateTotals.transactionCredit = rateTotals.transactionCredit.plus(transactionCredit);
    if (transactionDebit.gt(0)) rateTotals.debitComponentCount += componentCount;
    if (transactionCredit.gt(0)) rateTotals.creditComponentCount += componentCount;
    totalsByCurrencyAndRate.set(rateKey, rateTotals);
  }

  for (const [currency, totals] of totalsByCurrency) {
    if (!totals.debit.eq(totals.credit)) {
      throw new AccountingRuleError(
        `Journal transaction amounts are not balanced in ${currency}.`,
        "JOURNAL_TRANSACTION_NOT_BALANCED",
      );
    }
  }

  // Four-place document component allocation may leave one unit in the last
  // decimal place on an aggregated journal side. Anything larger is not a
  // rounding residual and must fail before persistence.
  for (const totals of totalsByCurrencyAndRate.values()) {
    if (totals.currency === normalizedBaseCurrency) continue;
    const expectedDebit = new Decimal(convertTransactionToBaseAmount(totals.transactionDebit.toString(), totals.rate.toString()));
    const expectedCredit = new Decimal(convertTransactionToBaseAmount(totals.transactionCredit.toString(), totals.rate.toString()));
    const allowedDebitResidual = new Decimal(totals.debitComponentCount).times("0.0001");
    const allowedCreditResidual = new Decimal(totals.creditComponentCount).times("0.0001");
    if (
      totals.baseDebit.minus(expectedDebit).abs().gt(allowedDebitResidual) ||
      totals.baseCredit.minus(expectedCredit).abs().gt(allowedCreditResidual)
    ) {
      throw new AccountingRuleError(
        `Journal base amounts do not match transaction amounts at the captured rate for ${totals.currency}.`,
        "JOURNAL_FX_RATE_MISMATCH",
      );
    }
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
    ...(line.functionalCurrencyOnly
      ? { functionalCurrencyOnly: true as const }
      : {
          transactionDebit: toMoney(line.transactionCredit ?? line.credit).toFixed(4),
          transactionCredit: toMoney(line.transactionDebit ?? line.debit).toFixed(4),
        }),
    description: line.description ? `Reversal: ${line.description}` : "Reversal",
    currency: line.currency,
    exchangeRate: line.exchangeRate ?? "1",
    rateSnapshotId: line.rateSnapshotId ?? null,
    fxRoundingComponentCount: line.fxRoundingComponentCount ?? 1,
    taxRateId: line.taxRateId ?? null,
    costCenterId: line.costCenterId ?? null,
    projectId: line.projectId ?? null,
  }));
}

export function calculateSalesInvoiceLine(line: SalesInvoiceLineInput, lineIndex = 0, defaultTaxMode: SalesInvoiceTaxMode = "TAX_EXCLUSIVE"): CalculatedSalesInvoiceLine {
  const quantity = toMoney(line.quantity);
  const unitPrice = toMoney(line.unitPrice);
  const discountRate = toMoney(line.discountRate);
  const taxMode = line.taxMode ?? defaultTaxMode;
  const taxRate = taxMode === "NO_TAX" ? ZERO : toMoney(line.taxRate);

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
  const amountAfterDiscount = roundMoney(lineGrossAmount.minus(discountAmount));
  const taxableAmount =
    taxMode === "TAX_INCLUSIVE" && taxRate.gt(0)
      ? roundMoney(amountAfterDiscount.mul(100).div(new Decimal(100).plus(taxRate)))
      : amountAfterDiscount;
  const taxAmount =
    taxMode === "NO_TAX"
      ? ZERO
      : taxMode === "TAX_INCLUSIVE"
        ? roundMoney(amountAfterDiscount.minus(taxableAmount))
        : roundMoney(taxableAmount.mul(taxRate).div(100));
  const lineTotal = taxMode === "TAX_INCLUSIVE" ? amountAfterDiscount : roundMoney(taxableAmount.plus(taxAmount));

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

export function calculateSalesInvoiceTotals(lines: SalesInvoiceLineInput[], taxMode: SalesInvoiceTaxMode = "TAX_EXCLUSIVE"): SalesInvoiceTotals {
  if (lines.length === 0) {
    throw new AccountingRuleError("An invoice requires at least one line.", "INVOICE_REQUIRES_LINES");
  }

  const calculatedLines = lines.map((line, index) => calculateSalesInvoiceLine(line, index, taxMode));
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

function parseExactDecimal(value: ExactDecimalInput, message: string, code: string): Decimal {
  if (typeof value !== "string" && !Decimal.isDecimal(value)) {
    throw new AccountingRuleError(message, code);
  }

  const normalized = typeof value === "string" ? value.trim() : value;
  if (typeof normalized === "string" && !PLAIN_DECIMAL_PATTERN.test(normalized)) {
    throw new AccountingRuleError(message, code);
  }

  let parsed: Decimal;
  try {
    parsed = new FxDecimal(normalized);
  } catch {
    throw new AccountingRuleError(message, code);
  }

  if (!parsed.isFinite()) {
    throw new AccountingRuleError(message, code);
  }
  return parsed;
}
