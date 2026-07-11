import { assertBalancedJournal, assertJournalFxContext, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";

export interface CustomerPaymentAllocationPostingInput {
  transactionAmountApplied: string;
  documentBaseAmountApplied: string;
  recognitionRate: string;
  rateSnapshotId?: string | null;
  carryingRate?: string;
  carryingRateSnapshotId?: string | null;
}

export interface CustomerPaymentPostingInput {
  paidThroughAccountId: string;
  accountsReceivableAccountId: string;
  paymentNumber: string;
  customerName: string;
  currency: string;
  amountReceived?: string;
  baseCurrency?: string;
  exchangeRate?: string;
  rateSnapshotId?: string | null;
  transactionAmountReceived?: string;
  settlementBaseAmountReceived?: string;
  allocations?: CustomerPaymentAllocationPostingInput[];
  transactionUnappliedAmount?: string;
  unappliedBaseAmount?: string;
  realizedGainAmount?: string;
  realizedLossAmount?: string;
  realizedGainAccountId?: string | null;
  realizedLossAccountId?: string | null;
}

export function buildCustomerPaymentJournalLines(input: CustomerPaymentPostingInput): JournalLineInput[] {
  if (!input.baseCurrency || !input.transactionAmountReceived || !input.settlementBaseAmountReceived) {
    return buildLegacyCustomerPaymentJournalLines(input);
  }

  const gain = toMoney(input.realizedGainAmount);
  const loss = toMoney(input.realizedLossAmount);
  if (gain.gt(0) && !input.realizedGainAccountId) {
    throw new Error("Realized FX gain account is required for this customer payment.");
  }
  if (loss.gt(0) && !input.realizedLossAccountId) {
    throw new Error("Realized FX loss account is required for this customer payment.");
  }

  const paymentRate = input.exchangeRate ?? "1";
  const lines: JournalLineInput[] = [{
    accountId: input.paidThroughAccountId,
    debit: input.settlementBaseAmountReceived,
    credit: "0.0000",
    transactionDebit: input.transactionAmountReceived,
    transactionCredit: "0.0000",
    description: `Customer payment ${input.paymentNumber} - ${input.customerName}`,
    currency: input.currency,
    exchangeRate: paymentRate,
    rateSnapshotId: input.rateSnapshotId ?? null,
  }];

  for (const allocation of input.allocations ?? []) {
    lines.push({
      accountId: input.accountsReceivableAccountId,
      debit: "0.0000",
      credit: allocation.documentBaseAmountApplied,
      transactionDebit: "0.0000",
      transactionCredit: allocation.transactionAmountApplied,
      description: `Accounts receivable cleared by ${input.paymentNumber} - ${input.customerName}`,
      currency: input.currency,
      exchangeRate: allocation.carryingRate ?? allocation.recognitionRate,
      rateSnapshotId: allocation.carryingRateSnapshotId ?? allocation.rateSnapshotId ?? null,
    });
  }

  if (toMoney(input.transactionUnappliedAmount).gt(0)) {
    lines.push({
      accountId: input.accountsReceivableAccountId,
      debit: "0.0000",
      credit: input.unappliedBaseAmount ?? "0.0000",
      transactionDebit: "0.0000",
      transactionCredit: input.transactionUnappliedAmount ?? "0.0000",
      description: `Unapplied customer credit from ${input.paymentNumber} - ${input.customerName}`,
      currency: input.currency,
      exchangeRate: paymentRate,
      rateSnapshotId: input.rateSnapshotId ?? null,
    });
  }

  if (loss.gt(0)) {
    lines.push({
      accountId: input.realizedLossAccountId!, debit: loss.toFixed(4), credit: "0.0000",
      description: `Realized FX loss on ${input.paymentNumber}`,
      currency: input.baseCurrency, exchangeRate: "1", rateSnapshotId: null, functionalCurrencyOnly: true,
    });
  }
  if (gain.gt(0)) {
    lines.push({
      accountId: input.realizedGainAccountId!, debit: "0.0000", credit: gain.toFixed(4),
      description: `Realized FX gain on ${input.paymentNumber}`,
      currency: input.baseCurrency, exchangeRate: "1", rateSnapshotId: null, functionalCurrencyOnly: true,
    });
  }

  assertBalancedJournal(lines);
  assertJournalFxContext(lines, input.baseCurrency);
  return lines;
}

function buildLegacyCustomerPaymentJournalLines(input: CustomerPaymentPostingInput): JournalLineInput[] {
  if (!input.amountReceived) {
    throw new Error("Customer payment base amount is required.");
  }
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
