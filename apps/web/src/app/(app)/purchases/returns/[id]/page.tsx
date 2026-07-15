"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { ValuationVariancePreviewPanel } from "@/components/inventory/valuation-variance-preview-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerActionDialog } from "@/components/ui-ledger/action-dialog";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { formatInventoryQuantity, inventoryValuationVariancePreviewUrl, stockMovementTypeLabel } from "@/lib/inventory";
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
  const { locale, tc } = useAppLocale();
  const [purchaseReturn, setPurchaseReturn] = useState<PurchaseReturn | null>(null);
  const [valuationVariancePreview, setValuationVariancePreview] = useState<InventoryValuationVariancePreviewResponse | null>(null);
  const [inventoryMovementPreview, setInventoryMovementPreview] = useState<PurchaseReturnInventoryMovementPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [movementActionLoading, setMovementActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingAction, setPendingAction] = useState<"cancel" | "void" | "post-movement" | null>(null);
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
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : tc("Unable to load purchase return."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, params.id, tc]);

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

  async function runAction(action: ReturnAction): Promise<boolean> {
    if (!purchaseReturn) return false;
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PurchaseReturn>(`/purchase-returns/${purchaseReturn.id}/${action}`, { method: "POST" });
      setPurchaseReturn(updated);
      setSuccess(tc("Purchase return {number} {action}.", { number: updated.purchaseReturnNumber, action: tc(actionLabel(action)) }));
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to {action} purchase return.", { action: tc(action) }));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function postInventoryReturnMovement(): Promise<boolean> {
    if (!purchaseReturn) return false;
    setMovementActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PurchaseReturn>(`/purchase-returns/${purchaseReturn.id}/post-inventory-return`, { method: "POST" });
      setPurchaseReturn(updated);
      setSuccess(tc("Inventory return movement posted for {number}.", { number: updated.purchaseReturnNumber }));
      if (canViewInventoryMovement) {
        const preview = await apiRequest<PurchaseReturnInventoryMovementPreview>(`/purchase-returns/${purchaseReturn.id}/inventory-return-preview`);
        setInventoryMovementPreview(preview);
      }
      return true;
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : tc("Unable to post inventory return movement."));
      return false;
    } finally {
      setMovementActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{purchaseReturn?.purchaseReturnNumber ? <bdi dir="ltr">{purchaseReturn.purchaseReturnNumber}</bdi> : tc("Purchase return")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Operational supplier return detail and non-posting lifecycle.")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/purchases/returns" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
          {purchaseReturn && canEditPurchaseReturn(purchaseReturn.status) && canManage ? (
            <Link href={`/purchases/returns/${purchaseReturn.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Edit")}
            </Link>
          ) : null}
          {purchaseReturn?.supplierId ? (
            <Link href={`/contacts/${purchaseReturn.supplierId}`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Supplier ledger")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load purchase returns.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading purchase return...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {purchaseReturn ? (
        <div className="mt-5 space-y-5">
          <PurchaseReturnWorkflowGuidance purchaseReturn={purchaseReturn} canManage={canManage} actionLoading={actionLoading} onAction={(action) => { if (action === "cancel" || action === "void") setPendingAction(action); else void runAction(action); }} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label={tc("Supplier")} value={purchaseReturn.supplier?.displayName ?? purchaseReturn.supplier?.name ?? "-"} />
              <Summary label={tc("Status")} value={tc(purchaseReturnStatusLabel(purchaseReturn.status))} />
              <Summary label={tc("Return date")} value={formatAppDate(purchaseReturn.returnDate, locale, "-")} />
              <Summary label={tc("Reference")} value={purchaseReturn.reference ? <bdi dir="ltr">{purchaseReturn.reference}</bdi> : "-"} />
              <Summary label={tc("Source")} value={tc(purchaseReturnSourceLabel(purchaseReturn))} href={purchaseReturnSourceHref(purchaseReturn) ?? undefined} />
              <Summary label={tc("Reason")} value={purchaseReturn.reason ?? "-"} />
              <Summary label={tc("Approved at")} value={formatAppDate(purchaseReturn.approvedAt, locale, "-")} />
              <Summary label={tc("Completed at")} value={formatAppDate(purchaseReturn.completedAt, locale, "-")} />
              <Summary label={tc("Related debit note")} value={purchaseReturn.relatedPurchaseDebitNote?.debitNoteNumber ? <bdi dir="ltr">{purchaseReturn.relatedPurchaseDebitNote.debitNoteNumber}</bdi> : "-"} href={purchaseReturn.relatedPurchaseDebitNote ? `/purchases/debit-notes/${purchaseReturn.relatedPurchaseDebitNote.id}` : undefined} />
              <Summary label={tc("Related supplier refund")} value={purchaseReturn.relatedSupplierRefund?.refundNumber ? <bdi dir="ltr">{purchaseReturn.relatedSupplierRefund.refundNumber}</bdi> : "-"} href={purchaseReturn.relatedSupplierRefund ? `/purchases/supplier-refunds/${purchaseReturn.relatedSupplierRefund.id}` : undefined} />
              <Summary label={tc("Matching review")} value={purchaseReturn.sourceMatchingReview ? tc(purchaseReturn.sourceMatchingReview.status) : "-"} href={purchaseReturn.sourceMatchingReview ? "/purchases/matching?reviewStatus=NEEDS_RETURN_REVIEW" : undefined} />
              <Summary label={tc("Inventory movement")} value={tc(purchaseReturnInventoryMovementStatusLabel(inventoryMovementPreview ?? purchaseReturn))} />
              <Summary label={tc("Movement posted at")} value={formatAppDate(inventoryMovementPreview?.postedAt ?? purchaseReturn.inventoryReturnPostedAt ?? null, locale, "-")} />
              <Summary label={tc("Notes")} value={purchaseReturn.notes ?? "-"} />
            </div>
          </div>

          {canViewInventoryMovement ? (
            <PurchaseReturnInventoryMovementPanel
              preview={inventoryMovementPreview}
              canPost={canPostInventoryMovement}
              actionLoading={movementActionLoading}
              onPost={() => setPendingAction("post-movement")}
            />
          ) : null}

          {canViewValuationVariances ? (
            <ValuationVariancePreviewPanel
              preview={valuationVariancePreview}
              href={inventoryValuationVariancePreviewUrl({ search: purchaseReturn.purchaseReturnNumber, sourceType: "purchaseReturn" })}
            />
          ) : null}

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[920px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Description")}</th>
                  <th className="px-4 py-3">{tc("Quantity")}</th>
                  <th className="px-4 py-3">{tc("Unit cost")}</th>
                  <th className="px-4 py-3">{tc("Source line")}</th>
                  <th className="px-4 py-3">{tc("Stock movement")}</th>
                  <th className="px-4 py-3">{tc("Reason")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseReturn.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.unitCost ? formatAppMoney(line.unitCost, "SAR", locale) : "-"}</td>
                  <td className="px-4 py-3 text-steel">{sourceLineLabel(line, tc)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-steel">{line.stockMovementId || line.stockMovement?.id ? <bdi dir="ltr">{line.stockMovementId ?? line.stockMovement?.id}</bdi> : "-"}</td>
                    <td className="px-4 py-3 text-steel">{line.reason ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">{tc("Accounting and inventory boundary")}</h2>
            <p className="mt-2 text-sm leading-6 text-steel">{tc(PURCHASE_RETURN_NON_EFFECT_TEXT)}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <p className="rounded-md bg-slate-50 p-3 text-steel">{tc("Create a purchase debit note separately if supplier credit accounting is required.")}</p>
              <p className="rounded-md bg-slate-50 p-3 text-steel">{tc("Record a supplier refund separately if money is returned.")}</p>
            </div>
          </div>
        </div>
      ) : null}
      <LedgerActionDialog
        open={Boolean(pendingAction && purchaseReturn)}
        onOpenChange={(open) => { if (!open && !actionLoading && !movementActionLoading) setPendingAction(null); }}
        tone="danger"
        title={pendingAction === "post-movement" ? tc("Post inventory return movement") : pendingAction === "void" ? tc("Void purchase return") : tc("Cancel purchase return")}
        description={purchaseReturn ? pendingAction === "post-movement" ? `${tc(PURCHASE_RETURN_INVENTORY_MOVEMENT_HELPER_TEXT)} ${tc("Post inventory return movement for {number}?", { number: purchaseReturn.purchaseReturnNumber })}` : tc("{action} purchase return {number}?", { action: tc(pendingAction === "void" ? "Void" : "Cancel"), number: purchaseReturn.purchaseReturnNumber }) : ""}
        confirmLabel={pendingAction === "post-movement" ? tc("Post movement") : pendingAction === "void" ? tc("Void") : tc("Cancel")}
        busy={actionLoading || movementActionLoading}
        onConfirm={async () => {
          const succeeded = pendingAction === "post-movement" ? await postInventoryReturnMovement() : pendingAction ? await runAction(pendingAction) : false;
          if (succeeded) setPendingAction(null);
        }}
      />
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
  const { tc } = useAppLocale();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">{tc("What happened?")}</h2>
            <p className="mt-1 text-sm leading-6 text-steel">{tc(outcomeDescription(purchaseReturn))}</p>
          </div>
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${purchaseReturnStatusBadgeClass(purchaseReturn.status)}`}>
            {tc(purchaseReturnStatusLabel(purchaseReturn.status))}
          </span>
        </div>
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{tc(PURCHASE_RETURN_NON_EFFECT_TEXT)}</div>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">{tc("Next actions")}</h2>
        <p className="mt-1 text-sm leading-6 text-steel">{tc(nextActionDescription(purchaseReturn))}</p>
        <div className="mt-4 flex flex-col gap-2">
          {canManage && canSubmitPurchaseReturn(purchaseReturn.status) ? <ActionButton label="Submit" active={actionLoading} onClick={() => onAction("submit")} /> : null}
          {canManage && canApprovePurchaseReturn(purchaseReturn.status) ? <ActionButton label="Approve" active={actionLoading} onClick={() => onAction("approve")} /> : null}
          {canManage && canCompletePurchaseReturn(purchaseReturn.status) ? <ActionButton label="Complete" active={actionLoading} onClick={() => onAction("complete")} /> : null}
          {canManage && canCancelPurchaseReturn(purchaseReturn.status) ? <ActionButton label="Cancel" active={actionLoading} onClick={() => onAction("cancel")} secondary /> : null}
          {canManage && canVoidPurchaseReturn(purchaseReturn.status) ? <ActionButton label="Void" active={actionLoading} onClick={() => onAction("void")} danger /> : null}
          {purchaseReturn.sourceMatchingReview ? (
            <Link href="/purchases/matching?reviewStatus=NEEDS_RETURN_REVIEW" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("View matching review")}
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
  const { locale, tc } = useAppLocale();

  if (!preview) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">{tc("Inventory return movement")}</h2>
        <p className="mt-2 text-sm text-steel">{tc("Inventory movement preview is unavailable for this return.")}</p>
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
          <h2 className="text-base font-semibold text-ink">{tc("Inventory return movement")}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{tc(preview.safeHelperText)}</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${inventoryMovementStatusBadgeClass(preview.inventoryMovementStatus)}`}>
          {tc(purchaseReturnInventoryMovementStatusLabel(preview))}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <Summary label={tc("Movement status")} value={tc(purchaseReturnInventoryMovementStatusLabel(preview))} />
        <Summary label={tc("Posted at")} value={formatAppDate(preview.postedAt, locale, "-")} />
        <Summary label={tc("Reversal")} value={reversalLabel ? tc(reversalLabel) : "-"} />
      </div>

      {movementIds.length > 0 ? (
        <div className="mt-4 rounded-md bg-slate-50 p-3">
          <div className="text-xs uppercase tracking-wide text-steel">{tc("Linked stock movement IDs")}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {movementIds.map((movementId) => (
              <span key={movementId} className="rounded-md bg-white px-2 py-1 font-mono text-xs text-ink">
                <bdi dir="ltr">{movementId}</bdi>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {preview.blockingReasons.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">{tc("Posting blockers")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {preview.blockingReasons.map((reason) => (
              <li key={reason}>{tc(reason)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[900px] text-start text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">{tc("Line")}</th>
              <th className="px-4 py-3">{tc("Item")}</th>
              <th className="px-4 py-3">{tc("Warehouse")}</th>
              <th className="px-4 py-3">{tc("Return qty")}</th>
              <th className="px-4 py-3">{tc("On hand")}</th>
              <th className="px-4 py-3">{tc("Projected")}</th>
              <th className="px-4 py-3">{tc("Movement")}</th>
              <th className="px-4 py-3">{tc("Status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                <td className="px-4 py-3 text-steel">{line.item?.name ?? tc("Non-inventory")}</td>
                <td className="px-4 py-3 text-steel">{line.warehouse ? <><bdi dir="ltr">{line.warehouse.code}</bdi> {line.warehouse.name}</> : "-"}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatInventoryQuantity(line.returnQuantity)}</td>
                <td className="px-4 py-3 font-mono text-xs">{line.currentOnHand ? formatInventoryQuantity(line.currentOnHand) : "-"}</td>
                <td className="px-4 py-3 font-mono text-xs">{line.projectedOnHandAfterReturn ? formatInventoryQuantity(line.projectedOnHandAfterReturn) : "-"}</td>
                <td className="px-4 py-3 text-steel">{line.movementRequired ? tc(stockMovementTypeLabel(line.movementType)) : tc("No movement required")}</td>
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
            {tc("Post inventory return movement")}
          </button>
        ) : null}
        {!canPost && preview.canPost ? <p className="text-sm text-steel">{tc("Posting requires stock movement create permission.")}</p> : null}
      </div>
    </div>
  );
}

function LineStatus({ line }: { line: PurchaseReturnInventoryMovementPreviewLine }) {
  const { tc } = useAppLocale();
  const label = line.status === "SKIPPED_NON_TRACKED" ? "Skipped" : line.status.charAt(0) + line.status.slice(1).toLowerCase().replaceAll("_", " ");
  return (
    <div>
      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${lineStatusBadgeClass(line.status)}`}>{tc(label)}</span>
      {line.stockMovementId ? <p className="mt-1 font-mono text-xs text-steel"><bdi dir="ltr">{line.stockMovementId}</bdi></p> : null}
      {line.blockingReasons.length > 0 ? <p className="mt-1 text-xs leading-5 text-rosewood">{line.blockingReasons.map((reason) => tc(reason)).join("; ")}</p> : null}
      {line.warnings.length > 0 ? <p className="mt-1 text-xs leading-5 text-steel">{line.warnings.map((warning) => tc(warning)).join("; ")}</p> : null}
    </div>
  );
}

function ActionButton({ label, active, onClick, secondary = false, danger = false }: { label: string; active: boolean; onClick: () => void; secondary?: boolean; danger?: boolean }) {
  const { tc } = useAppLocale();
  const className = danger
    ? "rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
    : secondary
      ? "rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
      : "rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400";
  return (
    <button type="button" onClick={onClick} disabled={active} className={className}>
      {tc(label)}
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

function sourceLineLabel(line: PurchaseReturnLine, tc: (value: string, params?: Record<string, string | number>) => string): ReactNode {
  if (line.sourcePurchaseBillLineId) {
    return tc("Bill line {line}", { line: line.sourcePurchaseBillLine?.description ?? line.sourcePurchaseBillLineId });
  }
  if (line.sourcePurchaseReceiptLineId) {
    return (
      <>
        {tc("Receipt line")} <bdi dir="ltr">{line.sourcePurchaseReceiptLineId}</bdi>
      </>
    );
  }
  if (line.sourcePurchaseOrderLineId) {
    return tc("PO line {line}", { line: line.sourcePurchaseOrderLine?.description ?? line.sourcePurchaseOrderLineId });
  }
  return tc("Manual");
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

function Summary({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
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
