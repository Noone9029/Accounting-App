"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { ValuationVariancePreviewPanel } from "@/components/inventory/valuation-variance-preview-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatInventoryQuantity, inventoryValuationVariancePreviewUrl, stockMovementTypeLabel } from "@/lib/inventory";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import {
  PURCHASE_RETURN_INVENTORY_MOVEMENT_HELPER_TEXT,
  PURCHASE_RETURN_NON_EFFECT_TEXT,
  canApprovePurchaseReturn,
  canCancelPurchaseReturn,
  canCompletePurchaseReturn,
  canEditPurchaseReturn,
  canPostPurchaseReturnInventoryMovement,
  canSubmitPurchaseReturn,
  canVoidPurchaseReturn,
  purchaseReturnInventoryMovementReversalLabel,
  purchaseReturnInventoryMovementStatusLabel,
  purchaseReturnSourceHref,
  purchaseReturnSourceLabel,
  purchaseReturnStatusBadgeClass,
  purchaseReturnStatusLabel,
} from "@/lib/purchase-returns";
import type {
  InventoryValuationVariancePreviewResponse,
  PurchaseReturn,
  PurchaseReturnInventoryMovementPreview,
  PurchaseReturnInventoryMovementPreviewLine,
  PurchaseReturnLine,
} from "@/lib/types";

type ReturnAction = "submit" | "approve" | "complete" | "cancel" | "void";

export default function PurchaseReturnDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can, canAny } = usePermissions();
  const [purchaseReturn, setPurchaseReturn] = useState<PurchaseReturn | null>(null);
  const [valuationVariancePreview, setValuationVariancePreview] = useState<InventoryValuationVariancePreviewResponse | null>(null);
  const [inventoryMovementPreview, setInventoryMovementPreview] = useState<PurchaseReturnInventoryMovementPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [movementActionLoading, setMovementActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManage = canAny(PERMISSIONS.purchaseBills.create, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create);
  const canViewInventoryMovement = can(PERMISSIONS.inventory.view);
  const canViewValuationVariances = canViewInventoryMovement;
  const canPostInventoryMovement = can(PERMISSIONS.stockMovements.create);

  useEffect(() => {
    if (!organizationId || !params.id) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<PurchaseReturn>(`/purchase-returns/${params.id}`)
      .then((result) => {
        if (!cancelled) setPurchaseReturn(result);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load purchase return.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, params.id]);

  useEffect(() => {
    if (!organizationId || !purchaseReturn?.purchaseReturnNumber || !canViewValuationVariances) {
      setValuationVariancePreview(null);
      return;
    }

    let cancelled = false;
    apiRequest<InventoryValuationVariancePreviewResponse>(`/inventory/valuation-variances?search=${encodeURIComponent(purchaseReturn.purchaseReturnNumber)}`)
      .then((result) => {
        if (!cancelled) setValuationVariancePreview(result);
      })
      .catch(() => {
        if (!cancelled) setValuationVariancePreview(null);
      });

    return () => {
      cancelled = true;
    };
  }, [canViewValuationVariances, organizationId, purchaseReturn?.purchaseReturnNumber]);

  useEffect(() => {
    if (!organizationId || !params.id || !canViewInventoryMovement) {
      setInventoryMovementPreview(null);
      return;
    }

    let cancelled = false;
    apiRequest<PurchaseReturnInventoryMovementPreview>(`/purchase-returns/${params.id}/inventory-return-preview`)
      .then((result) => {
        if (!cancelled) setInventoryMovementPreview(result);
      })
      .catch(() => {
        if (!cancelled) setInventoryMovementPreview(null);
      });

    return () => {
      cancelled = true;
    };
  }, [canViewInventoryMovement, organizationId, params.id, purchaseReturn?.status, purchaseReturn?.inventoryReturnPostedAt]);

  async function runAction(action: ReturnAction) {
    if (!purchaseReturn) return;
    if ((action === "void" || action === "cancel") && !window.confirm(`${action === "void" ? "Void" : "Cancel"} purchase return ${purchaseReturn.purchaseReturnNumber}?`)) {
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PurchaseReturn>(`/purchase-returns/${purchaseReturn.id}/${action}`, { method: "POST" });
      setPurchaseReturn(updated);
      setSuccess(`Purchase return ${updated.purchaseReturnNumber} ${actionLabel(action)}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action} purchase return.`);
    } finally {
      setActionLoading(false);
    }
  }

  async function postInventoryReturnMovement() {
    if (!purchaseReturn) return;
    if (!window.confirm(`${PURCHASE_RETURN_INVENTORY_MOVEMENT_HELPER_TEXT}\n\nPost inventory return movement for ${purchaseReturn.purchaseReturnNumber}?`)) {
      return;
    }
    setMovementActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PurchaseReturn>(`/purchase-returns/${purchaseReturn.id}/post-inventory-return`, { method: "POST" });
      setPurchaseReturn(updated);
      setSuccess(`Inventory return movement posted for ${updated.purchaseReturnNumber}.`);
      if (canViewInventoryMovement) {
        const preview = await apiRequest<PurchaseReturnInventoryMovementPreview>(`/purchase-returns/${purchaseReturn.id}/inventory-return-preview`);
        setInventoryMovementPreview(preview);
      }
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "Unable to post inventory return movement.");
    } finally {
      setMovementActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{purchaseReturn?.purchaseReturnNumber ?? "Purchase return"}</h1>
          <p className="mt-1 text-sm text-steel">Operational supplier return detail and non-posting lifecycle.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/purchases/returns" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {purchaseReturn && canEditPurchaseReturn(purchaseReturn.status) && canManage ? (
            <Link href={`/purchases/returns/${purchaseReturn.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              Edit
            </Link>
          ) : null}
          {purchaseReturn?.supplierId ? (
            <Link href={`/contacts/${purchaseReturn.supplierId}`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              Supplier ledger
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load purchase returns.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase return...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {purchaseReturn ? (
        <div className="mt-5 space-y-5">
          <PurchaseReturnWorkflowGuidance purchaseReturn={purchaseReturn} canManage={canManage} actionLoading={actionLoading} onAction={runAction} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Supplier" value={purchaseReturn.supplier?.displayName ?? purchaseReturn.supplier?.name ?? "-"} />
              <Summary label="Status" value={purchaseReturnStatusLabel(purchaseReturn.status)} />
              <Summary label="Return date" value={formatOptionalDate(purchaseReturn.returnDate, "-")} />
              <Summary label="Reference" value={purchaseReturn.reference ?? "-"} />
              <Summary label="Source" value={purchaseReturnSourceLabel(purchaseReturn)} href={purchaseReturnSourceHref(purchaseReturn) ?? undefined} />
              <Summary label="Reason" value={purchaseReturn.reason ?? "-"} />
              <Summary label="Approved at" value={formatOptionalDate(purchaseReturn.approvedAt, "-")} />
              <Summary label="Completed at" value={formatOptionalDate(purchaseReturn.completedAt, "-")} />
              <Summary label="Related debit note" value={purchaseReturn.relatedPurchaseDebitNote?.debitNoteNumber ?? "-"} href={purchaseReturn.relatedPurchaseDebitNote ? `/purchases/debit-notes/${purchaseReturn.relatedPurchaseDebitNote.id}` : undefined} />
              <Summary label="Related supplier refund" value={purchaseReturn.relatedSupplierRefund?.refundNumber ?? "-"} href={purchaseReturn.relatedSupplierRefund ? `/purchases/supplier-refunds/${purchaseReturn.relatedSupplierRefund.id}` : undefined} />
              <Summary label="Matching review" value={purchaseReturn.sourceMatchingReview ? purchaseReturn.sourceMatchingReview.status : "-"} href={purchaseReturn.sourceMatchingReview ? "/purchases/matching?reviewStatus=NEEDS_RETURN_REVIEW" : undefined} />
              <Summary label="Inventory movement" value={purchaseReturnInventoryMovementStatusLabel(inventoryMovementPreview ?? purchaseReturn)} />
              <Summary label="Movement posted at" value={formatOptionalDate(inventoryMovementPreview?.postedAt ?? purchaseReturn.inventoryReturnPostedAt ?? null, "-")} />
              <Summary label="Notes" value={purchaseReturn.notes ?? "-"} />
            </div>
          </div>

          {canViewInventoryMovement ? (
            <PurchaseReturnInventoryMovementPanel
              preview={inventoryMovementPreview}
              canPost={canPostInventoryMovement}
              actionLoading={movementActionLoading}
              onPost={postInventoryReturnMovement}
            />
          ) : null}

          {canViewValuationVariances ? (
            <ValuationVariancePreviewPanel
              preview={valuationVariancePreview}
              href={inventoryValuationVariancePreviewUrl({ search: purchaseReturn.purchaseReturnNumber, sourceType: "purchaseReturn" })}
            />
          ) : null}

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Unit cost</th>
                  <th className="px-4 py-3">Source line</th>
                  <th className="px-4 py-3">Stock movement</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseReturn.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.unitCost ? formatMoneyAmount(line.unitCost, "SAR") : "-"}</td>
                    <td className="px-4 py-3 text-steel">{sourceLineLabel(line)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-steel">{line.stockMovementId ?? line.stockMovement?.id ?? "-"}</td>
                    <td className="px-4 py-3 text-steel">{line.reason ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Accounting and inventory boundary</h2>
            <p className="mt-2 text-sm leading-6 text-steel">{PURCHASE_RETURN_NON_EFFECT_TEXT}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <p className="rounded-md bg-slate-50 p-3 text-steel">Create a purchase debit note separately if supplier credit accounting is required.</p>
              <p className="rounded-md bg-slate-50 p-3 text-steel">Record a supplier refund separately if money is returned.</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function PurchaseReturnWorkflowGuidance({
  purchaseReturn,
  canManage,
  actionLoading,
  onAction,
}: {
  purchaseReturn: PurchaseReturn;
  canManage: boolean;
  actionLoading: boolean;
  onAction: (action: ReturnAction) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">What happened?</h2>
            <p className="mt-1 text-sm leading-6 text-steel">{outcomeDescription(purchaseReturn)}</p>
          </div>
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${purchaseReturnStatusBadgeClass(purchaseReturn.status)}`}>
            {purchaseReturnStatusLabel(purchaseReturn.status)}
          </span>
        </div>
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{PURCHASE_RETURN_NON_EFFECT_TEXT}</div>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Next actions</h2>
        <p className="mt-1 text-sm leading-6 text-steel">{nextActionDescription(purchaseReturn)}</p>
        <div className="mt-4 flex flex-col gap-2">
          {canManage && canSubmitPurchaseReturn(purchaseReturn.status) ? <ActionButton label="Submit" active={actionLoading} onClick={() => onAction("submit")} /> : null}
          {canManage && canApprovePurchaseReturn(purchaseReturn.status) ? <ActionButton label="Approve" active={actionLoading} onClick={() => onAction("approve")} /> : null}
          {canManage && canCompletePurchaseReturn(purchaseReturn.status) ? <ActionButton label="Complete" active={actionLoading} onClick={() => onAction("complete")} /> : null}
          {canManage && canCancelPurchaseReturn(purchaseReturn.status) ? <ActionButton label="Cancel" active={actionLoading} onClick={() => onAction("cancel")} secondary /> : null}
          {canManage && canVoidPurchaseReturn(purchaseReturn.status) ? <ActionButton label="Void" active={actionLoading} onClick={() => onAction("void")} danger /> : null}
          {purchaseReturn.sourceMatchingReview ? (
            <Link href="/purchases/matching?reviewStatus=NEEDS_RETURN_REVIEW" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              View matching review
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PurchaseReturnInventoryMovementPanel({
  preview,
  canPost,
  actionLoading,
  onPost,
}: {
  preview: PurchaseReturnInventoryMovementPreview | null;
  canPost: boolean;
  actionLoading: boolean;
  onPost: () => void;
}) {
  if (!preview) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Inventory return movement</h2>
        <p className="mt-2 text-sm text-steel">Inventory movement preview is unavailable for this return.</p>
      </div>
    );
  }

  const reversalLabel = purchaseReturnInventoryMovementReversalLabel(preview);
  const movementIds = preview.movementIds.length > 0 ? preview.movementIds : preview.lines.map((line) => line.stockMovementId).filter((value): value is string => Boolean(value));
  const showPostAction = canPostPurchaseReturnInventoryMovement(preview, canPost);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Inventory return movement</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{preview.safeHelperText}</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${inventoryMovementStatusBadgeClass(preview.inventoryMovementStatus)}`}>
          {purchaseReturnInventoryMovementStatusLabel(preview)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <Summary label="Movement status" value={purchaseReturnInventoryMovementStatusLabel(preview)} />
        <Summary label="Posted at" value={formatOptionalDate(preview.postedAt, "-")} />
        <Summary label="Reversal" value={reversalLabel ?? "-"} />
      </div>

      {movementIds.length > 0 ? (
        <div className="mt-4 rounded-md bg-slate-50 p-3">
          <div className="text-xs uppercase tracking-wide text-steel">Linked stock movement IDs</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {movementIds.map((movementId) => (
              <span key={movementId} className="rounded-md bg-white px-2 py-1 font-mono text-xs text-ink">
                {movementId}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {preview.blockingReasons.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Posting blockers</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {preview.blockingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Line</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Return qty</th>
              <th className="px-4 py-3">On hand</th>
              <th className="px-4 py-3">Projected</th>
              <th className="px-4 py-3">Movement</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                <td className="px-4 py-3 text-steel">{line.item?.name ?? "Non-inventory"}</td>
                <td className="px-4 py-3 text-steel">{line.warehouse ? `${line.warehouse.code} ${line.warehouse.name}` : "-"}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatInventoryQuantity(line.returnQuantity)}</td>
                <td className="px-4 py-3 font-mono text-xs">{line.currentOnHand ? formatInventoryQuantity(line.currentOnHand) : "-"}</td>
                <td className="px-4 py-3 font-mono text-xs">{line.projectedOnHandAfterReturn ? formatInventoryQuantity(line.projectedOnHandAfterReturn) : "-"}</td>
                <td className="px-4 py-3 text-steel">{line.movementRequired ? stockMovementTypeLabel(line.movementType) : "No movement required"}</td>
                <td className="px-4 py-3">
                  <LineStatus line={line} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        {showPostAction ? (
          <button type="button" onClick={onPost} disabled={actionLoading} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            Post inventory return movement
          </button>
        ) : null}
        {!canPost && preview.canPost ? <p className="text-sm text-steel">Posting requires stock movement create permission.</p> : null}
      </div>
    </div>
  );
}

function LineStatus({ line }: { line: PurchaseReturnInventoryMovementPreviewLine }) {
  const label = line.status === "SKIPPED_NON_TRACKED" ? "Skipped" : line.status.charAt(0) + line.status.slice(1).toLowerCase().replaceAll("_", " ");
  return (
    <div>
      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${lineStatusBadgeClass(line.status)}`}>{label}</span>
      {line.stockMovementId ? <p className="mt-1 font-mono text-xs text-steel">{line.stockMovementId}</p> : null}
      {line.blockingReasons.length > 0 ? <p className="mt-1 text-xs leading-5 text-rosewood">{line.blockingReasons.join("; ")}</p> : null}
      {line.warnings.length > 0 ? <p className="mt-1 text-xs leading-5 text-steel">{line.warnings.join("; ")}</p> : null}
    </div>
  );
}

function ActionButton({ label, active, onClick, secondary = false, danger = false }: { label: string; active: boolean; onClick: () => void; secondary?: boolean; danger?: boolean }) {
  const className = danger
    ? "rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
    : secondary
      ? "rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
      : "rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400";
  return (
    <button type="button" onClick={onClick} disabled={active} className={className}>
      {label}
    </button>
  );
}

function outcomeDescription(purchaseReturn: PurchaseReturn): string {
  if (purchaseReturn.status === "DRAFT") return "This draft return is saved for review and can still be edited. It has not moved stock, changed AP, created supplier credits, or posted journals.";
  if (purchaseReturn.status === "SUBMITTED") return "This return is submitted for operational review. Approval is a document status only and does not post accounting or inventory effects.";
  if (purchaseReturn.status === "APPROVED") return "This return is approved as an operational document. Complete it only after the physical/vendor review is done.";
  if (purchaseReturn.status === "COMPLETED") return "This return is completed operationally. Any supplier credit, refund, or stock movement still requires a separate explicit workflow.";
  if (purchaseReturn.status === "VOIDED") return "This approved return was voided as a document state. No journal reversal is needed because the return itself posted no journal.";
  return "This return is cancelled and closed for further workflow actions.";
}

function nextActionDescription(purchaseReturn: PurchaseReturn): string {
  if (purchaseReturn.status === "DRAFT") return "Submit the return when supplier, source, and quantity details are ready.";
  if (purchaseReturn.status === "SUBMITTED") return "Approve or cancel after operational review.";
  if (purchaseReturn.status === "APPROVED") return "Complete or void the approved return as a document state only.";
  return "Use the source links and related document placeholders for follow-up review.";
}

function actionLabel(action: ReturnAction): string {
  const labels: Record<ReturnAction, string> = {
    submit: "submitted",
    approve: "approved",
    complete: "completed",
    cancel: "cancelled",
    void: "voided",
  };
  return labels[action];
}

function sourceLineLabel(line: PurchaseReturnLine): string {
  if (line.sourcePurchaseBillLineId) return `Bill line ${line.sourcePurchaseBillLine?.description ?? line.sourcePurchaseBillLineId}`;
  if (line.sourcePurchaseReceiptLineId) return `Receipt line ${line.sourcePurchaseReceiptLineId}`;
  if (line.sourcePurchaseOrderLineId) return `PO line ${line.sourcePurchaseOrderLine?.description ?? line.sourcePurchaseOrderLineId}`;
  return "Manual";
}

function inventoryMovementStatusBadgeClass(status: PurchaseReturnInventoryMovementPreview["inventoryMovementStatus"]): string {
  if (status === "POSTED") return "bg-emerald-50 text-emerald-700";
  if (status === "BLOCKED") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function lineStatusBadgeClass(status: PurchaseReturnInventoryMovementPreviewLine["status"]): string {
  if (status === "POSTED" || status === "POSTABLE") return "bg-emerald-50 text-emerald-700";
  if (status === "BLOCKED") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function Summary({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      {href ? (
        <Link href={href} className="mt-1 block font-medium text-palm hover:underline">
          {value}
        </Link>
      ) : (
        <div className="mt-1 break-words font-medium text-ink">{value}</div>
      )}
    </div>
  );
}
