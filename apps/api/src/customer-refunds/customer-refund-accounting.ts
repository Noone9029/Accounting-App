import { assertBalancedJournal, JournalLineInput } from "@ledgerbyte/accounting-core";

export interface CustomerRefundPostingInput {
  accountsReceivableAccountId: string;
  paidFromAccountId: string;
  refundNumber: string;
  customerName: string;
  currency: string;
  amountRefunded: string;
}

export function buildCustomerRefundJournalLines(input: CustomerRefundPostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [
    {
      accountId: input.accountsReceivableAccountId,
      debit: input.amountRefunded,
      credit: "0.0000",
      description: `Accounts receivable restored by refund ${input.refundNumber} - ${input.customerName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
    {
      accountId: input.paidFromAccountId,
      debit: "0.0000",
      credit: input.amountRefunded,
      description: `Customer refund ${input.refundNumber} - ${input.customerName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
  ];

  assertBalancedJournal(lines);
  return lines;
}
