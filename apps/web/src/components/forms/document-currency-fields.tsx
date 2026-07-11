"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { DocumentFxFormValue, convertTransactionToBasePreview, documentFxIsComplete, selectableDocumentRateSnapshots } from "@/lib/document-fx";
import { CurrencyRateSnapshot, FxCurrencyCatalog, getFxCurrencies, listCurrencyRates } from "@/lib/foreign-exchange";

interface DocumentCurrencyFieldsProps {
  baseCurrency: string;
  value: DocumentFxFormValue;
  transactionTotal: string;
  onChange: (value: DocumentFxFormValue) => void;
  disabled?: boolean;
  postingContext?: "document" | "payment";
}

export function DocumentCurrencyFields({ baseCurrency, value, transactionTotal, onChange, disabled = false, postingContext = "document" }: DocumentCurrencyFieldsProps) {
  const { tc } = useAppLocale();
  const [catalog, setCatalog] = useState<FxCurrencyCatalog | null>(null);
  const [rates, setRates] = useState<CurrencyRateSnapshot[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const foreign = value.currency !== baseCurrency;
  const baseEquivalent = useMemo(
    () => convertTransactionToBasePreview(transactionTotal, value.exchangeRate),
    [transactionTotal, value.exchangeRate],
  );

  useEffect(() => {
    let cancelled = false;
    getFxCurrencies().then((result) => { if (!cancelled) setCatalog(result); }).catch(() => { if (!cancelled) setCatalog(null); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!foreign || !value.currency) {
      setRates([]);
      return;
    }
    let cancelled = false;
    setLoadingRates(true);
    listCurrencyRates({ transactionCurrency: value.currency, limit: 100 })
      .then((result) => { if (!cancelled) setRates(selectableDocumentRateSnapshots(result.data)); })
      .catch(() => { if (!cancelled) setRates([]); })
      .finally(() => { if (!cancelled) setLoadingRates(false); });
    return () => { cancelled = true; };
  }, [foreign, value.currency]);

  function selectCurrency(currency: string) {
    if (currency === baseCurrency) {
      onChange({ currency, exchangeRate: "1", rateDate: today(), rateSource: "SYSTEM_RATE_1", rateSnapshotId: null });
      return;
    }
    onChange({ currency, exchangeRate: "", rateDate: today(), rateSource: "MANUAL", rateSnapshotId: null });
  }

  function selectSnapshot(id: string) {
    const snapshot = rates.find((candidate) => candidate.id === id);
    if (!snapshot) {
      onChange({ ...value, rateSnapshotId: null, rateSource: "MANUAL" });
      return;
    }
    onChange({
      currency: snapshot.transactionCurrency,
      exchangeRate: snapshot.rate,
      rateDate: snapshot.rateDate.slice(0, 10),
      rateSource: snapshot.source === "IMPORT" ? "IMPORT" : "MANUAL",
      rateSnapshotId: snapshot.id,
    });
  }

  const supported = catalog?.supportedCurrencies ?? [...new Set([baseCurrency, value.currency].filter(Boolean))].map((code) => ({ code, name: code }));
  return (
    <div className="md:col-span-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">{tc("Transaction currency")}</span>
          <select aria-label={tc("Transaction currency")} value={value.currency} onChange={(event) => selectCurrency(event.target.value)} disabled={disabled} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-palm">
            {supported.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} — {currency.name}</option>)}
          </select>
        </label>
        {foreign ? (
          <>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Saved rate snapshot")}</span>
              <select aria-label={tc("Saved rate snapshot")} value={value.rateSnapshotId ?? ""} onChange={(event) => selectSnapshot(event.target.value)} disabled={disabled || loadingRates} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">{loadingRates ? tc("Loading rates...") : tc("Enter a manual document rate")}</option>
                {rates.map((rate) => <option key={rate.id} value={rate.id}>{rate.rateDate.slice(0, 10)} · {rate.rate}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Exchange rate")}</span>
              <input aria-label={tc("Exchange rate")} value={value.exchangeRate} onChange={(event) => onChange({ ...value, exchangeRate: event.target.value, rateSource: "MANUAL", rateSnapshotId: null })} disabled={disabled || Boolean(value.rateSnapshotId)} inputMode="decimal" placeholder="3.67250000" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-palm" />
              <span className="mt-1 block text-xs text-steel">{tc("Base amount = transaction amount × rate")}</span>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Rate date")}</span>
              <input aria-label={tc("Rate date")} type="date" value={value.rateDate} onChange={(event) => onChange({ ...value, rateDate: event.target.value, rateSource: "MANUAL", rateSnapshotId: null })} disabled={disabled || Boolean(value.rateSnapshotId)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
          </>
        ) : (
          <div className="md:col-span-3 flex items-center text-sm text-steel">{tc("Same-currency documents use the exact identity rate 1.")}</div>
        )}
      </div>
      {foreign ? (
        <div className="mt-3 space-y-2">
          <StatusMessage type={documentFxIsComplete(value, baseCurrency) ? "info" : "error"}>
            {documentFxIsComplete(value, baseCurrency)
              ? postingContext === "payment"
                ? tc("The captured payment rate will freeze when this payment is recorded.")
                : tc("Captured rate will remain editable while this document is a draft and will freeze when posted.")
              : postingContext === "payment"
                ? tc("Select a saved rate or enter a positive manual rate and rate date before recording the payment.")
                : tc("Select a saved rate or enter a positive manual rate and rate date before saving.")}
          </StatusMessage>
          <p className="text-xs text-steel">{tc("Transaction total")}: {transactionTotal} {value.currency} · {tc("Base equivalent")}: {baseEquivalent ?? "—"} {baseCurrency}</p>
        </div>
      ) : null}
    </div>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
