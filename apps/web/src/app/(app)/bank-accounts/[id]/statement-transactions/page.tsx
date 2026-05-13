"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankStatementTransactionStatusBadgeClass,
  bankStatementTransactionStatusLabel,
  bankStatementTransactionTypeLabel,
} from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import type { BankAccountSummary, BankStatementTransaction, BankStatementTransactionStatus } from "@/lib/types";

function todayInputValue(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export default function BankStatementTransactionsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const initialStatus = (searchParams.get("status") as BankStatementTransactionStatus | null) ?? "";
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [transactions, setTransactions] = useState<BankStatementTransaction[]>([]);
  const [status, setStatus] = useState<BankStatementTransactionStatus | "">(initialStatus);
  const [from, setFrom] = useState(todayInputValue(-30));
  const [to, setTo] = useState(todayInputValue());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const path = useMemo(() => {
    const query = new URLSearchParams();
    if (status) {
      query.set("status", status);
    }
    if (from) {
      query.set("from", from);
    }
    if (to) {
      query.set("to", to);
    }
    const suffix = query.toString();
    return `/bank-accounts/${params.id}/statement-transactions${suffix ? `?${suffix}` : ""}`;
  }, [from, params.id, status, to]);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([apiRequest<BankAccountSummary>(`/bank-accounts/${params.id}`), apiRequest<BankStatementTransaction[]>(path)])
      .then(([profileResult, transactionsResult]) => {
        if (!cancelled) {
          setProfile(profileResult);
          setTransactions(transactionsResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load statement transactions.");
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
  }, [organizationId, params.id, path]);

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Statement transactions</h1>
          <p className="mt-1 text-sm text-steel">{profile ? `${profile.displayName} imported statement rows` : "Imported statement rows"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bank-accounts/${params.id}/statement-imports`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Imports
          </Link>
          <Link href={`/bank-accounts/${params.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load statement transactions.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading statement transactions...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as BankStatementTransactionStatus | "")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">All</option>
              {(["UNMATCHED", "MATCHED", "CATEGORIZED", "IGNORED", "VOIDED"] as BankStatementTransactionStatus[]).map((item) => (
                <option key={item} value={item}>
                  {bankStatementTransactionStatusLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">From</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">To</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-4 py-3 text-steel">{formatOptionalDate(transaction.transactionDate, "-")}</td>
                <td className="px-4 py-3 text-ink">{transaction.description}</td>
                <td className="px-4 py-3 font-mono text-xs">{transaction.reference ?? "-"}</td>
                <td className="px-4 py-3">{bankStatementTransactionTypeLabel(transaction.type)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(transaction.amount, profile?.currency ?? "SAR")}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankStatementTransactionStatusBadgeClass(transaction.status)}`}>
                    {bankStatementTransactionStatusLabel(transaction.status)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{transaction.matchedJournalEntry?.entryNumber ?? transaction.createdJournalEntry?.entryNumber ?? "-"}</td>
                <td className="px-4 py-3">
                  <Link href={`/bank-statement-transactions/${transaction.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && transactions.length === 0 ? <StatusMessage type="empty">No statement transactions found for this filter.</StatusMessage> : null}
      </div>
    </section>
  );
}
