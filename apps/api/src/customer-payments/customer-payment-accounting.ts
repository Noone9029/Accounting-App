import { assertBalancedJournal, JournalLineInput } from "@ledgerbyte/accounting-core";

export interface CustomerPaymentPostingInput {
  paidThroughAccountId: string;
  accountsReceivableAccountId: string;
  paymentNumber: string;
  customerName: string;
  currency: string;
  amountReceived: string;
}

export function buildCustomerPaymentJournalLines(input: CustomerPaymentPostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [
    {
      accountId: input.paidThroughAccountId,
      debit: input.amountReceived,
      credit: "0.0000",
      description: `Customer payment ${input.paymentNumber} - ${input.customerName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
    {
      accountId: input.accountsReceivableAccountId,
      debit: "0.0000",
      credit: input.amountReceived,
      description: `Accounts receivable cleared by ${input.paymentNumber} - ${input.customerName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
  ];

  assertBalancedJournal(lines);
  return lines;
}
