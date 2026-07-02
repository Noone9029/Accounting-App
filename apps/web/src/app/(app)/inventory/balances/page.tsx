"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatInventoryQuantity, inventoryBalanceDisplay, inventoryFifoPreviewUrl, inventoryOperationalWarning, warehouseStatusLabel } from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { InventoryBalance } from "@/lib/types";

export default function InventoryBalancesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canCreateAdjustment = can(PERMISSIONS.inventoryAdjustments.create);
  const canCreateTransfer = can(PERMISSIONS.warehouseTransfers.create);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<InventoryBalance[]>("/inventory/balances")
      .then((result) => {
        if (!cancelled) {
          setBalances(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load inventory balances.");
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

  const totalsByItem = balances.reduce<Record<string, { name: string; sku: string | null; quantityUnits: number }>>((totals, balance) => {
    const key = balance.item.id;
    totals[key] = totals[key] ?? { name: balance.item.name, sku: balance.item.sku, quantityUnits: 0 };
    totals[key].quantityUnits += Number.parseFloat(balance.quantityOnHand) * 10000;
    return totals;
  }, {});

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory / Stock review"
        title="Inventory balances"
        description="Operational quantity on hand by tracked item and warehouse."
        actions={
          <>
            <LedgerButton href="/inventory/reports/stock-valuation">
              Stock valuation
            </LedgerButton>
            <LedgerButton href={inventoryFifoPreviewUrl({})}>
              FIFO preview
            </LedgerButton>
            <LedgerButton href="/inventory/reports/movement-summary">
              Movement summary
            </LedgerButton>
            {canCreateAdjustment ? (
              <LedgerButton href="/inventory/adjustments/new">
                New adjustment
              </LedgerButton>
            ) : null}
            {canCreateTransfer ? (
              <LedgerButton href="/inventory/transfers/new" variant="primary">
                New transfer
              </LedgerButton>
            ) : null}
          </>
        }
      />

      <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>
      <InventoryBalanceGuidance canCreateAdjustment={canCreateAdjustment} canCreateTransfer={canCreateTransfer} />

      <LedgerPageBody>
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load inventory balances.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading inventory balances...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && balances.length === 0 ? (
          <LedgerEmptyState
            title="No inventory balances found"
            description="Add a tracked item, then receive stock, approve an adjustment, or transfer stock into a warehouse to create an on-hand balance."
            action={
              <div className="flex flex-col justify-center gap-2 sm:flex-row sm:flex-wrap">
                <LedgerButton href="/items">
                  View items
                </LedgerButton>
                {canCreateAdjustment ? (
                  <LedgerButton href="/inventory/adjustments/new" variant="primary">
                    Create adjustment
                  </LedgerButton>
                ) : null}
                {canCreateTransfer ? (
                  <LedgerButton href="/inventory/transfers/new">
                    Create transfer
                  </LedgerButton>
                ) : null}
              </div>
            }
          />
        ) : null}

        {Object.keys(totalsByItem).length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Object.entries(totalsByItem).map(([itemId, total]) => (
              <LedgerStatCard
                key={itemId}
                label={total.sku ?? "Tracked item"}
                value={formatInventoryQuantity(total.quantityUnits / 10000)}
                detail={total.name}
              />
            ))}
          </div>
        ) : null}

        {balances.length > 0 ? (
          <LedgerDataTable minWidth="980px">
            <thead className="ledger-table-header">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Warehouse status</th>
                <th className="px-4 py-3 text-right">Quantity on hand</th>
                <th className="px-4 py-3 text-right">Average unit cost</th>
                <th className="px-4 py-3 text-right">Inventory value</th>
                <th className="px-4 py-3">FIFO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {balances.map((balance) => {
                const display = inventoryBalanceDisplay(balance);
                return (
                  <tr key={`${balance.item.id}:${balance.warehouse.id}`}>
                    <td className="px-4 py-3 font-medium text-ink">{balance.item.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-steel">{balance.item.sku ?? "-"}</td>
                    <td className="px-4 py-3 text-steel">
                      {balance.warehouse.code} {balance.warehouse.name}
                    </td>
                    <td className="px-4 py-3">
                      <LedgerStatusBadge tone={balance.warehouse.status === "ACTIVE" ? "success" : "neutral"}>
                        {warehouseStatusLabel(balance.warehouse.status)}
                      </LedgerStatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{display.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{display.averageUnitCost}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{display.inventoryValue}</td>
                    <td className="px-4 py-3 text-xs">
                      <LedgerButton
                        href={inventoryFifoPreviewUrl({ itemId: balance.item.id, warehouseId: balance.warehouse.id })}
                        size="sm"
                        variant="quiet"
                        aria-label={`Open FIFO preview for ${balance.item.name} in ${balance.warehouse.code} ${balance.warehouse.name}`}
                      >
                        FIFO preview
                      </LedgerButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </LedgerDataTable>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function InventoryBalanceGuidance({ canCreateAdjustment, canCreateTransfer }: { canCreateAdjustment: boolean; canCreateTransfer: boolean }) {
  return (
    <LedgerPanel className="mb-5 border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">How to read balances</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <p className="font-semibold text-ink">Quantity on hand</p>
              <p className="mt-1">The current operational stock quantity for each tracked item in each warehouse.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Average unit cost</p>
              <p className="mt-1">A moving-average operational estimate. Blank values mean cost data is not complete yet.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Inventory value</p>
              <p className="mt-1">An estimate for stock review, not a financial statement value unless explicitly posted through manual accounting actions.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          {canCreateAdjustment ? (
            <LedgerButton href="/inventory/adjustments/new" variant="primary">
              Create adjustment
            </LedgerButton>
          ) : null}
          {canCreateTransfer ? (
            <LedgerButton href="/inventory/transfers/new">
              Create transfer
            </LedgerButton>
          ) : null}
          <LedgerButton href="/inventory/stock-movements">
            Stock movements
          </LedgerButton>
          <LedgerButton href={inventoryFifoPreviewUrl({})}>
            FIFO preview
          </LedgerButton>
          <LedgerButton href="/dashboard">
            Dashboard
          </LedgerButton>
        </div>
      </div>
    </LedgerPanel>
  );
}
