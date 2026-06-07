"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
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
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Inventory balances</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">Operational quantity on hand by tracked item and warehouse.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
          <Link href="/inventory/reports/stock-valuation" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Stock valuation
          </Link>
          <Link href={inventoryFifoPreviewUrl({})} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            FIFO preview
          </Link>
          <Link href="/inventory/reports/movement-summary" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Movement summary
          </Link>
          {canCreateAdjustment ? (
            <Link href="/inventory/adjustments/new" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              New adjustment
            </Link>
          ) : null}
          {canCreateTransfer ? (
            <Link href="/inventory/transfers/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              New transfer
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>
      <InventoryBalanceGuidance canCreateAdjustment={canCreateAdjustment} canCreateTransfer={canCreateTransfer} />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load inventory balances.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading inventory balances...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && balances.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-sm shadow-panel">
            <h2 className="font-semibold text-ink">No inventory balances found.</h2>
            <p className="mt-2 max-w-3xl leading-6 text-steel">
              Add a tracked item, then receive stock, approve an adjustment, or transfer stock into a warehouse to create an on-hand balance.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href="/items" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                View items
              </Link>
              {canCreateAdjustment ? (
                <Link href="/inventory/adjustments/new" className="rounded-md bg-palm px-3 py-2 text-center text-sm font-medium text-white hover:bg-palm-dark">
                  Create adjustment
                </Link>
              ) : null}
              {canCreateTransfer ? (
                <Link href="/inventory/transfers/new" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Create transfer
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {Object.keys(totalsByItem).length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {Object.entries(totalsByItem).map(([itemId, total]) => (
            <div key={itemId} className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
              <p className="text-xs font-medium uppercase tracking-wide text-steel">{total.sku ?? "Tracked item"}</p>
              <p className="mt-1 font-medium text-ink">{total.name}</p>
              <p className="mt-2 font-mono text-sm font-semibold text-ink">{formatInventoryQuantity(total.quantityUnits / 10000)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {balances.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
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
                    <td className="px-4 py-3 text-steel">{warehouseStatusLabel(balance.warehouse.status)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{display.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{display.averageUnitCost}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{display.inventoryValue}</td>
                    <td className="px-4 py-3 text-xs">
                      <Link href={inventoryFifoPreviewUrl({ itemId: balance.item.id, warehouseId: balance.warehouse.id })} className="font-medium text-palm hover:underline">
                        FIFO preview
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export function InventoryBalanceGuidance({ canCreateAdjustment, canCreateTransfer }: { canCreateAdjustment: boolean; canCreateTransfer: boolean }) {
  return (
    <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900 shadow-panel">
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
            <Link href="/inventory/adjustments/new" className="rounded-md bg-palm px-3 py-2 text-center text-sm font-medium text-white hover:bg-palm-dark">
              Create adjustment
            </Link>
          ) : null}
          {canCreateTransfer ? (
            <Link href="/inventory/transfers/new" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
              Create transfer
            </Link>
          ) : null}
          <Link href="/inventory/stock-movements" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            Stock movements
          </Link>
          <Link href={inventoryFifoPreviewUrl({})} className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            FIFO preview
          </Link>
          <Link href="/dashboard" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
