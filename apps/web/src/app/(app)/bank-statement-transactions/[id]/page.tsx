"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { useAppLocale } from "@/components/app-locale-provider";
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
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import type { Account, BankStatementMatchCandidate, BankStatementTransaction } from "@/lib/types";

export default function BankStatementTransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
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
          setError(tc(loadError instanceof Error ? loadError.message : "Unable to load statement transaction."));
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
      setSuccess(tc("Statement transaction {status}.", { status: tc(bankStatementTransactionStatusLabel(updated.status).toLowerCase()) }));
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(tc(actionError instanceof Error ? actionError.message : "Unable to update statement transaction."));
    } finally {
      setSubmitting("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Statement transaction")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Manual matching, categorization, and ignore controls.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {transaction?.bankAccountProfileId ? (
            <Link href={`/bank-accounts/${transaction.bankAccountProfileId}/statement-transactions`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Back")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load this statement row.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading statement transaction...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {transaction ? (
        <div className="mt-5 space-y-5">
          <AttachmentPanel linkedEntityType="BANK_STATEMENT_TRANSACTION" linkedEntityId={transaction.id} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label={tc("Date")} value={formatAppDate(transaction.transactionDate, locale, "-")} />
            <SummaryCard label={tc("Type")} value={tc(bankStatementTransactionTypeLabel(transaction.type))} />
            <SummaryCard label={tc("Amount")} value={formatAppMoney(transaction.amount, currency, locale)} />
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
              <p className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Status")}</p>
              <span className={`mt-2 inline-block rounded-md px-2 py-1 text-xs font-medium ${bankStatementTransactionStatusBadgeClass(transaction.status)}`}>
                {tc(bankStatementTransactionStatusLabel(transaction.status))}
              </span>
            </div>
          </div>

          <StatementTransactionWorkflowGuidance transaction={transaction} canReconcile={canReconcile} lockedWarning={lockedWarning} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Detail label={tc("Description")} value={transaction.description} />
              <Detail label={tc("Reference")} value={transaction.reference ?? "-"} />
              <Detail label={tc("Import")} value={transaction.import?.filename ?? "-"} />
              <Detail label={tc("Bank account")} value={transaction.bankAccountProfile?.displayName ?? "-"} />
              <Detail label={tc("Matched journal")} value={transaction.matchedJournalEntry?.entryNumber ?? transaction.createdJournalEntry?.entryNumber ?? "-"} />
              <Detail label={tc("Categorized account")} value={transaction.categorizedAccount ? `${transaction.categorizedAccount.code} ${transaction.categorizedAccount.name}` : "-"} />
            </div>
            {transaction.ignoredReason ? <p className="mt-4 text-sm text-steel">{tc("Ignored reason")}: {transaction.ignoredReason}</p> : null}
          </div>

          {lockedWarning ? <StatusMessage type="info">{lockedWarning}</StatusMessage> : null}

          {canReconcile && isUnmatched && !lockedWarning ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                <h2 className="text-lg font-semibold text-ink">{tc("Match candidates")}</h2>
                <p className="mt-1 text-sm leading-6 text-steel">
                  {tc("Candidates are posted journal lines with the same direction and a nearby date. Matching links the statement row to accounting that already exists.")}
                </p>
                {loadingCandidates ? <StatusMessage type="loading">{tc("Loading match candidates...")}</StatusMessage> : null}
                {!loadingCandidates && candidates.length === 0 ? <StatusMessage type="empty">{tc("No posted bank journal lines matched the amount and direction.")}</StatusMessage> : null}
                <div className="mt-4 space-y-3">
                  {candidates.map((candidate) => (
                    <div key={candidate.journalLineId} className="rounded-md border border-slate-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">{candidate.entryNumber}</p>
                          <p className="mt-1 text-xs text-steel">{formatAppDate(candidate.date, locale, "-")} - {candidate.description}</p>
                          <p className="mt-1 text-xs text-steel">{candidate.reason}</p>
                        </div>
                        <span className="rounded-md bg-mist px-2 py-1 text-xs font-medium text-ink">{tc(candidateScoreLabel(candidate))}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="font-mono text-xs text-steel">
                          {tc("Dr")} {formatAppMoney(candidate.debit, currency, locale)} / {tc("Cr")} {formatAppMoney(candidate.credit, currency, locale)}
                        </p>
                        <button type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("match", { journalLineId: candidate.journalLineId })} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          {submitting === "match" ? tc("Matching...") : tc("Match")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                  <h2 className="text-lg font-semibold text-ink">{tc("Categorize")}</h2>
                  <p className="mt-1 text-sm leading-6 text-steel">
                    {tc("Use categorization only when no existing posted movement should be matched. It posts a manual journal using this statement row date.")}
                  </p>
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Offset account")}</span>
                      <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} {account.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Description")}</span>
                      <input value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                    </label>
                    <button type="button" disabled={Boolean(submitting) || !accountId} onClick={() => void submitAction("categorize", { accountId, description: categoryDescription || undefined })} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                      {submitting === "categorize" ? tc("Posting...") : tc("Post categorization journal")}
                    </button>
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                  <h2 className="text-lg font-semibold text-ink">{tc("Ignore")}</h2>
                  <p className="mt-1 text-sm leading-6 text-steel">
                    {tc("Ignore rows that should stay out of reconciliation, such as duplicates already represented by another imported row.")}
                  </p>
                  <label className="mt-4 block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Reason")}</span>
                    <input value={ignoreReason} onChange={(event) => setIgnoreReason(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <button type="button" disabled={Boolean(submitting) || !ignoreReason.trim()} onClick={() => void submitAction("ignore", { reason: ignoreReason })} className="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {submitting === "ignore" ? tc("Ignoring...") : tc("Ignore row")}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!canReconcile ? <StatusMessage type="info">{tc("Your role can view statement rows, but reconciliation actions require bank statement reconcile permission.")}</StatusMessage> : null}
          {canReconcile && !lockedWarning && !isUnmatched ? <StatusMessage type="info">{tc("Only unmatched rows can be matched, categorized, or ignored.")}</StatusMessage> : null}
        </div>
      ) : null}
    </section>
  );
}

export function StatementTransactionWorkflowGuidance({
  transaction,
  canReconcile,
  lockedWarning,
}: {
  transaction: BankStatementTransaction;
  canReconcile: boolean;
  lockedWarning: string | null;
}) {
  const { tc } = useAppLocale();
  const profileHref = transaction.bankAccountProfileId ? `/bank-accounts/${transaction.bankAccountProfileId}` : "/bank-accounts";
  const rowsHref = transaction.bankAccountProfileId ? `/bank-accounts/${transaction.bankAccountProfileId}/statement-transactions` : "/bank-accounts";
  const reconciliationHref = transaction.bankAccountProfileId ? `/bank-accounts/${transaction.bankAccountProfileId}/reconciliation` : "/bank-accounts";
  const statusCopy =
    transaction.status === "UNMATCHED"
      ? tc("This row is waiting for review. Match it to an existing posted bank journal, categorize it to post a manual journal, or ignore it if it should not affect reconciliation.")
      : transaction.status === "MATCHED"
        ? tc("This row is matched to an existing posted journal line. It can be reviewed in the bank account ledger.")
        : transaction.status === "CATEGORIZED"
          ? tc("This row created a manual categorization journal. Review that journal from the matched journal reference.")
          : transaction.status === "IGNORED"
            ? tc("This row is ignored and stays out of reconciliation matching totals.")
            : tc("This row is voided and remains visible for audit review.");

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">{tc("What this statement row means")}</h2>
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankStatementTransactionStatusBadgeClass(transaction.status)}`}>
              {tc(bankStatementTransactionStatusLabel(transaction.status))}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-steel">{statusCopy}</p>
          <p className="mt-2 text-xs leading-5 text-steel">
            {tc("Credit rows increase the bank statement balance. Debit rows decrease it. Matching remains manual, and LedgerByte does not use live bank feeds.")}
          </p>
          {lockedWarning ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {tc(lockedWarning)} {tc("The closed period blocks match, categorize, and ignore changes.")}
            </div>
          ) : null}
          {!canReconcile ? (
            <p className="mt-3 text-xs leading-5 text-steel">{tc("Your role can review this row, but matching and categorization require reconcile permission.")}</p>
          ) : null}
        </div>
        <div className="min-w-full lg:min-w-[260px]">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Next actions")}</p>
          <div className="mt-2 flex flex-wrap gap-2 lg:flex-col">
            <Link href={profileHref} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Bank account")}
            </Link>
            <Link href={rowsHref} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Statement rows")}
            </Link>
            <Link href={reconciliationHref} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Reconciliation summary")}
            </Link>
            <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Dashboard")}
            </Link>
          </div>
        </div>
      </div>
    </div>
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
