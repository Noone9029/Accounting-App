"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankStatementTransactionStatusBadgeClass,
  bankStatementTransactionStatusLabel,
  bankStatementTransactionTypeLabel,
  candidateScoreLabel,
  lockedStatementTransactionWarning,
} from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { Account, BankStatementMatchCandidate, BankStatementTransaction } from "@/lib/types";

export default function BankStatementTransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [transaction, setTransaction] = useState<BankStatementTransaction | null>(null);
  const [candidates, setCandidates] = useState<BankStatementMatchCandidate[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [ignoreReason, setIgnoreReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canReconcile = can(PERMISSIONS.bankStatements.reconcile);
  const currency = transaction?.bankAccountProfile?.currency ?? "SAR";
  const isUnmatched = transaction?.status === "UNMATCHED";
  const lockedWarning = transaction ? lockedStatementTransactionWarning(transaction) : null;

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const requests: Array<Promise<unknown>> = [apiRequest<BankStatementTransaction>(`/bank-statement-transactions/${params.id}`)];
    if (canReconcile) {
      requests.push(apiRequest<Account[]>("/accounts"));
    }

    Promise.all(requests)
      .then(([transactionResult, accountResult]) => {
        if (!cancelled) {
          setTransaction(transactionResult as BankStatementTransaction);
          if (Array.isArray(accountResult)) {
            const postingAccounts = accountResult.filter((account) => account.isActive && account.allowPosting);
            setAccounts(postingAccounts);
            setAccountId((current) => current || postingAccounts[0]?.id || "");
          }
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load statement transaction.");
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
  }, [canReconcile, organizationId, params.id, reloadToken]);

  useEffect(() => {
    if (!organizationId || !params.id || !canReconcile || !isUnmatched || lockedWarning) {
      setCandidates([]);
      return;
    }

    let cancelled = false;
    setLoadingCandidates(true);

    apiRequest<BankStatementMatchCandidate[]>(`/bank-statement-transactions/${params.id}/match-candidates`)
      .then((result) => {
        if (!cancelled) {
          setCandidates(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCandidates([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCandidates(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canReconcile, isUnmatched, lockedWarning, organizationId, params.id, reloadToken]);

  async function submitAction(action: "match" | "categorize" | "ignore", body: unknown) {
    setSubmitting(action);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankStatementTransaction>(`/bank-statement-transactions/${params.id}/${action}`, {
        method: "POST",
        body,
      });
      setTransaction(updated);
      setSuccess(`Statement transaction ${bankStatementTransactionStatusLabel(updated.status).toLowerCase()}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update statement transaction.");
    } finally {
      setSubmitting("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Statement transaction</h1>
          <p className="mt-1 text-sm text-steel">Manual matching, categorization, and ignore controls.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {transaction?.bankAccountProfileId ? (
            <Link href={`/bank-accounts/${transaction.bankAccountProfileId}/statement-transactions`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Back
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load this statement row.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading statement transaction...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {transaction ? (
        <div className="mt-5 space-y-5">
          <AttachmentPanel linkedEntityType="BANK_STATEMENT_TRANSACTION" linkedEntityId={transaction.id} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Date" value={formatOptionalDate(transaction.transactionDate, "-")} />
            <SummaryCard label="Type" value={bankStatementTransactionTypeLabel(transaction.type)} />
            <SummaryCard label="Amount" value={formatMoneyAmount(transaction.amount, currency)} />
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
              <p className="text-xs font-medium uppercase tracking-wide text-steel">Status</p>
              <span className={`mt-2 inline-block rounded-md px-2 py-1 text-xs font-medium ${bankStatementTransactionStatusBadgeClass(transaction.status)}`}>
                {bankStatementTransactionStatusLabel(transaction.status)}
              </span>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Detail label="Description" value={transaction.description} />
              <Detail label="Reference" value={transaction.reference ?? "-"} />
              <Detail label="Import" value={transaction.import?.filename ?? "-"} />
              <Detail label="Bank account" value={transaction.bankAccountProfile?.displayName ?? "-"} />
              <Detail label="Matched journal" value={transaction.matchedJournalEntry?.entryNumber ?? transaction.createdJournalEntry?.entryNumber ?? "-"} />
              <Detail label="Categorized account" value={transaction.categorizedAccount ? `${transaction.categorizedAccount.code} ${transaction.categorizedAccount.name}` : "-"} />
            </div>
            {transaction.ignoredReason ? <p className="mt-4 text-sm text-steel">Ignored reason: {transaction.ignoredReason}</p> : null}
          </div>

          {lockedWarning ? <StatusMessage type="info">{lockedWarning}</StatusMessage> : null}

          {canReconcile && isUnmatched && !lockedWarning ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                <h2 className="text-lg font-semibold text-ink">Match candidates</h2>
                {loadingCandidates ? <StatusMessage type="loading">Loading match candidates...</StatusMessage> : null}
                {!loadingCandidates && candidates.length === 0 ? <StatusMessage type="empty">No posted bank journal lines matched the amount and direction.</StatusMessage> : null}
                <div className="mt-4 space-y-3">
                  {candidates.map((candidate) => (
                    <div key={candidate.journalLineId} className="rounded-md border border-slate-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">{candidate.entryNumber}</p>
                          <p className="mt-1 text-xs text-steel">{formatOptionalDate(candidate.date, "-")} - {candidate.description}</p>
                          <p className="mt-1 text-xs text-steel">{candidate.reason}</p>
                        </div>
                        <span className="rounded-md bg-mist px-2 py-1 text-xs font-medium text-ink">{candidateScoreLabel(candidate)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="font-mono text-xs text-steel">
                          Dr {formatMoneyAmount(candidate.debit, currency)} / Cr {formatMoneyAmount(candidate.credit, currency)}
                        </p>
                        <button type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("match", { journalLineId: candidate.journalLineId })} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          {submitting === "match" ? "Matching..." : "Match"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                  <h2 className="text-lg font-semibold text-ink">Categorize</h2>
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="text-xs font-medium uppercase tracking-wide text-steel">Offset account</span>
                      <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} {account.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium uppercase tracking-wide text-steel">Description</span>
                      <input value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                    </label>
                    <button type="button" disabled={Boolean(submitting) || !accountId} onClick={() => void submitAction("categorize", { accountId, description: categoryDescription || undefined })} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                      {submitting === "categorize" ? "Posting..." : "Post categorization journal"}
                    </button>
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                  <h2 className="text-lg font-semibold text-ink">Ignore</h2>
                  <label className="mt-4 block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Reason</span>
                    <input value={ignoreReason} onChange={(event) => setIgnoreReason(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <button type="button" disabled={Boolean(submitting) || !ignoreReason.trim()} onClick={() => void submitAction("ignore", { reason: ignoreReason })} className="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {submitting === "ignore" ? "Ignoring..." : "Ignore row"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!canReconcile ? <StatusMessage type="info">Your role can view statement rows, but reconciliation actions require bank statement reconcile permission.</StatusMessage> : null}
          {canReconcile && !lockedWarning && !isUnmatched ? <StatusMessage type="info">Only unmatched rows can be matched, categorized, or ignored.</StatusMessage> : null}
        </div>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-2 font-mono text-sm font-semibold text-ink">{value}</p>
    </div>
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
