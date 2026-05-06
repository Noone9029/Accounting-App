import { assertBalancedJournal, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";

export interface SalesInvoicePostingLine {
  accountId: string;
  description: string;
  taxableAmount: string;
}

export interface SalesInvoicePostingInput {
  accountsReceivableAccountId: string;
  vatPayableAccountId: string;
  invoiceNumber: string;
  customerName: string;
  currency: string;
  total: string;
  taxTotal: string;
  lines: SalesInvoicePostingLine[];
}

export function buildSalesInvoiceJournalLines(input: SalesInvoicePostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [
    {
      accountId: input.accountsReceivableAccountId,
      debit: input.total,
      credit: "0.0000",
      description: `Accounts receivable for ${input.invoiceNumber} - ${input.customerName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
  ];

  const revenueByAccount = new Map<string, { amount: ReturnType<typeof toMoney>; descriptions: string[] }>();
  for (const invoiceLine of input.lines) {
    const existing = revenueByAccount.get(invoiceLine.accountId);
    if (existing) {
      existing.amount = existing.amount.plus(invoiceLine.taxableAmount);
      if (existing.descriptions.length < 3) {
        existing.descriptions.push(invoiceLine.description);
      }
    } else {
      revenueByAccount.set(invoiceLine.accountId, { amount: toMoney(invoiceLine.taxableAmount), descriptions: [invoiceLine.description] });
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
      description: `Sales invoice ${input.invoiceNumber}: ${revenue.descriptions.join(", ")}`,
      currency: input.currency,
      exchangeRate: "1",
    });
  }

  if (toMoney(input.taxTotal).gt(0)) {
    lines.push({
      accountId: input.vatPayableAccountId,
      debit: "0.0000",
      credit: toMoney(input.taxTotal).toFixed(4),
      description: `VAT payable for sales invoice ${input.invoiceNumber}`,
      currency: input.currency,
      exchangeRate: "1",
    });
  }

  assertBalancedJournal(lines);
  return lines;
}
