"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDate,
  LedgerLoadingState,
  LedgerMetadataRow,
  LedgerMetricGrid,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { LedgerActionDialog } from "@/components/ui-ledger/action-dialog";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  canApproveInventoryAdjustment,
  canEditInventoryAdjustment,
  canVoidInventoryAdjustment,
  formatInventoryQuantity,
  inventoryAdjustmentStatusLabel,
  inventoryAdjustmentTypeLabel,
  inventoryOperationalWarning,
  stockMovementTypeLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { InventoryAdjustment } from "@/lib/types";

function adjustmentStatusTone(status: InventoryAdjustment["status"]): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "warning";
    case "APPROVED":
      return "success";
    case "VOIDED":
      return "danger";
  }
}

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  async function deleteAdjustment(): Promise<boolean> {
    if (!adjustment) {
      return false;
    }
    setActionId("delete");
    setError("");
    setSuccess("");
    try {
      await apiRequest<{ deleted: boolean }>(`/inventory-adjustments/${adjustment.id}`, { method: "DELETE" });
      router.push("/inventory/adjustments");
      return true;
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete inventory adjustment.");
      return false;
    } finally {
      setActionId("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title={adjustment?.adjustmentNumber ?? "Inventory adjustment"}
        description="Adjustment approval state and linked stock movement."
        badge={adjustment ? <LedgerStatusBadge tone={adjustmentStatusTone(adjustment.status)}>{inventoryAdjustmentStatusLabel(adjustment.status)}</LedgerStatusBadge> : null}
        actions={
          <>
            <LedgerButton href="/inventory/adjustments">Back</LedgerButton>
            {adjustment && canCreate && canEditInventoryAdjustment(adjustment.status) ? <LedgerButton href={`/inventory/adjustments/${adjustment.id}/edit`}>Edit</LedgerButton> : null}
            {adjustment && canCreate && canEditInventoryAdjustment(adjustment.status) ? (
              <LedgerButton type="button" disabled={actionId === "delete"} onClick={() => setDeleteDialogOpen(true)} variant="danger">
                {actionId === "delete" ? "Deleting..." : "Delete"}
              </LedgerButton>
            ) : null}
            {adjustment && canApprove && canApproveInventoryAdjustment(adjustment.status) ? (
              <LedgerButton type="button" disabled={actionId === "approve"} onClick={() => void approveAdjustment()} variant="primary">
                {actionId === "approve" ? "Approving..." : "Approve"}
              </LedgerButton>
            ) : null}
            {adjustment && canVoid && canVoidInventoryAdjustment(adjustment.status) ? (
              <LedgerButton type="button" disabled={actionId === "void"} onClick={() => void voidAdjustment()} variant="danger">
                {actionId === "void" ? "Voiding..." : "Void"}
              </LedgerButton>
            ) : null}
          </>
        }
      />

      <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load inventory adjustment details.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading inventory adjustment" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {adjustment ? (
          <>
            <AttachmentPanel linkedEntityType="INVENTORY_ADJUSTMENT" linkedEntityId={adjustment.id} />
            <InventoryAdjustmentWorkflowGuidance
              adjustment={adjustment}
              canApprove={canApprove}
              canVoid={canVoid}
              actionLoading={Boolean(actionId)}
              onApprove={() => void approveAdjustment()}
              onVoid={() => void voidAdjustment()}
            />

            <LedgerMetricGrid>
              <LedgerStatCard label="Status" value={<LedgerStatusBadge tone={adjustmentStatusTone(adjustment.status)}>{inventoryAdjustmentStatusLabel(adjustment.status)}</LedgerStatusBadge>} />
              <LedgerStatCard label="Type" value={inventoryAdjustmentTypeLabel(adjustment.type)} />
              <LedgerStatCard label="Quantity" value={formatInventoryQuantity(adjustment.quantity)} />
              <LedgerStatCard label="Date" value={<LedgerDate>{formatOptionalDate(adjustment.adjustmentDate, "-")}</LedgerDate>} />
            </LedgerMetricGrid>

            <LedgerSection title="Adjustment detail" description="Item, warehouse, cost, and approval metadata for this adjustment.">
              <LedgerMetadataRow
                items={[
                  { label: "Item", value: adjustment.item ? `${adjustment.item.name}${adjustment.item.sku ? ` (${adjustment.item.sku})` : ""}` : adjustment.itemId },
                  { label: "Warehouse", value: adjustment.warehouse ? `${adjustment.warehouse.code} ${adjustment.warehouse.name}` : adjustment.warehouseId },
                  { label: "Status", value: <LedgerStatusBadge tone={adjustmentStatusTone(adjustment.status)}>{inventoryAdjustmentStatusLabel(adjustment.status)}</LedgerStatusBadge> },
                  { label: "Unit cost", value: adjustment.unitCost ? formatInventoryQuantity(adjustment.unitCost) : "-" },
                  { label: "Total cost", value: adjustment.totalCost ? formatInventoryQuantity(adjustment.totalCost) : "-" },
                  { label: "Approved at", value: <LedgerDate>{formatOptionalDate(adjustment.approvedAt, "-")}</LedgerDate> },
                ]}
              />
              {adjustment.reason ? <p className="mt-4 text-sm leading-6 text-steel">{adjustment.reason}</p> : null}
            </LedgerSection>

            <LedgerSection title="Linked stock movements" description="Approval and void movements stay linked for audit review.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <MovementDetail label="Approval movement" movement={adjustment.stockMovement} />
                <MovementDetail label="Void movement" movement={adjustment.voidStockMovement} />
              </div>
            </LedgerSection>
          </>
        ) : null}
        <LedgerActionDialog
          open={deleteDialogOpen && Boolean(adjustment)}
          onOpenChange={(open) => {
            if (!open && actionId !== "delete") {
              setDeleteDialogOpen(false);
            }
          }}
          tone="danger"
          title="Delete inventory adjustment"
          description={adjustment ? `Delete ${adjustment.adjustmentNumber}?` : ""}
          confirmLabel="Delete"
          busy={actionId === "delete"}
          onConfirm={async () => {
            if (await deleteAdjustment()) {
              setDeleteDialogOpen(false);
            }
          }}
        />
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function InventoryAdjustmentWorkflowGuidance({
  adjustment,
  canApprove,
  canVoid,
  actionLoading,
  onApprove,
  onVoid,
}: {
  adjustment: InventoryAdjustment;
  canApprove: boolean;
  canVoid: boolean;
  actionLoading: boolean;
  onApprove: () => void;
  onVoid: () => void;
}) {
  const direction = adjustment.type === "INCREASE" ? "adds stock to" : "removes stock from";
  const warehouseLabel = adjustment.warehouse ? `${adjustment.warehouse.code} ${adjustment.warehouse.name}` : "the selected warehouse";

  return (
    <LedgerSummaryBand tone="info">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">What happened?</h2>
            <LedgerStatusBadge tone={adjustmentStatusTone(adjustment.status)}>{inventoryAdjustmentStatusLabel(adjustment.status)}</LedgerStatusBadge>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <p className="font-semibold text-ink">Draft vs approved</p>
              <p className="mt-1">Draft adjustments do not move stock. Approval creates the operational stock movement.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Quantity effect</p>
              <p className="mt-1">
                This {inventoryAdjustmentTypeLabel(adjustment.type).toLowerCase()} adjustment {direction} {warehouseLabel}.
              </p>
            </div>
            <div>
              <p className="font-semibold text-ink">Void/reversal</p>
              <p className="mt-1">Voiding an approved adjustment creates a linked reversal movement and keeps the original row visible for audit.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          {canApprove && canApproveInventoryAdjustment(adjustment.status) ? (
            <LedgerButton type="button" disabled={actionLoading} onClick={onApprove} variant="primary">Approve adjustment</LedgerButton>
          ) : null}
          {canVoid && canVoidInventoryAdjustment(adjustment.status) ? (
            <LedgerButton type="button" disabled={actionLoading} onClick={onVoid} variant="danger">Void adjustment</LedgerButton>
          ) : null}
          <LedgerButton href={`/inventory/warehouses/${adjustment.warehouseId}`}>View warehouse</LedgerButton>
          <LedgerButton href="/inventory/stock-movements">Stock movements</LedgerButton>
          <LedgerButton href="/inventory/reports/movement-summary">Inventory report</LedgerButton>
          <LedgerButton href="/dashboard">Dashboard</LedgerButton>
        </div>
      </div>
    </LedgerSummaryBand>
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
    <LedgerPanel>
      <p className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</p>
      {movement ? (
        <div className="mt-2 space-y-1 text-sm text-ink">
          <p>{stockMovementTypeLabel(movement.type)}</p>
          <p className="font-mono text-xs text-steel">{movement.id}</p>
          <p className="text-steel">{formatOptionalDate(movement.movementDate, "-")}</p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-steel">-</p>
      )}
    </LedgerPanel>
  );
}
