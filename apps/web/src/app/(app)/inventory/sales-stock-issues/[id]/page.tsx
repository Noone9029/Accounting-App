"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerLoadingState,
  LedgerMetadataRow,
  LedgerMoney,
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title={issue?.issueNumber ?? "Sales stock issue"}
        description="Issue detail and linked operational stock movements."
        badge={issue ? <LedgerStatusBadge tone={stockDocumentStatusTone(issue.status)}>{stockDocumentStatusLabel(issue.status)}</LedgerStatusBadge> : null}
        actions={
          <>
            <LedgerButton href="/inventory/sales-stock-issues">Back</LedgerButton>
            {issue && canVoid && canVoidPostedStockDocument(issue.status) ? (
              <LedgerButton type="button" disabled={voiding} onClick={() => void voidIssue()} variant="danger">
                {voiding ? "Voiding..." : "Void"}
              </LedgerButton>
            ) : null}
          </>
        }
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load sales stock issue details.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading sales stock issue" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {issue ? (
          <>
            <AttachmentPanel linkedEntityType="SALES_STOCK_ISSUE" linkedEntityId={issue.id} />
            <SalesStockIssueWorkflowGuidance
              issue={issue}
              preview={preview}
              canVoid={canVoid}
              canPostCogs={canPostCogs}
              canReverseCogs={canReverseCogs}
              onVoid={() => void voidIssue()}
              onPostCogs={() => void postCogs()}
              onReverseCogs={() => void reverseCogs()}
              actionLoading={voiding || postingCogs || reversingCogs}
            />

            <LedgerSection title="Issue profile" description={issue.notes || "Operational issue metadata for the linked invoice and warehouse."}>
              <LedgerMetadataRow
                items={[
                  { label: "Customer", value: issue.customer?.displayName ?? issue.customer?.name ?? issue.customerId },
                  { label: "Invoice", value: issue.salesInvoice?.invoiceNumber ?? issue.salesInvoiceId },
                  { label: "Warehouse", value: issue.warehouse ? `${issue.warehouse.code} ${issue.warehouse.name}` : issue.warehouseId },
                  { label: "Date", value: <LedgerDate>{formatOptionalDate(issue.issueDate, "-")}</LedgerDate> },
                  { label: "Status", value: <LedgerStatusBadge tone={stockDocumentStatusTone(issue.status)}>{stockDocumentStatusLabel(issue.status)}</LedgerStatusBadge> },
                  { label: "Posted at", value: <LedgerDate>{formatOptionalDate(issue.postedAt, "-")}</LedgerDate> },
                  { label: "Voided at", value: <LedgerDate>{formatOptionalDate(issue.voidedAt, "-")}</LedgerDate> },
                ]}
              />
            </LedgerSection>

            <LedgerSection title="Issue lines" description="Operational stock movement references and optional void movement references for each line.">
              <LedgerDataTable minWidth="920px">
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
                      <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(line.quantity)}</LedgerMoney></td>
                      <td className="px-4 py-3 text-right"><LedgerMoney>{line.unitCost ? formatInventoryQuantity(line.unitCost) : "-"}</LedgerMoney></td>
                      <td className="px-4 py-3"><Movement line={line} kind="stockMovement" /></td>
                      <td className="px-4 py-3"><Movement line={line} kind="voidStockMovement" /></td>
                    </tr>
                  ))}
                </tbody>
              </LedgerDataTable>
            </LedgerSection>

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
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
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

export function SalesStockIssueWorkflowGuidance({
  issue,
  preview,
  canVoid,
  canPostCogs,
  canReverseCogs,
  onVoid,
  onPostCogs,
  onReverseCogs,
  actionLoading,
}: {
  issue: SalesStockIssue;
  preview: SalesStockIssueAccountingPreview | null;
  canVoid: boolean;
  canPostCogs: boolean;
  canReverseCogs: boolean;
  onVoid: () => void;
  onPostCogs: () => void;
  onReverseCogs: () => void;
  actionLoading: boolean;
}) {
  const isPosted = issue.status === "POSTED";
  const isVoided = issue.status === "VOIDED";
  const showPostAction = preview ? canShowPostCogsAction(preview, canPostCogs) : false;
  const showReverseAction = preview ? canShowReverseCogsAction(preview, canReverseCogs) : false;
  const warehouseLabel = issue.warehouse ? `${issue.warehouse.code} ${issue.warehouse.name}` : "the issuing warehouse";

  return (
    <LedgerSummaryBand tone="success">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">What happened?</h2>
            <LedgerStatusBadge tone={stockDocumentStatusTone(issue.status)}>{stockDocumentStatusLabel(issue.status)}</LedgerStatusBadge>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <p className="font-semibold text-ink">Stock movement</p>
              <p className="mt-1">
                {isVoided
                  ? "This stock issue was voided, so reversal movements should offset the original stock decrease."
                  : `This stock issue decreases inventory in ${warehouseLabel} when posted.`}
              </p>
            </div>
            <div>
              <p className="font-semibold text-ink">COGS boundary</p>
              <p className="mt-1">COGS accounting is manual only and appears through the explicit COGS action when the issue is eligible.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Where to inspect</p>
              <p className="mt-1">Use the lines below for item quantities, operational stock movement IDs, void movements, and COGS preview warnings.</p>
            </div>
          </div>
          {!isPosted ? <p className="mt-3 text-xs leading-5">Voided issues stay available for audit but should not be treated as current stock demand.</p> : null}
        </div>
        <LedgerActionBar className="lg:justify-end">
          {isPosted && canVoid ? (
            <LedgerButton type="button" disabled={actionLoading} onClick={onVoid} variant="danger">
              Void issue
            </LedgerButton>
          ) : null}
          {showPostAction ? (
            <LedgerButton type="button" disabled={actionLoading} onClick={onPostCogs} variant="primary">
              Post COGS
            </LedgerButton>
          ) : null}
          {showReverseAction ? (
            <LedgerButton type="button" disabled={actionLoading} onClick={onReverseCogs} variant="danger">
              Reverse COGS
            </LedgerButton>
          ) : null}
          <LedgerButton href={`/sales/invoices/${issue.salesInvoiceId}`}>View invoice</LedgerButton>
          <LedgerButton href={`/inventory/warehouses/${issue.warehouseId}`}>View warehouse</LedgerButton>
          <LedgerButton href="/inventory/stock-movements">Stock movements</LedgerButton>
          <LedgerButton href="/inventory/reports/movement-summary">Inventory report</LedgerButton>
        </LedgerActionBar>
      </div>
    </LedgerSummaryBand>
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
    return <LedgerAlert tone="danger">{error}</LedgerAlert>;
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
    <LedgerSection
      title="COGS Preview"
      description="Manual COGS posting preview from operational moving-average cost."
      action={
        <>
          <LedgerStatusBadge tone="warning">{preview.postingStatus.replaceAll("_", " ")}</LedgerStatusBadge>
          <LedgerStatusBadge tone={postable ? "success" : "neutral"}>{postable ? "Manual post available" : "Preview only"}</LedgerStatusBadge>
          {showPostAction ? (
            <LedgerButton type="button" disabled={postingCogs} onClick={onPostCogs} variant="primary">
              {postingCogs ? "Posting..." : "Post COGS"}
            </LedgerButton>
          ) : null}
          {showReverseAction ? (
            <LedgerButton type="button" disabled={reversingCogs} onClick={onReverseCogs} variant="danger">
              {reversingCogs ? "Reversing..." : "Reverse COGS"}
            </LedgerButton>
          ) : null}
        </>
      }
    >
      <div className="space-y-5">
        <LedgerSummaryBand tone="warning">{cogsPostingFinancialReportWarning()}</LedgerSummaryBand>

        <LedgerMetadataRow
          items={[
            { label: "COGS status", value: cogsPostingStatus(preview) },
            { label: "Estimated COGS", value: <LedgerMoney>{formatInventoryQuantity(preview.journal.totalDebit)}</LedgerMoney> },
            { label: "COGS account", value: cogsLine?.accountCode ? `${cogsLine.accountCode} ${cogsLine.accountName}` : cogsLine?.accountName ?? "-" },
            { label: "Inventory asset account", value: assetLine?.accountCode ? `${assetLine.accountCode} ${assetLine.accountName}` : assetLine?.accountName ?? "-" },
            { label: "COGS journal", value: preview.journalEntryId ?? "-" },
            { label: "COGS reversal journal", value: preview.reversalJournalEntryId ?? "-" },
          ]}
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <PreviewList title="Blocking reasons" items={preview.blockingReasons} emptyText={preview.canPostReason} tone="slate" />
          <PreviewList title="Warnings" items={preview.warnings} emptyText="No warnings." tone="amber" />
        </div>

        <LedgerDataTable minWidth="760px">
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
                <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(line.quantity)}</LedgerMoney></td>
                <td className="px-4 py-3 text-right"><LedgerMoney>{line.estimatedUnitCost ? formatInventoryQuantity(line.estimatedUnitCost) : "-"}</LedgerMoney></td>
                <td className="px-4 py-3 text-right"><LedgerMoney>{line.estimatedCOGS ? formatInventoryQuantity(line.estimatedCOGS) : "-"}</LedgerMoney></td>
                <td className="px-4 py-3 text-steel">{line.warnings.length > 0 ? line.warnings.join("; ") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </LedgerDataTable>

        <JournalPreview preview={preview} />
      </div>
    </LedgerSection>
  );
}

function JournalPreview({ preview }: { preview: SalesStockIssueAccountingPreview }) {
  return (
    <LedgerPanel>
      <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <h3 className="text-sm font-semibold text-ink">Preview journal lines</h3>
        <p className="text-xs text-steel">
          Debit {formatInventoryQuantity(preview.journal.totalDebit)} / Credit {formatInventoryQuantity(preview.journal.totalCredit)}
        </p>
      </div>
      <LedgerDataTable minWidth="720px">
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
      </LedgerDataTable>
    </LedgerPanel>
  );
}

function PreviewList({ title, items, emptyText, tone }: { title: string; items: string[]; emptyText: string; tone: "amber" | "slate" }) {
  return (
    <LedgerPanel className={tone === "amber" ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-steel"}>
      <p className="font-medium text-ink">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>{emptyText}</li>}
      </ul>
    </LedgerPanel>
  );
}

function stockDocumentStatusTone(status: string): LedgerStatusTone {
  if (status === "POSTED") return "success";
  if (status === "VOIDED") return "danger";
  if (status === "DRAFT") return "draft";
  return "neutral";
}
