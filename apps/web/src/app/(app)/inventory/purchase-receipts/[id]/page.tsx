"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  accountingPreviewCanPost,
  accountingPreviewLineDisplay,
  canVoidPostedStockDocument,
  formatInventoryQuantity,
  inventoryOperationalWarning,
  purchaseReceiptPostingModeLabel,
  stockDocumentStatusBadgeClass,
  stockDocumentStatusLabel,
  stockMovementTypeLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { PurchaseReceipt, PurchaseReceiptAccountingPreview, PurchaseReceiptLine } from "@/lib/types";

export default function PurchaseReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [receipt, setReceipt] = useState<PurchaseReceipt | null>(null);
  const [preview, setPreview] = useState<PurchaseReceiptAccountingPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canVoid = can(PERMISSIONS.purchaseReceiving.create);

  useEffect(() => {
    if (!organizationId || !params.id) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    setPreviewError("");

    Promise.all([
      apiRequest<PurchaseReceipt>(`/purchase-receipts/${params.id}`),
      apiRequest<PurchaseReceiptAccountingPreview>(`/purchase-receipts/${params.id}/accounting-preview`),
    ])
      .then(([receiptResult, previewResult]) => {
        if (!cancelled) {
          setReceipt(receiptResult);
          setPreview(previewResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load purchase receipt.");
          setPreviewError(loadError instanceof Error ? loadError.message : "Unable to load accounting preview.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, params.id, reloadToken]);

  async function voidReceipt() {
    if (!receipt || !window.confirm(`Void purchase receipt ${receipt.receiptNumber}?`)) return;
    setVoiding(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<PurchaseReceipt>(`/purchase-receipts/${receipt.id}/void`, { method: "POST" });
      setReceipt(updated);
      setSuccess(`${updated.receiptNumber} has been voided.`);
      setReloadToken((current) => current + 1);
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : "Unable to void purchase receipt.");
    } finally {
      setVoiding(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{receipt?.receiptNumber ?? "Purchase receipt"}</h1>
          <p className="mt-1 text-sm text-steel">Receipt detail and linked operational stock movements.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory/purchase-receipts" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {receipt && canVoid && canVoidPostedStockDocument(receipt.status) ? (
            <button type="button" disabled={voiding} onClick={() => void voidReceipt()} className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {voiding ? "Voiding..." : "Void"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load purchase receipt details.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase receipt...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {receipt ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Detail label="Supplier" value={receipt.supplier?.displayName ?? receipt.supplier?.name ?? receipt.supplierId} />
              <Detail label="Warehouse" value={receipt.warehouse ? `${receipt.warehouse.code} ${receipt.warehouse.name}` : receipt.warehouseId} />
              <Detail label="Date" value={formatOptionalDate(receipt.receiptDate, "-")} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-steel">Status</p>
                <span className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-medium ${stockDocumentStatusBadgeClass(receipt.status)}`}>
                  {stockDocumentStatusLabel(receipt.status)}
                </span>
              </div>
              <Detail label="Source PO" value={receipt.purchaseOrder?.purchaseOrderNumber ?? "-"} />
              <Detail label="Source bill" value={receipt.purchaseBill?.billNumber ?? "-"} />
              <Detail label="Posted at" value={formatOptionalDate(receipt.postedAt, "-")} />
              <Detail label="Voided at" value={formatOptionalDate(receipt.voidedAt, "-")} />
            </div>
            {receipt.notes ? <p className="mt-4 text-sm text-steel">{receipt.notes}</p> : null}
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Source line</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Unit cost</th>
                  <th className="px-4 py-3">Movement</th>
                  <th className="px-4 py-3">Void movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipt.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.itemId}</td>
                    <td className="px-4 py-3 text-steel">{line.purchaseOrderLine?.description ?? line.purchaseBillLine?.description ?? "-"}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(line.quantity)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{line.unitCost ? formatInventoryQuantity(line.unitCost) : "-"}</td>
                    <td className="px-4 py-3"><Movement line={line} kind="stockMovement" /></td>
                    <td className="px-4 py-3"><Movement line={line} kind="voidStockMovement" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PurchaseReceiptAccountingPreviewPanel preview={preview} error={previewError} />
        </div>
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 break-words text-sm text-ink">{value}</p>
    </div>
  );
}

function Movement({ line, kind }: { line: PurchaseReceiptLine; kind: "stockMovement" | "voidStockMovement" }) {
  const movement = line[kind];
  return movement ? (
    <div>
      <p className="text-ink">{stockMovementTypeLabel(movement.type)}</p>
      <p className="font-mono text-xs text-steel">{movement.id}</p>
    </div>
  ) : (
    <span className="text-steel">-</span>
  );
}

function PurchaseReceiptAccountingPreviewPanel({ preview, error }: { preview: PurchaseReceiptAccountingPreview | null; error: string }) {
  if (error) {
    return <StatusMessage type="error">{error}</StatusMessage>;
  }
  if (!preview) {
    return null;
  }

  const postable = accountingPreviewCanPost(preview);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Accounting Preview</h2>
          <p className="mt-1 text-sm text-steel">Design-only inventory asset preview. No journal entry will be posted.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">{preview.postingStatus.replaceAll("_", " ")}</span>
          <span className={postable ? "rounded-md bg-emerald-50 px-2 py-1 text-emerald-700" : "rounded-md bg-slate-100 px-2 py-1 text-slate-700"}>
            {postable ? "Postable" : "Preview only"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <PreviewList title="Blocking reasons" items={preview.blockingReasons} emptyText={preview.canPostReason} tone="slate" />
        <PreviewList title="Warnings" items={preview.warnings} emptyText="No warnings." tone="amber" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
        <Detail label="Posting mode" value={purchaseReceiptPostingModeLabel(preview.postingMode)} />
        <Detail label="Receipt value" value={formatInventoryQuantity(preview.receiptValue)} />
        <Detail label="Matched bill value" value={formatInventoryQuantity(preview.matchedBillValue)} />
        <Detail label="Value difference" value={formatInventoryQuantity(preview.valueDifference)} />
      </div>

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right">Unit cost</th>
              <th className="px-4 py-3 text-right">Line value</th>
              <th className="px-4 py-3 text-right">Matched qty</th>
              <th className="px-4 py-3 text-right">Bill value</th>
              <th className="px-4 py-3">Warnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-4 py-3">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.lineId}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(line.quantity)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{line.unitCost ? formatInventoryQuantity(line.unitCost) : "-"}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{line.lineValue ? formatInventoryQuantity(line.lineValue) : "-"}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(line.matchedQuantity)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{line.matchedBillValue ? formatInventoryQuantity(line.matchedBillValue) : "-"}</td>
                <td className="px-4 py-3 text-steel">{line.warnings.length > 0 ? line.warnings.join("; ") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <JournalPreview preview={preview} />

      <MatchingSummary preview={preview} />
    </div>
  );
}

function MatchingSummary({ preview }: { preview: PurchaseReceiptAccountingPreview }) {
  return (
    <div className="mt-5 rounded-md bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Bill/receipt matching</h3>
          <p className="mt-1 text-sm text-steel">Operational comparison only. No purchase receipt journal is posted.</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{preview.matchingSummary.sourceType}</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <Detail label="Matched quantity" value={formatInventoryQuantity(preview.matchingSummary.matchedQuantity)} />
        <Detail label="Unmatched quantity" value={formatInventoryQuantity(preview.matchingSummary.unmatchedQuantity)} />
        <Detail label="Unmatched receipt value" value={formatInventoryQuantity(preview.unmatchedReceiptValue)} />
      </div>
      {preview.matchingSummary.billLines.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-3 py-2">Bill line</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2 text-right">Billed qty</th>
                <th className="px-3 py-2 text-right">Matched qty</th>
                <th className="px-3 py-2 text-right">Matched value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preview.matchingSummary.billLines.map((line) => (
                <tr key={line.lineId}>
                  <td className="px-3 py-2">{line.description}</td>
                  <td className="px-3 py-2 text-steel">{line.account.code} {line.account.name}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.billedQuantity)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.matchedQuantity)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.matchedValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function JournalPreview({ preview }: { preview: PurchaseReceiptAccountingPreview }) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <h3 className="text-sm font-semibold text-ink">Preview journal lines</h3>
        <p className="text-xs text-steel">
          Debit {formatInventoryQuantity(preview.journal.totalDebit)} / Credit {formatInventoryQuantity(preview.journal.totalCredit)}
        </p>
      </div>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Line</th>
              <th className="px-4 py-3">Preview</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.journal.lines.length > 0 ? (
              preview.journal.lines.map((line) => (
                <tr key={`${line.side}-${line.lineNumber}`}>
                  <td className="px-4 py-3 font-mono text-xs">{line.lineNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs">{accountingPreviewLineDisplay(line)}</td>
                  <td className="px-4 py-3 text-steel">{line.description}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-3 text-steel" colSpan={3}>
                  No journal lines available until mappings and cost data are complete.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewList({ title, items, emptyText, tone }: { title: string; items: string[]; emptyText: string; tone: "amber" | "slate" }) {
  const className = tone === "amber" ? "rounded-md bg-amber-50 p-4 text-sm text-amber-900" : "rounded-md bg-slate-50 p-4 text-sm text-steel";
  return (
    <div className={className}>
      <p className="font-medium text-ink">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>{emptyText}</li>}
      </ul>
    </div>
  );
}
