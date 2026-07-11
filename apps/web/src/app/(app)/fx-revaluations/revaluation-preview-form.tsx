import { FormEvent } from "react";
import {
  LedgerButton,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerPanel,
} from "@/components/ui/ledger-system";
import { formatFxRate, type CurrencyRateSnapshot, type FxCurrencyCatalog } from "@/lib/foreign-exchange";

interface RevaluationPreviewFormProps {
  catalog: FxCurrencyCatalog;
  rates: CurrencyRateSnapshot[];
  revaluationDate: string;
  rateDate: string;
  selectedRateIds: Record<string, string>;
  disabled: boolean;
  submitting: boolean;
  onRevaluationDateChange: (value: string) => void;
  onRateDateChange: (value: string) => void;
  onRateSelect: (currency: string, rateId: string) => void;
  onSubmit: () => void;
}

export function RevaluationPreviewForm({
  catalog,
  rates,
  revaluationDate,
  rateDate,
  selectedRateIds,
  disabled,
  submitting,
  onRevaluationDateChange,
  onRateDateChange,
  onRateSelect,
  onSubmit,
}: Readonly<RevaluationPreviewFormProps>) {
  const eligibleRates = rates.filter((rate) => rate.rateDate.slice(0, 10) === rateDate && rate.transactionCurrency !== catalog.baseCurrency);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <LedgerPanel>
      <div className="flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Create controlled preview</h2>
          <p className="mt-1 text-sm leading-6 text-steel">Choose one immutable rate snapshot per exposed currency. Previewing never posts a journal.</p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-steel">Base {catalog.baseCurrency}</span>
      </div>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LedgerFieldLabel>
            <LedgerFieldText>Revaluation date</LedgerFieldText>
            <LedgerInput type="date" value={revaluationDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => onRevaluationDateChange(event.target.value)} required />
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            <LedgerFieldText>Rate date</LedgerFieldText>
            <LedgerInput type="date" value={rateDate} max={revaluationDate} onChange={(event) => onRateDateChange(event.target.value)} required />
          </LedgerFieldLabel>
        </div>

        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-steel">Captured closing-rate evidence</legend>
          {eligibleRates.length ? (
            <div className="mt-2 divide-y divide-line rounded-md border border-line">
              {eligibleRates.map((rate) => {
                const label = `${rate.transactionCurrency}/${rate.baseCurrency} · ${formatFxRate(rate.rate)} · ${rate.rateDate.slice(0, 10)}`;
                return (
                  <label key={rate.id} className="flex cursor-pointer items-start gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                    <input
                      type="radio"
                      name={`rate-${rate.transactionCurrency}`}
                      aria-label={label}
                      checked={selectedRateIds[rate.transactionCurrency] === rate.id}
                      onChange={() => onRateSelect(rate.transactionCurrency, rate.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-mono font-semibold text-ink">{label}</span>
                      <span className="mt-0.5 block text-xs text-steel">{rate.source} · {rate.sourceReference || "No source reference"}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 rounded-md border border-dashed border-line px-3 py-4 text-sm text-steel">No captured manual/import rates match this rate date.</p>
          )}
        </fieldset>

        {!disabled ? (
          <LedgerButton type="submit" variant="primary" disabled={submitting || !revaluationDate || !rateDate || Object.keys(selectedRateIds).length === 0}>
            {submitting ? "Creating preview..." : "Preview revaluation"}
          </LedgerButton>
        ) : null}
      </form>
    </LedgerPanel>
  );
}
