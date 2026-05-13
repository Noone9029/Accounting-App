"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankReconciliationStatusBadgeClass, bankReconciliationStatusLabel } from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, BankReconciliation } from "@/lib/types";

export default function BankReconciliationsPage() {
  const params = useParams<{ id: string }>();
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load reconciliations.");
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
  }, [organizationId, params.id]);

  const currency = profile?.currency ?? "SAR";

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Bank reconciliations</h1>
          <p className="mt-1 text-sm text-steel">{profile ? `${profile.displayName} closed-period review history` : "Closed-period review history"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate ? (
            <Link href={`/bank-accounts/${params.id}/reconciliations/new`} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              New reconciliation
            </Link>
          ) : null}
          <Link href={`/bank-accounts/${params.id}/reconciliation`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Summary
          </Link>
          <Link href={`/bank-accounts/${params.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load reconciliations.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading reconciliations...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Statement closing</th>
              <th className="px-4 py-3 text-right">Ledger closing</th>
              <th className="px-4 py-3 text-right">Difference</th>
              <th className="px-4 py-3">Closed</th>
              <th className="px-4 py-3 text-right">Items</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reconciliations.map((reconciliation) => (
              <tr key={reconciliation.id}>
                <td className="px-4 py-3 font-medium text-ink">{reconciliation.reconciliationNumber}</td>
                <td className="px-4 py-3 text-steel">
                  {formatOptionalDate(reconciliation.periodStart, "-")} to {formatOptionalDate(reconciliation.periodEnd, "-")}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankReconciliationStatusBadgeClass(reconciliation.status)}`}>
                    {bankReconciliationStatusLabel(reconciliation.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(reconciliation.statementClosingBalance, currency)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(reconciliation.ledgerClosingBalance, currency)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(reconciliation.difference, currency)}</td>
                <td className="px-4 py-3 text-steel">{formatOptionalDate(reconciliation.closedAt, "-")}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{reconciliation._count?.items ?? 0}</td>
                <td className="px-4 py-3">
                  <Link href={`/bank-reconciliations/${reconciliation.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && reconciliations.length === 0 ? <StatusMessage type="empty">No reconciliations found for this bank account.</StatusMessage> : null}
      </div>
    </section>
  );
}
