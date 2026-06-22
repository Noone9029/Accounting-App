"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Edit3, UserRound } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
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
import { formatInventoryQuantity, stockMovementTypeLabel } from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import {
  SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT,
  canApproveSalesInventoryReturn,
  canCancelSalesInventoryReturn,
  canEditSalesInventoryReturn,
  canPostSalesInventoryReturnMovement,
  canReceiveSalesInventoryReturn,
  canSubmitSalesInventoryReturn,
  canVoidSalesInventoryReturn,
  salesInventoryReturnMovementStatusLabel,
  salesInventoryReturnSourceHref,
  salesInventoryReturnSourceLabel,
  salesInventoryReturnStatusLabel,
} from "@/lib/sales-inventory-returns";
import type { SalesInventoryReturn, SalesInventoryReturnInventoryMovementPreview, SalesInventoryReturnInventoryMovementPreviewLine, SalesInventoryReturnLine, SalesInventoryReturnStatus } from "@/lib/types";

type SalesInventoryReturnAction = "submit" | "approve" | "receive" | "cancel" | "void";

export default function SalesInventoryReturnDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [salesReturn, setSalesReturn] = useState<SalesInventoryReturn | null>(null);
  const [inventoryPreview, setInventoryPreview] = useState<SalesInventoryReturnInventoryMovementPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [movementActionLoading, setMovementActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManage = can(PERMISSIONS.salesInvoices.update);
  const canViewInventory = can(PERMISSIONS.inventory.view);
  const canPostMovement = can(PERMISSIONS.stockMovements.create);

  useEffect(() => {
    if (!organizationId || !params.id) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SalesInventoryReturn>(`/sales-inventory-returns/${params.id}`)
      .then((result) => {
        if (!cancelled) setSalesReturn(result);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load sales inventory return.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, params.id]);

  useEffect(() => {
    if (!organizationId || !params.id || !canViewInventory) {
      setInventoryPreview(null);
      return;
    }

    let cancelled = false;
    apiRequest<SalesInventoryReturnInventoryMovementPreview>(`/sales-inventory-returns/${params.id}/inventory-return-preview`)
      .then((result) => {
        if (!cancelled) setInventoryPreview(result);
      })
      .catch(() => {
        if (!cancelled) setInventoryPreview(null);
      });

    return () => {
      cancelled = true;
    };
  }, [canViewInventory, organizationId, params.id, salesReturn?.status, salesReturn?.inventoryReturnPostedAt]);

  async function runAction(action: SalesInventoryReturnAction) {
    if (!salesReturn) return;
    if ((action === "void" || action === "cancel") && !window.confirm(`${action === "void" ? "Void" : "Cancel"} sales inventory return ${salesReturn.salesReturnNumber}?`)) {
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<SalesInventoryReturn>(`/sales-inventory-returns/${salesReturn.id}/${action}`, { method: "POST" });
      setSalesReturn(updated);
      setSuccess(`Sales inventory return ${updated.salesReturnNumber} ${actionLabel(action)}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action} sales inventory return.`);
    } finally {
      setActionLoading(false);
    }
  }

  async function postInventoryReturnMovement() {
    if (!salesReturn) return;
    if (!window.confirm(`${SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT}\n\nPost operational stock-in movement for ${salesReturn.salesReturnNumber}?`)) {
      return;
    }
    setMovementActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<SalesInventoryReturn>(`/sales-inventory-returns/${salesReturn.id}/post-inventory-return`, { method: "POST" });
      setSalesReturn(updated);
      setSuccess(`Inventory return movement posted for ${updated.salesReturnNumber}.`);
      if (canViewInventory) {
        const preview = await apiRequest<SalesInventoryReturnInventoryMovementPreview>(`/sales-inventory-returns/${salesReturn.id}/inventory-return-preview`);
        setInventoryPreview(preview);
      }
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "Unable to post inventory return movement.");
    } finally {
      setMovementActionLoading(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales inventory"
        title={salesReturn?.salesReturnNumber ?? "Sales inventory return"}
        description="Customer stock return detail with explicit operational stock-in movement."
        actions={
          <>
            <LedgerButton href="/sales/inventory-returns" icon={ArrowLeft}>Back</LedgerButton>
            {salesReturn && canEditSalesInventoryReturn(salesReturn.status) && canManage ? (
              <LedgerButton href={`/sales/inventory-returns/${salesReturn.id}/edit`} icon={Edit3}>Edit</LedgerButton>
            ) : null}
            {salesReturn?.customerId ? (
              <LedgerButton href={`/customers/${salesReturn.customerId}`} icon={UserRound}>Customer activity</LedgerButton>
            ) : null}
          </>
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
          {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load sales inventory returns.</LedgerAlert> : null}
          {loading ? <StatusMessage type="loading">Loading sales inventory return...</StatusMessage> : null}
          {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
          {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        </div>

      {salesReturn ? (
        <div className="space-y-5">
          <SalesInventoryReturnWorkflowGuidance salesReturn={salesReturn} canManage={canManage} actionLoading={actionLoading} onAction={runAction} />

          <LedgerPanel>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Customer" value={salesReturn.customer?.displayName ?? salesReturn.customer?.name ?? "-"} href={`/customers/${salesReturn.customerId}`} />
              <Summary label="Status" value={salesInventoryReturnStatusLabel(salesReturn.status)} />
              <Summary label="Return date" value={formatOptionalDate(salesReturn.returnDate, "-")} />
              <Summary label="Reference" value={salesReturn.reference ?? "-"} />
              <Summary label="Source" value={salesInventoryReturnSourceLabel(salesReturn)} href={salesInventoryReturnSourceHref(salesReturn) ?? undefined} />
              <Summary label="Movement" value={salesInventoryReturnMovementStatusLabel(inventoryPreview ?? salesReturn)} />
              <Summary label="Movement posted at" value={formatOptionalDate(inventoryPreview?.postedAt ?? salesReturn.inventoryReturnPostedAt, "-")} />
              <Summary label="Approved at" value={formatOptionalDate(salesReturn.approvedAt, "-")} />
              <Summary label="Received at" value={formatOptionalDate(salesReturn.receivedAt, "-")} />
              <Summary label="Credit note link" value={salesReturn.sourceCreditNote?.creditNoteNumber ?? "Separate document"} href={salesReturn.sourceCreditNote ? `/sales/credit-notes/${salesReturn.sourceCreditNote.id}` : undefined} />
              <Summary label="Refund link" value="Separate customer refund workflow" />
              <Summary label="Notes" value={salesReturn.notes ?? "-"} />
            </div>
          </LedgerPanel>

          {canViewInventory ? (
            <SalesInventoryReturnInventoryMovementPanel
              preview={inventoryPreview}
              canPost={canPostMovement}
              actionLoading={movementActionLoading}
              onPost={postInventoryReturnMovement}
            />
          ) : null}

          <LedgerDataTable minWidth="980px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Source line</th>
                <th className="px-4 py-3">Stock movement</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(salesReturn.lines ?? []).map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                  <td className="px-4 py-3 text-steel">{line.item ? `${line.item.sku ? `${line.item.sku} - ` : ""}${line.item.name}` : "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatInventoryQuantity(line.quantity)}</td>
                  <td className="px-4 py-3 text-steel">{line.warehouse ? `${line.warehouse.code} ${line.warehouse.name}` : "-"}</td>
                  <td className="px-4 py-3 text-steel">{lineSourceLabel(line)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-steel">{line.stockMovementId ?? line.stockMovement?.id ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{line.reason ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>

          <LedgerSection title="Accounting and customer balance boundary">
            <LedgerSummaryBand tone="warning">{SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT}</LedgerSummaryBand>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <p className="rounded-md bg-slate-50 p-3 text-steel">Create a credit note separately if customer credit accounting is required.</p>
              <p className="rounded-md bg-slate-50 p-3 text-steel">Create a customer refund separately if money is returned.</p>
            </div>
          </LedgerSection>
        </div>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function SalesInventoryReturnWorkflowGuidance({
  salesReturn,
  canManage,
  actionLoading,
  onAction,
}: {
  salesReturn: SalesInventoryReturn;
  canManage: boolean;
  actionLoading: boolean;
  onAction: (action: SalesInventoryReturnAction) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <LedgerPanel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Return status</h2>
            <p className="mt-1 text-sm leading-6 text-steel">{outcomeDescription(salesReturn)}</p>
          </div>
          <SalesInventoryReturnStatusBadge status={salesReturn.status} />
        </div>
        <div className="mt-4">
          <LedgerSummaryBand tone="warning">{SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT}</LedgerSummaryBand>
        </div>
      </LedgerPanel>
      <LedgerPanel>
        <h2 className="text-base font-semibold text-ink">Next actions</h2>
        <p className="mt-1 text-sm leading-6 text-steel">{nextActionDescription(salesReturn)}</p>
        <LedgerActionBar className="mt-4">
          {canManage && canSubmitSalesInventoryReturn(salesReturn.status) ? <ActionButton label="Submit" active={actionLoading} onClick={() => onAction("submit")} /> : null}
          {canManage && canApproveSalesInventoryReturn(salesReturn.status) ? <ActionButton label="Approve" active={actionLoading} onClick={() => onAction("approve")} /> : null}
          {canManage && canReceiveSalesInventoryReturn(salesReturn.status) ? <ActionButton label="Receive" active={actionLoading} onClick={() => onAction("receive")} /> : null}
          {canManage && canCancelSalesInventoryReturn(salesReturn.status) ? <ActionButton label="Cancel" active={actionLoading} onClick={() => onAction("cancel")} secondary /> : null}
          {canManage && canVoidSalesInventoryReturn(salesReturn.status) ? <ActionButton label="Void" active={actionLoading} onClick={() => onAction("void")} danger /> : null}
        </LedgerActionBar>
      </LedgerPanel>
    </div>
  );
}

export function SalesInventoryReturnInventoryMovementPanel({
  preview,
  canPost,
  actionLoading,
  onPost,
}: {
  preview: SalesInventoryReturnInventoryMovementPreview | null;
  canPost: boolean;
  actionLoading: boolean;
  onPost: () => void;
}) {
  if (!preview) {
    return (
      <LedgerSection title="Inventory return movement">
        <p className="text-sm text-steel">Inventory movement preview is unavailable for this return.</p>
      </LedgerSection>
    );
  }

  const movementIds = preview.movementIds.length > 0 ? preview.movementIds : preview.lines.map((line) => line.stockMovementId).filter((value): value is string => Boolean(value));
  const showPostAction = canPostSalesInventoryReturnMovement(preview, canPost);

  return (
    <LedgerPanel>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Inventory return movement</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{preview.safeHelperText}</p>
        </div>
        <LedgerStatusBadge tone={inventoryMovementStatusTone(preview.inventoryMovementStatus)}>{salesInventoryReturnMovementStatusLabel(preview)}</LedgerStatusBadge>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <Summary label="Movement status" value={salesInventoryReturnMovementStatusLabel(preview)} />
        <Summary label="Posted at" value={formatOptionalDate(preview.postedAt, "-")} />
        <Summary label="Reversal" value={preview.alreadyPosted ? "Reversal not supported yet" : "-"} />
      </div>

      {movementIds.length > 0 ? (
        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
          <div className="font-medium text-ink">Linked stock movement IDs</div>
          <div className="mt-1 font-mono text-xs text-steel">{movementIds.join(", ")}</div>
        </div>
      ) : null}

      {preview.blockingReasons.length > 0 ? (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{preview.blockingReasons.join(" ")}</div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-md border border-line">
        <div style={{ minWidth: "920px" }}>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Warehouse</th>
                <th className="px-3 py-2">Return qty</th>
                <th className="px-3 py-2">On hand</th>
                <th className="px-3 py-2">Projected</th>
                <th className="px-3 py-2">Movement</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preview.lines.map((line) => (
                <PreviewLineRow key={line.lineId} line={line} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPostAction ? (
        <LedgerActionBar className="mt-4 justify-end">
          <LedgerButton type="button" onClick={onPost} disabled={actionLoading} variant="primary">
            {actionLoading ? "Posting..." : "Post inventory return movement"}
          </LedgerButton>
        </LedgerActionBar>
      ) : null}
    </LedgerPanel>
  );
}

function PreviewLineRow({ line }: { line: SalesInventoryReturnInventoryMovementPreviewLine }) {
  return (
    <tr>
      <td className="px-3 py-2 text-ink">{line.item ? `${line.item.sku ? `${line.item.sku} - ` : ""}${line.item.name}` : line.description}</td>
      <td className="px-3 py-2 text-steel">{line.warehouse ? `${line.warehouse.code} ${line.warehouse.name}` : "-"}</td>
      <td className="px-3 py-2 font-mono text-xs">{formatInventoryQuantity(line.returnQuantity)}</td>
      <td className="px-3 py-2 font-mono text-xs">{line.currentOnHand ? formatInventoryQuantity(line.currentOnHand) : "-"}</td>
      <td className="px-3 py-2 font-mono text-xs">{line.projectedOnHandAfterReturn ? formatInventoryQuantity(line.projectedOnHandAfterReturn) : "-"}</td>
      <td className="px-3 py-2 text-steel">{stockMovementTypeLabel(line.movementType)}</td>
      <td className="px-3 py-2 text-steel">{previewLineStatusLabel(line)}</td>
    </tr>
  );
}

function Summary({ label, value, href }: { label: string; value: string; href?: string }) {
  let content = <div className="mt-1 text-sm text-ink">{value}</div>;
  if (href) {
    content = (
      <Link href={href} className="mt-1 inline-block text-sm font-medium text-palm hover:underline">
        {value}
      </Link>
    );
  } else if (label.includes("date") || label.endsWith("at")) {
    content = <div className="mt-1"><LedgerDate>{value}</LedgerDate></div>;
  }

  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-steel">{label}</div>
      {content}
    </div>
  );
}

function SalesInventoryReturnStatusBadge({ status }: { status: SalesInventoryReturnStatus }) {
  return <LedgerStatusBadge tone={salesInventoryReturnStatusTone(status)}>{salesInventoryReturnStatusLabel(status)}</LedgerStatusBadge>;
}

function salesInventoryReturnStatusTone(status: SalesInventoryReturnStatus | undefined | null): LedgerStatusTone {
  switch (status) {
    case "RECEIVED":
      return "success";
    case "APPROVED":
    case "SUBMITTED":
      return "info";
    case "VOIDED":
    case "CANCELLED":
      return "danger";
    case "DRAFT":
      return "warning";
    default:
      return "neutral";
  }
}

function ActionButton({ label, active, onClick, secondary = false, danger = false }: { label: string; active: boolean; onClick: () => void; secondary?: boolean; danger?: boolean }) {
  return (
    <LedgerButton type="button" onClick={onClick} disabled={active} variant={danger ? "danger" : secondary ? "secondary" : "primary"}>
      {label}
    </LedgerButton>
  );
}

function outcomeDescription(salesReturn: SalesInventoryReturn): string {
  switch (salesReturn.status) {
    case "DRAFT":
      return "Draft customer stock return. It can be edited or submitted for approval.";
    case "SUBMITTED":
      return "Submitted for review. Approval is required before receiving or stock-in posting.";
    case "APPROVED":
      return "Approved for operational receiving. Stock-in movement still requires the explicit post action.";
    case "RECEIVED":
      return "Received operationally. Stock-in movement may be posted if it has not been posted yet.";
    case "VOIDED":
      return "Voided return. Posted movement reversal is not supported by this workflow.";
    case "CANCELLED":
      return "Cancelled return. No stock movement is available.";
  }
}

function nextActionDescription(salesReturn: SalesInventoryReturn): string {
  switch (salesReturn.status) {
    case "DRAFT":
      return "Review source links, quantities, and warehouses, then submit.";
    case "SUBMITTED":
      return "Approve the return once the operational details are correct.";
    case "APPROVED":
      return "Receive the return or post operational stock-in where warehouse validation passes.";
    case "RECEIVED":
      return "Post operational stock-in if not already posted.";
    case "VOIDED":
      return "No further lifecycle action is available.";
    case "CANCELLED":
      return "No further lifecycle action is available.";
  }
}

function actionLabel(action: SalesInventoryReturnAction): string {
  switch (action) {
    case "submit":
      return "submitted";
    case "approve":
      return "approved";
    case "receive":
      return "received";
    case "cancel":
      return "cancelled";
    case "void":
      return "voided";
  }
}

function lineSourceLabel(line: SalesInventoryReturnLine): string {
  if (line.sourceSalesStockIssueLineId) return "Sales stock issue line";
  if (line.sourceDeliveryNoteLineId) return "Delivery note line";
  if (line.sourceSalesInvoiceLineId) return "Invoice line";
  if (line.sourceCreditNoteLineId) return "Credit note line";
  return "Manual";
}

function previewLineStatusLabel(line: SalesInventoryReturnInventoryMovementPreviewLine): string {
  switch (line.status) {
    case "POSTABLE":
      return "Ready";
    case "POSTED":
      return "Posted";
    case "BLOCKED":
      return line.blockingReasons.join(" ") || "Blocked";
    case "SKIPPED_NON_TRACKED":
      return "No stock movement required";
  }
}

function inventoryMovementStatusTone(status: SalesInventoryReturnInventoryMovementPreview["inventoryMovementStatus"]): LedgerStatusTone {
  switch (status) {
    case "POSTED":
      return "success";
    case "BLOCKED":
      return "danger";
    case "NOT_POSTED":
      return "warning";
  }
}
