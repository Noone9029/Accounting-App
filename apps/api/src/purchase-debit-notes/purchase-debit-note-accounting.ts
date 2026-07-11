import { assertBalancedJournal, assertJournalFxContext, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";

export interface PurchaseDebitNotePostingLine {
  accountId: string;
  description: string;
  taxableAmount: string;
  transactionTaxableAmount?: string;
}

export interface PurchaseDebitNotePostingInput {
  accountsPayableAccountId: string;
  vatReceivableAccountId: string;
  debitNoteNumber: string;
  supplierName: string;
  currency: string;
  baseCurrency?: string;
  exchangeRate?: string;
  rateSnapshotId?: string | null;
  total: string;
  transactionTotal?: string;
  taxTotal: string;
  transactionTaxTotal?: string;
  lines: PurchaseDebitNotePostingLine[];
}

export function buildPurchaseDebitNoteJournalLines(input: PurchaseDebitNotePostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [
    {
      accountId: input.accountsPayableAccountId,
      debit: input.total,
      credit: "0.0000",
      transactionDebit: input.transactionTotal ?? input.total,
      transactionCredit: "0.0000",
      description: `Accounts payable reduced by ${input.debitNoteNumber} - ${input.supplierName}`,
      currency: input.currency,
      exchangeRate: input.exchangeRate ?? "1",
      rateSnapshotId: input.rateSnapshotId ?? null,
      fxRoundingComponentCount: Math.max(1, input.lines.length),
    },
  ];
  const expenseByAccount = new Map<string, { amount: ReturnType<typeof toMoney>; transactionAmount: ReturnType<typeof toMoney>; descriptions: string[]; componentCount: number }>();

  for (const debitNoteLine of input.lines) {
    const existing = expenseByAccount.get(debitNoteLine.accountId);
    if (existing) {
      existing.amount = existing.amount.plus(debitNoteLine.taxableAmount);
      existing.transactionAmount = existing.transactionAmount.plus(debitNoteLine.transactionTaxableAmount ?? debitNoteLine.taxableAmount);
      existing.componentCount += 1;
      if (existing.descriptions.length < 3) {
        existing.descriptions.push(debitNoteLine.description);
      }
    } else {
      expenseByAccount.set(debitNoteLine.accountId, {
        amount: toMoney(debitNoteLine.taxableAmount), transactionAmount: toMoney(debitNoteLine.transactionTaxableAmount ?? debitNoteLine.taxableAmount),
        descriptions: [debitNoteLine.description], componentCount: 1,
      });
    }
  }

  for (const [accountId, expense] of expenseByAccount.entries()) {
    if (expense.amount.eq(0)) {
      continue;
    }

    lines.push({
      accountId,
      debit: "0.0000",
      credit: expense.amount.toFixed(4),
      transactionDebit: "0.0000",
      transactionCredit: expense.transactionAmount.toFixed(4),
      description: `Purchase debit note ${input.debitNoteNumber}: ${expense.descriptions.join(", ")}`,
      currency: input.currency,
      exchangeRate: input.exchangeRate ?? "1",
      rateSnapshotId: input.rateSnapshotId ?? null,
      fxRoundingComponentCount: expense.componentCount,
    });
  }

  if (toMoney(input.taxTotal).gt(0)) {
    lines.push({
      accountId: input.vatReceivableAccountId,
      debit: "0.0000",
      credit: toMoney(input.taxTotal).toFixed(4),
      transactionDebit: "0.0000",
      transactionCredit: toMoney(input.transactionTaxTotal ?? input.taxTotal).toFixed(4),
      description: `VAT receivable reversed by purchase debit note ${input.debitNoteNumber}`,
      currency: input.currency,
      exchangeRate: input.exchangeRate ?? "1",
      rateSnapshotId: input.rateSnapshotId ?? null,
      fxRoundingComponentCount: Math.max(1, input.lines.length),
    });
  }

  assertBalancedJournal(lines);
  assertJournalFxContext(lines, input.baseCurrency ?? input.currency);
  return lines;
}
