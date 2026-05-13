"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankAccountStatusBadgeClass,
  bankAccountStatusLabel,
  bankAccountTypeLabel,
  canArchiveBankAccount,
  canReactivateBankAccount,
} from "@/lib/bank-accounts";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary } from "@/lib/types";

export default function BankAccountsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [profiles, setProfiles] = useState<BankAccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManage = can(PERMISSIONS.bankAccounts.manage);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankAccountSummary[]>("/bank-accounts")
      .then((result) => {
        if (!cancelled) {
          setProfiles(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bank accounts.");
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
  }, [organizationId, reloadToken]);

  async function changeStatus(profile: BankAccountSummary, action: "archive" | "reactivate") {
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

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Bank accounts</h1>
          <p className="mt-1 text-sm text-steel">Cash and bank profiles linked to posting asset accounts.</p>
        </div>
        {canManage ? (
          <Link href="/bank-accounts/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Link account
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load bank accounts.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank accounts...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && profiles.length === 0 ? <StatusMessage type="empty">No bank account profiles found.</StatusMessage> : null}
      </div>

      {profiles.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Chart account</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Ledger balance</th>
                <th className="px-4 py-3">Transactions</th>
                <th className="px-4 py-3">Latest</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td className="px-4 py-3 font-medium text-ink">{profile.displayName}</td>
                  <td className="px-4 py-3 text-steel">{bankAccountTypeLabel(profile.type)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankAccountStatusBadgeClass(profile.status)}`}>
                      {bankAccountStatusLabel(profile.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-steel">
                    {profile.account.code} {profile.account.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{profile.currency}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(profile.ledgerBalance, profile.currency)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{profile.transactionCount}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(profile.latestTransactionDate, "-")}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/bank-accounts/${profile.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        View
                      </Link>
                      {canManage ? (
                        <Link href={`/bank-accounts/${profile.id}/edit`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          Edit
                        </Link>
                      ) : null}
                      {canManage && canArchiveBankAccount(profile.status) ? (
                        <button type="button" disabled={actionId === profile.id} onClick={() => void changeStatus(profile, "archive")} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          Archive
                        </button>
                      ) : null}
                      {canManage && canReactivateBankAccount(profile.status) ? (
                        <button type="button" disabled={actionId === profile.id} onClick={() => void changeStatus(profile, "reactivate")} className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          Reactivate
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
