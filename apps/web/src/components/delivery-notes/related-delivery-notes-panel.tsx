"use client";

import Link from "next/link";
import { LedgerDataTable, LedgerEmptyState, LedgerLoadingState, LedgerPanel, LedgerStatusBadge, type LedgerStatusTone } from "@/components/ui/ledger-system";
import { deliveryNoteStatusLabel } from "@/lib/delivery-notes";
import { formatOptionalDate } from "@/lib/invoice-display";
import type { DeliveryNote } from "@/lib/types";

export function RelatedDeliveryNotesPanel({
  sourceKind,
  deliveryNotes,
  loading,
}: {
  sourceKind: "invoice" | "quote";
  deliveryNotes: DeliveryNote[];
  loading: boolean;
}) {
  const helperText =
    sourceKind === "invoice"
      ? "Delivery notes linked to this invoice are fulfillment documents. They do not post journals, create accounts receivable, file VAT, send email, call ZATCA, or move inventory by themselves."
      : "Delivery notes linked to quotes remain operational and non-posting. They do not convert the quote, create an invoice, post revenue, file VAT, send email, call ZATCA, or move inventory by themselves.";

  return (
    <LedgerPanel>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Related delivery notes</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{helperText}</p>
        </div>
        <LedgerStatusBadge tone="draft">Non-posting fulfillment</LedgerStatusBadge>
      </div>

      <div className="mt-4">
        {loading ? <LedgerLoadingState title="Loading related delivery notes" /> : null}
        {!loading && deliveryNotes.length === 0 ? (
          <LedgerEmptyState title="No delivery notes linked" description={<>No delivery notes are linked to this {sourceKind} yet.</>} />
        ) : null}
        {!loading && deliveryNotes.length > 0 ? (
          <LedgerDataTable minWidth="760px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-3 py-2">Delivery Note</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Issue date</th>
                <th className="px-3 py-2">Delivery date</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Delivery address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveryNotes.map((deliveryNote) => (
                <tr key={deliveryNote.id}>
                  <td className="px-3 py-2">
                    <Link href={`/sales/delivery-notes/${deliveryNote.id}`} className="font-mono text-xs font-medium text-palm hover:underline">
                      {deliveryNote.deliveryNoteNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <LedgerStatusBadge tone={deliveryNoteStatusTone(deliveryNote.status)}>
                      {deliveryNoteStatusLabel(deliveryNote.status)}
                    </LedgerStatusBadge>
                  </td>
                  <td className="px-3 py-2 text-steel">{formatOptionalDate(deliveryNote.issueDate)}</td>
                  <td className="px-3 py-2 text-steel">{formatOptionalDate(deliveryNote.deliveryDate)}</td>
                  <td className="px-3 py-2 text-steel">{deliveryNote.customer?.displayName ?? deliveryNote.customer?.name ?? "-"}</td>
                  <td className="px-3 py-2 text-steel">{deliveryAddressSummary(deliveryNote.deliveryAddress)}</td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        ) : null}
      </div>
    </LedgerPanel>
  );
}

function deliveryAddressSummary(address: string | null): string {
  const summary = address
    ?.split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  return summary || "-";
}

function deliveryNoteStatusTone(status: DeliveryNote["status"]): LedgerStatusTone {
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
