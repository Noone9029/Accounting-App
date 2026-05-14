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
  accountingPreviewCanPost,
  accountingPreviewLineDisplay,
  canShowPostCogsAction,
  canShowReverseCogsAction,
  canVoidPostedStockDocument,
  cogsPostingFinancialReportWarning,
  cogsPostingStatus,
  formatInventoryQuantity,
  inventoryOperationalWarning,
  stockDocumentStatusBadgeClass,
  stockDocumentStatusLabel,
  stockMovementTypeLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { SalesStockIssue, SalesStockIssueAccountingPreview, SalesStockIssueLine } from "@/lib/types";

export default function SalesStockIssueDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [issue, setIssue] = useState<SalesStockIssue | null>(null);
  const [preview, setPreview] = useState<SalesStockIssueAccountingPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [postingCogs, setPostingCogs] = useState(false);
  const [reversingCogs, setReversingCogs] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canVoid = can(PERMISSIONS.salesStockIssue.create);
  const canPostCogs = can(PERMISSIONS.inventory.cogsPost);
  const canReverseCogs = can(PERMISSIONS.inventory.cogsReverse);

  useEffect(() => {
    if (!organizationId || !params.id) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    setPreviewError("");

    Promise.all([
      apiRequest<SalesStockIssue>(`/sales-stock-issues/${params.id}`),
      apiRequest<SalesStockIssueAccountingPreview>(`/sales-stock-issues/${params.id}/accounting-preview`),
    ])
      .then(([issueResult, previewResult]) => {
        if (!cancelled) {
          setIssue(issueResult);
          setPreview(previewResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load sales stock issue.");
          setPreviewError(loadError instanceof Error ? loadError.message : "Unable to load COGS preview.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, params.id, reloadToken]);

  async function voidIssue() {
    if (!issue || !window.confirm(`Void sales stock issue ${issue.issueNumber}?`)) return;
    setVoiding(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<SalesStockIssue>(`/sales-stock-issues/${issue.id}/void`, { method: "POST" });
      setIssue(updated);
      setSuccess(`${updated.issueNumber} has been voided.`);
      setReloadToken((current) => current + 1);
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : "Unable to void sales stock issue.");
    } finally {
      setVoiding(false);
    }
  }

  async function postCogs() {
    if (!issue || !window.confirm(`Post COGS for ${issue.issueNumber}? ${cogsPostingFinancialReportWarning()}`)) return;
    setPostingCogs(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<SalesStockIssue>(`/sales-stock-issues/${issue.id}/post-cogs`, { method: "POST" });
      setIssue(updated);
      setSuccess(`COGS has been posted for ${updated.issueNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "Unable to post COGS.");
    } finally {
      setPostingCogs(false);
    }
  }

  async function reverseCogs() {
    if (!issue || !window.confirm(`Reverse COGS for ${issue.issueNumber}? This creates a reversal journal entry.`)) return;
    setReversingCogs(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<SalesStockIssue>(`/sales-stock-issues/${issue.id}/reverse-cogs`, { method: "POST", body: {} });
      setIssue(updated);
      setSuccess(`COGS has been reversed for ${updated.issueNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : "Unable to reverse COGS.");
    } finally {
      setReversingCogs(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{issue?.issueNumber ?? "Sales stock issue"}</h1>
          <p className="mt-1 text-sm text-steel">Issue detail and linked operational stock movements.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory/sales-stock-issues" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {issue && canVoid && canVoidPostedStockDocument(issue.status) ? (
            <button type="button" disabled={voiding} onClick={() => void voidIssue()} className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {voiding ? "Voiding..." : "Void"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load sales stock issue details.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading sales stock issue...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {issue ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Detail label="Customer" value={issue.customer?.displayName ?? issue.customer?.name ?? issue.customerId} />
              <Detail label="Invoice" value={issue.salesInvoice?.invoiceNumber ?? issue.salesInvoiceId} />
              <Detail label="Warehouse" value={issue.warehouse ? `${issue.warehouse.code} ${issue.warehouse.name}` : issue.warehouseId} />
              <Detail label="Date" value={formatOptionalDate(issue.issueDate, "-")} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-steel">Status</p>
                <span className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-medium ${stockDocumentStatusBadgeClass(issue.status)}`}>{stockDocumentStatusLabel(issue.status)}</span>
              </div>
              <Detail label="Posted at" value={formatOptionalDate(issue.postedAt, "-")} />
              <Detail label="Voided at" value={formatOptionalDate(issue.voidedAt, "-")} />
            </div>
            {issue.notes ? <p className="mt-4 text-sm text-steel">{issue.notes}</p> : null}
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Invoice line</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Unit cost</th>
                  <th className="px-4 py-3">Movement</th>
                  <th className="px-4 py-3">Void movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issue.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.itemId}</td>
                    <td className="px-4 py-3 text-steel">{line.salesInvoiceLine?.description ?? "-"}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(line.quantity)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{line.unitCost ? formatInventoryQuantity(line.unitCost) : "-"}</td>
                    <td className="px-4 py-3"><Movement line={line} kind="stockMovement" /></td>
                    <td className="px-4 py-3"><Movement line={line} kind="voidStockMovement" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SalesIssueAccountingPreviewPanel
            preview={preview}
            error={previewError}
            canPostPermission={canPostCogs}
            canReversePermission={canReverseCogs}
            postingCogs={postingCogs}
            reversingCogs={reversingCogs}
            onPostCogs={() => void postCogs()}
            onReverseCogs={() => void reverseCogs()}
          />
        </div>
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 break-words text-sm text-ink">{value}</p>
    </div>
  );
}

function Movement({ line, kind }: { line: SalesStockIssueLine; kind: "stockMovement" | "voidStockMovement" }) {
  const movement = line[kind];
  return movement ? (
    <div>
      <p className="text-ink">{stockMovementTypeLabel(movement.type)}</p>
      <p className="font-mono text-xs text-steel">{movement.id}</p>
    </div>
  ) : (
    <span className="text-steel">-</span>
  );
}

function SalesIssueAccountingPreviewPanel({
  preview,
  error,
  canPostPermission,
  canReversePermission,
  postingCogs,
  reversingCogs,
  onPostCogs,
  onReverseCogs,
}: {
  preview: SalesStockIssueAccountingPreview | null;
  error: string;
  canPostPermission: boolean;
  canReversePermission: boolean;
  postingCogs: boolean;
  reversingCogs: boolean;
  onPostCogs: () => void;
  onReverseCogs: () => void;
}) {
  if (error) {
    return <StatusMessage type="error">{error}</StatusMessage>;
  }
  if (!preview) {
    return null;
  }

  const postable = accountingPreviewCanPost(preview);
  const cogsLine = preview.journal.lines.find((line) => line.side === "DEBIT");
  const assetLine = preview.journal.lines.find((line) => line.side === "CREDIT");
  const showPostAction = canShowPostCogsAction(preview, canPostPermission);
  const showReverseAction = canShowReverseCogsAction(preview, canReversePermission);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">COGS Preview</h2>
          <p className="mt-1 text-sm text-steel">Manual COGS posting preview from operational moving-average cost.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">{preview.postingStatus.replaceAll("_", " ")}</span>
            <span className={postable ? "rounded-md bg-emerald-50 px-2 py-1 text-emerald-700" : "rounded-md bg-slate-100 px-2 py-1 text-slate-700"}>
              {postable ? "Manual post available" : "Preview only"}
            </span>
          </div>
          {showPostAction ? (
            <button
              type="button"
              disabled={postingCogs}
              onClick={onPostCogs}
              className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {postingCogs ? "Posting..." : "Post COGS"}
            </button>
          ) : null}
          {showReverseAction ? (
            <button
              type="button"
              disabled={reversingCogs}
              onClick={onReverseCogs}
              className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {reversingCogs ? "Reversing..." : "Reverse COGS"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">{cogsPostingFinancialReportWarning()}</div>

      <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
        <Detail label="COGS status" value={cogsPostingStatus(preview)} />
        <Detail label="Estimated COGS" value={formatInventoryQuantity(preview.journal.totalDebit)} />
        <Detail label="COGS account" value={cogsLine?.accountCode ? `${cogsLine.accountCode} ${cogsLine.accountName}` : cogsLine?.accountName ?? "-"} />
        <Detail label="Inventory asset account" value={assetLine?.accountCode ? `${assetLine.accountCode} ${assetLine.accountName}` : assetLine?.accountName ?? "-"} />
      </div>

      {preview.journalEntryId || preview.reversalJournalEntryId ? (
        <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <Detail label="COGS journal" value={preview.journalEntryId ?? "-"} />
          <Detail label="COGS reversal journal" value={preview.reversalJournalEntryId ?? "-"} />
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <PreviewList title="Blocking reasons" items={preview.blockingReasons} emptyText={preview.canPostReason} tone="slate" />
        <PreviewList title="Warnings" items={preview.warnings} emptyText="No warnings." tone="amber" />
      </div>

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right">Estimated unit cost</th>
              <th className="px-4 py-3 text-right">Estimated COGS</th>
              <th className="px-4 py-3">Warnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-4 py-3">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.lineId}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(line.quantity)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  {line.estimatedUnitCost ? formatInventoryQuantity(line.estimatedUnitCost) : "-"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">{line.estimatedCOGS ? formatInventoryQuantity(line.estimatedCOGS) : "-"}</td>
                <td className="px-4 py-3 text-steel">{line.warnings.length > 0 ? line.warnings.join("; ") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <JournalPreview preview={preview} />
    </div>
  );
}

function JournalPreview({ preview }: { preview: SalesStockIssueAccountingPreview }) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <h3 className="text-sm font-semibold text-ink">Preview journal lines</h3>
        <p className="text-xs text-steel">
          Debit {formatInventoryQuantity(preview.journal.totalDebit)} / Credit {formatInventoryQuantity(preview.journal.totalCredit)}
        </p>
      </div>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Line</th>
              <th className="px-4 py-3">Preview</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.journal.lines.length > 0 ? (
              preview.journal.lines.map((line) => (
                <tr key={`${line.side}-${line.lineNumber}`}>
                  <td className="px-4 py-3 font-mono text-xs">{line.lineNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs">{accountingPreviewLineDisplay(line)}</td>
                  <td className="px-4 py-3 text-steel">{line.description}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-3 text-steel" colSpan={3}>
                  No journal lines available until mappings and cost estimates are complete.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewList({ title, items, emptyText, tone }: { title: string; items: string[]; emptyText: string; tone: "amber" | "slate" }) {
  const className = tone === "amber" ? "rounded-md bg-amber-50 p-4 text-sm text-amber-900" : "rounded-md bg-slate-50 p-4 text-sm text-steel";
  return (
    <div className={className}>
      <p className="font-medium text-ink">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>{emptyText}</li>}
      </ul>
    </div>
  );
}
