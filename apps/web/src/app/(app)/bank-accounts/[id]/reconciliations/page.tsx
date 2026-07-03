"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { appIntlLocale, formatAppDate, formatAppMoney, type AppLocale } from "@/lib/app-i18n";
import { bankReconciliationStatusBadgeClass, bankReconciliationStatusLabel } from "@/lib/bank-statements";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, BankReconciliation } from "@/lib/types";

export default function BankReconciliationsPage() {
  const params = useParams<{ id: string }>();
  const { locale, tc } = useAppLocale();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreate = can(PERMISSIONS.bankReconciliations.create);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<BankAccountSummary>(`/bank-accounts/${params.id}`),
      apiRequest<BankReconciliation[]>(`/bank-accounts/${params.id}/reconciliations`),
    ])
      .then(([profileResult, reconciliationsResult]) => {
        if (!cancelled) {
          setProfile(profileResult);
          setReconciliations(reconciliationsResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load reconciliations."));
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

  const currency = profile?.currency ?? "SAR";

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Bank reconciliations")}</h1>
          <p className="mt-1 text-sm text-steel">{profile ? tc("{name} closed-period review history", { name: profile.displayName }) : tc("Closed-period review history")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate ? (
            <Link href={`/bank-accounts/${params.id}/reconciliations/new`} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              {tc("New reconciliation")}
            </Link>
          ) : null}
          <Link href={`/bank-accounts/${params.id}/reconciliation`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Summary")}
          </Link>
          <Link href={`/bank-accounts/${params.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load reconciliations.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading reconciliations...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">{tc("Closed-period history")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
          {tc("Reconciliations document when the imported statement rows and posted bank ledger agree. Closing a reconciliation locks the statement transaction period, while voiding the reconciliation unlocks it without deleting the audit trail.")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/bank-accounts/${params.id}/reconciliation`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Reconciliation summary")}
          </Link>
          <Link href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Unmatched rows")}
          </Link>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[1040px] text-start text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">{tc("Number")}</th>
              <th className="px-4 py-3">{tc("Period")}</th>
              <th className="px-4 py-3">{tc("Status")}</th>
              <th className="px-4 py-3 text-end">{tc("Statement closing")}</th>
              <th className="px-4 py-3 text-end">{tc("Ledger closing")}</th>
              <th className="px-4 py-3 text-end">{tc("Difference")}</th>
              <th className="px-4 py-3">{tc("Closed")}</th>
              <th className="px-4 py-3 text-end">{tc("Items")}</th>
              <th className="px-4 py-3">{tc("Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reconciliations.map((reconciliation) => (
              <tr key={reconciliation.id}>
                <td className="px-4 py-3 font-medium text-ink"><bdi dir="ltr">{reconciliation.reconciliationNumber}</bdi></td>
                <td className="px-4 py-3 text-steel">
                  {formatAppDate(reconciliation.periodStart, locale, "-")} {tc("to")} {formatAppDate(reconciliation.periodEnd, locale, "-")}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankReconciliationStatusBadgeClass(reconciliation.status)}`}>
                    {tc(bankReconciliationStatusLabel(reconciliation.status))}
                  </span>
                </td>
                <td className="px-4 py-3 text-end font-mono text-xs">{formatAppMoney(reconciliation.statementClosingBalance, currency, locale)}</td>
                <td className="px-4 py-3 text-end font-mono text-xs">{formatAppMoney(reconciliation.ledgerClosingBalance, currency, locale)}</td>
                <td className="px-4 py-3 text-end font-mono text-xs">{formatAppMoney(reconciliation.difference, currency, locale)}</td>
                <td className="px-4 py-3 text-steel">{formatAppDate(reconciliation.closedAt, locale, "-")}</td>
                <td className="px-4 py-3 text-end font-mono text-xs">{formatCount(reconciliation._count?.items ?? 0, locale)}</td>
                <td className="px-4 py-3">
                  <Link href={`/bank-reconciliations/${reconciliation.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    {tc("View")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && reconciliations.length === 0 ? (
          <div className="p-4">
            <StatusMessage type="empty">{tc("No reconciliations found for this bank account.")}</StatusMessage>
            <p className="mt-2 text-sm leading-6 text-steel">
              {tc("Import statement rows, review unmatched activity, then create a reconciliation draft when the ledger and statement are ready to close.")}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function formatCount(value: number, locale: AppLocale): string {
  return new Intl.NumberFormat(appIntlLocale(locale)).format(value);
}
