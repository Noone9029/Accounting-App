import { assertBalancedJournal, assertJournalFxContext, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";

export function buildRealizedFxAdjustmentJournalLines(input: {
  clearingAccountId: string;
  realizedGainAccountId?: string | null;
  realizedLossAccountId?: string | null;
  realizedGainAmount: string;
  realizedLossAmount: string;
  baseCurrency: string;
  reference: string;
}): JournalLineInput[] {
  const gain = toMoney(input.realizedGainAmount);
  const loss = toMoney(input.realizedLossAmount);
  if ((gain.gt(0) && loss.gt(0)) || (gain.eq(0) && loss.eq(0))) {
    throw new Error("A realized FX adjustment requires exactly one gain or loss amount.");
  }
  if (gain.gt(0) && !input.realizedGainAccountId) throw new Error("Realized FX gain account is required.");
  if (loss.gt(0) && !input.realizedLossAccountId) throw new Error("Realized FX loss account is required.");

  const functionalLine = (line: Omit<JournalLineInput, "currency" | "exchangeRate" | "functionalCurrencyOnly">): JournalLineInput => ({
    ...line,
    currency: input.baseCurrency,
    exchangeRate: "1",
    rateSnapshotId: null,
    functionalCurrencyOnly: true,
  });
  const lines = gain.gt(0)
    ? [
        functionalLine({ accountId: input.clearingAccountId, debit: gain.toFixed(4), credit: "0.0000", description: `Realized FX clearing adjustment ${input.reference}` }),
        functionalLine({ accountId: input.realizedGainAccountId!, debit: "0.0000", credit: gain.toFixed(4), description: `Realized FX gain ${input.reference}` }),
      ]
    : [
        functionalLine({ accountId: input.realizedLossAccountId!, debit: loss.toFixed(4), credit: "0.0000", description: `Realized FX loss ${input.reference}` }),
        functionalLine({ accountId: input.clearingAccountId, debit: "0.0000", credit: loss.toFixed(4), description: `Realized FX clearing adjustment ${input.reference}` }),
      ];
  assertBalancedJournal(lines);
  assertJournalFxContext(lines, input.baseCurrency);
  return lines;
}
