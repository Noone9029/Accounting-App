"use client";

import { LedgerStatusBadge } from "@/components/ui/ledger-system";
import { deliveryStatusLabel, deliveryStatusTone, formatDeliveryRecipient } from "@/lib/email-deliveries";
import type { CustomerDocumentDeliveryHistoryEntry } from "@/lib/email-deliveries";

export interface CustomerDocumentEmailDeliveryHistoryProps {
  entries: CustomerDocumentDeliveryHistoryEntry[];
  loading: boolean;
  error: string;
  emptyMessage: string;
}

export function CustomerDocumentEmailDeliveryHistory({ entries, loading, error, emptyMessage }: Readonly<CustomerDocumentEmailDeliveryHistoryProps>) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <h3 className="text-sm font-semibold text-ink">Delivery history</h3>
      {loading ? <p className="mt-3 text-sm text-steel">Loading delivery history...</p> : null}
      {error ? <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rosewood">{error}</p> : null}
      {!loading && !error && entries.length === 0 ? <p className="mt-3 text-sm text-steel">{emptyMessage}</p> : null}
      {entries.length > 0 ? (
        <div className="mt-3 space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50/60 p-3 text-sm md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-center">
              <div><div className="font-medium text-ink">{deliveryStatusLabel(entry)}</div><div className="text-xs text-steel">{formatDeliveryRecipient(entry.maskedRecipient)} · {entry.attachmentFilename ?? "No attachment"}</div><div className="text-xs text-steel">Requested {formatDeliveryDate(entry.createdAt)}</div></div>
              <div className="text-xs text-steel">{entry.provider} · {entry.attemptCount} attempt{entry.attemptCount === 1 ? "" : "s"}{entry.latestAttemptAt ? ` · Attempted ${formatDeliveryDate(entry.latestAttemptAt)}` : ""}{entry.nextAttemptAt ? ` · Retry ${formatDeliveryDate(entry.nextAttemptAt)}` : ""}</div>
              <div className="text-xs text-steel">{entry.requestedBy?.name ?? "Unknown requester"}{entry.bouncedAt ? ` · Bounced ${formatDeliveryDate(entry.bouncedAt)}` : ""}{entry.complainedAt ? ` · Complaint ${formatDeliveryDate(entry.complainedAt)}` : ""}{entry.suppressionStatus ? ` · ${entry.suppressionStatus}` : ""}</div>
              <LedgerStatusBadge tone={deliveryStatusTone(entry.status)}>{deliveryStatusLabel(entry)}</LedgerStatusBadge>
              {entry.safeError ? <div className="text-xs text-rosewood md:col-span-4">{entry.safeError}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatDeliveryDate(value: string): string {
  return value.slice(0, 16).replace("T", " ");
}
