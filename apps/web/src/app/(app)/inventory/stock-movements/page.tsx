"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  inventoryOperationalWarning,
  stockMovementDirectionLabel,
  stockMovementTypeLabel,
  warehouseStatusLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { StockMovement, StockMovementType } from "@/lib/types";

const movementTypes: StockMovementType[] = [
  "OPENING_BALANCE",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "PURCHASE_RECEIPT_PLACEHOLDER",
  "SALES_ISSUE_PLACEHOLDER",
];

export default function StockMovementsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filters, setFilters] = useState(() => ({
    itemId: searchParams.get("itemId") ?? "",
    warehouseId: searchParams.get("warehouseId") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    type: searchParams.get("type") ?? "",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreate = can(PERMISSIONS.stockMovements.create);
  const canCreateAdjustment = can(PERMISSIONS.inventoryAdjustments.create);
  const canCreateTransfer = can(PERMISSIONS.warehouseTransfers.create);

  const path = useMemo(() => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) {
        query.set(key, value);
      }
    }
    return `/stock-movements${query.toString() ? `?${query.toString()}` : ""}`;
  }, [filters]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<StockMovement[]>(path)
      .then((result) => {
        if (!cancelled) {
          setMovements(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load stock movements.");
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
  }, [organizationId, path]);

  function updateFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFilters({
      itemId: String(formData.get("itemId") || ""),
      warehouseId: String(formData.get("warehouseId") || ""),
      from: String(formData.get("from") || ""),
      to: String(formData.get("to") || ""),
      type: String(formData.get("type") || ""),
    });
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Stock movements</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">Operational stock ledger entries from opening balances, approvals, transfers, and voids.</p>
        </div>
        {canCreate ? (
          <Link href="/inventory/stock-movements/new" className="self-start rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            New movement
          </Link>
        ) : null}
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>
      <StockMovementLedgerGuidance canCreate={canCreate} />

      <form onSubmit={updateFilters} className="mb-5 grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-panel md:grid-cols-6">
        <input name="itemId" defaultValue={filters.itemId} placeholder="Item ID" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        <input name="warehouseId" defaultValue={filters.warehouseId} placeholder="Warehouse ID" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        <input name="from" type="date" defaultValue={filters.from} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        <input name="to" type="date" defaultValue={filters.to} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        <select name="type" defaultValue={filters.type} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
          <option value="">All types</option>
          {movementTypes.map((type) => (
            <option key={type} value={type}>
              {stockMovementTypeLabel(type)}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Filter
        </button>
      </form>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load stock movements.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading stock movements...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && movements.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-sm shadow-panel">
            <h2 className="font-semibold text-ink">No stock movements found.</h2>
            <p className="mt-2 max-w-3xl leading-6 text-steel">
              Stock movements appear after opening balances, purchase receipts, sales stock issues, approved adjustments, warehouse transfers, or void reversals.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {canCreate ? (
                <Link href="/inventory/stock-movements/new" className="rounded-md bg-palm px-3 py-2 text-center text-sm font-medium text-white hover:bg-palm-dark">
                  Add opening movement
                </Link>
              ) : null}
              {canCreateAdjustment ? (
                <Link href="/inventory/adjustments/new" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
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

      {movements.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Unit cost</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(movement.movementDate, "-")}</td>
                  <td className="px-4 py-3 text-steel">{stockMovementTypeLabel(movement.type)}</td>
                  <td className="px-4 py-3 text-steel">{stockMovementDirectionLabel(movement.type)}</td>
                  <td className="px-4 py-3 text-ink">{movement.item ? `${movement.item.name}${movement.item.sku ? ` (${movement.item.sku})` : ""}` : movement.itemId}</td>
                  <td className="px-4 py-3 text-steel">
                    {movement.warehouse ? `${movement.warehouse.code} ${movement.warehouse.name} (${warehouseStatusLabel(movement.warehouse.status)})` : movement.warehouseId}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(movement.quantity)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{movement.unitCost ? formatInventoryQuantity(movement.unitCost) : "-"}</td>
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

export function StockMovementLedgerGuidance({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">How to read the stock ledger</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <p className="font-semibold text-ink">Direction</p>
              <p className="mt-1">In increases on-hand quantity. Out decreases on-hand quantity for the item and warehouse shown.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">References</p>
              <p className="mt-1">Receipts, issues, adjustments, transfers, and voids leave separate movement rows instead of rewriting history.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Cost fields</p>
              <p className="mt-1">Unit cost is operational and may be blank until cost data is available. It is not a financial posting by itself.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          {canCreate ? (
            <Link href="/inventory/stock-movements/new" className="rounded-md bg-palm px-3 py-2 text-center text-sm font-medium text-white hover:bg-palm-dark">
              New movement
            </Link>
          ) : null}
          <Link href="/inventory/balances" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            Balances
          </Link>
          <Link href="/inventory/reports/movement-summary" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            Movement report
          </Link>
          <Link href="/dashboard" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
