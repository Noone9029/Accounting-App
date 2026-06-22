"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerInput,
  LedgerMetricGrid,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
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
  const canCreateTransfers = can(PERMISSIONS.bankTransfers.create);
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking / Account profile"
        title={profile?.displayName ?? "Bank account"}
        description="Ledger balance, profile metadata, and posted transaction activity for the linked asset account."
        badge={profile ? <BankAccountStatusPill status={profile.status} /> : null}
        actions={
          <LedgerActionBar className="sm:justify-end">
            <LedgerButton href="/bank-accounts">Back</LedgerButton>
            {profile && canManage ? <LedgerButton href={`/bank-accounts/${profile.id}/edit`}>Edit</LedgerButton> : null}
          </LedgerActionBar>
        }
      />

      <LedgerSummaryBand tone="info">
        This account view is manual-review banking. LedgerByte does not connect to live bank feeds, call external banking APIs, move money, or automatically reconcile statement rows from this page.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load bank account details.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank account...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}

        {profile ? (
        <>
          <LedgerMetricGrid>
            <LedgerStatCard label="Ledger balance" value={<LedgerMoney>{formatMoneyAmount(profile.ledgerBalance, profile.currency)}</LedgerMoney>} detail="Posted journal balance" />
            <LedgerStatCard label="Transactions" value={String(profile.transactionCount)} detail="Posted journal lines" />
            <LedgerStatCard label="Type" value={bankAccountTypeLabel(profile.type)} detail={profile.currency} />
            <LedgerStatCard label="Status" value={<BankAccountStatusPill status={profile.status} />} detail="Profile availability" />
          </LedgerMetricGrid>

          <BankAccountWorkflowGuidance
            profile={profile}
            canImportStatements={canImportStatements}
            canCreateTransfers={canCreateTransfers}
            canViewStatements={canViewStatements}
            canViewReconciliations={canViewReconciliations}
          />

          <LedgerSection title="Profile and posting setup" description="Chart-account linkage, opening-balance lock state, and manual banking destinations.">
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
            <LedgerSummaryBand tone="warning">
              Opening balances create posted accounting journals. Once posted, the opening balance amount and date are locked.
            </LedgerSummaryBand>
            <LedgerActionBar className="mt-4">
              <LedgerButton href={`/reports/general-ledger?accountId=${profile.accountId}`}>General ledger</LedgerButton>
              {canImportStatements ? (
                <LedgerButton href={`/bank-accounts/${profile.id}/statement-imports`}>Import statement</LedgerButton>
              ) : null}
              {canViewStatements ? (
                <>
                  <LedgerButton href={`/bank-accounts/${profile.id}/statement-transactions`}>Statement transactions</LedgerButton>
                  <LedgerButton href={`/bank-accounts/${profile.id}/rules`}>Bank rules</LedgerButton>
                  <LedgerButton href={`/bank-accounts/${profile.id}/deposits`}>Deposit batches</LedgerButton>
                  <LedgerButton href={`/bank-accounts/${profile.id}/card-settlements`}>Card settlements</LedgerButton>
                  <LedgerButton href={`/bank-accounts/${profile.id}/cheques`}>Cheques</LedgerButton>
                  <LedgerButton href={`/bank-accounts/${profile.id}/reconciliation`}>Reconciliation</LedgerButton>
                </>
              ) : null}
              {canViewReconciliations ? (
                <LedgerButton href={`/bank-accounts/${profile.id}/reconciliations`}>Reconciliations</LedgerButton>
              ) : null}
              {canPostOpening && canPostOpeningBalance(profile) ? (
                <LedgerButton type="button" disabled={postingOpeningBalance} onClick={() => void postOpeningBalance()} variant="primary">
                  {postingOpeningBalance ? "Posting..." : "Post opening balance"}
                </LedgerButton>
              ) : null}
              {hasPostedOpeningBalance(profile) ? (
                <LedgerStatusBadge tone="success">Opening balance posted</LedgerStatusBadge>
              ) : null}
              {canManage && canArchiveBankAccount(profile.status) ? (
                <LedgerButton type="button" disabled={Boolean(actionId)} onClick={() => void changeStatus("archive")}>
                  Archive
                </LedgerButton>
              ) : null}
              {canManage && canReactivateBankAccount(profile.status) ? (
                <LedgerButton type="button" disabled={Boolean(actionId)} onClick={() => void changeStatus("reactivate")} variant="primary">
                  Reactivate
                </LedgerButton>
              ) : null}
            </LedgerActionBar>
          </LedgerSection>

          <LedgerSection
            title="Transactions"
            description={
              <>
                Posted journal lines for the linked asset account.
                <span className="mt-1 block text-xs leading-5">
                  Debits increase this bank asset balance, credits reduce it, and the running balance follows posted LedgerByte journals. Imported statement rows are matched here only after you explicitly review or categorize them.
                </span>
              </>
            }
            action={
              canViewTransactions ? (
                <div className="grid grid-cols-2 gap-3">
                  <LedgerFieldLabel>
                    From
                    <LedgerInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                  </LedgerFieldLabel>
                  <LedgerFieldLabel>
                    To
                    <LedgerInput type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                  </LedgerFieldLabel>
                </div>
              ) : null
            }
          >
            {!canViewTransactions ? <StatusMessage type="info">You can view the account profile, but transaction visibility requires bank transaction permission.</StatusMessage> : null}
            {loadingTransactions ? <StatusMessage type="loading">Loading transactions...</StatusMessage> : null}
            {transactionError ? <StatusMessage type="error">{transactionError}</StatusMessage> : null}
            {canViewTransactions && transactions && transactions.transactions.length === 0 ? (
              <LedgerEmptyState
                title="No posted transactions found"
                description="No linked journal lines were found for this date range. Statement imports remain manual review records until matched, categorized, or ignored."
                action={
                  <LedgerActionBar className="justify-center">
                    {canImportStatements ? <LedgerButton href={`/bank-accounts/${profile.id}/statement-imports`}>Import statement rows</LedgerButton> : null}
                    {canCreateTransfers ? <LedgerButton href="/bank-transfers/new">Create transfer</LedgerButton> : null}
                    <LedgerButton href={`/reports/general-ledger?accountId=${profile.accountId}`}>Open ledger</LedgerButton>
                  </LedgerActionBar>
                }
              />
            ) : null}

            {canViewTransactions && transactions && transactions.transactions.length > 0 ? (
              <LedgerDataTable minWidth="980px" className="mt-4 shadow-none">
                  <thead className="ledger-table-header">
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
                        <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(transaction.date, "-")}</LedgerDate></td>
                        <td className="px-4 py-3 font-mono text-xs">{transaction.entryNumber}</td>
                        <td className="px-4 py-3 text-ink">{transaction.description}</td>
                        <td className="px-4 py-3 font-mono text-xs">{transaction.reference ?? "-"}</td>
                        <td className="px-4 py-3 text-steel">{bankTransactionSourceLabel(transaction)}</td>
                        <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(transaction.debit, profile.currency)}</LedgerMoney></td>
                        <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(transaction.credit, profile.currency)}</LedgerMoney></td>
                        <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(transaction.runningBalance, profile.currency)}</LedgerMoney></td>
                      </tr>
                    ))}
                  </tbody>
              </LedgerDataTable>
            ) : null}
          </LedgerSection>
        </>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function BankAccountWorkflowGuidance({
  profile,
  canImportStatements,
  canCreateTransfers,
  canViewStatements,
  canViewReconciliations,
}: {
  profile: BankAccountSummary;
  canImportStatements: boolean;
  canCreateTransfers: boolean;
  canViewStatements: boolean;
  canViewReconciliations: boolean;
}) {
  return (
    <LedgerPanel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-base font-semibold text-ink">How to read this bank account</h2>
          <p className="mt-2 text-sm leading-6 text-steel">
            The balance comes from posted LedgerByte journals for the linked asset account. Transfers, payments, refunds, cash expenses, and opening-balance journals move this balance. Statement imports are manual review records until you match, categorize, ignore, or reconcile them.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-steel md:grid-cols-3">
            <p>
              <span className="font-medium text-ink">Debits</span> increase the bank asset balance.
            </p>
            <p>
              <span className="font-medium text-ink">Credits</span> reduce the bank asset balance.
            </p>
            <p>
              <span className="font-medium text-ink">Locked periods</span> come from closed reconciliations.
            </p>
          </div>
          <p className="mt-3 text-xs leading-5 text-steel">
            This is manual statement import and matching. LedgerByte is not connected to live bank feeds or external banking APIs.
          </p>
        </div>
        <div className="min-w-full lg:min-w-[260px]">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">What to do next</p>
          <LedgerActionBar className="mt-2 lg:flex-col lg:items-stretch">
            {canImportStatements ? (
              <LedgerButton href={`/bank-accounts/${profile.id}/statement-imports`}>Import statement</LedgerButton>
            ) : null}
            {canCreateTransfers ? (
              <LedgerButton href="/bank-transfers/new">Create transfer</LedgerButton>
            ) : null}
            {canViewStatements ? (
              <LedgerButton href={`/bank-accounts/${profile.id}/statement-transactions?status=UNMATCHED`}>Review unmatched rows</LedgerButton>
            ) : null}
            {canViewStatements ? (
              <LedgerButton href={`/bank-accounts/${profile.id}/deposits`}>Deposit batches</LedgerButton>
            ) : null}
            {canViewStatements ? (
              <LedgerButton href={`/bank-accounts/${profile.id}/cheques`}>Cheques</LedgerButton>
            ) : null}
            <LedgerButton href={`/reports/general-ledger?accountId=${profile.accountId}`}>View bank ledger</LedgerButton>
            {canViewReconciliations ? (
              <LedgerButton href={`/bank-accounts/${profile.id}/reconciliations`}>Reconciliation history</LedgerButton>
            ) : null}
            <LedgerButton href="/dashboard">Dashboard</LedgerButton>
          </LedgerActionBar>
        </div>
      </div>
    </LedgerPanel>
  );
}

function BankAccountStatusPill({ status }: Readonly<{ status: BankAccountSummary["status"] }>) {
  return <LedgerStatusBadge tone={bankAccountStatusTone(status)}>{bankAccountStatusLabel(status)}</LedgerStatusBadge>;
}

function bankAccountStatusTone(status: BankAccountSummary["status"]): LedgerStatusTone {
  return status === "ACTIVE" ? "success" : "neutral";
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}
