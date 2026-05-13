"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  canApproveInventoryAdjustment,
  canEditInventoryAdjustment,
  canVoidInventoryAdjustment,
  formatInventoryQuantity,
  inventoryAdjustmentStatusBadgeClass,
  inventoryAdjustmentStatusLabel,
  inventoryAdjustmentTypeLabel,
  inventoryOperationalWarning,
  stockMovementTypeLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { InventoryAdjustment } from "@/lib/types";

export default function InventoryAdjustmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [adjustment, setAdjustment] = useState<InventoryAdjustment | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canCreate = can(PERMISSIONS.inventoryAdjustments.create);
  const canApprove = can(PERMISSIONS.inventoryAdjustments.approve);
  const canVoid = can(PERMISSIONS.inventoryAdjustments.void);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<InventoryAdjustment>(`/inventory-adjustments/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setAdjustment(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load inventory adjustment.");
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

  async function approveAdjustment() {
    if (!adjustment) {
      return;
    }
    setActionId("approve");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<InventoryAdjustment>(`/inventory-adjustments/${adjustment.id}/approve`, { method: "POST" });
      setAdjustment(updated);
      setSuccess(`${updated.adjustmentNumber} has been approved.`);
      setReloadToken((current) => current + 1);
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Unable to approve inventory adjustment.");
    } finally {
      setActionId("");
    }
  }

  async function voidAdjustment() {
    if (!adjustment) {
      return;
    }
    setActionId("void");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<InventoryAdjustment>(`/inventory-adjustments/${adjustment.id}/void`, { method: "POST" });
      setAdjustment(updated);
      setSuccess(`${updated.adjustmentNumber} has been voided.`);
      setReloadToken((current) => current + 1);
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : "Unable to void inventory adjustment.");
    } finally {
      setActionId("");
    }
  }

  async function deleteAdjustment() {
    if (!adjustment || !window.confirm(`Delete ${adjustment.adjustmentNumber}?`)) {
      return;
    }
    setActionId("delete");
    setError("");
    setSuccess("");
    try {
      await apiRequest<{ deleted: boolean }>(`/inventory-adjustments/${adjustment.id}`, { method: "DELETE" });
      router.push("/inventory/adjustments");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete inventory adjustment.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{adjustment?.adjustmentNumber ?? "Inventory adjustment"}</h1>
          <p className="mt-1 text-sm text-steel">Adjustment approval state and linked stock movement.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory/adjustments" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {adjustment && canCreate && canEditInventoryAdjustment(adjustment.status) ? (
            <Link href={`/inventory/adjustments/${adjustment.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Edit
            </Link>
          ) : null}
          {adjustment && canCreate && canEditInventoryAdjustment(adjustment.status) ? (
            <button type="button" disabled={actionId === "delete"} onClick={() => void deleteAdjustment()} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {actionId === "delete" ? "Deleting..." : "Delete"}
            </button>
          ) : null}
          {adjustment && canApprove && canApproveInventoryAdjustment(adjustment.status) ? (
            <button type="button" disabled={actionId === "approve"} onClick={() => void approveAdjustment()} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {actionId === "approve" ? "Approving..." : "Approve"}
            </button>
          ) : null}
          {adjustment && canVoid && canVoidInventoryAdjustment(adjustment.status) ? (
            <button type="button" disabled={actionId === "void"} onClick={() => void voidAdjustment()} className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {actionId === "void" ? "Voiding..." : "Void"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load inventory adjustment details.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading inventory adjustment...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {adjustment ? (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Status" value={inventoryAdjustmentStatusLabel(adjustment.status)} />
            <SummaryCard label="Type" value={inventoryAdjustmentTypeLabel(adjustment.type)} />
            <SummaryCard label="Quantity" value={formatInventoryQuantity(adjustment.quantity)} />
            <SummaryCard label="Date" value={formatOptionalDate(adjustment.adjustmentDate, "-")} />
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Detail label="Item" value={adjustment.item ? `${adjustment.item.name}${adjustment.item.sku ? ` (${adjustment.item.sku})` : ""}` : adjustment.itemId} />
              <Detail label="Warehouse" value={adjustment.warehouse ? `${adjustment.warehouse.code} ${adjustment.warehouse.name}` : adjustment.warehouseId} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-steel">Status</p>
                <span className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-medium ${inventoryAdjustmentStatusBadgeClass(adjustment.status)}`}>
                  {inventoryAdjustmentStatusLabel(adjustment.status)}
                </span>
              </div>
              <Detail label="Unit cost" value={adjustment.unitCost ? formatInventoryQuantity(adjustment.unitCost) : "-"} />
              <Detail label="Total cost" value={adjustment.totalCost ? formatInventoryQuantity(adjustment.totalCost) : "-"} />
              <Detail label="Approved at" value={formatOptionalDate(adjustment.approvedAt, "-")} />
            </div>
            {adjustment.reason ? <p className="mt-4 text-sm text-steel">{adjustment.reason}</p> : null}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Linked stock movements</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <MovementDetail label="Approval movement" movement={adjustment.stockMovement} />
              <MovementDetail label="Void movement" movement={adjustment.voidStockMovement} />
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

function MovementDetail({
  label,
  movement,
}: {
  label: string;
  movement: InventoryAdjustment["stockMovement"];
}) {
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
