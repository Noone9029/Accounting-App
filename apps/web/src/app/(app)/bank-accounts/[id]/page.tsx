"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankTransactionSourceLabel,
  bankAccountStatusLabel,
  bankAccountTypeLabel,
  canArchiveBankAccount,
  canPostOpeningBalance,
  canReactivateBankAccount,
  hasPostedOpeningBalance,
} from "@/lib/bank-accounts";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, BankAccountTransactionsResponse } from "@/lib/types";

function todayInputValue(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export default function BankAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [transactions, setTransactions] = useState<BankAccountTransactionsResponse | null>(null);
  const [from, setFrom] = useState(todayInputValue(-30));
  const [to, setTo] = useState(todayInputValue());
  const [loading, setLoading] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [actionId, setActionId] = useState("");
  const [postingOpeningBalance, setPostingOpeningBalance] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [transactionError, setTransactionError] = useState("");
  const [success, setSuccess] = useState("");
  const canManage = can(PERMISSIONS.bankAccounts.manage);
  const canViewTransactions = can(PERMISSIONS.bankAccounts.transactionsView);
  const canPostOpening = can(PERMISSIONS.bankAccounts.openingBalancePost);
  const canViewStatements = can(PERMISSIONS.bankStatements.view);
  const canImportStatements = can(PERMISSIONS.bankStatements.import);
  const canViewReconciliations = can(PERMISSIONS.bankReconciliations.view);
  const transactionPath = useMemo(() => {
    const query = new URLSearchParams();
    if (from) {
      query.set("from", from);
    }
    if (to) {
      query.set("to", to);
    }
    const suffix = query.toString();
    return `/bank-accounts/${params.id}/transactions${suffix ? `?${suffix}` : ""}`;
  }, [from, params.id, to]);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankAccountSummary>(`/bank-accounts/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setProfile(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bank account profile.");
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

  useEffect(() => {
    if (!organizationId || !params.id || !canViewTransactions) {
      return;
    }

    let cancelled = false;
    setLoadingTransactions(true);
    setTransactionError("");

    apiRequest<BankAccountTransactionsResponse>(transactionPath)
      .then((result) => {
        if (!cancelled) {
          setTransactions(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setTransactionError(loadError instanceof Error ? loadError.message : "Unable to load bank account transactions.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTransactions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canViewTransactions, organizationId, params.id, reloadToken, transactionPath]);

  async function changeStatus(action: "archive" | "reactivate") {
    if (!profile) {
      return;
    }
    setActionId(profile.id);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankAccountSummary>(`/bank-accounts/${profile.id}/${action}`, { method: "POST" });
      setSuccess(`${updated.displayName} is now ${bankAccountStatusLabel(updated.status).toLowerCase()}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update bank account status.");
    } finally {
      setActionId("");
    }
  }

  async function postOpeningBalance() {
    if (!profile) {
      return;
    }
    setPostingOpeningBalance(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankAccountSummary>(`/bank-accounts/${profile.id}/post-opening-balance`, { method: "POST" });
      setProfile(updated);
      setSuccess(`Opening balance for ${updated.displayName} has been posted.`);
      setReloadToken((current) => current + 1);
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "Unable to post opening balance.");
    } finally {
      setPostingOpeningBalance(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{profile?.displayName ?? "Bank account"}</h1>
          <p className="mt-1 text-sm text-steel">Ledger balance and posted transaction activity.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/bank-accounts" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {profile && canManage ? (
            <Link href={`/bank-accounts/${profile.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Edit
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load bank account details.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank account...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {profile ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Ledger balance" value={formatMoneyAmount(profile.ledgerBalance, profile.currency)} />
            <SummaryCard label="Transactions" value={String(profile.transactionCount)} />
            <SummaryCard label="Type" value={bankAccountTypeLabel(profile.type)} />
            <SummaryCard label="Status" value={bankAccountStatusLabel(profile.status)} />
          </div>

          <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Detail label="Chart account" value={`${profile.account.code} ${profile.account.name}`} />
              <Detail label="Currency" value={profile.currency} />
              <Detail label="Bank name" value={profile.bankName ?? "-"} />
              <Detail label="Latest transaction" value={formatOptionalDate(profile.latestTransactionDate, "-")} />
              <Detail label="Masked account" value={profile.accountNumberMasked ?? "-"} />
              <Detail label="Masked IBAN" value={profile.ibanMasked ?? "-"} />
              <Detail label="Opening balance" value={formatMoneyAmount(profile.openingBalance, profile.currency)} />
              <Detail label="Opening balance date" value={formatOptionalDate(profile.openingBalanceDate, "-")} />
              <Detail label="Opening posted" value={profile.openingBalancePostedAt ? formatOptionalDate(profile.openingBalancePostedAt, "-") : "-"} />
              <Detail label="Opening journal" value={profile.openingBalanceJournalEntry?.entryNumber ?? "-"} />
            </div>
            {profile.notes ? <p className="mt-4 text-sm text-steel">{profile.notes}</p> : null}
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Opening balances create posted accounting journals. Once posted, the opening balance amount and date are locked.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/reports/general-ledger?accountId=${profile.accountId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                General ledger
              </Link>
              {canImportStatements ? (
                <Link href={`/bank-accounts/${profile.id}/statement-imports`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Import statement
                </Link>
              ) : null}
              {canViewStatements ? (
                <>
                  <Link href={`/bank-accounts/${profile.id}/statement-transactions`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Statement transactions
                  </Link>
                  <Link href={`/bank-accounts/${profile.id}/reconciliation`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Reconciliation
                  </Link>
                </>
              ) : null}
              {canViewReconciliations ? (
                <Link href={`/bank-accounts/${profile.id}/reconciliations`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Reconciliations
                </Link>
              ) : null}
              {canPostOpening && canPostOpeningBalance(profile) ? (
                <button type="button" disabled={postingOpeningBalance} onClick={() => void postOpeningBalance()} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {postingOpeningBalance ? "Posting..." : "Post opening balance"}
                </button>
              ) : null}
              {hasPostedOpeningBalance(profile) ? (
                <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">Opening balance posted</span>
              ) : null}
              {canManage && canArchiveBankAccount(profile.status) ? (
                <button type="button" disabled={Boolean(actionId)} onClick={() => void changeStatus("archive")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  Archive
                </button>
              ) : null}
              {canManage && canReactivateBankAccount(profile.status) ? (
                <button type="button" disabled={Boolean(actionId)} onClick={() => void changeStatus("reactivate")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  Reactivate
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Transactions</h2>
                <p className="mt-1 text-sm text-steel">Posted journal lines for the linked asset account.</p>
              </div>
              {canViewTransactions ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">From</span>
                    <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">To</span>
                    <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                </div>
              ) : null}
            </div>

            {!canViewTransactions ? <StatusMessage type="info">You can view the account profile, but transaction visibility requires bank transaction permission.</StatusMessage> : null}
            {loadingTransactions ? <StatusMessage type="loading">Loading transactions...</StatusMessage> : null}
            {transactionError ? <StatusMessage type="error">{transactionError}</StatusMessage> : null}
            {canViewTransactions && transactions && transactions.transactions.length === 0 ? <StatusMessage type="empty">No posted transactions found for this date range.</StatusMessage> : null}

            {canViewTransactions && transactions && transactions.transactions.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Entry</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-4 py-3 text-steel">{formatOptionalDate(transaction.date, "-")}</td>
                        <td className="px-4 py-3 font-mono text-xs">{transaction.entryNumber}</td>
                        <td className="px-4 py-3 text-ink">{transaction.description}</td>
                        <td className="px-4 py-3 font-mono text-xs">{transaction.reference ?? "-"}</td>
                        <td className="px-4 py-3 text-steel">{bankTransactionSourceLabel(transaction)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(transaction.debit, profile.currency)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(transaction.credit, profile.currency)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(transaction.runningBalance, profile.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </>
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
