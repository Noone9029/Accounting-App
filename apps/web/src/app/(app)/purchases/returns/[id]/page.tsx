"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ValuationVariancePreviewPanel } from "@/components/inventory/valuation-variance-preview-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatusBadge,
  LedgerSummaryBand,
  LedgerLoadingState,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
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
  purchaseReturnStatusLabel,
} from "@/lib/purchase-returns";
import type {
  InventoryValuationVariancePreviewResponse,
  PurchaseReturn,
  PurchaseReturnInventoryMovementPreview,
  PurchaseReturnInventoryMovementPreviewLine,
  PurchaseReturnLine,
  PurchaseReturnStatus,
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title={purchaseReturn?.purchaseReturnNumber ?? "Purchase return"}
        description="Operational supplier return detail and non-posting lifecycle."
        badge={purchaseReturn ? <PurchaseReturnStatusBadge status={purchaseReturn.status} /> : null}
        actions={
          <LedgerActionBar className="sm:justify-end">
            <LedgerButton href="/purchases/returns">
              Back
            </LedgerButton>
            {purchaseReturn && canEditPurchaseReturn(purchaseReturn.status) && canManage ? (
              <LedgerButton href={`/purchases/returns/${purchaseReturn.id}/edit`}>
                Edit
              </LedgerButton>
            ) : null}
            {purchaseReturn?.supplierId ? (
              <LedgerButton href={`/contacts/${purchaseReturn.supplierId}`}>
                Supplier ledger
              </LedgerButton>
            ) : null}
          </LedgerActionBar>
        }
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load purchase returns.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading purchase return" description="Fetching the return document, source links, and operational movement state." /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

      {purchaseReturn ? (
        <div className="space-y-5">
          <PurchaseReturnWorkflowGuidance purchaseReturn={purchaseReturn} canManage={canManage} actionLoading={actionLoading} onAction={runAction} />

          <LedgerPanel>
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
          </LedgerPanel>

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

          <LedgerDataTable minWidth="920px">
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
                    <td className="px-4 py-3">{line.unitCost ? <LedgerMoney>{formatMoneyAmount(line.unitCost, "SAR")}</LedgerMoney> : "-"}</td>
                    <td className="px-4 py-3 text-steel">{sourceLineLabel(line)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-steel">{line.stockMovementId ?? line.stockMovement?.id ?? "-"}</td>
                    <td className="px-4 py-3 text-steel">{line.reason ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
          </LedgerDataTable>

          <LedgerSection title="Accounting and inventory boundary">
            <LedgerSummaryBand tone="warning">{PURCHASE_RETURN_NON_EFFECT_TEXT}</LedgerSummaryBand>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <p className="rounded-md bg-slate-50 p-3 text-steel">Create a purchase debit note separately if supplier credit accounting is required.</p>
              <p className="rounded-md bg-slate-50 p-3 text-steel">Record a supplier refund separately if money is returned.</p>
            </div>
          </LedgerSection>
        </div>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
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
      <LedgerPanel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Return status</h2>
            <p className="mt-1 text-sm leading-6 text-steel">{outcomeDescription(purchaseReturn)}</p>
          </div>
          <PurchaseReturnStatusBadge status={purchaseReturn.status} />
        </div>
        <div className="mt-4">
          <LedgerSummaryBand tone="warning">{PURCHASE_RETURN_NON_EFFECT_TEXT}</LedgerSummaryBand>
        </div>
      </LedgerPanel>
      <LedgerPanel>
        <h2 className="text-base font-semibold text-ink">Next actions</h2>
        <p className="mt-1 text-sm leading-6 text-steel">{nextActionDescription(purchaseReturn)}</p>
        <LedgerActionBar className="mt-4">
          {canManage && canSubmitPurchaseReturn(purchaseReturn.status) ? <ActionButton label="Submit" active={actionLoading} onClick={() => onAction("submit")} /> : null}
          {canManage && canApprovePurchaseReturn(purchaseReturn.status) ? <ActionButton label="Approve" active={actionLoading} onClick={() => onAction("approve")} /> : null}
          {canManage && canCompletePurchaseReturn(purchaseReturn.status) ? <ActionButton label="Complete" active={actionLoading} onClick={() => onAction("complete")} /> : null}
          {canManage && canCancelPurchaseReturn(purchaseReturn.status) ? <ActionButton label="Cancel" active={actionLoading} onClick={() => onAction("cancel")} secondary /> : null}
          {canManage && canVoidPurchaseReturn(purchaseReturn.status) ? <ActionButton label="Void" active={actionLoading} onClick={() => onAction("void")} danger /> : null}
          {purchaseReturn.sourceMatchingReview ? (
            <LedgerButton href="/purchases/matching?reviewStatus=NEEDS_RETURN_REVIEW">
              View matching review
            </LedgerButton>
          ) : null}
        </LedgerActionBar>
      </LedgerPanel>
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
      <LedgerSection title="Inventory return movement">
        <p className="mt-2 text-sm text-steel">Inventory movement preview is unavailable for this return.</p>
      </LedgerSection>
    );
  }

  const reversalLabel = purchaseReturnInventoryMovementReversalLabel(preview);
  const movementIds = preview.movementIds.length > 0 ? preview.movementIds : preview.lines.map((line) => line.stockMovementId).filter((value): value is string => Boolean(value));
  const showPostAction = canPostPurchaseReturnInventoryMovement(preview, canPost);

  return (
    <LedgerPanel>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Inventory return movement</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{preview.safeHelperText}</p>
        </div>
        <LedgerStatusBadge tone={inventoryMovementStatusTone(preview.inventoryMovementStatus)}>{purchaseReturnInventoryMovementStatusLabel(preview)}</LedgerStatusBadge>
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
        <LedgerAlert tone="warning" title="Posting blockers">
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {preview.blockingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </LedgerAlert>
      ) : null}

      <LedgerDataTable minWidth="900px" className="mt-4 shadow-none">
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
      </LedgerDataTable>

      <LedgerActionBar className="mt-4">
        {showPostAction ? (
          <LedgerButton type="button" onClick={onPost} disabled={actionLoading} variant="primary">
            {actionLoading ? "Posting..." : "Post inventory return movement"}
          </LedgerButton>
        ) : null}
        {!canPost && preview.canPost ? <p className="text-sm text-steel">Posting requires stock movement create permission.</p> : null}
      </LedgerActionBar>
    </LedgerPanel>
  );
}

function LineStatus({ line }: { line: PurchaseReturnInventoryMovementPreviewLine }) {
  const label = line.status === "SKIPPED_NON_TRACKED" ? "Skipped" : line.status.charAt(0) + line.status.slice(1).toLowerCase().replaceAll("_", " ");
  return (
    <div>
      <LedgerStatusBadge tone={lineStatusTone(line.status)}>{label}</LedgerStatusBadge>
      {line.stockMovementId ? <p className="mt-1 font-mono text-xs text-steel">{line.stockMovementId}</p> : null}
      {line.blockingReasons.length > 0 ? <p className="mt-1 text-xs leading-5 text-rosewood">{line.blockingReasons.join("; ")}</p> : null}
      {line.warnings.length > 0 ? <p className="mt-1 text-xs leading-5 text-steel">{line.warnings.join("; ")}</p> : null}
    </div>
  );
}

function ActionButton({ label, active, onClick, secondary = false, danger = false }: { label: string; active: boolean; onClick: () => void; secondary?: boolean; danger?: boolean }) {
  return (
    <LedgerButton type="button" onClick={onClick} disabled={active} variant={danger ? "danger" : secondary ? "secondary" : "primary"}>
      {label}
    </LedgerButton>
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

function PurchaseReturnStatusBadge({ status }: { status: PurchaseReturnStatus }) {
  return <LedgerStatusBadge tone={purchaseReturnStatusTone(status)}>{purchaseReturnStatusLabel(status)}</LedgerStatusBadge>;
}

function purchaseReturnStatusTone(status: PurchaseReturnStatus | undefined | null): LedgerStatusTone {
  if (status === "COMPLETED") return "success";
  if (status === "APPROVED" || status === "SUBMITTED") return "info";
  if (status === "DRAFT") return "warning";
  if (status === "VOIDED" || status === "CANCELLED") return "danger";
  return "neutral";
}

function inventoryMovementStatusTone(status: PurchaseReturnInventoryMovementPreview["inventoryMovementStatus"]): LedgerStatusTone {
  if (status === "POSTED") return "success";
  if (status === "BLOCKED") return "danger";
  return "warning";
}

function lineStatusTone(status: PurchaseReturnInventoryMovementPreviewLine["status"]): LedgerStatusTone {
  if (status === "POSTED" || status === "POSTABLE") return "success";
  if (status === "BLOCKED") return "danger";
  return "neutral";
}

function Summary({ label, value, href }: { label: string; value: string; href?: string }) {
  let content = <div className="mt-1 break-words font-medium text-ink">{value}</div>;
  if (href) {
    content = (
      <Link href={href} className="mt-1 inline-block font-medium text-palm hover:underline">
        {value}
      </Link>
    );
  } else if (label.toLowerCase().includes("date") || label.toLowerCase().endsWith("at")) {
    content = (
      <div className="mt-1">
        <LedgerDate>{value}</LedgerDate>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      {content}
    </div>
  );
}
