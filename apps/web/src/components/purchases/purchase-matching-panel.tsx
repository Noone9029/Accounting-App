"use client";

import Link from "next/link";
import {
  LedgerActionBar,
  LedgerDataTable,
  LedgerDate,
  LedgerMetadataRow,
  LedgerPanel,
  LedgerSection,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatInventoryQuantity, inventoryValuationVariancePreviewUrl } from "@/lib/inventory";
import type { PurchaseMatchingDocumentRef, PurchaseMatchingReviewStatus, PurchaseMatchingStatusLabel, PurchaseMatchingSummary } from "@/lib/types";

export function PurchaseMatchingPanel({
  summary,
  showValuationVariancePreviewLink = false,
}: {
  summary: PurchaseMatchingSummary;
  showValuationVariancePreviewLink?: boolean;
}) {
  const showVariancePreview = showValuationVariancePreviewLink && summary.reviewSummary?.reviewStatus === "NEEDS_VARIANCE_REVIEW";
  return (
    <LedgerPanel>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Purchase matching</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            Read-only PO, bill, and receipt comparison. This view does not post journals, book variances, change AP balances, or move inventory.
          </p>
        </div>
        <LedgerActionBar className="sm:justify-end">
          <Link href="/purchases/matching" className="text-sm font-medium text-palm hover:underline">
            View all purchase matching exceptions
          </Link>
          <LedgerStatusBadge tone={purchaseMatchingStatusTone(summary.status)}>{summary.status}</LedgerStatusBadge>
        </LedgerActionBar>
      </div>

      <div className="mt-4">
        <LedgerMetadataRow
          items={[
            { label: "Ordered", value: formatInventoryQuantity(summary.totals.orderedQuantity) },
            { label: "Billed", value: formatInventoryQuantity(summary.totals.billedQuantity) },
            { label: "Received", value: formatInventoryQuantity(summary.totals.receivedQuantity) },
            { label: "Remaining to bill", value: formatInventoryQuantity(summary.totals.remainingToBill) },
            { label: "Remaining to receive", value: formatInventoryQuantity(summary.totals.remainingToReceive) },
            { label: "Over billed", value: formatInventoryQuantity(summary.totals.overBilledQuantity) },
            { label: "Over received", value: formatInventoryQuantity(summary.totals.overReceivedQuantity) },
            { label: "Supplier", value: <Link href={`/contacts/${summary.supplier.id}`} className="font-medium text-palm hover:underline">{summary.supplier.displayName ?? summary.supplier.name}</Link> },
          ]}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm lg:grid-cols-3">
        <DocumentSummary title="Purchase order" document={summary.purchaseOrder} />
        <DocumentSummary title="Purchase bill" document={summary.purchaseBill ?? summary.relatedBills[0] ?? null} />
        <DocumentSummary title="Purchase receipt" document={summary.purchaseReceipt ?? summary.relatedReceipts[0] ?? null} />
      </div>

      <div className="mt-4 rounded-md border border-line bg-mist p-3 text-sm">
        <div className="text-xs uppercase tracking-wide text-steel">Review workflow</div>
        {summary.reviewSummary ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <LedgerStatusBadge tone={purchaseMatchingReviewTone(summary.reviewSummary.reviewStatus)}>{purchaseMatchingReviewStatusLabel(summary.reviewSummary.reviewStatus)}</LedgerStatusBadge>
            {summary.reviewSummary.reasonCode ? <span className="text-xs text-steel">{summary.reviewSummary.reasonCode.replaceAll("_", " ").toLowerCase()}</span> : null}
            <Link href="/purchases/matching" className="text-xs font-medium text-palm hover:underline">
              View matching exception review
            </Link>
            {showVariancePreview ? (
              <Link
                href={inventoryValuationVariancePreviewUrl({
                  matchingReviewId: summary.reviewSummary?.reviewId ?? null,
                  sourceType: "matchingReview",
                })}
                className="text-xs font-medium text-palm hover:underline"
              >
                Open valuation variance preview
              </Link>
            ) : null}
            {summary.reviewSummary.purchaseReturnHref && summary.reviewSummary.purchaseReturnNumber ? (
              <Link href={summary.reviewSummary.purchaseReturnHref} className="text-xs font-medium text-palm hover:underline">
                Return {summary.reviewSummary.purchaseReturnNumber}
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <LedgerStatusBadge>No review started</LedgerStatusBadge>
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
        <LedgerSummaryBand tone="warning">
          <ul className="space-y-1">
            {summary.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </LedgerSummaryBand>
      ) : null}

      <LedgerSection title="Matching lines" description="Line-level ordered, billed, received, and follow-up quantities." className="mt-4 p-0">
        <LedgerDataTable minWidth="1040px" className="rounded-t-none border-0 shadow-none">
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
                  <LedgerStatusBadge tone={purchaseMatchingStatusTone(line.status)}>{line.status}</LedgerStatusBadge>
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
        </LedgerDataTable>
      </LedgerSection>
    </LedgerPanel>
  );
}

function DocumentSummary({ title, document }: { title: string; document: PurchaseMatchingDocumentRef | null }) {
  if (!document) {
    return (
      <div className="rounded-md border border-line bg-mist p-3">
        <p className="text-xs uppercase tracking-wide text-steel">{title}</p>
        <p className="mt-1 text-sm font-medium text-ink">Not linked</p>
      </div>
    );
  }

  const label = document.purchaseOrderNumber ?? document.billNumber ?? document.receiptNumber ?? document.id;
  const href = purchaseMatchingDocumentHref(document);
  const date = document.orderDate ?? document.billDate ?? document.receiptDate ?? null;

  return (
    <div className="rounded-md border border-line bg-mist p-3">
      <p className="text-xs uppercase tracking-wide text-steel">{title}</p>
      <Link href={href} className="mt-1 block text-sm font-medium text-palm hover:underline">
        {label}
      </Link>
      <p className="mt-1 text-xs text-steel">
        {document.status}
        {date ? <> · <LedgerDate>{formatOptionalDate(date, "-")}</LedgerDate></> : ""}
      </p>
    </div>
  );
}

function purchaseMatchingDocumentHref(document: PurchaseMatchingDocumentRef): string {
  if (document.purchaseOrderNumber) return `/purchases/purchase-orders/${document.id}`;
  if (document.billNumber) return `/purchases/bills/${document.id}`;
  if (document.receiptNumber) return `/inventory/purchase-receipts/${document.id}`;
  return "#";
}

function purchaseMatchingStatusTone(status: PurchaseMatchingStatusLabel): LedgerStatusTone {
  switch (status) {
    case "Matched":
      return "success";
    case "Partially matched":
    case "Bill pending receipt":
    case "Receipt pending bill":
      return "warning";
    case "Not received":
    case "Not billed":
      return "neutral";
    case "Over received":
    case "Over billed":
      return "danger";
    case "Review required":
      return "warning";
  }
}

function purchaseMatchingReviewStatusLabel(status: PurchaseMatchingReviewStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function purchaseMatchingReviewTone(status: PurchaseMatchingReviewStatus): LedgerStatusTone {
  if (status === "RESOLVED") return "success";
  if (status === "CANCELLED") return "neutral";
  if (status === "NEEDS_VARIANCE_REVIEW" || status === "NEEDS_RETURN_REVIEW") return "warning";
  if (status === "WAITING_FOR_SUPPLIER" || status === "WAITING_FOR_RECEIPT" || status === "WAITING_FOR_BILL") return "warning";
  return "info";
}
