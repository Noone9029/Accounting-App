"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerInput,
  LedgerLoadingState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  inventoryFifoPreviewUrl,
  inventoryOperationalWarning,
  inventoryTraceabilityUrl,
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
  "PURCHASE_RETURN_OUT",
  "SALES_RETURN_IN",
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
  const canViewFifoPreview = can(PERMISSIONS.inventory.view);
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title="Stock movements"
        description="Operational stock ledger entries from opening balances, approvals, transfers, returns, and voids."
        actions={
          <>
            {canViewFifoPreview ? <LedgerButton href={inventoryFifoPreviewUrl({ itemId: filters.itemId || null, warehouseId: filters.warehouseId || null })}>FIFO preview</LedgerButton> : null}
            {canCreate ? <LedgerButton href="/inventory/stock-movements/new" variant="primary">New movement</LedgerButton> : null}
          </>
        }
      />

      <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>
      <StockMovementLedgerGuidance canCreate={canCreate} canViewFifoPreview={canViewFifoPreview} />

      <LedgerPageBody>
        <LedgerPanel>
          <form onSubmit={updateFilters}>
            <LedgerFilterBar>
              <LedgerFieldLabel>
                <LedgerFieldText>Item ID</LedgerFieldText>
                <LedgerInput name="itemId" defaultValue={filters.itemId} />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Warehouse ID</LedgerFieldText>
                <LedgerInput name="warehouseId" defaultValue={filters.warehouseId} />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>From</LedgerFieldText>
                <LedgerInput name="from" type="date" defaultValue={filters.from} />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>To</LedgerFieldText>
                <LedgerInput name="to" type="date" defaultValue={filters.to} />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Type</LedgerFieldText>
                <LedgerSelect name="type" defaultValue={filters.type}>
                  <option value="">All types</option>
                  {movementTypes.map((type) => (
                    <option key={type} value={type}>
                      {stockMovementTypeLabel(type)}
                    </option>
                  ))}
                </LedgerSelect>
              </LedgerFieldLabel>
              <LedgerButton type="submit">Filter</LedgerButton>
            </LedgerFilterBar>
          </form>
        </LedgerPanel>

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load stock movements.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading stock movements" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && organizationId && movements.length === 0 ? (
          <LedgerEmptyState
            title="No stock movements found."
            description="Stock movements appear after opening balances, purchase receipts, sales stock issues, explicit purchase returns, approved adjustments, warehouse transfers, or void reversals."
            action={
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {canCreate ? <LedgerButton href="/inventory/stock-movements/new" variant="primary">Add opening movement</LedgerButton> : null}
                {canCreateAdjustment ? <LedgerButton href="/inventory/adjustments/new">Create adjustment</LedgerButton> : null}
                {canCreateTransfer ? <LedgerButton href="/inventory/transfers/new">Create transfer</LedgerButton> : null}
              </div>
            }
          />
        ) : null}

        {movements.length > 0 ? (
          <LedgerDataTable minWidth="1220px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Unit cost</th>
                <th className="px-4 py-3">Tracking refs</th>
                <th className="px-4 py-3">Description</th>
                {canViewFifoPreview ? <th className="px-4 py-3">FIFO</th> : null}
                {canViewFifoPreview ? <th className="px-4 py-3">Traceability</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(movement.movementDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-steel">{stockMovementTypeLabel(movement.type)}</td>
                  <td className="px-4 py-3 text-steel">{stockMovementDirectionLabel(movement.type)}</td>
                  <td className="px-4 py-3 text-ink">{movement.item ? `${movement.item.name}${movement.item.sku ? ` (${movement.item.sku})` : ""}` : movement.itemId}</td>
                  <td className="px-4 py-3 text-steel">
                    {movement.warehouse ? `${movement.warehouse.code} ${movement.warehouse.name} (${warehouseStatusLabel(movement.warehouse.status)})` : movement.warehouseId}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(movement.quantity)}</td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{movement.unitCost ? formatInventoryQuantity(movement.unitCost) : "-"}</LedgerMoney></td>
                  <td className="px-4 py-3 text-xs text-steel">
                    {[movement.batch?.batchNumber, movement.serialNumber?.serialNumber, movement.binLocation?.code ?? movement.fromBinLocation?.code ?? movement.toBinLocation?.code]
                      .filter(Boolean)
                      .join(" / ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-steel">{movement.description ?? "-"}</td>
                  {canViewFifoPreview ? (
                    <td className="px-4 py-3 text-xs"><LedgerButton href={inventoryFifoPreviewUrl({ itemId: movement.itemId, warehouseId: movement.warehouseId })} size="sm">FIFO preview</LedgerButton></td>
                  ) : null}
                  {canViewFifoPreview ? (
                    <td className="px-4 py-3 text-xs"><LedgerButton href={inventoryTraceabilityUrl(movement.itemId)} size="sm">Traceability</LedgerButton></td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function StockMovementLedgerGuidance({ canCreate, canViewFifoPreview }: { canCreate: boolean; canViewFifoPreview: boolean }) {
  return (
    <LedgerSummaryBand tone="info">
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
              <p className="mt-1">Receipts, issues, returns, adjustments, transfers, and voids leave separate movement rows instead of rewriting history.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Cost fields</p>
              <p className="mt-1">Unit cost is operational and may be blank until cost data is available. It is not a financial posting by itself.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          {canCreate ? <LedgerButton href="/inventory/stock-movements/new" variant="primary">New movement</LedgerButton> : null}
          <LedgerButton href="/inventory/balances">Balances</LedgerButton>
          <LedgerButton href="/inventory/reports/movement-summary">Movement report</LedgerButton>
          {canViewFifoPreview ? <LedgerButton href={inventoryFifoPreviewUrl({})}>FIFO preview</LedgerButton> : null}
          <LedgerButton href="/dashboard">Dashboard</LedgerButton>
        </div>
      </div>
    </LedgerSummaryBand>
  );
}
