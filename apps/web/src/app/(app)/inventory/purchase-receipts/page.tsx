"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatInventoryQuantity, inventoryOperationalWarning, purchaseReceiptSourceTypeLabel, stockDocumentStatusBadgeClass, stockDocumentStatusLabel } from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { PurchaseReceipt } from "@/lib/types";

export default function PurchaseReceiptsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreate = can(PERMISSIONS.purchaseReceiving.create);

  useEffect(() => {
    if (!organizationId) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<PurchaseReceipt[]>("/purchase-receipts")
      .then((result) => {
        if (!cancelled) setReceipts(result);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load purchase receipts.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Purchase receipts</h1>
          <p className="mt-1 text-sm text-steel">Operational stock receipts from purchase documents or standalone supplier receipts.</p>
        </div>
        {canCreate ? (
          <Link href="/inventory/purchase-receipts/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            New receipt
          </Link>
        ) : null}
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load purchase receipts.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase receipts...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && receipts.length === 0 ? <StatusMessage type="empty">No purchase receipts found.</StatusMessage> : null}
      </div>

      {receipts.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3 text-right">Lines</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td className="px-4 py-3 font-mono text-xs">{receipt.receiptNumber}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(receipt.receiptDate, "-")}</td>
                  <td className="px-4 py-3 text-ink">{receipt.supplier?.displayName ?? receipt.supplier?.name ?? receipt.supplierId}</td>
                  <td className="px-4 py-3 text-steel">{receiptSource(receipt)}</td>
                  <td className="px-4 py-3 text-steel">{receipt.warehouse ? `${receipt.warehouse.code} ${receipt.warehouse.name}` : receipt.warehouseId}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(totalReceiptQuantity(receipt))}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${stockDocumentStatusBadgeClass(receipt.status)}`}>
                      {stockDocumentStatusLabel(receipt.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/inventory/purchase-receipts/${receipt.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      View
                    </Link>
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

function receiptSource(receipt: PurchaseReceipt): string {
  if (receipt.purchaseOrder) return `${purchaseReceiptSourceTypeLabel("purchaseOrder")} ${receipt.purchaseOrder.purchaseOrderNumber}`;
  if (receipt.purchaseBill) return `${purchaseReceiptSourceTypeLabel("purchaseBill")} ${receipt.purchaseBill.billNumber}`;
  return purchaseReceiptSourceTypeLabel("standalone");
}

function totalReceiptQuantity(receipt: PurchaseReceipt): string {
  const total = receipt.lines?.reduce((sum, line) => sum + Number(line.quantity || 0), 0) ?? 0;
  return String(total);
}
