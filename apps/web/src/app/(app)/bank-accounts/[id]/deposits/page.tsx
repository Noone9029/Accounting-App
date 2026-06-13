"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankDepositStatusBadgeClass, bankDepositStatusLabel } from "@/lib/bank-deposits";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, BankDepositBatch } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BankDepositsPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.bankStatements.manage);
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [deposits, setDeposits] = useState<BankDepositBatch[]>([]);
  const [depositDate, setDepositDate] = useState(todayInputValue());
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const currency = profile?.currency ?? "SAR";

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<BankAccountSummary>(`/bank-accounts/${params.id}`),
      apiRequest<BankDepositBatch[]>(`/bank-deposits?bankAccountProfileId=${params.id}`),
    ])
      .then(([profileResult, depositResult]) => {
        if (!cancelled) {
          setProfile(profileResult);
          setDeposits(depositResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bank deposits.");
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

  const totals = useMemo(
    () =>
      deposits.reduce(
        (summary, deposit) => {
          summary.count += 1;
          summary.amount += Number(deposit.totalAmount);
          return summary;
        },
        { count: 0, amount: 0 },
      ),
    [deposits],
  );

  async function createDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      return;
    }
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const created = await apiRequest<BankDepositBatch>("/bank-deposits", {
        method: "POST",
        body: {
          bankAccountProfileId: profile.id,
          depositDate: `${depositDate}T00:00:00.000Z`,
          currency: profile.currency,
          memo: memo.trim() || undefined,
        },
      });
      setSuccess("Draft bank deposit batch created.");
      setMemo("");
      setDeposits((current) => [created, ...current]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create bank deposit batch.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Bank deposit batches</h1>
          <p className="mt-1 text-sm text-steel">{profile ? `${profile.displayName} grouped receipt deposits` : "Grouped receipt deposits"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Statement rows
          </Link>
          <Link href={`/bank-accounts/${params.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load bank deposits.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank deposits...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!canManage ? <StatusMessage type="info">You can view deposit batches, but creating or editing drafts requires bank statement manage permission.</StatusMessage> : null}
      </div>

      <BankDepositGuidance />

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Batches" value={String(totals.count)} />
        <SummaryCard label="Total grouped" value={formatMoneyAmount(totals.amount.toFixed(4), currency)} />
        <SummaryCard label="Currency" value={currency} />
      </div>

      {canManage && profile ? (
        <form onSubmit={createDeposit} className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">Create draft deposit</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Deposit date</span>
              <input type="date" value={depositDate} onChange={(event) => setDepositDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Memo</span>
              <input value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <button type="submit" disabled={creating} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {creating ? "Creating..." : "Create draft"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Memo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Statement row</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deposits.map((deposit) => (
              <tr key={deposit.id}>
                <td className="px-4 py-3 text-steel">{formatOptionalDate(deposit.depositDate, "-")}</td>
                <td className="px-4 py-3 text-ink">{deposit.memo ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankDepositStatusBadgeClass(deposit.status)}`}>
                    {bankDepositStatusLabel(deposit.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(deposit.totalAmount, deposit.currency)}</td>
                <td className="px-4 py-3 text-steel">
                  {deposit.statementTransaction
                    ? `${formatOptionalDate(deposit.statementTransaction.transactionDate, "-")} - ${deposit.statementTransaction.description}`
                    : "Not matched"}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/bank-accounts/${params.id}/deposits/${deposit.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && deposits.length === 0 ? (
          <div className="p-4">
            <StatusMessage type="empty">No bank deposit batches yet.</StatusMessage>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function BankDepositGuidance() {
  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-base font-semibold text-ink">Manual treasury grouping</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        Deposit batches group receipt-like items so one posted batch can be explicitly matched to one imported bank statement credit row. This is manual banking only: no live bank feed, no bank API call, no bank payment is sent, and no payment initiation is enabled.
      </p>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-steel">
        Ledger-backed undeposited-funds movement is deferred until a clearing-account model is confirmed. Posting a deposit batch here changes only the operational deposit status and does not duplicate revenue, AR settlement, VAT, ZATCA, or bank journal behavior.
      </p>
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
