"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
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
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
  LedgerToolbar,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import { salesQuoteStatusLabel } from "@/lib/sales-quotes";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales / pre-invoice"
        title="Sales quotes"
        badge={<LedgerStatusBadge tone="info">Non-posting</LedgerStatusBadge>}
        description="Customer quote workspace for pricing, acceptance tracking, and draft invoice conversion. Quotes do not post accounting, VAT filing, inventory movement, payments, email delivery, or compliance submissions."
        actions={
          canCreateQuote ? (
            <LedgerButton href="/sales/quotes/new" variant="primary">
              Create quote
            </LedgerButton>
          ) : null
        }
      />

      <LedgerSummaryBand tone="info">
        Quote actions stay inside the existing quote lifecycle. Acceptance and conversion are explicit user actions; this page does not send quotes, collect payments, submit tax data, or create live compliance events.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load sales quotes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading sales quotes...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && quotes.length === 0 ? (
          <LedgerEmptyState
            title="No sales quotes found"
            description="Create a draft quote, mark it sent for tracking, then convert it only after acceptance. No accounting or VAT records are posted from an empty quote list."
            action={canCreateQuote ? <LedgerButton href="/sales/quotes/new" variant="primary">Create quote</LedgerButton> : null}
          />
        ) : null}

      {quotes.length > 0 ? (
        <LedgerToolbar
          title="Quote filters"
          description="Review non-posting quote states by customer before opening the quote detail or conversion path."
        >
          <LedgerFilterBar>
          <LedgerFieldLabel>
            <LedgerFieldText>Status</LedgerFieldText>
            <LedgerSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="sm:w-44">
              <option value="ALL">All</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {salesQuoteStatusLabel(status)}
                </option>
              ))}
            </LedgerSelect>
          </LedgerFieldLabel>
          <LedgerFieldLabel className="min-w-64">
            <LedgerFieldText>Customer</LedgerFieldText>
            <LedgerInput value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customer" />
          </LedgerFieldLabel>
          </LedgerFilterBar>
        </LedgerToolbar>
      ) : null}

      {quotes.length > 0 && filteredQuotes.length === 0 ? (
        <LedgerEmptyState title="No sales quotes match the current filters" description="Clear the status or customer filter to return to the full non-posting quote list." />
      ) : null}

      {filteredQuotes.length > 0 ? (
        <LedgerDataTable minWidth="1160px">
            <thead className="ledger-table-header">
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
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(quote.issueDate)}</LedgerDate></td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(quote.expiryDate)}</LedgerDate></td>
                  <td className="px-4 py-3">
                    <QuoteStatusPill status={quote.status} />
                  </td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(quote.taxTotal, quote.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(quote.total, quote.currency)}</LedgerMoney></td>
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
                      <LedgerButton href={`/sales/quotes/${quote.id}`} size="sm">
                        View
                      </LedgerButton>
                      {quote.status === "DRAFT" && canEditQuote ? (
                        <LedgerButton href={`/sales/quotes/${quote.id}/edit`} size="sm">
                          Edit
                        </LedgerButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
        </LedgerDataTable>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function QuoteStatusPill({ status }: { status: SalesQuoteStatus }) {
  return <LedgerStatusBadge tone={quoteStatusTone(status)}>{salesQuoteStatusLabel(status)}</LedgerStatusBadge>;
}

function quoteStatusTone(status: SalesQuoteStatus): LedgerStatusTone {
  switch (status) {
    case "ACCEPTED":
    case "CONVERTED":
      return "success";
    case "SENT":
      return "info";
    case "REJECTED":
    case "EXPIRED":
    case "CANCELLED":
      return "danger";
    case "DRAFT":
      return "draft";
  }
}
