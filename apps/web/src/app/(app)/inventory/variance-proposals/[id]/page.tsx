"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerLoadingState,
  LedgerMetadataRow,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSection,
  LedgerStatusBadge,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  accountingPreviewLineDisplay,
  canApproveInventoryVarianceProposal,
  canPostInventoryVarianceProposal,
  canReverseInventoryVarianceProposal,
  canSubmitInventoryVarianceProposal,
  canVoidInventoryVarianceProposal,
  inventoryVarianceProposalFinancialReportWarning,
  inventoryVarianceProposalStatusBadgeClass,
  inventoryVarianceProposalStatusLabel,
  inventoryVarianceReasonLabel,
} from "@/lib/inventory";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  InventoryVarianceProposal,
  InventoryVarianceProposalAccountingPreview,
  InventoryVarianceProposalEvent,
} from "@/lib/types";

export default function InventoryVarianceProposalDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [proposal, setProposal] = useState<InventoryVarianceProposal | null>(null);
  const [events, setEvents] = useState<InventoryVarianceProposalEvent[]>([]);
  const [preview, setPreview] = useState<InventoryVarianceProposalAccountingPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const canCreate = can(PERMISSIONS.inventory.varianceProposalsCreate);
  const canApprove = can(PERMISSIONS.inventory.varianceProposalsApprove);
  const canPost = can(PERMISSIONS.inventory.varianceProposalsPost);
  const canReverse = can(PERMISSIONS.inventory.varianceProposalsReverse);
  const canVoid = can(PERMISSIONS.inventory.varianceProposalsVoid);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<InventoryVarianceProposal>(`/inventory/variance-proposals/${params.id}`),
      apiRequest<InventoryVarianceProposalEvent[]>(`/inventory/variance-proposals/${params.id}/events`),
      apiRequest<InventoryVarianceProposalAccountingPreview>(`/inventory/variance-proposals/${params.id}/accounting-preview`).catch(() => null),
    ])
      .then(([proposalResult, eventsResult, previewResult]) => {
        if (!cancelled) {
          setProposal(proposalResult);
          setEvents(eventsResult);
          setPreview(previewResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load inventory variance proposal.");
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

  async function runWorkflow(action: "submit" | "approve" | "post" | "reverse" | "void") {
    if (!proposal) {
      return;
    }
    if (action === "post" && !window.confirm(`${inventoryVarianceProposalFinancialReportWarning()} Post ${proposal.proposalNumber}?`)) {
      return;
    }
    if (action === "reverse" && !window.confirm(`Reverse the posted journal for ${proposal.proposalNumber}?`)) {
      return;
    }
    if (action === "void" && !window.confirm(`Void ${proposal.proposalNumber}?`)) {
      return;
    }

    const notes = action === "submit" ? window.prompt("Submission notes", "") : null;
    const approvalNotes = action === "approve" ? window.prompt("Approval notes", "") : null;
    const reason = action === "reverse" || action === "void" ? window.prompt("Reason", "") : null;

    setActionLoading(action);
    setError("");
    setSuccess("");
    try {
      const body =
        action === "submit"
          ? { notes: notes || undefined }
          : action === "approve"
            ? { approvalNotes: approvalNotes || undefined }
            : action === "reverse" || action === "void"
              ? { reason: reason || undefined }
              : undefined;
      const updated = await apiRequest<InventoryVarianceProposal>(`/inventory/variance-proposals/${proposal.id}/${action}`, {
        method: "POST",
        body,
      });
      setProposal(updated);
      setSuccess(`${updated.proposalNumber} ${actionLabel(action)}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action} variance proposal.`);
    } finally {
      setActionLoading("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory valuation"
        title={proposal?.proposalNumber ?? "Inventory variance proposal"}
        description="Review, approve, explicitly post, and reverse inventory variance proposals."
        actions={
          <>
          <LedgerButton href="/inventory/variance-proposals">Back</LedgerButton>
          {proposal && canSubmitInventoryVarianceProposal(proposal.status, canCreate) ? (
            <ActionButton label="Submit" loading={actionLoading === "submit"} onClick={() => void runWorkflow("submit")} />
          ) : null}
          {proposal && canApproveInventoryVarianceProposal(proposal.status, canApprove) ? (
            <ActionButton label="Approve" loading={actionLoading === "approve"} onClick={() => void runWorkflow("approve")} />
          ) : null}
          {canPostInventoryVarianceProposal(preview, canPost) ? (
            <ActionButton label="Post journal" loading={actionLoading === "post"} onClick={() => void runWorkflow("post")} primary />
          ) : null}
          {proposal && canReverseInventoryVarianceProposal(proposal.status, canReverse) ? (
            <ActionButton label="Reverse" loading={actionLoading === "reverse"} onClick={() => void runWorkflow("reverse")} danger />
          ) : null}
          {proposal && canVoidInventoryVarianceProposal(proposal.status, canVoid) ? (
            <ActionButton label="Void" loading={actionLoading === "void"} onClick={() => void runWorkflow("void")} danger />
          ) : null}
          </>
        }
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load variance proposal details.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading variance proposal" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

      {proposal ? (
        <div className="space-y-5">
          <AttachmentPanel linkedEntityType="INVENTORY_VARIANCE_PROPOSAL" linkedEntityId={proposal.id} />

          <LedgerSection
            title="Proposal summary"
            description="No journal exists unless this proposal reaches Approved and a permitted user posts it."
            action={<span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryVarianceProposalStatusBadgeClass(proposal.status)}`}>{inventoryVarianceProposalStatusLabel(proposal.status)}</span>}
          >
            <LedgerMetadataRow
              items={[
                { label: "Reason", value: inventoryVarianceReasonLabel(proposal.reason) },
                { label: "Source", value: proposal.sourceType.replaceAll("_", " ") },
                { label: "Proposal date", value: <LedgerDate>{formatOptionalDate(proposal.proposalDate, "-")}</LedgerDate> },
                { label: "Amount", value: <LedgerMoney>{formatMoneyAmount(proposal.amount, "SAR")}</LedgerMoney> },
                { label: "Debit account", value: proposal.debitAccount ? `${proposal.debitAccount.code} ${proposal.debitAccount.name}` : proposal.debitAccountId },
                { label: "Credit account", value: proposal.creditAccount ? `${proposal.creditAccount.code} ${proposal.creditAccount.name}` : proposal.creditAccountId },
                { label: "Journal", value: proposal.journalEntry?.entryNumber ?? proposal.journalEntryId ?? "-" },
                { label: "Reversal journal", value: proposal.reversalJournalEntry?.entryNumber ?? proposal.reversalJournalEntryId ?? "-" },
              ]}
            />
            {proposal.description ? <p className="mt-4 text-sm text-steel">{proposal.description}</p> : null}
          </LedgerSection>

          <SourcePanel proposal={proposal} />
          {preview ? <AccountingPreviewPanel preview={preview} /> : null}
          <EventsPanel events={events} />
        </div>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function SourcePanel({ proposal }: { proposal: InventoryVarianceProposal }) {
  return (
    <LedgerSection title="Source">
      <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
        <Summary label="Supplier" value={proposal.supplier?.displayName ?? proposal.supplier?.name ?? "-"} />
        <div>
          <div className="text-xs uppercase tracking-wide text-steel">Purchase bill</div>
          {proposal.purchaseBill ? (
            <Link href={`/purchases/bills/${proposal.purchaseBill.id}`} className="mt-1 block font-medium text-palm hover:underline">
              {proposal.purchaseBill.billNumber}
            </Link>
          ) : (
            <div className="mt-1 text-ink">-</div>
          )}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-steel">Purchase receipt</div>
          {proposal.purchaseReceipt ? (
            <Link href={`/inventory/purchase-receipts/${proposal.purchaseReceipt.id}`} className="mt-1 block font-medium text-palm hover:underline">
              {proposal.purchaseReceipt.receiptNumber}
            </Link>
          ) : (
            <div className="mt-1 text-ink">-</div>
          )}
        </div>
      </div>
    </LedgerSection>
  );
}

function AccountingPreviewPanel({ preview }: { preview: InventoryVarianceProposalAccountingPreview }) {
  return (
    <LedgerSection
      title="Accounting preview"
      description="Read-only journal preview. Posting requires explicit approval and action."
      action={<LedgerStatusBadge tone={preview.canPost ? "success" : "neutral"}>{preview.canPost ? "Can post" : "Blocked"}</LedgerStatusBadge>}
    >

      <LedgerAlert tone="warning">{inventoryVarianceProposalFinancialReportWarning()}</LedgerAlert>

      <LedgerMetadataRow
        items={[
          { label: "Status", value: inventoryVarianceProposalStatusLabel(preview.status) },
          { label: "Amount", value: <LedgerMoney>{formatMoneyAmount(preview.amount, "SAR")}</LedgerMoney> },
          { label: "Debit", value: `${preview.debitAccount.code} ${preview.debitAccount.name}` },
          { label: "Credit", value: `${preview.creditAccount.code} ${preview.creditAccount.name}` },
        ]}
      />

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <MessageList title="Blocking reasons" items={preview.blockingReasons} emptyText="No posting blockers." tone="slate" />
        <MessageList title="Warnings" items={preview.warnings} emptyText="No warnings." tone="amber" />
      </div>

      <LedgerDataTable minWidth="720px" className="mt-5">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Line</th>
              <th className="px-4 py-3">Preview</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.journal.lines.map((line) => (
              <tr key={`${line.lineNumber}-${line.side}`}>
                <td className="px-4 py-3 font-mono text-xs">{line.lineNumber}</td>
                <td className="px-4 py-3 font-mono text-xs">{accountingPreviewLineDisplay(line)}</td>
                <td className="px-4 py-3 text-steel">{line.description}</td>
              </tr>
            ))}
          </tbody>
        </LedgerDataTable>
    </LedgerSection>
  );
}

function EventsPanel({ events }: { events: InventoryVarianceProposalEvent[] }) {
  return (
    <LedgerSection title="Event timeline">
      {events.length === 0 ? (
        <LedgerEmptyState title="No events recorded." />
      ) : (
        <LedgerDataTable minWidth="720px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-3 py-2"><LedgerDate>{formatOptionalDate(event.createdAt, "-")}</LedgerDate></td>
                  <td className="px-3 py-2 text-ink">{event.action}</td>
                  <td className="px-3 py-2 text-steel">{event.fromStatus ? `${event.fromStatus} -> ${event.toStatus}` : event.toStatus}</td>
                  <td className="px-3 py-2 text-steel">{event.actorUser?.name ?? event.actorUser?.email ?? "-"}</td>
                  <td className="px-3 py-2 text-steel">{event.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
      )}
    </LedgerSection>
  );
}

function ActionButton({
  label,
  loading,
  onClick,
  primary = false,
  danger = false,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <LedgerButton type="button" onClick={onClick} disabled={loading} variant={primary ? "primary" : danger ? "danger" : "secondary"}>
      {loading ? "Working..." : label}
    </LedgerButton>
  );
}

function MessageList({ title, items, emptyText, tone }: { title: string; items: string[]; emptyText: string; tone: "amber" | "slate" }) {
  const className = tone === "amber" ? "rounded-md bg-amber-50 p-4 text-sm text-amber-900" : "rounded-md bg-slate-50 p-4 text-sm text-steel";
  return (
    <div className={className}>
      <p className="font-medium text-ink">{title}</p>
      <ul className="mt-2 space-y-1">{items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>{emptyText}</li>}</ul>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}

function actionLabel(action: "submit" | "approve" | "post" | "reverse" | "void"): string {
  switch (action) {
    case "submit":
      return "submitted";
    case "approve":
      return "approved";
    case "post":
      return "posted";
    case "reverse":
      return "reversed";
    case "void":
      return "voided";
  }
}
