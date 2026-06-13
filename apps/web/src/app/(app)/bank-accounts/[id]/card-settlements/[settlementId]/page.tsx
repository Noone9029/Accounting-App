"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  canMatchCardSettlement,
  canPostCardSettlement,
  canVoidCardSettlement,
  cardSettlementStatusBadgeClass,
  cardSettlementStatusLabel,
  cardSettlementTypeLabel,
} from "@/lib/card-settlements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankStatementTransaction, CardSettlement } from "@/lib/types";

export default function CardSettlementDetailPage() {
  const params = useParams<{ id: string; settlementId: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canReconcile = can(PERMISSIONS.bankStatements.reconcile);
  const [settlement, setSettlement] = useState<CardSettlement | null>(null);
  const [matchCandidates, setMatchCandidates] = useState<BankStatementTransaction[]>([]);
  const [selectedStatementId, setSelectedStatementId] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId || !params.settlementId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<CardSettlement>(`/card-settlements/${params.settlementId}`)
      .then((result) => {
        if (!cancelled) {
          setSettlement(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load card settlement.");
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
  }, [organizationId, params.settlementId, reloadToken]);

  useEffect(() => {
    if (!organizationId || !settlement || settlement.status !== "POSTED") {
      setMatchCandidates([]);
      return;
    }

    let cancelled = false;
    apiRequest<BankStatementTransaction[]>(`/card-settlements/${settlement.id}/match-candidates`)
      .then((candidates) => {
        if (!cancelled) {
          setMatchCandidates(candidates);
          setSelectedStatementId((current) => current || candidates[0]?.id || "");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load card settlement match candidates.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, settlement]);

  async function runSettlementAction(actionName: "post" | "void" | "unmatch-statement-transaction") {
    if (!settlement) {
      return;
    }
    setAction(actionName);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<CardSettlement>(`/card-settlements/${settlement.id}/${actionName}`, { method: "POST" });
      setSettlement(updated);
      setSuccess(
        actionName === "post"
          ? "Card settlement posted for operational matching."
          : actionName === "void"
            ? "Card settlement voided."
            : "Card settlement unmatched.",
      );
      setReloadToken((current) => current + 1);
    } catch (settlementError) {
      setError(settlementError instanceof Error ? settlementError.message : "Unable to update card settlement.");
    } finally {
      setAction("");
    }
  }

  async function matchStatementRow() {
    if (!settlement || !selectedStatementId) {
      return;
    }
    setAction("match");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<CardSettlement>(`/card-settlements/${settlement.id}/match-statement-transaction`, {
        method: "POST",
        body: { statementTransactionId: selectedStatementId },
      });
      setSettlement(updated);
      setSuccess("Card settlement matched to statement row.");
      setReloadToken((current) => current + 1);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Unable to match statement row.");
    } finally {
      setAction("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Card settlement detail</h1>
          <p className="mt-1 text-sm text-steel">{settlement ? cardSettlementTypeLabel(settlement.settlementType) : "Credit and prepaid card settlement"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bank-accounts/${params.id}/card-settlements`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Card settlements
          </Link>
          <Link href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Statement rows
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load this card settlement.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading card settlement...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {settlement ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Status" value={cardSettlementStatusLabel(settlement.status)} badgeClass={cardSettlementStatusBadgeClass(settlement.status)} />
            <SummaryCard label="Amount" value={formatMoneyAmount(settlement.amount, settlement.currency)} />
            <SummaryCard label="Settlement date" value={formatOptionalDate(settlement.settlementDate, "-")} />
            <SummaryCard label="Type" value={cardSettlementTypeLabel(settlement.settlementType)} />
          </div>

          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-6 text-steel">
              This is a manual card settlement record for reconciliation. No live bank feed is added, no bank API is called, no card credentials are collected, and no bank payment is sent.
            </p>
            <p className="mt-2 text-xs leading-5 text-steel">
              Journal-backed card liability or prepaid asset posting is deferred until the accounting classification and clearing model are confirmed. Posting here changes only operational status.
            </p>
          </div>

          <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Settlement metadata</h2>
                <p className="mt-1 text-sm text-steel">{settlement.memo ?? "No memo"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canReconcile && canPostCardSettlement(settlement.status) ? (
                  <button type="button" disabled={Boolean(action)} onClick={() => void runSettlementAction("post")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "post" ? "Posting..." : "Post settlement"}
                  </button>
                ) : null}
                {canReconcile && settlement.status === "MATCHED" ? (
                  <button type="button" disabled={Boolean(action)} onClick={() => void runSettlementAction("unmatch-statement-transaction")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "unmatch-statement-transaction" ? "Unmatching..." : "Unmatch"}
                  </button>
                ) : null}
                {canReconcile && canVoidCardSettlement(settlement.status) ? (
                  <button type="button" disabled={Boolean(action)} onClick={() => void runSettlementAction("void")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "void" ? "Voiding..." : "Void"}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Detail label="Funding account" value={settlement.fundingBankAccountProfile?.displayName ?? "-"} />
              <Detail label="Card account" value={settlement.cardAccountProfile?.displayName ?? "-"} />
              <Detail label="Reference" value={settlement.reference ?? "-"} />
              <Detail label="Posted at" value={formatOptionalDate(settlement.postedAt, "-")} />
              <Detail label="Matched at" value={formatOptionalDate(settlement.matchedAt, "-")} />
              <Detail label="Voided at" value={formatOptionalDate(settlement.voidedAt, "-")} />
            </div>
          </div>

          {canReconcile && canMatchCardSettlement(settlement.status) ? (
            <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Match statement row</h2>
              <p className="mt-1 text-sm text-steel">
                Matching is explicit. Paydowns and prepaid top-ups match funding-account debit rows; credit card credits match card-account credit rows.
              </p>
              {matchCandidates.length === 0 ? <StatusMessage type="empty">No matching statement rows found within the date window.</StatusMessage> : null}
              {matchCandidates.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Candidate row</span>
                    <select value={selectedStatementId} onChange={(event) => setSelectedStatementId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                      {matchCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {formatOptionalDate(candidate.transactionDate, "-")} - {candidate.description} - {candidate.type} - {formatMoneyAmount(candidate.amount, settlement.currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" disabled={!selectedStatementId || Boolean(action)} onClick={() => void matchStatementRow()} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "match" ? "Matching..." : "Match card settlement"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {settlement.statementTransaction ? (
            <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Linked statement row</h2>
              <p className="mt-2 text-sm text-steel">
                {formatOptionalDate(settlement.statementTransaction.transactionDate, "-")} - {settlement.statementTransaction.description} -{" "}
                {formatMoneyAmount(settlement.statementTransaction.amount, settlement.currency)}
              </p>
              <Link href={`/bank-statement-transactions/${settlement.statementTransaction.id}`} className="mt-3 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Open statement row
              </Link>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, badgeClass }: { label: string; value: string; badgeClass?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className={`mt-2 inline-flex rounded-md text-sm font-semibold ${badgeClass ? `${badgeClass} px-2 py-1` : "font-mono text-ink"}`}>{value}</p>
    </div>
  );
}
