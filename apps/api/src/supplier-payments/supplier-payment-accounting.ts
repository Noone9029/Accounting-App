import { assertBalancedJournal, JournalLineInput } from "@ledgerbyte/accounting-core";

export interface SupplierPaymentPostingInput {
  paidThroughAccountId: string;
  accountsPayableAccountId: string;
  paymentNumber: string;
  supplierName: string;
  currency: string;
  amountPaid: string;
}

export function buildSupplierPaymentJournalLines(input: SupplierPaymentPostingInput): JournalLineInput[] {
  const lines: JournalLineInput[] = [
    {
      accountId: input.accountsPayableAccountId,
      debit: input.amountPaid,
      credit: "0.0000",
      description: `Accounts payable paid by ${input.paymentNumber} - ${input.supplierName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
    {
      accountId: input.paidThroughAccountId,
      debit: "0.0000",
      credit: input.amountPaid,
      description: `Supplier payment ${input.paymentNumber} - ${input.supplierName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
  ];

  assertBalancedJournal(lines);
  return lines;
}
