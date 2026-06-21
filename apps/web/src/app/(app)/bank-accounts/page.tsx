"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking / Manual profiles"
        title="Bank accounts"
        description="Cash and bank profiles linked to posting asset accounts."
        actions={
          canManage ? (
            <LedgerButton href="/bank-accounts/new" variant="primary">
              Link account
            </LedgerButton>
          ) : null
        }
      />

      <LedgerSummaryBand tone="info">
        Banking remains manual-review only. LedgerByte does not connect to live bank feeds, auto-reconcile statement rows, or move money from this list.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load bank accounts.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank accounts...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && profiles.length === 0 ? (
          <LedgerEmptyState
            title="No bank account profiles found"
            description="Link a cash, card, wallet, or bank profile before recording transfers or importing statement rows. This does not connect LedgerByte to a live bank feed."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {canManage ? (
                  <LedgerButton href="/bank-accounts/new" variant="primary">
                    Link first account
                  </LedgerButton>
                ) : null}
                <LedgerButton href="/dashboard">Dashboard</LedgerButton>
              </div>
            }
          />
        ) : null}

        {profiles.length > 0 ? (
          <LedgerDataTable minWidth="1080px">
            <thead className="ledger-table-header">
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
                    <BankAccountStatusPill status={profile.status} />
                  </td>
                  <td className="px-4 py-3 text-steel">
                    {profile.account.code} {profile.account.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{profile.currency}</td>
                  <td className="px-4 py-3">
                    <LedgerMoney>{formatMoneyAmount(profile.ledgerBalance, profile.currency)}</LedgerMoney>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{profile.transactionCount}</td>
                  <td className="px-4 py-3">
                    <LedgerDate>{formatOptionalDate(profile.latestTransactionDate, "-")}</LedgerDate>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <LedgerButton href={`/bank-accounts/${profile.id}`} size="sm">
                        View
                      </LedgerButton>
                      {canManage ? (
                        <LedgerButton href={`/bank-accounts/${profile.id}/edit`} size="sm">
                          Edit
                        </LedgerButton>
                      ) : null}
                      {canManage && canArchiveBankAccount(profile.status) ? (
                        <LedgerButton size="sm" disabled={actionId === profile.id} onClick={() => void changeStatus(profile, "archive")}>
                          Archive
                        </LedgerButton>
                      ) : null}
                      {canManage && canReactivateBankAccount(profile.status) ? (
                        <LedgerButton size="sm" disabled={actionId === profile.id} onClick={() => void changeStatus(profile, "reactivate")}>
                          Reactivate
                        </LedgerButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function BankAccountStatusPill({ status }: Readonly<{ status: BankAccountSummary["status"] }>) {
  const tone: LedgerStatusTone = status === "ACTIVE" ? "success" : "neutral";
  return <LedgerStatusBadge tone={tone}>{bankAccountStatusLabel(status)}</LedgerStatusBadge>;
}
