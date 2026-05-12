import { assertBalancedJournal, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";

export interface CashExpensePostingLine {
  accountId: string;
  description: string;
  taxableAmount: string;
}

export interface CashExpensePostingInput {
  paidThroughAccountId: string;
  vatReceivableAccountId: string;
  expenseNumber: string;
  currency: string;
  total: string;
  taxTotal: string;
  lines: CashExpensePostingLine[];
}

export function buildCashExpenseJournalLines(input: CashExpensePostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [];
  const expenseByAccount = new Map<string, { amount: ReturnType<typeof toMoney>; descriptions: string[] }>();

  for (const expenseLine of input.lines) {
    const existing = expenseByAccount.get(expenseLine.accountId);
    if (existing) {
      existing.amount = existing.amount.plus(expenseLine.taxableAmount);
      if (existing.descriptions.length < 3) {
        existing.descriptions.push(expenseLine.description);
      }
    } else {
      expenseByAccount.set(expenseLine.accountId, { amount: toMoney(expenseLine.taxableAmount), descriptions: [expenseLine.description] });
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
      description: `Cash expense ${input.expenseNumber}: ${expense.descriptions.join(", ")}`,
      currency: input.currency,
      exchangeRate: "1",
    });
  }

  if (toMoney(input.taxTotal).gt(0)) {
    lines.push({
      accountId: input.vatReceivableAccountId,
      debit: toMoney(input.taxTotal).toFixed(4),
      credit: "0.0000",
      description: `VAT receivable for cash expense ${input.expenseNumber}`,
      currency: input.currency,
      exchangeRate: "1",
    });
  }

  lines.push({
    accountId: input.paidThroughAccountId,
    debit: "0.0000",
    credit: input.total,
    description: `Paid cash expense ${input.expenseNumber}`,
    currency: input.currency,
    exchangeRate: "1",
  });

  assertBalancedJournal(lines);
  return lines;
}
