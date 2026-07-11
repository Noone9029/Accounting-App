import { assertBalancedJournal, assertJournalFxContext, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";
import { FxMonetarySourceType } from "@prisma/client";

export interface FxRevaluationPostingLine {
  sourceType: FxMonetarySourceType | "CUSTOMER_RECEIVABLE" | "SUPPLIER_PAYABLE";
  reference: string;
  unrealizedGainAmount: string;
  unrealizedLossAmount: string;
}

export function buildFxRevaluationJournalLines(input: {
  baseCurrency: string;
  receivableAccountId: string;
  payableAccountId: string;
  unrealizedGainAccountId: string;
  unrealizedLossAccountId: string;
  lines: readonly FxRevaluationPostingLine[];
}): JournalLineInput[] {
  const functionalLine = (
    line: Omit<JournalLineInput, "currency" | "exchangeRate" | "rateSnapshotId" | "functionalCurrencyOnly">,
  ): JournalLineInput => ({
    ...line,
    currency: input.baseCurrency,
    exchangeRate: "1",
    rateSnapshotId: null,
    functionalCurrencyOnly: true,
  });

  const journalLines: JournalLineInput[] = [];
  for (const line of input.lines) {
    const gain = toMoney(line.unrealizedGainAmount);
    const loss = toMoney(line.unrealizedLossAmount);
    if (gain.gt(0) && loss.gt(0)) {
      throw new Error("An FX revaluation line cannot contain both an unrealized gain and loss.");
    }
    if (gain.eq(0) && loss.eq(0)) continue;

    const monetaryAccountId = line.sourceType === "CUSTOMER_RECEIVABLE"
      ? input.receivableAccountId
      : input.payableAccountId;
    if (gain.gt(0)) {
      journalLines.push(
        functionalLine({
          accountId: monetaryAccountId,
          debit: gain.toFixed(4),
          credit: "0.0000",
          description: `FX revaluation carrying adjustment ${line.reference}`,
        }),
        functionalLine({
          accountId: input.unrealizedGainAccountId,
          debit: "0.0000",
          credit: gain.toFixed(4),
          description: `Unrealized FX gain ${line.reference}`,
        }),
      );
    } else {
      journalLines.push(
        functionalLine({
          accountId: input.unrealizedLossAccountId,
          debit: loss.toFixed(4),
          credit: "0.0000",
          description: `Unrealized FX loss ${line.reference}`,
        }),
        functionalLine({
          accountId: monetaryAccountId,
          debit: "0.0000",
          credit: loss.toFixed(4),
          description: `FX revaluation carrying adjustment ${line.reference}`,
        }),
      );
    }
  }

  if (journalLines.length > 0) {
    assertBalancedJournal(journalLines);
    assertJournalFxContext(journalLines, input.baseCurrency);
  }
  return journalLines;
}
