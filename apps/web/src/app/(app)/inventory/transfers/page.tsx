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
import { formatInventoryQuantity, inventoryOperationalWarning, warehouseTransferStatusLabel } from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { WarehouseTransfer } from "@/lib/types";

function transferStatusTone(status: WarehouseTransfer["status"]): LedgerStatusTone {
  return status === "POSTED" ? "success" : "danger";
}

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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title="Warehouse transfers"
        description="Posted operational transfers between active warehouses."
        actions={canCreate ? <LedgerButton href="/inventory/transfers/new" variant="primary">New transfer</LedgerButton> : null}
      />

      <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load warehouse transfers.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading warehouse transfers" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && organizationId && transfers.length === 0 ? <LedgerEmptyState title="No warehouse transfers found." /> : null}

        {transfers.length > 0 ? (
          <LedgerDataTable minWidth="1060px">
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
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(transfer.transferDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-ink">{transfer.item ? `${transfer.item.name}${transfer.item.sku ? ` (${transfer.item.sku})` : ""}` : transfer.itemId}</td>
                  <td className="px-4 py-3 text-steel">{transfer.fromWarehouse ? `${transfer.fromWarehouse.code} ${transfer.fromWarehouse.name}` : transfer.fromWarehouseId}</td>
                  <td className="px-4 py-3 text-steel">{transfer.toWarehouse ? `${transfer.toWarehouse.code} ${transfer.toWarehouse.name}` : transfer.toWarehouseId}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(transfer.quantity)}</td>
                  <td className="px-4 py-3"><LedgerStatusBadge tone={transferStatusTone(transfer.status)}>{warehouseTransferStatusLabel(transfer.status)}</LedgerStatusBadge></td>
                  <td className="px-4 py-3">
                    <LedgerButton href={`/inventory/transfers/${transfer.id}`} size="sm" aria-label={`View transfer ${transfer.transferNumber}`}>
                      View
                    </LedgerButton>
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
