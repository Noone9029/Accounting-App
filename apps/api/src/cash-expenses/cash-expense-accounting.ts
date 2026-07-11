import { assertBalancedJournal, assertJournalFxContext, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";

export interface CashExpensePostingLine {
  accountId: string;
  description: string;
  taxableAmount: string;
  transactionTaxableAmount?: string;
}

export interface CashExpensePostingInput {
  paidThroughAccountId: string;
  vatReceivableAccountId: string;
  expenseNumber: string;
  currency: string;
  baseCurrency?: string;
  exchangeRate?: string;
  rateSnapshotId?: string | null;
  total: string;
  transactionTotal?: string;
  taxTotal: string;
  transactionTaxTotal?: string;
  lines: CashExpensePostingLine[];
}

export function buildCashExpenseJournalLines(input: CashExpensePostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [];
  const expenseByAccount = new Map<string, { amount: ReturnType<typeof toMoney>; transactionAmount: ReturnType<typeof toMoney>; descriptions: string[]; componentCount: number }>();

  for (const expenseLine of input.lines) {
    const existing = expenseByAccount.get(expenseLine.accountId);
    if (existing) {
      existing.amount = existing.amount.plus(expenseLine.taxableAmount);
      existing.transactionAmount = existing.transactionAmount.plus(expenseLine.transactionTaxableAmount ?? expenseLine.taxableAmount);
      existing.componentCount += 1;
      if (existing.descriptions.length < 3) {
        existing.descriptions.push(expenseLine.description);
      }
    } else {
      expenseByAccount.set(expenseLine.accountId, {
        amount: toMoney(expenseLine.taxableAmount), transactionAmount: toMoney(expenseLine.transactionTaxableAmount ?? expenseLine.taxableAmount),
        descriptions: [expenseLine.description], componentCount: 1,
      });
    }
  }

  for (const [accountId, expense] of expenseByAccount.entries()) {
    if (expense.amount.eq(0)) {
      continue;
    }

    lines.push({
      accountId,
      debit: expense.amount.toFixed(4),
      credit: "0.0000",
      transactionDebit: expense.transactionAmount.toFixed(4),
      transactionCredit: "0.0000",
      description: `Cash expense ${input.expenseNumber}: ${expense.descriptions.join(", ")}`,
      currency: input.currency,
      exchangeRate: input.exchangeRate ?? "1",
      rateSnapshotId: input.rateSnapshotId ?? null,
      fxRoundingComponentCount: expense.componentCount,
    });
  }

  if (toMoney(input.taxTotal).gt(0)) {
    lines.push({
      accountId: input.vatReceivableAccountId,
      debit: toMoney(input.taxTotal).toFixed(4),
      credit: "0.0000",
      transactionDebit: toMoney(input.transactionTaxTotal ?? input.taxTotal).toFixed(4),
      transactionCredit: "0.0000",
      description: `VAT receivable for cash expense ${input.expenseNumber}`,
      currency: input.currency,
      exchangeRate: input.exchangeRate ?? "1",
      rateSnapshotId: input.rateSnapshotId ?? null,
      fxRoundingComponentCount: Math.max(1, input.lines.length),
    });
  }

  lines.push({
    accountId: input.paidThroughAccountId,
    debit: "0.0000",
    credit: input.total,
    transactionDebit: "0.0000",
    transactionCredit: input.transactionTotal ?? input.total,
    description: `Paid cash expense ${input.expenseNumber}`,
    currency: input.currency,
    exchangeRate: input.exchangeRate ?? "1",
    rateSnapshotId: input.rateSnapshotId ?? null,
    fxRoundingComponentCount: Math.max(1, input.lines.length),
  });

  assertBalancedJournal(lines);
  assertJournalFxContext(lines, input.baseCurrency ?? input.currency);
  return lines;
}
