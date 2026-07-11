import { assertBalancedJournal, assertJournalFxContext, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";

export interface CreditNotePostingLine {
  accountId: string;
  description: string;
  taxableAmount: string;
  transactionTaxableAmount?: string;
}

export interface CreditNotePostingInput {
  accountsReceivableAccountId: string;
  vatPayableAccountId: string;
  creditNoteNumber: string;
  customerName: string;
  currency: string;
  baseCurrency?: string;
  exchangeRate?: string;
  rateSnapshotId?: string | null;
  total: string;
  transactionTotal?: string;
  taxTotal: string;
  transactionTaxTotal?: string;
  lines: CreditNotePostingLine[];
}

export function buildCreditNoteJournalLines(input: CreditNotePostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [];
  const revenueByAccount = new Map<string, { amount: ReturnType<typeof toMoney>; transactionAmount: ReturnType<typeof toMoney>; descriptions: string[]; componentCount: number }>();

  for (const creditNoteLine of input.lines) {
    const existing = revenueByAccount.get(creditNoteLine.accountId);
    if (existing) {
      existing.amount = existing.amount.plus(creditNoteLine.taxableAmount);
      existing.transactionAmount = existing.transactionAmount.plus(creditNoteLine.transactionTaxableAmount ?? creditNoteLine.taxableAmount);
      existing.componentCount += 1;
      if (existing.descriptions.length < 3) {
        existing.descriptions.push(creditNoteLine.description);
      }
    } else {
      revenueByAccount.set(creditNoteLine.accountId, {
        amount: toMoney(creditNoteLine.taxableAmount), transactionAmount: toMoney(creditNoteLine.transactionTaxableAmount ?? creditNoteLine.taxableAmount),
        descriptions: [creditNoteLine.description], componentCount: 1,
      });
    }
  }

  for (const [accountId, revenue] of revenueByAccount.entries()) {
    if (revenue.amount.eq(0)) {
      continue;
    }

    lines.push({
      accountId,
      debit: revenue.amount.toFixed(4),
      credit: "0.0000",
      transactionDebit: revenue.transactionAmount.toFixed(4),
      transactionCredit: "0.0000",
      description: `Sales credit note ${input.creditNoteNumber}: ${revenue.descriptions.join(", ")}`,
      currency: input.currency,
      exchangeRate: input.exchangeRate ?? "1",
      rateSnapshotId: input.rateSnapshotId ?? null,
      fxRoundingComponentCount: revenue.componentCount,
    });
  }

  if (toMoney(input.taxTotal).gt(0)) {
    lines.push({
      accountId: input.vatPayableAccountId,
      debit: toMoney(input.taxTotal).toFixed(4),
      credit: "0.0000",
      transactionDebit: toMoney(input.transactionTaxTotal ?? input.taxTotal).toFixed(4),
      transactionCredit: "0.0000",
      description: `VAT payable reversed by sales credit note ${input.creditNoteNumber}`,
      currency: input.currency,
      exchangeRate: input.exchangeRate ?? "1",
      rateSnapshotId: input.rateSnapshotId ?? null,
      fxRoundingComponentCount: Math.max(1, input.lines.length),
    });
  }

  lines.push({
    accountId: input.accountsReceivableAccountId,
    debit: "0.0000",
    credit: input.total,
    transactionDebit: "0.0000",
    transactionCredit: input.transactionTotal ?? input.total,
    description: `Accounts receivable credited by ${input.creditNoteNumber} - ${input.customerName}`,
    currency: input.currency,
    exchangeRate: input.exchangeRate ?? "1",
    rateSnapshotId: input.rateSnapshotId ?? null,
    fxRoundingComponentCount: Math.max(1, input.lines.length),
  });

  assertBalancedJournal(lines);
  assertJournalFxContext(lines, input.baseCurrency ?? input.currency);
  return lines;
}
