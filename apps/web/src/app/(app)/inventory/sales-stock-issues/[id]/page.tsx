"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { canVoidPostedStockDocument, formatInventoryQuantity, inventoryOperationalWarning, stockDocumentStatusBadgeClass, stockDocumentStatusLabel, stockMovementTypeLabel } from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { SalesStockIssue, SalesStockIssueLine } from "@/lib/types";

export default function SalesStockIssueDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [issue, setIssue] = useState<SalesStockIssue | null>(null);
  const [loading, setLoading] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canVoid = can(PERMISSIONS.salesStockIssue.create);

  useEffect(() => {
    if (!organizationId || !params.id) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SalesStockIssue>(`/sales-stock-issues/${params.id}`)
      .then((result) => {
        if (!cancelled) setIssue(result);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load sales stock issue.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, params.id, reloadToken]);

  async function voidIssue() {
    if (!issue || !window.confirm(`Void sales stock issue ${issue.issueNumber}?`)) return;
    setVoiding(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<SalesStockIssue>(`/sales-stock-issues/${issue.id}/void`, { method: "POST" });
      setIssue(updated);
      setSuccess(`${updated.issueNumber} has been voided.`);
      setReloadToken((current) => current + 1);
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : "Unable to void sales stock issue.");
    } finally {
      setVoiding(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{issue?.issueNumber ?? "Sales stock issue"}</h1>
          <p className="mt-1 text-sm text-steel">Issue detail and linked operational stock movements.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory/sales-stock-issues" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {issue && canVoid && canVoidPostedStockDocument(issue.status) ? (
            <button type="button" disabled={voiding} onClick={() => void voidIssue()} className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {voiding ? "Voiding..." : "Void"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load sales stock issue details.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading sales stock issue...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {issue ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Detail label="Customer" value={issue.customer?.displayName ?? issue.customer?.name ?? issue.customerId} />
              <Detail label="Invoice" value={issue.salesInvoice?.invoiceNumber ?? issue.salesInvoiceId} />
              <Detail label="Warehouse" value={issue.warehouse ? `${issue.warehouse.code} ${issue.warehouse.name}` : issue.warehouseId} />
              <Detail label="Date" value={formatOptionalDate(issue.issueDate, "-")} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-steel">Status</p>
                <span className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-medium ${stockDocumentStatusBadgeClass(issue.status)}`}>{stockDocumentStatusLabel(issue.status)}</span>
              </div>
              <Detail label="Posted at" value={formatOptionalDate(issue.postedAt, "-")} />
              <Detail label="Voided at" value={formatOptionalDate(issue.voidedAt, "-")} />
            </div>
            {issue.notes ? <p className="mt-4 text-sm text-steel">{issue.notes}</p> : null}
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Invoice line</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Unit cost</th>
                  <th className="px-4 py-3">Movement</th>
                  <th className="px-4 py-3">Void movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issue.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.itemId}</td>
                    <td className="px-4 py-3 text-steel">{line.salesInvoiceLine?.description ?? "-"}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(line.quantity)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{line.unitCost ? formatInventoryQuantity(line.unitCost) : "-"}</td>
                    <td className="px-4 py-3"><Movement line={line} kind="stockMovement" /></td>
                    <td className="px-4 py-3"><Movement line={line} kind="voidStockMovement" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

function Movement({ line, kind }: { line: SalesStockIssueLine; kind: "stockMovement" | "voidStockMovement" }) {
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
