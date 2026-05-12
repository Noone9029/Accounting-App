import { assertBalancedJournal, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";

export interface PurchaseBillPostingLine {
  accountId: string;
  description: string;
  taxableAmount: string;
}

export interface PurchaseBillPostingInput {
  accountsPayableAccountId: string;
  vatReceivableAccountId: string;
  billNumber: string;
  supplierName: string;
  currency: string;
  total: string;
  taxTotal: string;
  lines: PurchaseBillPostingLine[];
}

export function buildPurchaseBillJournalLines(input: PurchaseBillPostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [];
  const expenseByAccount = new Map<string, { amount: ReturnType<typeof toMoney>; descriptions: string[] }>();

  for (const billLine of input.lines) {
    const existing = expenseByAccount.get(billLine.accountId);
    if (existing) {
      existing.amount = existing.amount.plus(billLine.taxableAmount);
      if (existing.descriptions.length < 3) {
        existing.descriptions.push(billLine.description);
      }
    } else {
      expenseByAccount.set(billLine.accountId, { amount: toMoney(billLine.taxableAmount), descriptions: [billLine.description] });
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
      description: `Purchase bill ${input.billNumber}: ${expense.descriptions.join(", ")}`,
      currency: input.currency,
      exchangeRate: "1",
    });
  }

  if (toMoney(input.taxTotal).gt(0)) {
    lines.push({
      accountId: input.vatReceivableAccountId,
      debit: toMoney(input.taxTotal).toFixed(4),
      credit: "0.0000",
      description: `VAT receivable for purchase bill ${input.billNumber}`,
      currency: input.currency,
      exchangeRate: "1",
    });
  }

  lines.push({
    accountId: input.accountsPayableAccountId,
    debit: "0.0000",
    credit: input.total,
    description: `Accounts payable for ${input.billNumber} - ${input.supplierName}`,
    currency: input.currency,
    exchangeRate: "1",
  });

  assertBalancedJournal(lines);
  return lines;
}
