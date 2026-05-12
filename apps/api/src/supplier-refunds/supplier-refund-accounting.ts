import { assertBalancedJournal, JournalLineInput } from "@ledgerbyte/accounting-core";

export interface SupplierRefundPostingInput {
  accountsPayableAccountId: string;
  receivedIntoAccountId: string;
  refundNumber: string;
  supplierName: string;
  currency: string;
  amountRefunded: string;
}

export function buildSupplierRefundJournalLines(input: SupplierRefundPostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [
    {
      accountId: input.receivedIntoAccountId,
      debit: input.amountRefunded,
      credit: "0.0000",
      description: `Supplier refund ${input.refundNumber} - ${input.supplierName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
    {
      accountId: input.accountsPayableAccountId,
      debit: "0.0000",
      credit: input.amountRefunded,
      description: `Accounts payable credit reduced by supplier refund ${input.refundNumber} - ${input.supplierName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
  ];

  assertBalancedJournal(lines);
  return lines;
}
