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
  inventoryOperationalWarning,
  warehouseTransferStatusBadgeClass,
  warehouseTransferStatusLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { WarehouseTransfer } from "@/lib/types";

export default function WarehouseTransfersPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreate = can(PERMISSIONS.warehouseTransfers.create);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<WarehouseTransfer[]>("/warehouse-transfers")
      .then((result) => {
        if (!cancelled) {
          setTransfers(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load warehouse transfers.");
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
          <h1 className="text-2xl font-semibold text-ink">Warehouse transfers</h1>
          <p className="mt-1 text-sm text-steel">Posted operational transfers between active warehouses.</p>
        </div>
        {canCreate ? (
          <Link href="/inventory/transfers/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            New transfer
          </Link>
        ) : null}
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load warehouse transfers.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading warehouse transfers...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && transfers.length === 0 ? <StatusMessage type="empty">No warehouse transfers found.</StatusMessage> : null}
      </div>

      {transfers.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Transfer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td className="px-4 py-3 font-mono text-xs">{transfer.transferNumber}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(transfer.transferDate, "-")}</td>
                  <td className="px-4 py-3 text-ink">{transfer.item ? `${transfer.item.name}${transfer.item.sku ? ` (${transfer.item.sku})` : ""}` : transfer.itemId}</td>
                  <td className="px-4 py-3 text-steel">{transfer.fromWarehouse ? `${transfer.fromWarehouse.code} ${transfer.fromWarehouse.name}` : transfer.fromWarehouseId}</td>
                  <td className="px-4 py-3 text-steel">{transfer.toWarehouse ? `${transfer.toWarehouse.code} ${transfer.toWarehouse.name}` : transfer.toWarehouseId}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(transfer.quantity)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${warehouseTransferStatusBadgeClass(transfer.status)}`}>
                      {warehouseTransferStatusLabel(transfer.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/inventory/transfers/${transfer.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
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
