"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
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
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary } from "@/lib/types";

export default function BankAccountsPage() {
  const { locale, tc } = useAppLocale();
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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load bank accounts."));
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
      setSuccess(tc("{name} is now {status}.", { name: updated.displayName, status: tc(bankAccountStatusLabel(updated.status)).toLowerCase() }));
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to update bank account status."));
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Bank accounts")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Cash and bank profiles linked to posting asset accounts.")}</p>
        </div>
        {canManage ? (
          <Link href="/bank-accounts/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            {tc("Link account")}
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load bank accounts.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading bank accounts...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && profiles.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 shadow-panel">
            <StatusMessage type="empty">{tc("No bank account profiles found.")}</StatusMessage>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-steel">
              {tc("Link a cash, card, wallet, or bank profile before recording transfers or importing statement rows. This does not connect LedgerByte to a live bank feed.")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {canManage ? (
                <Link href="/bank-accounts/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                  {tc("Link first account")}
                </Link>
              ) : null}
              <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Dashboard")}
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {profiles.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1080px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{tc("Name")}</th>
                <th className="px-4 py-3">{tc("Type")}</th>
                <th className="px-4 py-3">{tc("Status")}</th>
                <th className="px-4 py-3">{tc("Chart account")}</th>
                <th className="px-4 py-3">{tc("Currency")}</th>
                <th className="px-4 py-3 text-end">{tc("Ledger balance")}</th>
                <th className="px-4 py-3 text-end">{tc("Transactions")}</th>
                <th className="px-4 py-3">{tc("Latest")}</th>
                <th className="px-4 py-3">{tc("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td className="px-4 py-3 font-medium text-ink">{profile.displayName}</td>
                  <td className="px-4 py-3 text-steel">{tc(bankAccountTypeLabel(profile.type))}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankAccountStatusBadgeClass(profile.status)}`}>
                      {tc(bankAccountStatusLabel(profile.status))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-steel">
                    <bdi dir="ltr">{profile.account.code}</bdi> {profile.account.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{profile.currency}</bdi></td>
                  <td className="px-4 py-3 text-end font-mono text-xs">{formatAppMoney(profile.ledgerBalance, profile.currency, locale)}</td>
                  <td className="px-4 py-3 text-end font-mono text-xs">{profile.transactionCount}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(profile.latestTransactionDate, locale, "-")}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/bank-accounts/${profile.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {tc("View")}
                      </Link>
                      {canManage ? (
                        <Link href={`/bank-accounts/${profile.id}/edit`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          {tc("Edit")}
                        </Link>
                      ) : null}
                      {canManage && canArchiveBankAccount(profile.status) ? (
                        <button type="button" disabled={actionId === profile.id} onClick={() => void changeStatus(profile, "archive")} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          {tc("Archive")}
                        </button>
                      ) : null}
                      {canManage && canReactivateBankAccount(profile.status) ? (
                        <button type="button" disabled={actionId === profile.id} onClick={() => void changeStatus(profile, "reactivate")} className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          {tc("Reactivate")}
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
