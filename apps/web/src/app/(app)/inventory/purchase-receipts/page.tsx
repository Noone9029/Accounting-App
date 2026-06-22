"use client";

import { useEffect, useState } from "react";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerLoadingState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatInventoryQuantity, inventoryOperationalWarning, purchaseReceiptSourceTypeLabel, stockDocumentStatusLabel } from "@/lib/inventory";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title="Purchase receipts"
        description="Operational stock receipts from purchase documents or standalone supplier receipts."
        actions={canCreate ? <LedgerButton href="/inventory/purchase-receipts/new" variant="primary">New receipt</LedgerButton> : null}
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load purchase receipts.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading purchase receipts" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

        {!loading && organizationId && receipts.length === 0 ? (
          <LedgerEmptyState title="No purchase receipts found" description="Receipts posted from purchase orders, purchase bills, or standalone supplier receipts will appear here." />
        ) : null}

        {receipts.length > 0 ? (
          <LedgerDataTable minWidth="1060px">
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
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(receipt.receiptDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-ink">{receipt.supplier?.displayName ?? receipt.supplier?.name ?? receipt.supplierId}</td>
                  <td className="px-4 py-3 text-steel">{receiptSource(receipt)}</td>
                  <td className="px-4 py-3 text-steel">{receipt.warehouse ? `${receipt.warehouse.code} ${receipt.warehouse.name}` : receipt.warehouseId}</td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(totalReceiptQuantity(receipt))}</LedgerMoney></td>
                  <td className="px-4 py-3">
                    <LedgerStatusBadge tone={stockDocumentStatusTone(receipt.status)}>{stockDocumentStatusLabel(receipt.status)}</LedgerStatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <LedgerButton href={`/inventory/purchase-receipts/${receipt.id}`} size="sm">View</LedgerButton>
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

function receiptSource(receipt: PurchaseReceipt): string {
  if (receipt.purchaseOrder) return `${purchaseReceiptSourceTypeLabel("purchaseOrder")} ${receipt.purchaseOrder.purchaseOrderNumber}`;
  if (receipt.purchaseBill) return `${purchaseReceiptSourceTypeLabel("purchaseBill")} ${receipt.purchaseBill.billNumber}`;
  return purchaseReceiptSourceTypeLabel("standalone");
}

function totalReceiptQuantity(receipt: PurchaseReceipt): string {
  const total = receipt.lines?.reduce((sum, line) => sum + Number(line.quantity || 0), 0) ?? 0;
  return String(total);
}

function stockDocumentStatusTone(status: string): LedgerStatusTone {
  if (status === "POSTED") return "success";
  if (status === "VOIDED") return "danger";
  if (status === "DRAFT") return "draft";
  return "neutral";
}
