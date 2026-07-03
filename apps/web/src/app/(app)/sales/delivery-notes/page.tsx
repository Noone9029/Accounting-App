"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate } from "@/lib/app-i18n";
import { deliveryNoteStatusBadgeClass, deliveryNoteStatusLabel, deliveryNoteStatuses } from "@/lib/delivery-notes";
import { PERMISSIONS } from "@/lib/permissions";
import type { DeliveryNote, DeliveryNoteStatus } from "@/lib/types";

type StatusFilter = "ALL" | DeliveryNoteStatus;

export default function DeliveryNotesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [customerSearch, setCustomerSearch] = useState("");
  const canCreate = can(PERMISSIONS.salesInvoices.create);
  const canEdit = can(PERMISSIONS.salesInvoices.update);

  const filteredDeliveryNotes = useMemo(() => {
    const normalizedSearch = customerSearch.trim().toLowerCase();
    return deliveryNotes.filter((deliveryNote) => {
      const statusMatches = statusFilter === "ALL" || deliveryNote.status === statusFilter;
      const customerName = deliveryNote.customer?.displayName ?? deliveryNote.customer?.name ?? "";
      const customerMatches = !normalizedSearch || customerName.toLowerCase().includes(normalizedSearch);
      return statusMatches && customerMatches;
    });
  }, [customerSearch, deliveryNotes, statusFilter]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    const customerId = params.get("customerId")?.trim();
    const path = customerId ? `/delivery-notes?customerId=${encodeURIComponent(customerId)}` : "/delivery-notes";

    setLoading(true);
    setError("");

    apiRequest<DeliveryNote[]>(path)
      .then((result) => {
        if (!cancelled) {
          setDeliveryNotes(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load delivery notes."));
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
          <h1 className="text-2xl font-semibold text-ink">{tc("Delivery notes")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Operational fulfillment documents for customer deliveries. They do not post accounting or move inventory by themselves.")}</p>
        </div>
        {canCreate ? (
          <Link href="/sales/delivery-notes/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            {tc("Create delivery note")}
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load delivery notes.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading delivery notes...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && deliveryNotes.length === 0 ? (
          <StatusMessage type="empty">{tc("No delivery notes found. Create a draft delivery note, issue it, then mark it delivered when fulfillment is complete.")}</StatusMessage>
        ) : null}
      </div>

      {deliveryNotes.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Status")}</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="ALL">{tc("All")}</option>
              {deliveryNoteStatuses.map((status) => (
                <option key={status} value={status}>
                  {tc(deliveryNoteStatusLabel(status))}
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

      {deliveryNotes.length > 0 && filteredDeliveryNotes.length === 0 ? (
        <div className="mt-5">
          <StatusMessage type="empty">{tc("No delivery notes match the current filters.")}</StatusMessage>
        </div>
      ) : null}

      {filteredDeliveryNotes.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1120px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{tc("Number")}</th>
                <th className="px-4 py-3">{tc("Customer")}</th>
                <th className="px-4 py-3">{tc("Issue")}</th>
                <th className="px-4 py-3">{tc("Delivery")}</th>
                <th className="px-4 py-3">{tc("Status")}</th>
                <th className="px-4 py-3">{tc("Source")}</th>
                <th className="px-4 py-3">{tc("Lines")}</th>
                <th className="px-4 py-3">{tc("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeliveryNotes.map((deliveryNote) => (
                <tr key={deliveryNote.id}>
                  <td className="px-4 py-3 font-mono text-xs">
                    <bdi dir="ltr">{deliveryNote.deliveryNoteNumber}</bdi>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{deliveryNote.customer?.displayName ?? deliveryNote.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(deliveryNote.issueDate, locale, "-")}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(deliveryNote.deliveryDate, locale, "-")}</td>
                  <td className="px-4 py-3">
                    <DeliveryNoteStatusPill status={deliveryNote.status} label={tc(deliveryNoteStatusLabel(deliveryNote.status))} />
                  </td>
                  <td className="px-4 py-3 text-steel">{sourceLabel(deliveryNote, tc)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{deliveryNote._count?.lines ?? deliveryNote.lines?.length ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/sales/delivery-notes/${deliveryNote.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {tc("View")}
                      </Link>
                      {deliveryNote.status === "DRAFT" && canEdit ? (
                        <Link href={`/sales/delivery-notes/${deliveryNote.id}/edit`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
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

function DeliveryNoteStatusPill({ status, label }: { status: DeliveryNoteStatus; label: string }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${deliveryNoteStatusBadgeClass(status)}`}>{label}</span>;
}

function sourceLabel(deliveryNote: DeliveryNote, tc: (value: string, params?: Record<string, string | number>) => string): string {
  if (deliveryNote.relatedSalesInvoice) {
    return tc("Invoice {number}", { number: deliveryNote.relatedSalesInvoice.invoiceNumber });
  }
  if (deliveryNote.relatedSalesQuote) {
    return tc("Quote {number}", { number: deliveryNote.relatedSalesQuote.quoteNumber });
  }
  if (deliveryNote.relatedSalesStockIssue) {
    return tc("Stock issue {number}", { number: deliveryNote.relatedSalesStockIssue.issueNumber });
  }
  return tc("Direct");
}
