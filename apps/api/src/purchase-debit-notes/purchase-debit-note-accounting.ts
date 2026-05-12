import { assertBalancedJournal, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";

export interface PurchaseDebitNotePostingLine {
  accountId: string;
  description: string;
  taxableAmount: string;
}

export interface PurchaseDebitNotePostingInput {
  accountsPayableAccountId: string;
  vatReceivableAccountId: string;
  debitNoteNumber: string;
  supplierName: string;
  currency: string;
  total: string;
  taxTotal: string;
  lines: PurchaseDebitNotePostingLine[];
}

export function buildPurchaseDebitNoteJournalLines(input: PurchaseDebitNotePostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [
    {
      accountId: input.accountsPayableAccountId,
      debit: input.total,
      credit: "0.0000",
      description: `Accounts payable reduced by ${input.debitNoteNumber} - ${input.supplierName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
  ];
  const expenseByAccount = new Map<string, { amount: ReturnType<typeof toMoney>; descriptions: string[] }>();

  for (const debitNoteLine of input.lines) {
    const existing = expenseByAccount.get(debitNoteLine.accountId);
    if (existing) {
      existing.amount = existing.amount.plus(debitNoteLine.taxableAmount);
      if (existing.descriptions.length < 3) {
        existing.descriptions.push(debitNoteLine.description);
      }
    } else {
      expenseByAccount.set(debitNoteLine.accountId, { amount: toMoney(debitNoteLine.taxableAmount), descriptions: [debitNoteLine.description] });
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
      description: `Purchase debit note ${input.debitNoteNumber}: ${expense.descriptions.join(", ")}`,
      currency: input.currency,
      exchangeRate: "1",
    });
  }

  if (toMoney(input.taxTotal).gt(0)) {
    lines.push({
      accountId: input.vatReceivableAccountId,
      debit: "0.0000",
      credit: toMoney(input.taxTotal).toFixed(4),
      description: `VAT receivable reversed by purchase debit note ${input.debitNoteNumber}`,
      currency: input.currency,
      exchangeRate: "1",
    });
  }

  assertBalancedJournal(lines);
  return lines;
}
