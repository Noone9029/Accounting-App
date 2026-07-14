"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerActionDialog } from "@/components/ui-ledger/action-dialog";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDateTime } from "@/lib/app-i18n";
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
  salesInventoryReturnStatusBadgeClass,
  salesInventoryReturnStatusLabel,
} from "@/lib/sales-inventory-returns";
import type { SalesInventoryReturn, SalesInventoryReturnInventoryMovementPreview, SalesInventoryReturnInventoryMovementPreviewLine, SalesInventoryReturnLine } from "@/lib/types";

type SalesInventoryReturnAction = "submit" | "approve" | "receive" | "cancel" | "void";

export default function SalesInventoryReturnDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [salesReturn, setSalesReturn] = useState<SalesInventoryReturn | null>(null);
  const [inventoryPreview, setInventoryPreview] = useState<SalesInventoryReturnInventoryMovementPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [movementActionLoading, setMovementActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingAction, setPendingAction] = useState<"cancel" | "void" | "post-movement" | null>(null);
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
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : tc("Unable to load sales inventory return."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, params.id, tc]);

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

  async function runAction(action: SalesInventoryReturnAction): Promise<boolean> {
    if (!salesReturn) return false;
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<SalesInventoryReturn>(`/sales-inventory-returns/${salesReturn.id}/${action}`, { method: "POST" });
      setSalesReturn(updated);
      setSuccess(tc("Sales inventory return {number} {status}.", { number: updated.salesReturnNumber, status: tc(actionLabel(action)).toLowerCase() }));
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to {action} sales inventory return.", { action: tc(action) }));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function postInventoryReturnMovement(): Promise<boolean> {
    if (!salesReturn) return false;
    setMovementActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<SalesInventoryReturn>(`/sales-inventory-returns/${salesReturn.id}/post-inventory-return`, { method: "POST" });
      setSalesReturn(updated);
      setSuccess(tc("Inventory return movement posted for {number}.", { number: updated.salesReturnNumber }));
      if (canViewInventory) {
        const preview = await apiRequest<SalesInventoryReturnInventoryMovementPreview>(`/sales-inventory-returns/${salesReturn.id}/inventory-return-preview`);
        setInventoryPreview(preview);
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
          <h1 className="text-2xl font-semibold text-ink">{salesReturn ? <bdi dir="ltr">{salesReturn.salesReturnNumber}</bdi> : tc("Sales inventory return")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{tc("Customer stock return detail with explicit operational stock-in movement.")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/sales/inventory-returns" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
          {salesReturn && canEditSalesInventoryReturn(salesReturn.status) && canManage ? (
            <Link href={`/sales/inventory-returns/${salesReturn.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Edit")}
            </Link>
          ) : null}
          {salesReturn?.customerId ? (
            <Link href={`/customers/${salesReturn.customerId}`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Customer activity")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load sales inventory returns.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading sales inventory return...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {salesReturn ? (
        <div className="mt-5 space-y-5">
          <SalesInventoryReturnWorkflowGuidance
            salesReturn={salesReturn}
            canManage={canManage}
            actionLoading={actionLoading}
            onAction={(action) => {
              if (action === "cancel" || action === "void") {
                setPendingAction(action);
              } else {
                void runAction(action);
              }
            }}
          />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label={tc("Customer")} value={salesReturn.customer?.displayName ?? salesReturn.customer?.name ?? "-"} href={`/customers/${salesReturn.customerId}`} />
              <Summary label={tc("Status")} value={tc(salesInventoryReturnStatusLabel(salesReturn.status))} />
              <Summary label={tc("Return date")} value={formatAppDateTime(salesReturn.returnDate, locale, "-")} />
              <Summary label={tc("Reference")} value={salesReturn.reference ? <bdi dir="ltr">{salesReturn.reference}</bdi> : "-"} />
              <Summary label={tc("Source")} value={sourceLabel(salesReturn, tc)} href={salesInventoryReturnSourceHref(salesReturn) ?? undefined} />
              <Summary label={tc("Movement")} value={tc(salesInventoryReturnMovementStatusLabel(inventoryPreview ?? salesReturn))} />
              <Summary label={tc("Movement posted at")} value={formatAppDateTime(inventoryPreview?.postedAt ?? salesReturn.inventoryReturnPostedAt, locale, "-")} />
              <Summary label={tc("Approved at")} value={formatAppDateTime(salesReturn.approvedAt, locale, "-")} />
              <Summary label={tc("Received at")} value={formatAppDateTime(salesReturn.receivedAt, locale, "-")} />
              <Summary label={tc("Credit note link")} value={salesReturn.sourceCreditNote?.creditNoteNumber ? <bdi dir="ltr">{salesReturn.sourceCreditNote.creditNoteNumber}</bdi> : tc("Separate document")} href={salesReturn.sourceCreditNote ? `/sales/credit-notes/${salesReturn.sourceCreditNote.id}` : undefined} />
              <Summary label={tc("Refund link")} value={tc("Separate customer refund workflow")} />
              <Summary label={tc("Notes")} value={salesReturn.notes ?? "-"} />
            </div>
          </div>

          {canViewInventory ? (
            <SalesInventoryReturnInventoryMovementPanel
              preview={inventoryPreview}
              canPost={canPostMovement}
              actionLoading={movementActionLoading}
              onPost={() => setPendingAction("post-movement")}
            />
          ) : null}

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[980px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Description")}</th>
                  <th className="px-4 py-3">{tc("Item")}</th>
                  <th className="px-4 py-3">{tc("Quantity")}</th>
                  <th className="px-4 py-3">{tc("Warehouse")}</th>
                  <th className="px-4 py-3">{tc("Source line")}</th>
                  <th className="px-4 py-3">{tc("Stock movement")}</th>
                  <th className="px-4 py-3">{tc("Reason")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(salesReturn.lines ?? []).map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.item ? <><bdi dir="ltr">{line.item.sku ? `${line.item.sku} - ` : ""}</bdi>{line.item.name}</> : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatInventoryQuantity(line.quantity)}</td>
                    <td className="px-4 py-3 text-steel">{line.warehouse ? <><bdi dir="ltr">{line.warehouse.code}</bdi> {line.warehouse.name}</> : "-"}</td>
                    <td className="px-4 py-3 text-steel">{tc(lineSourceLabel(line))}</td>
                    <td className="px-4 py-3 font-mono text-xs text-steel">{line.stockMovementId ?? line.stockMovement?.id ? <bdi dir="ltr">{line.stockMovementId ?? line.stockMovement?.id}</bdi> : "-"}</td>
                    <td className="px-4 py-3 text-steel">{line.reason ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">{tc("Accounting and customer balance boundary")}</h2>
            <p className="mt-2 text-sm leading-6 text-steel">{tc(SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT)}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <p className="rounded-md bg-slate-50 p-3 text-steel">{tc("Create a credit note separately if customer credit accounting is required.")}</p>
              <p className="rounded-md bg-slate-50 p-3 text-steel">{tc("Create a customer refund separately if money is returned.")}</p>
            </div>
          </div>
        </div>
      ) : null}

      <LedgerActionDialog
        open={Boolean(pendingAction && salesReturn)}
        onOpenChange={(open) => {
          if (!open && !actionLoading && !movementActionLoading) {
            setPendingAction(null);
          }
        }}
        tone="danger"
        title={pendingAction === "post-movement" ? tc("Post inventory return movement") : pendingAction === "void" ? tc("Void sales inventory return") : tc("Cancel sales inventory return")}
        description={
          salesReturn
            ? pendingAction === "post-movement"
              ? `${tc(SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT)} ${tc("Post operational stock-in movement for {number}?", { number: salesReturn.salesReturnNumber })}`
              : tc("{action} sales inventory return {number}?", { action: tc(pendingAction === "void" ? "Void" : "Cancel"), number: salesReturn.salesReturnNumber })
            : ""
        }
        confirmLabel={pendingAction === "post-movement" ? tc("Post movement") : pendingAction === "void" ? tc("Void") : tc("Cancel")}
        busy={actionLoading || movementActionLoading}
        onConfirm={async () => {
          const succeeded = pendingAction === "post-movement" ? await postInventoryReturnMovement() : pendingAction ? await runAction(pendingAction) : false;
          if (succeeded) {
            setPendingAction(null);
          }
        }}
      />
    </section>
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
  const { tc } = useAppLocale();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">{tc("Return status")}</h2>
            <p className="mt-1 text-sm leading-6 text-steel">{tc(outcomeDescription(salesReturn))}</p>
          </div>
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${salesInventoryReturnStatusBadgeClass(salesReturn.status)}`}>
            {tc(salesInventoryReturnStatusLabel(salesReturn.status))}
          </span>
        </div>
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{tc(SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT)}</div>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">{tc("Next actions")}</h2>
        <p className="mt-1 text-sm leading-6 text-steel">{tc(nextActionDescription(salesReturn))}</p>
        <div className="mt-4 flex flex-col gap-2">
          {canManage && canSubmitSalesInventoryReturn(salesReturn.status) ? <ActionButton label={tc("Submit")} active={actionLoading} onClick={() => onAction("submit")} /> : null}
          {canManage && canApproveSalesInventoryReturn(salesReturn.status) ? <ActionButton label={tc("Approve")} active={actionLoading} onClick={() => onAction("approve")} /> : null}
          {canManage && canReceiveSalesInventoryReturn(salesReturn.status) ? <ActionButton label={tc("Receive")} active={actionLoading} onClick={() => onAction("receive")} /> : null}
          {canManage && canCancelSalesInventoryReturn(salesReturn.status) ? <ActionButton label={tc("Cancel")} active={actionLoading} onClick={() => onAction("cancel")} secondary /> : null}
          {canManage && canVoidSalesInventoryReturn(salesReturn.status) ? <ActionButton label={tc("Void")} active={actionLoading} onClick={() => onAction("void")} danger /> : null}
        </div>
      </div>
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
  const { locale, tc } = useAppLocale();

  if (!preview) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">{tc("Inventory return movement")}</h2>
        <p className="mt-2 text-sm text-steel">{tc("Inventory movement preview is unavailable for this return.")}</p>
      </div>
    );
  }

  const movementIds = preview.movementIds.length > 0 ? preview.movementIds : preview.lines.map((line) => line.stockMovementId).filter((value): value is string => Boolean(value));
  const showPostAction = canPostSalesInventoryReturnMovement(preview, canPost);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc("Inventory return movement")}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{tc(preview.safeHelperText)}</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${inventoryMovementStatusBadgeClass(preview.inventoryMovementStatus)}`}>
          {tc(salesInventoryReturnMovementStatusLabel(preview))}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <Summary label={tc("Movement status")} value={tc(salesInventoryReturnMovementStatusLabel(preview))} />
        <Summary label={tc("Posted at")} value={formatAppDateTime(preview.postedAt, locale, "-")} />
        <Summary label={tc("Reversal")} value={preview.alreadyPosted ? tc("Reversal not supported yet") : "-"} />
      </div>

      {movementIds.length > 0 ? (
        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
          <div className="font-medium text-ink">{tc("Linked stock movement IDs")}</div>
          <div className="mt-1 font-mono text-xs text-steel">
            <bdi dir="ltr">{movementIds.join(", ")}</bdi>
          </div>
        </div>
      ) : null}

      {preview.blockingReasons.length > 0 ? (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{preview.blockingReasons.map((reason) => tc(reason)).join(" ")}</div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[920px] text-start text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-3 py-2">{tc("Item")}</th>
              <th className="px-3 py-2">{tc("Warehouse")}</th>
              <th className="px-3 py-2">{tc("Return qty")}</th>
              <th className="px-3 py-2">{tc("On hand")}</th>
              <th className="px-3 py-2">{tc("Projected")}</th>
              <th className="px-3 py-2">{tc("Movement")}</th>
              <th className="px-3 py-2">{tc("Status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.lines.map((line) => (
              <PreviewLineRow key={line.lineId} line={line} />
            ))}
          </tbody>
        </table>
      </div>

      {showPostAction ? (
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onPost} disabled={actionLoading} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {actionLoading ? tc("Posting...") : tc("Post inventory return movement")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PreviewLineRow({ line }: { line: SalesInventoryReturnInventoryMovementPreviewLine }) {
  const { tc } = useAppLocale();

  return (
    <tr>
      <td className="px-3 py-2 text-ink">{line.item ? <><bdi dir="ltr">{line.item.sku ? `${line.item.sku} - ` : ""}</bdi>{line.item.name}</> : line.description}</td>
      <td className="px-3 py-2 text-steel">{line.warehouse ? <><bdi dir="ltr">{line.warehouse.code}</bdi> {line.warehouse.name}</> : "-"}</td>
      <td className="px-3 py-2 font-mono text-xs">{formatInventoryQuantity(line.returnQuantity)}</td>
      <td className="px-3 py-2 font-mono text-xs">{line.currentOnHand ? formatInventoryQuantity(line.currentOnHand) : "-"}</td>
      <td className="px-3 py-2 font-mono text-xs">{line.projectedOnHandAfterReturn ? formatInventoryQuantity(line.projectedOnHandAfterReturn) : "-"}</td>
      <td className="px-3 py-2 text-steel">{tc(stockMovementTypeLabel(line.movementType))}</td>
      <td className="px-3 py-2 text-steel">{tc(previewLineStatusLabel(line))}</td>
    </tr>
  );
}

function Summary({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-steel">{label}</div>
      {href ? (
        <Link href={href} className="mt-1 inline-block text-sm font-medium text-palm hover:underline">
          {value}
        </Link>
      ) : (
        <div className="mt-1 text-sm text-ink">{value}</div>
      )}
    </div>
  );
}

function ActionButton({ label, active, onClick, secondary = false, danger = false }: { label: string; active: boolean; onClick: () => void; secondary?: boolean; danger?: boolean }) {
  const classes = danger
    ? "border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
    : secondary
      ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      : "border-palm bg-palm text-white hover:bg-teal-800";
  return (
    <button type="button" onClick={onClick} disabled={active} className={`rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${classes}`}>
      {label}
    </button>
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

function sourceLabel(salesReturn: SalesInventoryReturn, tc: (value: string, params?: Record<string, string | number>) => string): ReactNode {
  if (salesReturn.sourceSalesStockIssue) return <>{tc("Stock issue")} <bdi dir="ltr">{salesReturn.sourceSalesStockIssue.issueNumber}</bdi></>;
  if (salesReturn.sourceDeliveryNote) return <>{tc("Delivery note")} <bdi dir="ltr">{salesReturn.sourceDeliveryNote.deliveryNoteNumber}</bdi></>;
  if (salesReturn.sourceSalesInvoice) return <>{tc("Invoice")} <bdi dir="ltr">{salesReturn.sourceSalesInvoice.invoiceNumber}</bdi></>;
  if (salesReturn.sourceCreditNote) return <>{tc("Credit note")} <bdi dir="ltr">{salesReturn.sourceCreditNote.creditNoteNumber}</bdi></>;
  return tc(salesInventoryReturnSourceLabel(salesReturn));
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

function inventoryMovementStatusBadgeClass(status: SalesInventoryReturnInventoryMovementPreview["inventoryMovementStatus"]): string {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";
    case "BLOCKED":
      return "bg-rose-50 text-rose-700";
    case "NOT_POSTED":
      return "bg-amber-50 text-amber-700";
  }
}
