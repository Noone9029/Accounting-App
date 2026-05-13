"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatInventoryQuantity, inventoryBalanceDisplay, inventoryOperationalWarning, warehouseStatusLabel } from "@/lib/inventory";
import type { InventoryBalance } from "@/lib/types";

export default function InventoryBalancesPage() {
  const organizationId = useActiveOrganizationId();
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Inventory balances</h1>
        <p className="mt-1 text-sm text-steel">Operational quantity on hand by tracked item and warehouse.</p>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load inventory balances.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading inventory balances...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && balances.length === 0 ? <StatusMessage type="empty">No inventory balances found.</StatusMessage> : null}
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
