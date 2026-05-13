"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  inventoryBalanceDisplay,
  inventoryOperationalWarning,
  stockMovementTypeLabel,
  warehouseStatusBadgeClass,
  warehouseStatusLabel,
} from "@/lib/inventory";
import type { InventoryBalance, StockMovement, Warehouse } from "@/lib/types";

export default function WarehouseDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<Warehouse>(`/warehouses/${params.id}`),
      apiRequest<InventoryBalance[]>(`/inventory/balances?warehouseId=${params.id}`),
      apiRequest<StockMovement[]>(`/stock-movements?warehouseId=${params.id}`),
    ])
      .then(([warehouseResult, balanceResult, movementResult]) => {
        if (!cancelled) {
          setWarehouse(warehouseResult);
          setBalances(balanceResult);
          setMovements(movementResult.slice(0, 20));
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load warehouse.");
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
  }, [organizationId, params.id]);

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{warehouse ? `${warehouse.code} ${warehouse.name}` : "Warehouse"}</h1>
          <p className="mt-1 text-sm text-steel">Warehouse details, stock balances, and recent operational movements.</p>
        </div>
        <Link href="/inventory/warehouses" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load warehouse details.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading warehouse...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {warehouse ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Detail label="Code" value={warehouse.code} />
            <Detail label="Name" value={warehouse.name} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-steel">Status</p>
              <span className={`mt-1 inline-flex rounded-md px-2 py-1 text-xs font-medium ${warehouseStatusBadgeClass(warehouse.status)}`}>
                {warehouseStatusLabel(warehouse.status)}
              </span>
            </div>
            <Detail label="Default" value={warehouse.isDefault ? "Yes" : "No"} />
            <Detail label="Address" value={warehouse.addressLine1 ?? "-"} />
            <Detail label="City" value={warehouse.city ?? "-"} />
            <Detail label="Country" value={warehouse.countryCode} />
            <Detail label="Phone" value={warehouse.phone ?? "-"} />
          </div>
        </div>
      ) : null}

      {balances.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Quantity on hand</th>
                <th className="px-4 py-3 text-right">Average cost</th>
                <th className="px-4 py-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {balances.map((balance) => {
                const display = inventoryBalanceDisplay(balance);
                return (
                  <tr key={`${balance.item.id}:${balance.warehouse.id}`}>
                    <td className="px-4 py-3 font-medium text-ink">{balance.item.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-steel">{balance.item.sku ?? "-"}</td>
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

      {movements.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(movement.movementDate, "-")}</td>
                  <td className="px-4 py-3 text-steel">{stockMovementTypeLabel(movement.type)}</td>
                  <td className="px-4 py-3 text-ink">{movement.item ? movement.item.name : movement.itemId}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(movement.quantity)}</td>
                  <td className="px-4 py-3 text-steel">{movement.description ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}
