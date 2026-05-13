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
  canVoidWarehouseTransfer,
  formatInventoryQuantity,
  inventoryOperationalWarning,
  stockMovementTypeLabel,
  warehouseTransferStatusBadgeClass,
  warehouseTransferStatusLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { WarehouseTransfer } from "@/lib/types";

type TransferMovement =
  | WarehouseTransfer["fromStockMovement"]
  | WarehouseTransfer["toStockMovement"]
  | WarehouseTransfer["voidFromStockMovement"]
  | WarehouseTransfer["voidToStockMovement"];

export default function WarehouseTransferDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [transfer, setTransfer] = useState<WarehouseTransfer | null>(null);
  const [loading, setLoading] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canVoid = can(PERMISSIONS.warehouseTransfers.void);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<WarehouseTransfer>(`/warehouse-transfers/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setTransfer(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load warehouse transfer.");
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
  }, [organizationId, params.id, reloadToken]);

  async function voidTransfer() {
    if (!transfer) {
      return;
    }
    setVoiding(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<WarehouseTransfer>(`/warehouse-transfers/${transfer.id}/void`, { method: "POST" });
      setTransfer(updated);
      setSuccess(`${updated.transferNumber} has been voided.`);
      setReloadToken((current) => current + 1);
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : "Unable to void warehouse transfer.");
    } finally {
      setVoiding(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{transfer?.transferNumber ?? "Warehouse transfer"}</h1>
          <p className="mt-1 text-sm text-steel">Transfer state and linked stock movements.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory/transfers" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {transfer && canVoid && canVoidWarehouseTransfer(transfer.status) ? (
            <button type="button" disabled={voiding} onClick={() => void voidTransfer()} className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {voiding ? "Voiding..." : "Void"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load warehouse transfer details.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading warehouse transfer...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {transfer ? (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Quantity" value={formatInventoryQuantity(transfer.quantity)} />
            <SummaryCard label="Date" value={formatOptionalDate(transfer.transferDate, "-")} />
            <SummaryCard label="Status" value={warehouseTransferStatusLabel(transfer.status)} />
            <SummaryCard label="Posted at" value={formatOptionalDate(transfer.postedAt, "-")} />
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Detail label="Item" value={transfer.item ? `${transfer.item.name}${transfer.item.sku ? ` (${transfer.item.sku})` : ""}` : transfer.itemId} />
              <Detail label="From warehouse" value={transfer.fromWarehouse ? `${transfer.fromWarehouse.code} ${transfer.fromWarehouse.name}` : transfer.fromWarehouseId} />
              <Detail label="To warehouse" value={transfer.toWarehouse ? `${transfer.toWarehouse.code} ${transfer.toWarehouse.name}` : transfer.toWarehouseId} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-steel">Status</p>
                <span className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-medium ${warehouseTransferStatusBadgeClass(transfer.status)}`}>
                  {warehouseTransferStatusLabel(transfer.status)}
                </span>
              </div>
              <Detail label="Unit cost" value={transfer.unitCost ? formatInventoryQuantity(transfer.unitCost) : "-"} />
              <Detail label="Total cost" value={transfer.totalCost ? formatInventoryQuantity(transfer.totalCost) : "-"} />
            </div>
            {transfer.description ? <p className="mt-4 text-sm text-steel">{transfer.description}</p> : null}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Linked stock movements</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <MovementDetail label="Source movement" movement={transfer.fromStockMovement} />
              <MovementDetail label="Destination movement" movement={transfer.toStockMovement} />
              <MovementDetail label="Void source movement" movement={transfer.voidFromStockMovement} />
              <MovementDetail label="Void destination movement" movement={transfer.voidToStockMovement} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-2 font-mono text-sm font-semibold text-ink">{value}</p>
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

function MovementDetail({ label, movement }: { label: string; movement: TransferMovement }) {
  return (
    <div className="rounded-md border border-slate-100 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      {movement ? (
        <div className="mt-2 space-y-1 text-sm text-ink">
          <p>{stockMovementTypeLabel(movement.type)}</p>
          <p className="font-mono text-xs text-steel">{movement.id}</p>
          <p className="text-steel">{formatOptionalDate(movement.movementDate, "-")}</p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-steel">-</p>
      )}
    </div>
  );
}
