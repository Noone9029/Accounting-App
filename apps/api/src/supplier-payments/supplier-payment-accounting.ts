import { assertBalancedJournal, assertJournalFxContext, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";

export interface SupplierPaymentAllocationPostingInput {
  transactionAmountApplied: string;
  documentBaseAmountApplied: string;
  recognitionRate: string;
  rateSnapshotId?: string | null;
  carryingRate?: string;
  carryingRateSnapshotId?: string | null;
}

export interface SupplierPaymentPostingInput {
  paidThroughAccountId: string;
  accountsPayableAccountId: string;
  paymentNumber: string;
  supplierName: string;
  currency: string;
  amountPaid?: string;
  baseCurrency?: string;
  exchangeRate?: string;
  rateSnapshotId?: string | null;
  transactionAmountPaid?: string;
  settlementBaseAmountPaid?: string;
  allocations?: SupplierPaymentAllocationPostingInput[];
  transactionUnappliedAmount?: string;
  unappliedBaseAmount?: string;
  realizedGainAmount?: string;
  realizedLossAmount?: string;
  realizedGainAccountId?: string | null;
  realizedLossAccountId?: string | null;
}

export function buildSupplierPaymentJournalLines(input: SupplierPaymentPostingInput): JournalLineInput[] {
  if (!input.baseCurrency || !input.transactionAmountPaid || !input.settlementBaseAmountPaid) {
    return buildLegacySupplierPaymentJournalLines(input);
  }
  const gain = toMoney(input.realizedGainAmount);
  const loss = toMoney(input.realizedLossAmount);
  if (gain.gt(0) && !input.realizedGainAccountId) throw new Error("Realized FX gain account is required for this supplier payment.");
  if (loss.gt(0) && !input.realizedLossAccountId) throw new Error("Realized FX loss account is required for this supplier payment.");
  const paymentRate = input.exchangeRate ?? "1";
  const lines: JournalLineInput[] = [];
  for (const allocation of input.allocations ?? []) {
    lines.push({
      accountId: input.accountsPayableAccountId, debit: allocation.documentBaseAmountApplied, credit: "0.0000",
      transactionDebit: allocation.transactionAmountApplied, transactionCredit: "0.0000",
      description: `Accounts payable paid by ${input.paymentNumber} - ${input.supplierName}`,
      currency: input.currency, exchangeRate: allocation.carryingRate ?? allocation.recognitionRate,
      rateSnapshotId: allocation.carryingRateSnapshotId ?? allocation.rateSnapshotId ?? null,
    });
  }
  if (toMoney(input.transactionUnappliedAmount).gt(0)) {
    lines.push({
      accountId: input.accountsPayableAccountId, debit: input.unappliedBaseAmount ?? "0.0000", credit: "0.0000",
      transactionDebit: input.transactionUnappliedAmount ?? "0.0000", transactionCredit: "0.0000",
      description: `Unapplied supplier debit from ${input.paymentNumber} - ${input.supplierName}`,
      currency: input.currency, exchangeRate: paymentRate, rateSnapshotId: input.rateSnapshotId ?? null,
    });
  }
  if (loss.gt(0)) {
    lines.push({
      accountId: input.realizedLossAccountId!, debit: loss.toFixed(4), credit: "0.0000",
      description: `Realized FX loss on ${input.paymentNumber}`,
      currency: input.baseCurrency, exchangeRate: "1", rateSnapshotId: null, functionalCurrencyOnly: true,
    });
  }
  lines.push({
    accountId: input.paidThroughAccountId, debit: "0.0000", credit: input.settlementBaseAmountPaid,
    transactionDebit: "0.0000", transactionCredit: input.transactionAmountPaid,
    description: `Supplier payment ${input.paymentNumber} - ${input.supplierName}`,
    currency: input.currency, exchangeRate: paymentRate, rateSnapshotId: input.rateSnapshotId ?? null,
  });
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

function buildLegacySupplierPaymentJournalLines(input: SupplierPaymentPostingInput): JournalLineInput[] {
  if (!input.amountPaid) throw new Error("Supplier payment base amount is required.");
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
