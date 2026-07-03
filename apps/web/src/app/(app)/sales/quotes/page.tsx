"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useAppLocale } from "@/components/app-locale-provider";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import { salesQuoteStatusBadgeClass, salesQuoteStatusLabel } from "@/lib/sales-quotes";
import type { SalesQuote, SalesQuoteStatus } from "@/lib/types";

type StatusFilter = "ALL" | SalesQuoteStatus;

const statuses: SalesQuoteStatus[] = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED", "CONVERTED"];

export default function SalesQuotesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [quotes, setQuotes] = useState<SalesQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [customerSearch, setCustomerSearch] = useState("");
  const canCreateQuote = can(PERMISSIONS.salesInvoices.create);
  const canEditQuote = can(PERMISSIONS.salesInvoices.update);

  const filteredQuotes = useMemo(() => {
    const normalizedSearch = customerSearch.trim().toLowerCase();
    return quotes.filter((quote) => {
      const statusMatches = statusFilter === "ALL" || quote.status === statusFilter;
      const customerName = quote.customer?.displayName ?? quote.customer?.name ?? "";
      const customerMatches = !normalizedSearch || customerName.toLowerCase().includes(normalizedSearch);
      return statusMatches && customerMatches;
    });
  }, [customerSearch, quotes, statusFilter]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    const customerId = params.get("customerId")?.trim();
    const path = customerId ? `/sales-quotes?customerId=${encodeURIComponent(customerId)}` : "/sales-quotes";

    setLoading(true);
    setError("");

    apiRequest<SalesQuote[]>(path)
      .then((result) => {
        if (!cancelled) {
          setQuotes(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load sales quotes."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, tc]);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Sales quotes")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Non-posting customer quotes that can be accepted and converted into draft sales invoices.")}</p>
        </div>
        {canCreateQuote ? (
          <Link href="/sales/quotes/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            {tc("Create quote")}
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load sales quotes.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading sales quotes...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && quotes.length === 0 ? (
          <StatusMessage type="empty">{tc("No sales quotes found. Create a draft quote, mark it sent for tracking, then convert it only after acceptance.")}</StatusMessage>
        ) : null}
      </div>

      {quotes.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Status")}</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="ALL">{tc("All")}</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {tc(salesQuoteStatusLabel(status))}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-64">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Customer")}</span>
            <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder={tc("Search customer")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
      ) : null}

      {quotes.length > 0 && filteredQuotes.length === 0 ? (
        <div className="mt-5">
          <StatusMessage type="empty">{tc("No sales quotes match the current filters.")}</StatusMessage>
        </div>
      ) : null}

      {filteredQuotes.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1160px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{tc("Number")}</th>
                <th className="px-4 py-3">{tc("Customer")}</th>
                <th className="px-4 py-3">{tc("Issue")}</th>
                <th className="px-4 py-3">{tc("Expiry")}</th>
                <th className="px-4 py-3">{tc("Status")}</th>
                <th className="px-4 py-3">{tc("Tax")}</th>
                <th className="px-4 py-3">{tc("Total")}</th>
                <th className="px-4 py-3">{tc("Converted invoice")}</th>
                <th className="px-4 py-3">{tc("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.map((quote) => (
                <tr key={quote.id}>
                  <td className="px-4 py-3 font-mono text-xs">
                    <bdi dir="ltr">{quote.quoteNumber}</bdi>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{quote.customer?.displayName ?? quote.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(quote.issueDate, locale, "-")}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(quote.expiryDate, locale, "-")}</td>
                  <td className="px-4 py-3">
                    <QuoteStatusPill status={quote.status} label={tc(salesQuoteStatusLabel(quote.status))} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(quote.taxTotal, quote.currency, locale)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(quote.total, quote.currency, locale)}</td>
                  <td className="px-4 py-3 text-steel">
                    {quote.convertedSalesInvoice ? (
                      <Link href={`/sales/invoices/${quote.convertedSalesInvoice.id}`} className="font-mono text-xs text-palm hover:underline">
                        <bdi dir="ltr">{quote.convertedSalesInvoice.invoiceNumber}</bdi>
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/sales/quotes/${quote.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {tc("View")}
                      </Link>
                      {quote.status === "DRAFT" && canEditQuote ? (
                        <Link href={`/sales/quotes/${quote.id}/edit`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          {tc("Edit")}
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function QuoteStatusPill({ status, label }: { status: SalesQuoteStatus; label: string }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${salesQuoteStatusBadgeClass(status)}`}>{label}</span>;
}
