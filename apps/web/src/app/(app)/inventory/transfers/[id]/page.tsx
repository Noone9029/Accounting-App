"use client";

import { useParams } from "next/navigation";
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
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  canVoidWarehouseTransfer,
  formatInventoryQuantity,
  inventoryOperationalWarning,
  stockMovementTypeLabel,
  warehouseTransferStatusLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { WarehouseTransfer } from "@/lib/types";

type TransferMovement =
  | WarehouseTransfer["fromStockMovement"]
  | WarehouseTransfer["toStockMovement"]
  | WarehouseTransfer["voidFromStockMovement"]
  | WarehouseTransfer["voidToStockMovement"];

function transferStatusTone(status: WarehouseTransfer["status"]): LedgerStatusTone {
  return status === "POSTED" ? "success" : "danger";
}

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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title={transfer?.transferNumber ?? "Warehouse transfer"}
        description="Transfer state and linked stock movements."
        badge={transfer ? <LedgerStatusBadge tone={transferStatusTone(transfer.status)}>{warehouseTransferStatusLabel(transfer.status)}</LedgerStatusBadge> : null}
        actions={
          <>
            <LedgerButton href="/inventory/transfers">Back</LedgerButton>
            {transfer && canVoid && canVoidWarehouseTransfer(transfer.status) ? (
              <LedgerButton type="button" disabled={voiding} onClick={() => void voidTransfer()} variant="danger">
                {voiding ? "Voiding..." : "Void"}
              </LedgerButton>
            ) : null}
          </>
        }
      />

      <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load warehouse transfer details.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading warehouse transfer" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {transfer ? (
          <>
            <AttachmentPanel linkedEntityType="WAREHOUSE_TRANSFER" linkedEntityId={transfer.id} />
            <WarehouseTransferWorkflowGuidance
              transfer={transfer}
              canVoid={canVoid}
              actionLoading={voiding}
              onVoid={() => void voidTransfer()}
            />

            <LedgerMetricGrid>
              <LedgerStatCard label="Quantity" value={formatInventoryQuantity(transfer.quantity)} />
              <LedgerStatCard label="Date" value={<LedgerDate>{formatOptionalDate(transfer.transferDate, "-")}</LedgerDate>} />
              <LedgerStatCard label="Status" value={<LedgerStatusBadge tone={transferStatusTone(transfer.status)}>{warehouseTransferStatusLabel(transfer.status)}</LedgerStatusBadge>} />
              <LedgerStatCard label="Posted at" value={<LedgerDate>{formatOptionalDate(transfer.postedAt, "-")}</LedgerDate>} />
            </LedgerMetricGrid>

            <LedgerSection title="Transfer detail" description="Item, warehouse, and cost metadata for this transfer.">
              <LedgerMetadataRow
                items={[
                  { label: "Item", value: transfer.item ? `${transfer.item.name}${transfer.item.sku ? ` (${transfer.item.sku})` : ""}` : transfer.itemId },
                  { label: "From warehouse", value: transfer.fromWarehouse ? `${transfer.fromWarehouse.code} ${transfer.fromWarehouse.name}` : transfer.fromWarehouseId },
                  { label: "To warehouse", value: transfer.toWarehouse ? `${transfer.toWarehouse.code} ${transfer.toWarehouse.name}` : transfer.toWarehouseId },
                  { label: "Status", value: <LedgerStatusBadge tone={transferStatusTone(transfer.status)}>{warehouseTransferStatusLabel(transfer.status)}</LedgerStatusBadge> },
                  { label: "Unit cost", value: transfer.unitCost ? formatInventoryQuantity(transfer.unitCost) : "-" },
                  { label: "Total cost", value: transfer.totalCost ? formatInventoryQuantity(transfer.totalCost) : "-" },
                ]}
              />
              {transfer.description ? <p className="mt-4 text-sm leading-6 text-steel">{transfer.description}</p> : null}
            </LedgerSection>

            <LedgerSection title="Linked stock movements" description="Posted and void reversal rows stay linked for audit review.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <MovementDetail label="Source movement" movement={transfer.fromStockMovement} />
                <MovementDetail label="Destination movement" movement={transfer.toStockMovement} />
                <MovementDetail label="Void source movement" movement={transfer.voidFromStockMovement} />
                <MovementDetail label="Void destination movement" movement={transfer.voidToStockMovement} />
              </div>
            </LedgerSection>
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function WarehouseTransferWorkflowGuidance({
  transfer,
  canVoid,
  actionLoading,
  onVoid,
}: {
  transfer: WarehouseTransfer;
  canVoid: boolean;
  actionLoading: boolean;
  onVoid: () => void;
}) {
  const itemLabel = transfer.item ? `${transfer.item.name}${transfer.item.sku ? ` (${transfer.item.sku})` : ""}` : "the selected item";
  const fromLabel = transfer.fromWarehouse ? `${transfer.fromWarehouse.code} ${transfer.fromWarehouse.name}` : "the source warehouse";
  const toLabel = transfer.toWarehouse ? `${transfer.toWarehouse.code} ${transfer.toWarehouse.name}` : "the destination warehouse";

  return (
    <LedgerSummaryBand tone="info">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">What happened?</h2>
            <LedgerStatusBadge tone={transferStatusTone(transfer.status)}>{warehouseTransferStatusLabel(transfer.status)}</LedgerStatusBadge>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <p className="font-semibold text-ink">Source warehouse</p>
              <p className="mt-1">
                Posted transfer decreases {itemLabel} in {fromLabel}.
              </p>
            </div>
            <div>
              <p className="font-semibold text-ink">Destination warehouse</p>
              <p className="mt-1">
                The same quantity increases in {toLabel}, keeping total organization stock unchanged.
              </p>
            </div>
            <div>
              <p className="font-semibold text-ink">Void/reversal</p>
              <p className="mt-1">Voiding creates opposite source and destination movements. It does not delete the original transfer history.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          {canVoid && canVoidWarehouseTransfer(transfer.status) ? (
            <LedgerButton type="button" disabled={actionLoading} onClick={onVoid} variant="danger">Void transfer</LedgerButton>
          ) : null}
          <LedgerButton href={`/inventory/warehouses/${transfer.fromWarehouseId}`}>Source warehouse</LedgerButton>
          <LedgerButton href={`/inventory/warehouses/${transfer.toWarehouseId}`}>Destination warehouse</LedgerButton>
          <LedgerButton href="/inventory/stock-movements">Stock movements</LedgerButton>
          <LedgerButton href="/inventory/reports/movement-summary">Inventory report</LedgerButton>
          <LedgerButton href="/dashboard">Dashboard</LedgerButton>
        </div>
      </div>
    </LedgerSummaryBand>
  );
}

function MovementDetail({ label, movement }: { label: string; movement: TransferMovement }) {
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
