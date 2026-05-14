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
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{proposal?.proposalNumber ?? "Inventory variance proposal"}</h1>
          <p className="mt-1 text-sm text-steel">Review, approve, explicitly post, and reverse inventory variance proposals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory/variance-proposals" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
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
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load variance proposal details.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading variance proposal...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {proposal ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Proposal summary</h2>
                <p className="mt-1 text-sm text-steel">No journal exists unless this proposal reaches Approved and a permitted user posts it.</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryVarianceProposalStatusBadgeClass(proposal.status)}`}>
                {inventoryVarianceProposalStatusLabel(proposal.status)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Reason" value={inventoryVarianceReasonLabel(proposal.reason)} />
              <Summary label="Source" value={proposal.sourceType.replaceAll("_", " ")} />
              <Summary label="Proposal date" value={formatOptionalDate(proposal.proposalDate, "-")} />
              <Summary label="Amount" value={formatMoneyAmount(proposal.amount, "SAR")} />
              <Summary label="Debit account" value={proposal.debitAccount ? `${proposal.debitAccount.code} ${proposal.debitAccount.name}` : proposal.debitAccountId} />
              <Summary label="Credit account" value={proposal.creditAccount ? `${proposal.creditAccount.code} ${proposal.creditAccount.name}` : proposal.creditAccountId} />
              <Summary label="Journal" value={proposal.journalEntry?.entryNumber ?? proposal.journalEntryId ?? "-"} />
              <Summary label="Reversal journal" value={proposal.reversalJournalEntry?.entryNumber ?? proposal.reversalJournalEntryId ?? "-"} />
            </div>
            {proposal.description ? <p className="mt-4 text-sm text-steel">{proposal.description}</p> : null}
          </div>

          <SourcePanel proposal={proposal} />
          {preview ? <AccountingPreviewPanel preview={preview} /> : null}
          <EventsPanel events={events} />
        </div>
      ) : null}
    </section>
  );
}

function SourcePanel({ proposal }: { proposal: InventoryVarianceProposal }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold text-ink">Source</h2>
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
    </div>
  );
}

function AccountingPreviewPanel({ preview }: { preview: InventoryVarianceProposalAccountingPreview }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Accounting preview</h2>
          <p className="mt-1 text-sm text-steel">Read-only journal preview. Posting requires explicit approval and action.</p>
        </div>
        <span className={preview.canPost ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700" : "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"}>
          {preview.canPost ? "Can post" : "Blocked"}
        </span>
      </div>

      <div className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryVarianceProposalFinancialReportWarning()}</div>

      <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
        <Summary label="Status" value={inventoryVarianceProposalStatusLabel(preview.status)} />
        <Summary label="Amount" value={formatMoneyAmount(preview.amount, "SAR")} />
        <Summary label="Debit" value={`${preview.debitAccount.code} ${preview.debitAccount.name}`} />
        <Summary label="Credit" value={`${preview.creditAccount.code} ${preview.creditAccount.name}`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <MessageList title="Blocking reasons" items={preview.blockingReasons} emptyText="No posting blockers." tone="slate" />
        <MessageList title="Warnings" items={preview.warnings} emptyText="No warnings." tone="amber" />
      </div>

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[720px] text-left text-sm">
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
        </table>
      </div>
    </div>
  );
}

function EventsPanel({ events }: { events: InventoryVarianceProposalEvent[] }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold text-ink">Event timeline</h2>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-steel">No events recorded.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
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
                  <td className="px-3 py-2 text-steel">{formatOptionalDate(event.createdAt, "-")}</td>
                  <td className="px-3 py-2 text-ink">{event.action}</td>
                  <td className="px-3 py-2 text-steel">{event.fromStatus ? `${event.fromStatus} -> ${event.toStatus}` : event.toStatus}</td>
                  <td className="px-3 py-2 text-steel">{event.actorUser?.name ?? event.actorUser?.email ?? "-"}</td>
                  <td className="px-3 py-2 text-steel">{event.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
  const className = primary
    ? "rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
    : danger
      ? "rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
      : "rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400";
  return (
    <button type="button" onClick={onClick} disabled={loading} className={className}>
      {loading ? "Working..." : label}
    </button>
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
