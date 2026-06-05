"use client";

import Link from "next/link";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatInventoryQuantity } from "@/lib/inventory";
import type { PurchaseMatchingDocumentRef, PurchaseMatchingReviewStatus, PurchaseMatchingStatusLabel, PurchaseMatchingSummary } from "@/lib/types";

export function PurchaseMatchingPanel({ summary }: { summary: PurchaseMatchingSummary }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Purchase matching</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            Read-only PO, bill, and receipt comparison. This view does not post journals, book variances, change AP balances, or move inventory.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/purchases/matching" className="text-sm font-medium text-palm hover:underline">
            View all purchase matching exceptions
          </Link>
          <span className={`rounded-md px-2 py-1 text-xs font-medium ${purchaseMatchingStatusBadgeClass(summary.status)}`}>
            {summary.status}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
        <Summary label="Ordered" value={formatInventoryQuantity(summary.totals.orderedQuantity)} />
        <Summary label="Billed" value={formatInventoryQuantity(summary.totals.billedQuantity)} />
        <Summary label="Received" value={formatInventoryQuantity(summary.totals.receivedQuantity)} />
        <Summary label="Remaining to bill" value={formatInventoryQuantity(summary.totals.remainingToBill)} />
        <Summary label="Remaining to receive" value={formatInventoryQuantity(summary.totals.remainingToReceive)} />
        <Summary label="Over billed" value={formatInventoryQuantity(summary.totals.overBilledQuantity)} />
        <Summary label="Over received" value={formatInventoryQuantity(summary.totals.overReceivedQuantity)} />
        <Summary label="Supplier" value={summary.supplier.displayName ?? summary.supplier.name} href={`/contacts/${summary.supplier.id}`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm lg:grid-cols-3">
        <DocumentSummary title="Purchase order" document={summary.purchaseOrder} />
        <DocumentSummary title="Purchase bill" document={summary.purchaseBill ?? summary.relatedBills[0] ?? null} />
        <DocumentSummary title="Purchase receipt" document={summary.purchaseReceipt ?? summary.relatedReceipts[0] ?? null} />
      </div>

      <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
        <div className="text-xs uppercase tracking-wide text-steel">Review workflow</div>
        {summary.reviewSummary ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${purchaseMatchingReviewBadgeClass(summary.reviewSummary.reviewStatus)}`}>
              {purchaseMatchingReviewStatusLabel(summary.reviewSummary.reviewStatus)}
            </span>
            {summary.reviewSummary.reasonCode ? <span className="text-xs text-steel">{summary.reviewSummary.reasonCode.replaceAll("_", " ").toLowerCase()}</span> : null}
            <Link href="/purchases/matching" className="text-xs font-medium text-palm hover:underline">
              View matching exception review
            </Link>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">No review started</span>
            <Link href="/purchases/matching" className="text-xs font-medium text-palm hover:underline">
              View all purchase matching exceptions
            </Link>
          </div>
        )}
        <p className="mt-2 text-xs leading-5 text-steel">
          Review status is for follow-up only. It does not post journals, update AP balances, change inventory quantities, book variances, or create returns.
        </p>
      </div>

      {summary.warnings.length > 0 ? (
        <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <ul className="space-y-1">
            {summary.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-3 py-2">Line</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Ordered</th>
              <th className="px-3 py-2 text-right">Billed</th>
              <th className="px-3 py-2 text-right">Received</th>
              <th className="px-3 py-2 text-right">Remaining bill</th>
              <th className="px-3 py-2 text-right">Remaining receipt</th>
              <th className="px-3 py-2">Bills</th>
              <th className="px-3 py-2">Receipts</th>
              <th className="px-3 py-2">Review flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summary.lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-3 py-2">
                  <div className="font-medium text-ink">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.description}</div>
                  {line.item ? <div className="text-xs text-steel">{line.description}</div> : null}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${purchaseMatchingStatusBadgeClass(line.status)}`}>
                    {line.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">{line.orderedQuantity === null ? "-" : formatInventoryQuantity(line.orderedQuantity)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.billedQuantity)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.receivedQuantity)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{line.remainingToBill === null ? "-" : formatInventoryQuantity(line.remainingToBill)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.remainingToReceive)}</td>
                <td className="px-3 py-2 text-steel">
                  {line.bills.length > 0 ? (
                    <div className="space-y-1">
                      {line.bills.map((bill) => (
                        <Link key={`${bill.id}-${bill.billLineId}`} href={bill.href} className="block text-palm hover:underline">
                          {bill.billNumber} · {formatInventoryQuantity(bill.quantity)}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-2 text-steel">
                  {line.receipts.length > 0 ? (
                    <div className="space-y-1">
                      {line.receipts.map((receipt) => (
                        <Link key={`${receipt.id}-${receipt.receiptLineId}`} href={receipt.href} className="block text-palm hover:underline">
                          {receipt.receiptNumber} · {formatInventoryQuantity(receipt.quantity)}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-2 text-steel">{line.warnings.length > 0 ? line.warnings.join("; ") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentSummary({ title, document }: { title: string; document: PurchaseMatchingDocumentRef | null }) {
  if (!document) {
    return (
      <div className="rounded-md bg-slate-50 p-3">
        <p className="text-xs uppercase tracking-wide text-steel">{title}</p>
        <p className="mt-1 text-sm font-medium text-ink">Not linked</p>
      </div>
    );
  }

  const label = document.purchaseOrderNumber ?? document.billNumber ?? document.receiptNumber ?? document.id;
  const href = purchaseMatchingDocumentHref(document);
  const date = document.orderDate ?? document.billDate ?? document.receiptDate ?? null;

  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-wide text-steel">{title}</p>
      <Link href={href} className="mt-1 block text-sm font-medium text-palm hover:underline">
        {label}
      </Link>
      <p className="mt-1 text-xs text-steel">
        {document.status}
        {date ? ` · ${formatOptionalDate(date, "-")}` : ""}
      </p>
    </div>
  );
}

function Summary({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      {href ? (
        <Link href={href} className="mt-1 block font-medium text-palm hover:underline">
          {value}
        </Link>
      ) : (
        <div className="mt-1 font-medium text-ink">{value}</div>
      )}
    </div>
  );
}

function purchaseMatchingDocumentHref(document: PurchaseMatchingDocumentRef): string {
  if (document.purchaseOrderNumber) return `/purchases/purchase-orders/${document.id}`;
  if (document.billNumber) return `/purchases/bills/${document.id}`;
  if (document.receiptNumber) return `/inventory/purchase-receipts/${document.id}`;
  return "#";
}

function purchaseMatchingStatusBadgeClass(status: PurchaseMatchingStatusLabel): string {
  switch (status) {
    case "Matched":
      return "bg-emerald-50 text-emerald-700";
    case "Partially matched":
    case "Bill pending receipt":
    case "Receipt pending bill":
      return "bg-amber-50 text-amber-700";
    case "Not received":
    case "Not billed":
      return "bg-slate-100 text-slate-700";
    case "Over received":
    case "Over billed":
      return "bg-rose-50 text-rose-700";
    case "Review required":
      return "bg-orange-50 text-orange-700";
  }
}

function purchaseMatchingReviewStatusLabel(status: PurchaseMatchingReviewStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function purchaseMatchingReviewBadgeClass(status: PurchaseMatchingReviewStatus): string {
  if (status === "RESOLVED") return "bg-emerald-50 text-emerald-700";
  if (status === "CANCELLED") return "bg-slate-100 text-slate-700";
  if (status === "NEEDS_VARIANCE_REVIEW" || status === "NEEDS_RETURN_REVIEW") return "bg-orange-50 text-orange-700";
  if (status === "WAITING_FOR_SUPPLIER" || status === "WAITING_FOR_RECEIPT" || status === "WAITING_FOR_BILL") return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
}
