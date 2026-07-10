"use client";

import { FormEvent, useState } from "react";
import {
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerInput,
  LedgerMoney,
  LedgerPanel,
  LedgerSelect,
  LedgerStatusBadge,
} from "@/components/ui/ledger-system";
import {
  formatFxRate,
  ratePairLabel,
  type CurrencyRateListResponse,
  type CurrencyRateQuery,
  type FxCurrencyCatalog,
} from "@/lib/foreign-exchange";
import { formatAppDateTime } from "@/lib/app-i18n";

export function RateEvidenceTable({
  catalog,
  result,
  loading,
  onQuery,
}: Readonly<{
  catalog: FxCurrencyCatalog;
  result: CurrencyRateListResponse;
  loading: boolean;
  onQuery: (query: CurrencyRateQuery) => void;
}>) {
  const [transactionCurrency, setTransactionCurrency] = useState("");
  const [rateDate, setRateDate] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ transactionCurrency: "", rateDate: "" });

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters({ transactionCurrency, rateDate });
    onQuery({ transactionCurrency, rateDate, page: 1, limit: result.pagination.limit });
  }

  return (
    <LedgerPanel>
      <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Captured rate evidence</h2>
          <p className="mt-1 text-sm leading-6 text-steel">Manual snapshots are append-only. This workspace does not offer update or delete actions.</p>
        </div>
        <LedgerStatusBadge tone="info">Page {result.pagination.page}</LedgerStatusBadge>
      </div>
      <form onSubmit={filter} className="mt-4">
        <LedgerFilterBar>
          <LedgerFieldLabel className="min-w-48">
            <LedgerFieldText>Filter currency</LedgerFieldText>
            <LedgerSelect value={transactionCurrency} onChange={(event) => setTransactionCurrency(event.target.value)} aria-label="Filter currency">
              <option value="">All currencies</option>
              {catalog.supportedCurrencies
                .filter((currency) => currency.code !== catalog.baseCurrency)
                .map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
            </LedgerSelect>
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            <LedgerFieldText>Filter effective date</LedgerFieldText>
            <LedgerInput type="date" value={rateDate} onChange={(event) => setRateDate(event.target.value)} aria-label="Filter effective date" />
          </LedgerFieldLabel>
          <LedgerButton type="submit" disabled={loading}>
            Apply filters
          </LedgerButton>
        </LedgerFilterBar>
      </form>

      <div className="mt-4" aria-busy={loading}>
        {result.data.length ? (
          <LedgerDataTable minWidth="880px">
            <thead className="bg-mist text-xs uppercase tracking-wide text-steel">
              <tr>
                <th scope="col" className="px-3 py-2">Pair</th>
                <th scope="col" className="px-3 py-2">Exact rate</th>
                <th scope="col" className="px-3 py-2">Effective date</th>
                <th scope="col" className="px-3 py-2">Source</th>
                <th scope="col" className="px-3 py-2">Reference</th>
                <th scope="col" className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {result.data.map((rate) => (
                <tr key={rate.id} className="bg-white align-top">
                  <td className="px-3 py-2 font-semibold text-ink">{ratePairLabel(rate.transactionCurrency, rate.baseCurrency)}</td>
                  <td className="px-3 py-2"><LedgerMoney>{formatFxRate(rate.rate)}</LedgerMoney></td>
                  <td className="px-3 py-2"><LedgerDate>{rate.rateDate.slice(0, 10)}</LedgerDate></td>
                  <td className="px-3 py-2"><LedgerStatusBadge tone="neutral">{rate.source}</LedgerStatusBadge></td>
                  <td className="max-w-64 break-words px-3 py-2 text-steel">{rate.sourceReference ?? "No reference"}</td>
                  <td className="px-3 py-2"><LedgerDate>{formatAppDateTime(rate.createdAt)}</LedgerDate></td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        ) : (
          <LedgerEmptyState title="No captured rates" description="No immutable manual rate snapshots match the current filters." />
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <LedgerButton
          disabled={loading || result.pagination.page <= 1}
          onClick={() => onQuery({ ...appliedFilters, page: result.pagination.page - 1, limit: result.pagination.limit })}
        >
          Previous
        </LedgerButton>
        <LedgerButton
          disabled={loading || !result.pagination.hasMore}
          onClick={() => onQuery({ ...appliedFilters, page: result.pagination.page + 1, limit: result.pagination.limit })}
        >
          Next
        </LedgerButton>
      </div>
    </LedgerPanel>
  );
}
