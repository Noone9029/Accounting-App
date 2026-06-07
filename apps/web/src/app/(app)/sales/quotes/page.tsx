"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import { salesQuoteStatusBadgeClass, salesQuoteStatusLabel } from "@/lib/sales-quotes";
import type { SalesQuote, SalesQuoteStatus } from "@/lib/types";

type StatusFilter = "ALL" | SalesQuoteStatus;

const statuses: SalesQuoteStatus[] = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED", "CONVERTED"];

export default function SalesQuotesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load sales quotes.");
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
  }, [organizationId]);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Sales quotes</h1>
          <p className="mt-1 text-sm text-steel">Non-posting customer quotes that can be accepted and converted into draft sales invoices.</p>
        </div>
        {canCreateQuote ? (
          <Link href="/sales/quotes/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Create quote
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load sales quotes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading sales quotes...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && quotes.length === 0 ? (
          <StatusMessage type="empty">No sales quotes found. Create a draft quote, mark it sent for tracking, then convert it only after acceptance.</StatusMessage>
        ) : null}
      </div>

      {quotes.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="ALL">All</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {salesQuoteStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-64">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Customer</span>
            <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customer" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
      ) : null}

      {quotes.length > 0 && filteredQuotes.length === 0 ? (
        <div className="mt-5">
          <StatusMessage type="empty">No sales quotes match the current filters.</StatusMessage>
        </div>
      ) : null}

      {filteredQuotes.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1160px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tax</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Converted invoice</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.map((quote) => (
                <tr key={quote.id}>
                  <td className="px-4 py-3 font-mono text-xs">{quote.quoteNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{quote.customer?.displayName ?? quote.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(quote.issueDate)}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(quote.expiryDate)}</td>
                  <td className="px-4 py-3">
                    <QuoteStatusPill status={quote.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(quote.taxTotal, quote.currency)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(quote.total, quote.currency)}</td>
                  <td className="px-4 py-3 text-steel">
                    {quote.convertedSalesInvoice ? (
                      <Link href={`/sales/invoices/${quote.convertedSalesInvoice.id}`} className="font-mono text-xs text-palm hover:underline">
                        {quote.convertedSalesInvoice.invoiceNumber}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/sales/quotes/${quote.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        View
                      </Link>
                      {quote.status === "DRAFT" && canEditQuote ? (
                        <Link href={`/sales/quotes/${quote.id}/edit`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          Edit
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

function QuoteStatusPill({ status }: { status: SalesQuoteStatus }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${salesQuoteStatusBadgeClass(status)}`}>{salesQuoteStatusLabel(status)}</span>;
}
