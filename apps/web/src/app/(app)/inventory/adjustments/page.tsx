"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  inventoryAdjustmentStatusBadgeClass,
  inventoryAdjustmentStatusLabel,
  inventoryAdjustmentTypeLabel,
  inventoryOperationalWarning,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { InventoryAdjustment } from "@/lib/types";

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
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Inventory adjustments</h1>
          <p className="mt-1 text-sm text-steel">Draft, approved, and voided operational inventory adjustments.</p>
        </div>
        {canCreate ? (
          <Link href="/inventory/adjustments/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            New adjustment
          </Link>
        ) : null}
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load inventory adjustments.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading inventory adjustments...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && adjustments.length === 0 ? <StatusMessage type="empty">No inventory adjustments found.</StatusMessage> : null}
      </div>

      {adjustments.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1060px] text-left text-sm">
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
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(adjustment.adjustmentDate, "-")}</td>
                  <td className="px-4 py-3 text-ink">{adjustment.item ? `${adjustment.item.name}${adjustment.item.sku ? ` (${adjustment.item.sku})` : ""}` : adjustment.itemId}</td>
                  <td className="px-4 py-3 text-steel">{adjustment.warehouse ? `${adjustment.warehouse.code} ${adjustment.warehouse.name}` : adjustment.warehouseId}</td>
                  <td className="px-4 py-3 text-steel">{inventoryAdjustmentTypeLabel(adjustment.type)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(adjustment.quantity)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryAdjustmentStatusBadgeClass(adjustment.status)}`}>
                      {inventoryAdjustmentStatusLabel(adjustment.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/inventory/adjustments/${adjustment.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
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
