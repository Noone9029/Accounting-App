"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { deliveryNoteStatusBadgeClass, deliveryNoteStatusLabel, deliveryNoteStatuses } from "@/lib/delivery-notes";
import { formatOptionalDate } from "@/lib/invoice-display";
import { PERMISSIONS } from "@/lib/permissions";
import type { DeliveryNote, DeliveryNoteStatus } from "@/lib/types";

type StatusFilter = "ALL" | DeliveryNoteStatus;

export default function DeliveryNotesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load delivery notes.");
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
          <h1 className="text-2xl font-semibold text-ink">Delivery notes</h1>
          <p className="mt-1 text-sm text-steel">Operational fulfillment documents for customer deliveries. They do not post accounting or move inventory by themselves.</p>
        </div>
        {canCreate ? (
          <Link href="/sales/delivery-notes/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Create delivery note
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load delivery notes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading delivery notes...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && deliveryNotes.length === 0 ? (
          <StatusMessage type="empty">No delivery notes found. Create a draft delivery note, issue it, then mark it delivered when fulfillment is complete.</StatusMessage>
        ) : null}
      </div>

      {deliveryNotes.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="ALL">All</option>
              {deliveryNoteStatuses.map((status) => (
                <option key={status} value={status}>
                  {deliveryNoteStatusLabel(status)}
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

      {deliveryNotes.length > 0 && filteredDeliveryNotes.length === 0 ? (
        <div className="mt-5">
          <StatusMessage type="empty">No delivery notes match the current filters.</StatusMessage>
        </div>
      ) : null}

      {filteredDeliveryNotes.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Lines</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeliveryNotes.map((deliveryNote) => (
                <tr key={deliveryNote.id}>
                  <td className="px-4 py-3 font-mono text-xs">{deliveryNote.deliveryNoteNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{deliveryNote.customer?.displayName ?? deliveryNote.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(deliveryNote.issueDate)}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(deliveryNote.deliveryDate)}</td>
                  <td className="px-4 py-3">
                    <DeliveryNoteStatusPill status={deliveryNote.status} />
                  </td>
                  <td className="px-4 py-3 text-steel">{sourceLabel(deliveryNote)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{deliveryNote._count?.lines ?? deliveryNote.lines?.length ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/sales/delivery-notes/${deliveryNote.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        View
                      </Link>
                      {deliveryNote.status === "DRAFT" && canEdit ? (
                        <Link href={`/sales/delivery-notes/${deliveryNote.id}/edit`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
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

function DeliveryNoteStatusPill({ status }: { status: DeliveryNoteStatus }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${deliveryNoteStatusBadgeClass(status)}`}>{deliveryNoteStatusLabel(status)}</span>;
}

function sourceLabel(deliveryNote: DeliveryNote): string {
  if (deliveryNote.relatedSalesInvoice) {
    return `Invoice ${deliveryNote.relatedSalesInvoice.invoiceNumber}`;
  }
  if (deliveryNote.relatedSalesQuote) {
    return `Quote ${deliveryNote.relatedSalesQuote.quoteNumber}`;
  }
  if (deliveryNote.relatedSalesStockIssue) {
    return `Stock issue ${deliveryNote.relatedSalesStockIssue.issueNumber}`;
  }
  return "Direct";
}
