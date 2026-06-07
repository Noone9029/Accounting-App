"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  inventoryBalanceDisplay,
  inventoryAdjustmentStatusLabel,
  inventoryFifoPreviewUrl,
  inventoryOperationalWarning,
  stockMovementTypeLabel,
  warehouseTransferStatusLabel,
  warehouseStatusBadgeClass,
  warehouseStatusLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { InventoryAdjustment, InventoryBalance, StockMovement, Warehouse, WarehouseTransfer } from "@/lib/types";

export default function WarehouseDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canViewAdjustments = can(PERMISSIONS.inventoryAdjustments.view);
  const canViewTransfers = can(PERMISSIONS.warehouseTransfers.view);
  const canViewFifoPreview = can(PERMISSIONS.inventory.view);
  const canCreateAdjustment = can(PERMISSIONS.inventoryAdjustments.create);
  const canCreateTransfer = can(PERMISSIONS.warehouseTransfers.create);

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
      canViewAdjustments ? apiRequest<InventoryAdjustment[]>("/inventory-adjustments") : Promise.resolve([]),
      canViewTransfers ? apiRequest<WarehouseTransfer[]>("/warehouse-transfers") : Promise.resolve([]),
    ])
      .then(([warehouseResult, balanceResult, movementResult, adjustmentResult, transferResult]) => {
        if (!cancelled) {
          setWarehouse(warehouseResult);
          setBalances(balanceResult);
          setMovements(movementResult.slice(0, 20));
          setAdjustments(adjustmentResult.filter((adjustment) => adjustment.warehouseId === params.id).slice(0, 10));
          setTransfers(
            transferResult
              .filter((transfer) => transfer.fromWarehouseId === params.id || transfer.toWarehouseId === params.id)
              .slice(0, 10),
          );
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
  }, [canViewAdjustments, canViewTransfers, organizationId, params.id]);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{warehouse ? `${warehouse.code} ${warehouse.name}` : "Warehouse"}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">Warehouse details, stock balances, and recent operational movements.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewFifoPreview ? (
            <Link href={`/inventory/bin-locations?warehouseId=${warehouse?.id ?? params.id}`} className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Bin locations
            </Link>
          ) : null}
          <Link href="/inventory/warehouses" className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
        </div>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load warehouse details.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading warehouse...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {warehouse ? (
        <div className="mt-5 space-y-5">
          <WarehouseInventoryGuidance
            warehouse={warehouse}
            canCreateAdjustment={canCreateAdjustment}
            canCreateTransfer={canCreateTransfer}
            canViewFifoPreview={canViewFifoPreview}
            hasBalances={balances.length > 0}
            hasMovements={movements.length > 0}
          />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
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
      ) : warehouse && !loading ? (
        <InventoryEmptyPanel
          title="No stock balances in this warehouse yet."
          body="Post a purchase receipt, approve an adjustment, or transfer stock into this warehouse to build an on-hand balance."
          actions={[
            canCreateAdjustment ? { href: "/inventory/adjustments/new", label: "Create adjustment" } : null,
            canCreateTransfer ? { href: "/inventory/transfers/new", label: "Create transfer" } : null,
          ]}
        />
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
      ) : warehouse && !loading ? (
        <InventoryEmptyPanel
          title="No stock movements recorded here yet."
          body="Movements will appear after receipts, stock issues, approved adjustments, transfers, or void reversals affect this warehouse."
          actions={[{ href: "/inventory/stock-movements", label: "Open stock ledger" }]}
        />
      ) : null}

      {adjustments.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Adjustment</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adjustments.map((adjustment) => (
                <tr key={adjustment.id}>
                  <td className="px-4 py-3 font-mono text-xs">{adjustment.adjustmentNumber}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(adjustment.adjustmentDate, "-")}</td>
                  <td className="px-4 py-3 text-ink">{adjustment.item?.name ?? adjustment.itemId}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(adjustment.quantity)}</td>
                  <td className="px-4 py-3 text-steel">{inventoryAdjustmentStatusLabel(adjustment.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {transfers.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Transfer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td className="px-4 py-3 font-mono text-xs">{transfer.transferNumber}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(transfer.transferDate, "-")}</td>
                  <td className="px-4 py-3 text-ink">{transfer.item?.name ?? transfer.itemId}</td>
                  <td className="px-4 py-3 text-steel">{transfer.fromWarehouse?.code ?? transfer.fromWarehouseId}</td>
                  <td className="px-4 py-3 text-steel">{transfer.toWarehouse?.code ?? transfer.toWarehouseId}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(transfer.quantity)}</td>
                  <td className="px-4 py-3 text-steel">{warehouseTransferStatusLabel(transfer.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export function WarehouseInventoryGuidance({
  warehouse,
  canCreateAdjustment,
  canCreateTransfer,
  canViewFifoPreview,
  hasBalances,
  hasMovements,
}: {
  warehouse: Warehouse;
  canCreateAdjustment: boolean;
  canCreateTransfer: boolean;
  canViewFifoPreview: boolean;
  hasBalances: boolean;
  hasMovements: boolean;
}) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">How to read this warehouse</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <p className="font-semibold text-ink">Quantity on hand</p>
              <p className="mt-1">The balance is derived from approved operational stock movements for {warehouse.code}.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">In and out</p>
              <p className="mt-1">Receipts, increases, and transfer-ins add stock. Issues, decreases, and transfer-outs reduce stock.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Value guidance</p>
              <p className="mt-1">Average cost and value are operational estimates unless a manual financial posting action is shown and used.</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-emerald-900">
            {hasBalances || hasMovements
              ? "Use the tables below to trace which item and movement changed this warehouse."
              : "This warehouse has no stock activity yet. Start with a receipt, adjustment, or transfer."}
          </p>
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
          <Link href={`/inventory/stock-movements?warehouseId=${warehouse.id}`} className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            Stock movements
          </Link>
          {canViewFifoPreview ? (
            <Link href={inventoryFifoPreviewUrl({ warehouseId: warehouse.id })} className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
              FIFO preview
            </Link>
          ) : null}
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

function InventoryEmptyPanel({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions: Array<{ href: string; label: string } | null>;
}) {
  const visibleActions = actions.filter(Boolean) as Array<{ href: string; label: string }>;
  return (
    <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-white p-5 text-sm shadow-panel">
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-3xl leading-6 text-steel">{body}</p>
      {visibleActions.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {visibleActions.map((action) => (
            <Link key={action.href} href={action.href} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
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
