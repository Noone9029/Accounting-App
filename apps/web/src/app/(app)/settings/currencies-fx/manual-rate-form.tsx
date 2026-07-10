"use client";

import { FormEvent, useState } from "react";
import {
  LedgerButton,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFormSection,
  LedgerInput,
  LedgerSelect,
} from "@/components/ui/ledger-system";
import type { CreateCurrencyRateInput, FxCurrencyCatalog } from "@/lib/foreign-exchange";

export function ManualRateForm({
  catalog,
  canManage,
  saving,
  onCapture,
}: Readonly<{
  catalog: FxCurrencyCatalog;
  canManage: boolean;
  saving: boolean;
  onCapture: (input: CreateCurrencyRateInput) => Promise<void>;
}>) {
  const foreignCurrencies = catalog.supportedCurrencies.filter((currency) => currency.code !== catalog.baseCurrency);
  const [transactionCurrency, setTransactionCurrency] = useState(foreignCurrencies[0]?.code ?? "");
  const [rate, setRate] = useState("");
  const [rateDate, setRateDate] = useState("");
  const [sourceReference, setSourceReference] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    await onCapture({
      transactionCurrency,
      rate,
      rateDate,
      sourceReference: sourceReference.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit}>
      <LedgerFormSection
        title="Capture a manual rate"
        description={`Enter how many ${catalog.baseCurrency} one unit of the transaction currency equals. The captured snapshot cannot be edited or deleted.`}
      >
        <LedgerFieldLabel>
          <LedgerFieldText>Transaction currency</LedgerFieldText>
          <LedgerSelect
            aria-label="Transaction currency"
            value={transactionCurrency}
            onChange={(event) => setTransactionCurrency(event.target.value)}
            disabled={!canManage || saving}
            required
          >
            {foreignCurrencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Exact rate</LedgerFieldText>
          <LedgerInput
            aria-label="Exact rate"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            disabled={!canManage || saving}
            inputMode="decimal"
            pattern="\d{1,10}(\.\d{1,8})?"
            placeholder="3.67250000"
            required
          />
          <LedgerFieldHelp>Stored as an exact decimal with up to eight places; no live lookup is performed.</LedgerFieldHelp>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Effective date</LedgerFieldText>
          <LedgerInput
            aria-label="Effective date"
            type="date"
            value={rateDate}
            onChange={(event) => setRateDate(event.target.value)}
            disabled={!canManage || saving}
            required
          />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Source reference (optional)</LedgerFieldText>
          <LedgerInput
            aria-label="Source reference (optional)"
            value={sourceReference}
            onChange={(event) => setSourceReference(event.target.value)}
            disabled={!canManage || saving}
            maxLength={200}
            placeholder="Approved worksheet or source note"
          />
        </LedgerFieldLabel>
        {canManage ? (
          <div className="md:col-span-2">
            <LedgerButton type="submit" variant="primary" disabled={saving || !transactionCurrency || !rate || !rateDate}>
              {saving ? "Capturing..." : "Capture immutable rate"}
            </LedgerButton>
          </div>
        ) : (
          <p className="text-sm leading-6 text-steel md:col-span-2">FX rate management permission is required to capture a rate.</p>
        )}
      </LedgerFormSection>
    </form>
  );
}
