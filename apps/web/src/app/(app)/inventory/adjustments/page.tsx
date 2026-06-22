"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerLoadingState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  inventoryAdjustmentStatusLabel,
  inventoryAdjustmentTypeLabel,
  inventoryOperationalWarning,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { InventoryAdjustment } from "@/lib/types";

function adjustmentStatusTone(status: InventoryAdjustment["status"]): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "warning";
    case "APPROVED":
      return "success";
    case "VOIDED":
      return "danger";
  }
}

export default function InventoryAdjustmentsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreate = can(PERMISSIONS.inventoryAdjustments.create);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<InventoryAdjustment[]>("/inventory-adjustments")
      .then((result) => {
        if (!cancelled) {
          setAdjustments(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load inventory adjustments.");
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
        eyebrow="Inventory"
        title="Inventory adjustments"
        description="Draft, approved, and voided operational inventory adjustments."
        actions={canCreate ? <LedgerButton href="/inventory/adjustments/new" variant="primary">New adjustment</LedgerButton> : null}
      />

      <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load inventory adjustments.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading inventory adjustments" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && organizationId && adjustments.length === 0 ? <LedgerEmptyState title="No inventory adjustments found." /> : null}

        {adjustments.length > 0 ? (
          <LedgerDataTable minWidth="1060px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Adjustment</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adjustments.map((adjustment) => (
                <tr key={adjustment.id}>
                  <td className="px-4 py-3 font-mono text-xs">{adjustment.adjustmentNumber}</td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(adjustment.adjustmentDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-ink">{adjustment.item ? `${adjustment.item.name}${adjustment.item.sku ? ` (${adjustment.item.sku})` : ""}` : adjustment.itemId}</td>
                  <td className="px-4 py-3 text-steel">{adjustment.warehouse ? `${adjustment.warehouse.code} ${adjustment.warehouse.name}` : adjustment.warehouseId}</td>
                  <td className="px-4 py-3 text-steel">{inventoryAdjustmentTypeLabel(adjustment.type)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(adjustment.quantity)}</td>
                  <td className="px-4 py-3"><LedgerStatusBadge tone={adjustmentStatusTone(adjustment.status)}>{inventoryAdjustmentStatusLabel(adjustment.status)}</LedgerStatusBadge></td>
                  <td className="px-4 py-3"><LedgerButton href={`/inventory/adjustments/${adjustment.id}`} size="sm">View</LedgerButton></td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
