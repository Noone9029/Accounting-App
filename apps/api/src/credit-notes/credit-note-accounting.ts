import { assertBalancedJournal, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";

export interface CreditNotePostingLine {
  accountId: string;
  description: string;
  taxableAmount: string;
}

export interface CreditNotePostingInput {
  accountsReceivableAccountId: string;
  vatPayableAccountId: string;
  creditNoteNumber: string;
  customerName: string;
  currency: string;
  total: string;
  taxTotal: string;
  lines: CreditNotePostingLine[];
}

export function buildCreditNoteJournalLines(input: CreditNotePostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [];
  const revenueByAccount = new Map<string, { amount: ReturnType<typeof toMoney>; descriptions: string[] }>();

  for (const creditNoteLine of input.lines) {
    const existing = revenueByAccount.get(creditNoteLine.accountId);
    if (existing) {
      existing.amount = existing.amount.plus(creditNoteLine.taxableAmount);
      if (existing.descriptions.length < 3) {
        existing.descriptions.push(creditNoteLine.description);
      }
    } else {
      revenueByAccount.set(creditNoteLine.accountId, { amount: toMoney(creditNoteLine.taxableAmount), descriptions: [creditNoteLine.description] });
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
      description: `Sales credit note ${input.creditNoteNumber}: ${revenue.descriptions.join(", ")}`,
      currency: input.currency,
      exchangeRate: "1",
    });
  }

  if (toMoney(input.taxTotal).gt(0)) {
    lines.push({
      accountId: input.vatPayableAccountId,
      debit: toMoney(input.taxTotal).toFixed(4),
      credit: "0.0000",
      description: `VAT payable reversed by sales credit note ${input.creditNoteNumber}`,
      currency: input.currency,
      exchangeRate: "1",
    });
  }

  lines.push({
    accountId: input.accountsReceivableAccountId,
    debit: "0.0000",
    credit: input.total,
    description: `Accounts receivable credited by ${input.creditNoteNumber} - ${input.customerName}`,
    currency: input.currency,
    exchangeRate: "1",
  });

  assertBalancedJournal(lines);
  return lines;
}
