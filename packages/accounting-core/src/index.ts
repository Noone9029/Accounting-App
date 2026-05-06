export type JournalStatus = "DRAFT" | "POSTED" | "VOIDED" | "REVERSED";

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
