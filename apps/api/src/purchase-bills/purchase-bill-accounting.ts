import { assertBalancedJournal, assertJournalFxContext, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";

export interface PurchaseBillPostingLine {
  accountId: string;
  description: string;
  taxableAmount: string;
  transactionTaxableAmount?: string;
}

export interface PurchaseBillPostingInput {
  accountsPayableAccountId: string;
  vatReceivableAccountId: string;
  billNumber: string;
  supplierName: string;
  currency: string;
  baseCurrency?: string;
  exchangeRate?: string;
  rateSnapshotId?: string | null;
  total: string;
  transactionTotal?: string;
  taxTotal: string;
  transactionTaxTotal?: string;
  lines: PurchaseBillPostingLine[];
}

export function buildPurchaseBillJournalLines(input: PurchaseBillPostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [];
  const expenseByAccount = new Map<string, { amount: ReturnType<typeof toMoney>; transactionAmount: ReturnType<typeof toMoney>; descriptions: string[]; componentCount: number }>();

  for (const billLine of input.lines) {
    const existing = expenseByAccount.get(billLine.accountId);
    if (existing) {
      existing.amount = existing.amount.plus(billLine.taxableAmount);
      existing.transactionAmount = existing.transactionAmount.plus(billLine.transactionTaxableAmount ?? billLine.taxableAmount);
      existing.componentCount += 1;
      if (existing.descriptions.length < 3) {
        existing.descriptions.push(billLine.description);
      }
    } else {
      expenseByAccount.set(billLine.accountId, {
        amount: toMoney(billLine.taxableAmount),
        transactionAmount: toMoney(billLine.transactionTaxableAmount ?? billLine.taxableAmount),
        descriptions: [billLine.description],
        componentCount: 1,
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
      description: `Purchase bill ${input.billNumber}: ${expense.descriptions.join(", ")}`,
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
      description: `VAT receivable for purchase bill ${input.billNumber}`,
      currency: input.currency,
      exchangeRate: input.exchangeRate ?? "1",
      rateSnapshotId: input.rateSnapshotId ?? null,
      fxRoundingComponentCount: Math.max(1, input.lines.length),
    });
  }

  lines.push({
    accountId: input.accountsPayableAccountId,
    debit: "0.0000",
    credit: input.total,
    transactionDebit: "0.0000",
    transactionCredit: input.transactionTotal ?? input.total,
    description: `Accounts payable for ${input.billNumber} - ${input.supplierName}`,
    currency: input.currency,
    exchangeRate: input.exchangeRate ?? "1",
    rateSnapshotId: input.rateSnapshotId ?? null,
    fxRoundingComponentCount: Math.max(1, input.lines.length),
  });

  assertBalancedJournal(lines);
  assertJournalFxContext(lines, input.baseCurrency ?? input.currency);
  return lines;
}
