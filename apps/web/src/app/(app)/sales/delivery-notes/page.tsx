"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerInput,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerToolbar,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { deliveryNoteStatusLabel, deliveryNoteStatuses } from "@/lib/delivery-notes";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="Delivery notes"
        description="Operational fulfillment documents for customer deliveries. They do not post accounting or move inventory by themselves."
        actions={
          canCreate ? (
            <LedgerButton href="/sales/delivery-notes/new" variant="primary" icon={Plus}>
              Create delivery note
            </LedgerButton>
          ) : null
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
          {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load delivery notes.</LedgerAlert> : null}
          {loading ? <StatusMessage type="loading">Loading delivery notes...</StatusMessage> : null}
          {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
          {!loading && organizationId && deliveryNotes.length === 0 ? (
            <LedgerEmptyState
              title="No delivery notes found"
              description="Create a draft delivery note, issue it, then mark it delivered when fulfillment is complete."
              action={canCreate ? <LedgerButton href="/sales/delivery-notes/new" variant="primary" icon={Plus}>Create delivery note</LedgerButton> : null}
            />
          ) : null}
        </div>

        {deliveryNotes.length > 0 ? (
          <LedgerToolbar title="Filters" description="Filter fulfillment documents without changing delivery, invoice, quote, stock, or posting state.">
            <LedgerFilterBar>
              <LedgerFieldLabel>
                <LedgerFieldText>Status</LedgerFieldText>
                <LedgerSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                  <option value="ALL">All</option>
                  {deliveryNoteStatuses.map((status) => (
                    <option key={status} value={status}>
                      {deliveryNoteStatusLabel(status)}
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

        {deliveryNotes.length > 0 && filteredDeliveryNotes.length === 0 ? (
          <LedgerEmptyState title="No delivery notes match the current filters" />
        ) : null}

        {filteredDeliveryNotes.length > 0 ? (
          <LedgerDataTable minWidth="1120px">
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
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(deliveryNote.issueDate)}</LedgerDate></td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(deliveryNote.deliveryDate)}</LedgerDate></td>
                  <td className="px-4 py-3">
                    <DeliveryNoteStatusPill status={deliveryNote.status} />
                  </td>
                  <td className="px-4 py-3 text-steel">{sourceLabel(deliveryNote)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{deliveryNote._count?.lines ?? deliveryNote.lines?.length ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <LedgerButton href={`/sales/delivery-notes/${deliveryNote.id}`} size="sm">
                        View
                      </LedgerButton>
                      {deliveryNote.status === "DRAFT" && canEdit ? (
                        <LedgerButton href={`/sales/delivery-notes/${deliveryNote.id}/edit`} size="sm">
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

function DeliveryNoteStatusPill({ status }: { status: DeliveryNoteStatus }) {
  return <LedgerStatusBadge tone={deliveryNoteStatusTone(status)}>{deliveryNoteStatusLabel(status)}</LedgerStatusBadge>;
}

function deliveryNoteStatusTone(status: DeliveryNoteStatus): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "ISSUED":
      return "info";
    case "DELIVERED":
      return "success";
    case "CANCELLED":
      return "warning";
    case "VOIDED":
      return "danger";
  }
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
