"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerLoadingState,
  LedgerMetadataRow,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  inventoryAdjustmentStatusLabel,
  inventoryBalanceDisplay,
  inventoryFifoPreviewUrl,
  inventoryOperationalWarning,
  stockMovementTypeLabel,
  warehouseStatusLabel,
  warehouseTransferStatusLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { InventoryAdjustment, InventoryBalance, StockMovement, Warehouse, WarehouseTransfer } from "@/lib/types";

function warehouseStatusTone(status: Warehouse["status"]): LedgerStatusTone {
  return status === "ACTIVE" ? "success" : "draft";
}

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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title={warehouse ? `${warehouse.code} ${warehouse.name}` : "Warehouse"}
        description="Warehouse details, stock balances, and recent operational movements."
        badge={warehouse ? <LedgerStatusBadge tone={warehouseStatusTone(warehouse.status)}>{warehouseStatusLabel(warehouse.status)}</LedgerStatusBadge> : null}
        actions={
          <>
            {canViewFifoPreview ? <LedgerButton href={`/inventory/bin-locations?warehouseId=${warehouse?.id ?? params.id}`}>Bin locations</LedgerButton> : null}
            <LedgerButton href="/inventory/warehouses">Back</LedgerButton>
          </>
        }
      />

      <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load warehouse details.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading warehouse" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

        {warehouse ? (
          <>
            <WarehouseInventoryGuidance
              warehouse={warehouse}
              canCreateAdjustment={canCreateAdjustment}
              canCreateTransfer={canCreateTransfer}
              canViewFifoPreview={canViewFifoPreview}
              hasBalances={balances.length > 0}
              hasMovements={movements.length > 0}
            />

            <LedgerSection title="Warehouse profile" description="Location metadata used by operational stock movements.">
              <LedgerMetadataRow
                items={[
                  { label: "Code", value: warehouse.code },
                  { label: "Name", value: warehouse.name },
                  { label: "Status", value: <LedgerStatusBadge tone={warehouseStatusTone(warehouse.status)}>{warehouseStatusLabel(warehouse.status)}</LedgerStatusBadge> },
                  { label: "Default", value: warehouse.isDefault ? "Yes" : "No" },
                  { label: "Address", value: warehouse.addressLine1 ?? "-" },
                  { label: "City", value: warehouse.city ?? "-" },
                  { label: "Country", value: warehouse.countryCode },
                  { label: "Phone", value: warehouse.phone ?? "-" },
                ]}
              />
            </LedgerSection>
          </>
        ) : null}

        {balances.length > 0 ? (
          <LedgerSection title="Balances" description="On-hand quantity and operational value by item in this warehouse.">
            <LedgerDataTable minWidth="820px">
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
                      <td className="px-4 py-3 text-right"><LedgerMoney>{display.averageUnitCost}</LedgerMoney></td>
                      <td className="px-4 py-3 text-right"><LedgerMoney>{display.inventoryValue}</LedgerMoney></td>
                    </tr>
                  );
                })}
              </tbody>
            </LedgerDataTable>
          </LedgerSection>
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
          <LedgerSection title="Recent stock movements" description="Latest operational stock movement rows affecting this warehouse.">
            <LedgerDataTable minWidth="840px">
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
                    <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(movement.movementDate, "-")}</LedgerDate></td>
                    <td className="px-4 py-3 text-steel">{stockMovementTypeLabel(movement.type)}</td>
                    <td className="px-4 py-3 text-ink">{movement.item ? movement.item.name : movement.itemId}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(movement.quantity)}</td>
                    <td className="px-4 py-3 text-steel">{movement.description ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </LedgerDataTable>
          </LedgerSection>
        ) : warehouse && !loading ? (
          <InventoryEmptyPanel
            title="No stock movements recorded here yet."
            body="Movements will appear after receipts, stock issues, approved adjustments, transfers, or void reversals affect this warehouse."
            actions={[{ href: "/inventory/stock-movements", label: "Open stock ledger" }]}
          />
        ) : null}

        {adjustments.length > 0 ? (
          <LedgerSection title="Recent adjustments" description="Latest inventory adjustment rows for this warehouse.">
            <LedgerDataTable minWidth="760px">
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
                    <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(adjustment.adjustmentDate, "-")}</LedgerDate></td>
                    <td className="px-4 py-3 text-ink">{adjustment.item?.name ?? adjustment.itemId}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(adjustment.quantity)}</td>
                    <td className="px-4 py-3 text-steel">{inventoryAdjustmentStatusLabel(adjustment.status)}</td>
                  </tr>
                ))}
              </tbody>
            </LedgerDataTable>
          </LedgerSection>
        ) : null}

        {transfers.length > 0 ? (
          <LedgerSection title="Recent transfers" description="Latest transfer rows moving stock into or out of this warehouse.">
            <LedgerDataTable minWidth="860px">
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
                    <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(transfer.transferDate, "-")}</LedgerDate></td>
                    <td className="px-4 py-3 text-ink">{transfer.item?.name ?? transfer.itemId}</td>
                    <td className="px-4 py-3 text-steel">{transfer.fromWarehouse?.code ?? transfer.fromWarehouseId}</td>
                    <td className="px-4 py-3 text-steel">{transfer.toWarehouse?.code ?? transfer.toWarehouseId}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(transfer.quantity)}</td>
                    <td className="px-4 py-3 text-steel">{warehouseTransferStatusLabel(transfer.status)}</td>
                  </tr>
                ))}
              </tbody>
            </LedgerDataTable>
          </LedgerSection>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
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
    <LedgerSummaryBand tone="info">
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
          <p className="mt-3 text-xs leading-5">
            {hasBalances || hasMovements
              ? "Use the tables below to trace which item and movement changed this warehouse."
              : "This warehouse has no stock activity yet. Start with a receipt, adjustment, or transfer."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          {canCreateAdjustment ? <LedgerButton href="/inventory/adjustments/new" variant="primary">Create adjustment</LedgerButton> : null}
          {canCreateTransfer ? <LedgerButton href="/inventory/transfers/new">Create transfer</LedgerButton> : null}
          <LedgerButton href={`/inventory/stock-movements?warehouseId=${warehouse.id}`}>Stock movements</LedgerButton>
          {canViewFifoPreview ? <LedgerButton href={inventoryFifoPreviewUrl({ warehouseId: warehouse.id })}>FIFO preview</LedgerButton> : null}
          <LedgerButton href="/inventory/reports/movement-summary">Movement report</LedgerButton>
          <LedgerButton href="/dashboard">Dashboard</LedgerButton>
        </div>
      </div>
    </LedgerSummaryBand>
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
    <LedgerEmptyState
      title={title}
      description={body}
      action={
        visibleActions.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {visibleActions.map((action) => (
              <LedgerButton key={action.href} href={action.href}>{action.label}</LedgerButton>
            ))}
          </div>
        ) : null
      }
    />
  );
}
