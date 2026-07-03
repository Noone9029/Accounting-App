"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { appIntlLocale, formatAppDate, formatAppMoney, type AppLocale } from "@/lib/app-i18n";
import { apiRequest } from "@/lib/api";
import {
  bankReconciliationStatusLabel,
  bankStatementImportStatusBadgeClass,
  bankStatementImportStatusLabel,
  reconciliationDifferenceStatus,
} from "@/lib/bank-statements";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankReconciliationSummary } from "@/lib/types";

function todayInputValue(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export default function BankReconciliationPage() {
  const params = useParams<{ id: string }>();
  const { locale, tc } = useAppLocale();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [summary, setSummary] = useState<BankReconciliationSummary | null>(null);
  const [from, setFrom] = useState(todayInputValue(-30));
  const [to, setTo] = useState(todayInputValue());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const path = useMemo(() => {
    const query = new URLSearchParams();
    if (from) {
      query.set("from", from);
    }
    if (to) {
      query.set("to", to);
    }
    const suffix = query.toString();
    return `/bank-accounts/${params.id}/reconciliation-summary${suffix ? `?${suffix}` : ""}`;
  }, [from, params.id, to]);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankReconciliationSummary>(path)
      .then((result) => {
        if (!cancelled) {
          setSummary(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load reconciliation summary."));
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
  }, [organizationId, params.id, path, tc]);

  const status = summary ? reconciliationDifferenceStatus(summary) : "NEEDS_REVIEW";
  const currency = summary?.profile.currency ?? "SAR";
  const canViewBankAccount = can(PERMISSIONS.bankAccounts.view);
  const canImportStatements = can(PERMISSIONS.bankStatements.import);
  const canViewReconciliations = can(PERMISSIONS.bankReconciliations.view);
  const canCreateReconciliation = can(PERMISSIONS.bankReconciliations.create);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Reconciliation summary")}</h1>
          <p className="mt-1 text-sm text-steel">{summary ? tc("{name} statement and ledger review", { name: summary.profile.displayName }) : tc("Statement and ledger review")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewReconciliations ? (
            <Link href={`/bank-accounts/${params.id}/reconciliations`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Reconciliations")}
            </Link>
          ) : null}
          {canCreateReconciliation ? (
            <Link href={`/bank-accounts/${params.id}/reconciliations/new`} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50">
              {tc("New close")}
            </Link>
          ) : null}
          <Link href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Unmatched rows")}
          </Link>
          <Link href={`/bank-accounts/${params.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load reconciliation details.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading reconciliation summary...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("From")}</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("To")}</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Suggestion")}</p>
            <span className={`mt-1 inline-flex rounded-md px-2 py-1 text-xs font-medium ${status === "RECONCILED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {status === "RECONCILED" ? tc("Reconciled") : tc("Needs review")}
            </span>
          </div>
        </div>
      </div>

      {summary ? (
        <div className="mt-5 space-y-5">
          <ReconciliationSummaryGuidance
            summary={summary}
            profileId={params.id}
            canImportStatements={canImportStatements}
            canCreateReconciliation={canCreateReconciliation}
            canViewBankAccount={canViewBankAccount}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label={tc("Ledger balance")} value={formatAppMoney(summary.ledgerBalance, currency, locale)} />
            <SummaryCard label={tc("Statement closing")} value={summary.statementClosingBalance ? formatAppMoney(summary.statementClosingBalance, currency, locale) : "-"} />
            <SummaryCard label={tc("Difference")} value={summary.difference ? formatAppMoney(summary.difference, currency, locale) : "-"} />
            <SummaryCard label={tc("Unmatched rows")} value={formatCount(summary.totals.unmatched.count, locale)} />
            <SummaryCard label={tc("Closed through")} value={closedThroughDateDisplay(summary, locale)} />
            <SummaryCard label={tc("Unreconciled rows")} value={formatCount(summary.unreconciledTransactionCount, locale)} />
            <SummaryCard label={tc("Open draft")} value={summary.hasOpenDraftReconciliation ? tc("Yes") : tc("No")} />
            <SummaryCard
              label={tc("Latest close")}
              value={
                summary.latestClosedReconciliation ? (
                  <>
                    <bdi dir="ltr">{summary.latestClosedReconciliation.reconciliationNumber}</bdi> {tc(bankReconciliationStatusLabel(summary.latestClosedReconciliation.status))}
                  </>
                ) : "-"
              }
            />
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-lg font-semibold text-ink">{tc("Statement row totals")}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryCard label={tc("Credits")} value={formatCountMoney(summary.totals.credits.count, summary.totals.credits.total, currency, locale)} />
              <SummaryCard label={tc("Debits")} value={formatCountMoney(summary.totals.debits.count, summary.totals.debits.total, currency, locale)} />
              <SummaryCard label={tc("Matched")} value={formatCountMoney(summary.totals.matched.count, summary.totals.matched.total, currency, locale)} />
              <SummaryCard label={tc("Categorized")} value={formatCountMoney(summary.totals.categorized.count, summary.totals.categorized.total, currency, locale)} />
              <SummaryCard label={tc("Ignored")} value={formatCountMoney(summary.totals.ignored.count, summary.totals.ignored.total, currency, locale)} />
              <SummaryCard label={tc("Unmatched")} value={formatCountMoney(summary.totals.unmatched.count, summary.totals.unmatched.total, currency, locale)} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[900px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Filename")}</th>
                  <th className="px-4 py-3">{tc("Status")}</th>
                  <th className="px-4 py-3">{tc("Statement range")}</th>
                  <th className="px-4 py-3 text-end">{tc("Rows")}</th>
                  <th className="px-4 py-3 text-end">{tc("Closing balance")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.imports.map((statementImport) => (
                  <tr key={statementImport.id}>
                    <td className="px-4 py-3 text-ink"><bdi dir="ltr">{statementImport.filename}</bdi></td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankStatementImportStatusBadgeClass(statementImport.status)}`}>
                        {tc(bankStatementImportStatusLabel(statementImport.status))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-steel">
                      {formatAppDate(statementImport.statementStartDate, locale, "-")} {tc("to")} {formatAppDate(statementImport.statementEndDate, locale, "-")}
                    </td>
                    <td className="px-4 py-3 text-end font-mono text-xs">{formatCount(statementImport.rowCount, locale)}</td>
                    <td className="px-4 py-3 text-end font-mono text-xs">{statementImport.closingStatementBalance ? formatAppMoney(statementImport.closingStatementBalance, currency, locale) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {summary.imports.length === 0 ? <StatusMessage type="empty">{tc("No statement imports found for this date range.")}</StatusMessage> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function ReconciliationSummaryGuidance({
  summary,
  profileId,
  canImportStatements = true,
  canCreateReconciliation = true,
  canViewBankAccount = true,
}: {
  summary: BankReconciliationSummary;
  profileId: string;
  canImportStatements?: boolean;
  canCreateReconciliation?: boolean;
  canViewBankAccount?: boolean;
}) {
  const { locale, tc } = useAppLocale();
  const status = reconciliationDifferenceStatus(summary);
  const differenceText = summary.difference ? formatAppMoney(summary.difference, summary.profile.currency, locale) : "-";
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">{tc("How reconciliation works")}</h2>
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${status === "RECONCILED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {status === "RECONCILED" ? tc("Ready to close") : tc("Needs review")}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-steel">
            {tc("Reconciliation compares the posted bank ledger against imported statement rows for the selected period. You can close only when the difference is zero and no statement rows are unmatched.")}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-steel md:grid-cols-3">
            <p>
              <span className="font-medium text-ink">{tc("Difference")}:</span> {differenceText}
            </p>
            <p>
              <span className="font-medium text-ink">{tc("Unmatched rows")}:</span> {formatCount(summary.totals.unmatched.count, locale)}
            </p>
            <p>
              <span className="font-medium text-ink">{tc("Closed through")}:</span> {closedThroughDateDisplay(summary, locale)}
            </p>
          </div>
          <p className="mt-3 text-xs leading-5 text-steel">
            {tc("Closed reconciliations lock statement rows in that period from matching, categorizing, ignoring, and overlapping imports.")}
          </p>
        </div>
        <div className="min-w-full lg:min-w-[260px]">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Next actions")}</p>
          <div className="mt-2 flex flex-wrap gap-2 lg:flex-col">
            <Link href={`/bank-accounts/${profileId}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Review unmatched rows")}
            </Link>
            {canImportStatements ? (
              <Link href={`/bank-accounts/${profileId}/statement-imports`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Import statement")}
              </Link>
            ) : null}
            {canCreateReconciliation ? (
              <Link href={`/bank-accounts/${profileId}/reconciliations/new`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Create close draft")}
              </Link>
            ) : null}
            {canViewBankAccount ? (
              <Link href={`/bank-accounts/${profileId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Bank account")}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-2 font-mono text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function closedThroughDateDisplay(summary: Pick<BankReconciliationSummary, "closedThroughDate">, locale: AppLocale): string {
  return summary.closedThroughDate ? formatAppDate(summary.closedThroughDate, locale, "-") : translateNotClosed(locale);
}

function translateNotClosed(locale: AppLocale): string {
  return locale === "ar" ? "غير مغلقة" : "Not closed";
}

function formatCount(value: number, locale: AppLocale): string {
  return new Intl.NumberFormat(appIntlLocale(locale)).format(value);
}

function formatCountMoney(count: number, total: string, currency: string, locale: AppLocale): string {
  return `${formatCount(count, locale)} / ${formatAppMoney(total, currency, locale)}`;
}
