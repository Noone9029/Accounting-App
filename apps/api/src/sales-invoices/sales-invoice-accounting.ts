import { assertBalancedJournal, assertJournalFxContext, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";

export interface SalesInvoicePostingLine {
  accountId: string;
  description: string;
  taxableAmount: string;
  transactionTaxableAmount?: string;
}

export interface SalesInvoicePostingInput {
  accountsReceivableAccountId: string;
  vatPayableAccountId: string;
  invoiceNumber: string;
  customerName: string;
  currency: string;
  baseCurrency?: string;
  exchangeRate?: string;
  rateSnapshotId?: string | null;
  total: string;
  transactionTotal?: string;
  taxTotal: string;
  transactionTaxTotal?: string;
  lines: SalesInvoicePostingLine[];
}

export function buildSalesInvoiceJournalLines(input: SalesInvoicePostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [
    {
      accountId: input.accountsReceivableAccountId,
      debit: input.total,
      credit: "0.0000",
      transactionDebit: input.transactionTotal ?? input.total,
      transactionCredit: "0.0000",
      description: `Accounts receivable for ${input.invoiceNumber} - ${input.customerName}`,
      currency: input.currency,
      exchangeRate: input.exchangeRate ?? "1",
      rateSnapshotId: input.rateSnapshotId ?? null,
      fxRoundingComponentCount: Math.max(1, input.lines.length),
    },
  ];

  const revenueByAccount = new Map<string, { amount: ReturnType<typeof toMoney>; transactionAmount: ReturnType<typeof toMoney>; descriptions: string[]; componentCount: number }>();
  for (const invoiceLine of input.lines) {
    const existing = revenueByAccount.get(invoiceLine.accountId);
    if (existing) {
      existing.amount = existing.amount.plus(invoiceLine.taxableAmount);
      existing.transactionAmount = existing.transactionAmount.plus(invoiceLine.transactionTaxableAmount ?? invoiceLine.taxableAmount);
      existing.componentCount += 1;
      if (existing.descriptions.length < 3) {
        existing.descriptions.push(invoiceLine.description);
      }
    } else {
      revenueByAccount.set(invoiceLine.accountId, {
        amount: toMoney(invoiceLine.taxableAmount),
        transactionAmount: toMoney(invoiceLine.transactionTaxableAmount ?? invoiceLine.taxableAmount),
        descriptions: [invoiceLine.description],
        componentCount: 1,
      });
    }
  }

  for (const [accountId, revenue] of revenueByAccount.entries()) {
    if (revenue.amount.eq(0)) {
      continue;
    }

    lines.push({
      accountId,
      debit: "0.0000",
        credit: revenue.amount.toFixed(4),
      transactionDebit: "0.0000",
      transactionCredit: revenue.transactionAmount.toFixed(4),
      description: `Sales invoice ${input.invoiceNumber}: ${revenue.descriptions.join(", ")}`,
      currency: input.currency,
      exchangeRate: input.exchangeRate ?? "1",
      rateSnapshotId: input.rateSnapshotId ?? null,
      fxRoundingComponentCount: revenue.componentCount,
    });
  }

  if (toMoney(input.taxTotal).gt(0)) {
    lines.push({
      accountId: input.vatPayableAccountId,
      debit: "0.0000",
      credit: toMoney(input.taxTotal).toFixed(4),
      transactionDebit: "0.0000",
      transactionCredit: toMoney(input.transactionTaxTotal ?? input.taxTotal).toFixed(4),
      description: `VAT payable for sales invoice ${input.invoiceNumber}`,
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
