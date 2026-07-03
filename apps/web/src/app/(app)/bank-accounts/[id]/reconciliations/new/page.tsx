"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppMoney } from "@/lib/app-i18n";
import type { BankAccountSummary, BankReconciliation } from "@/lib/types";

function todayInputValue(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export default function NewBankReconciliationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale, tc } = useAppLocale();
  const organizationId = useActiveOrganizationId();
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [periodStart, setPeriodStart] = useState(todayInputValue(-30));
  const [periodEnd, setPeriodEnd] = useState(todayInputValue());
  const [statementOpeningBalance, setStatementOpeningBalance] = useState("");
  const [statementClosingBalance, setStatementClosingBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
          setStatementClosingBalance((current) => current || result.ledgerBalance);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load bank account profile."));
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
  }, [organizationId, params.id, tc]);

  async function submitReconciliation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!periodStart || !periodEnd || !statementClosingBalance) {
      setError(tc("Period start, period end, and statement closing balance are required."));
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiRequest<BankReconciliation>(`/bank-accounts/${params.id}/reconciliations`, {
        method: "POST",
        body: {
          periodStart,
          periodEnd,
          statementClosingBalance,
          statementOpeningBalance: statementOpeningBalance || undefined,
          notes: notes || undefined,
        },
      });
      router.push(`/bank-reconciliations/${created.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tc("Unable to create reconciliation."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("New reconciliation")}</h1>
          <p className="mt-1 text-sm text-steel">{profile ? tc("{name} statement close draft", { name: profile.displayName }) : tc("Statement close draft")}</p>
        </div>
        <Link href={`/bank-accounts/${params.id}/reconciliations`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back")}
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to create a reconciliation.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading bank account...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <form onSubmit={submitReconciliation} className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-ink">{tc("Before you close a period")}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
            {tc("Create a draft after statement rows are imported and reviewed. The period is not locked yet; submit and close only after the difference is zero and no statement rows remain unmatched.")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Review unmatched rows")}
            </Link>
            <Link href={`/bank-accounts/${params.id}/statement-imports`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Import statement")}
            </Link>
          </div>
        </div>

        {profile ? (
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard label={tc("Bank account")} value={profile.displayName} />
            <SummaryCard label={tc("Current ledger balance")} value={formatAppMoney(profile.ledgerBalance, profile.currency, locale)} />
            <SummaryCard label={tc("Currency")} value={<bdi dir="ltr">{profile.currency}</bdi>} />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Period start")}</span>
            <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Period end")}</span>
            <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Statement opening balance")}</span>
            <input inputMode="decimal" value={statementOpeningBalance} onChange={(event) => setStatementOpeningBalance(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Statement closing balance")}</span>
            <input inputMode="decimal" value={statementClosingBalance} onChange={(event) => setStatementClosingBalance(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">{tc("Notes")}</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        </label>
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {tc("Creating a draft does not lock the period. The period becomes immutable only after close succeeds with zero difference and no unmatched statement rows.")}
        </div>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href={`/bank-accounts/${params.id}/reconciliation`} className="rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Review summary first")}
          </Link>
          <button type="submit" disabled={submitting} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? tc("Creating...") : tc("Create draft")}
          </button>
        </div>
      </form>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-2 font-mono text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
