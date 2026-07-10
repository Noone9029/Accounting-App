"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankAccountStatusLabel,
  bankAccountTypeLabel,
  canArchiveBankAccount,
  canPostOpeningBalance,
  canReactivateBankAccount,
  hasPostedOpeningBalance,
} from "@/lib/bank-accounts";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, BankAccountTransaction, BankAccountTransactionsResponse } from "@/lib/types";

function todayInputValue(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export default function BankAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const { locale, tc } = useAppLocale();
  const activeOrganization = useActiveOrganization();
  const organizationId = activeOrganization?.id ?? null;
  const baseCurrency = activeOrganization?.baseCurrency ?? null;
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
  const profileOrganizationMismatch = Boolean(profile && organizationId && profile.organizationId !== organizationId);
  const openingBalanceCurrencyMismatch = Boolean(profile && baseCurrency && profile.currency !== baseCurrency);
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
    setProfile(null);
    if (!organizationId || !params.id) {
      setLoading(false);
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
  }, [organizationId, params.id, reloadToken]);

  useEffect(() => {
    setTransactions(null);
    if (!organizationId || !params.id || !canViewTransactions) {
      setLoadingTransactions(false);
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
          setTransactionError(loadError instanceof Error ? loadError.message : tc("Unable to load bank account transactions."));
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
      setSuccess(tc("{name} is now {status}.", { name: updated.displayName, status: tc(bankAccountStatusLabel(updated.status)).toLowerCase() }));
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to update bank account status."));
    } finally {
      setActionId("");
    }
  }

  async function postOpeningBalance() {
    if (!profile) {
      return;
    }
    if (loading || !organizationId || profile.organizationId !== organizationId) {
      setError(tc("Wait for the bank account from the active organization before posting its opening balance."));
      return;
    }
    if (!baseCurrency || openingBalanceCurrencyMismatch) {
      setError(tc("Opening balances can post only in the organization base currency. Change the unposted bank profile currency or use a base-currency account."));
      return;
    }
    setPostingOpeningBalance(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankAccountSummary>(`/bank-accounts/${profile.id}/post-opening-balance`, { method: "POST" });
      setProfile(updated);
      setSuccess(tc("Opening balance for {name} has been posted.", { name: updated.displayName }));
      setReloadToken((current) => current + 1);
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : tc("Unable to post opening balance."));
    } finally {
      setPostingOpeningBalance(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{profile?.displayName ?? tc("Bank account")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Ledger balance and posted transaction activity.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/bank-accounts" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
          {profile && canManage ? (
            <Link href={`/bank-accounts/${profile.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Edit")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load bank account details.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading bank account...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {profile ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label={tc("Ledger balance")} value={formatAppMoney(profile.ledgerBalance, profile.currency, locale)} />
            <SummaryCard label={tc("Transactions")} value={String(profile.transactionCount)} />
            <SummaryCard label={tc("Type")} value={tc(bankAccountTypeLabel(profile.type))} />
            <SummaryCard label={tc("Status")} value={tc(bankAccountStatusLabel(profile.status))} />
          </div>

          <BankAccountWorkflowGuidance
            profile={profile}
            canImportStatements={canImportStatements}
            canCreateTransfers={canCreateTransfers}
            canViewStatements={canViewStatements}
            canViewReconciliations={canViewReconciliations}
          />

          <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Detail label={tc("Chart account")} value={<><bdi dir="ltr">{profile.account.code}</bdi> {profile.account.name}</>} />
              <Detail label={tc("Currency")} value={<bdi dir="ltr">{profile.currency}</bdi>} />
              <Detail label={tc("Bank name")} value={profile.bankName ?? "-"} />
              <Detail label={tc("Latest transaction")} value={formatAppDate(profile.latestTransactionDate, locale, "-")} />
              <Detail label={tc("Masked account")} value={profile.accountNumberMasked ? <bdi dir="ltr">{profile.accountNumberMasked}</bdi> : "-"} />
              <Detail label={tc("Masked IBAN")} value={profile.ibanMasked ? <bdi dir="ltr">{profile.ibanMasked}</bdi> : "-"} />
              <Detail label={tc("Opening balance")} value={formatAppMoney(profile.openingBalance, profile.currency, locale)} />
              <Detail label={tc("Opening balance date")} value={formatAppDate(profile.openingBalanceDate, locale, "-")} />
              <Detail label={tc("Opening posted")} value={profile.openingBalancePostedAt ? formatAppDate(profile.openingBalancePostedAt, locale, "-") : "-"} />
              <Detail label={tc("Opening journal")} value={profile.openingBalanceJournalEntry?.entryNumber ? <bdi dir="ltr">{profile.openingBalanceJournalEntry.entryNumber}</bdi> : "-"} />
            </div>
            {profile.notes ? <p className="mt-4 text-sm text-steel">{profile.notes}</p> : null}
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {tc("Opening balances create posted accounting journals. Once posted, the opening balance amount and date are locked.")}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/reports/general-ledger?accountId=${profile.accountId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("General ledger")}
              </Link>
              {canImportStatements ? (
                <Link href={`/bank-accounts/${profile.id}/statement-imports`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {tc("Import statement")}
                </Link>
              ) : null}
              {canViewStatements ? (
                <>
                  <Link href={`/bank-accounts/${profile.id}/statement-transactions`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    {tc("Statement transactions")}
                  </Link>
                  <Link href={`/bank-accounts/${profile.id}/rules`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    {tc("Bank rules")}
                  </Link>
                  <Link href={`/bank-accounts/${profile.id}/deposits`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    {tc("Deposit batches")}
                  </Link>
                  <Link href={`/bank-accounts/${profile.id}/card-settlements`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    {tc("Card settlements")}
                  </Link>
                  <Link href={`/bank-accounts/${profile.id}/cheques`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    {tc("Cheques")}
                  </Link>
                  <Link href={`/bank-accounts/${profile.id}/reconciliation`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    {tc("Reconciliation")}
                  </Link>
                </>
              ) : null}
              {canViewReconciliations ? (
                <Link href={`/bank-accounts/${profile.id}/reconciliations`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {tc("Reconciliations")}
                </Link>
              ) : null}
              {canPostOpening && canPostOpeningBalance(profile) ? (
                <button type="button" disabled={loading || postingOpeningBalance || profileOrganizationMismatch || openingBalanceCurrencyMismatch || !baseCurrency} onClick={() => void postOpeningBalance()} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {postingOpeningBalance ? tc("Posting...") : tc("Post opening balance")}
                </button>
              ) : null}
              {hasPostedOpeningBalance(profile) ? (
                <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{tc("Opening balance posted")}</span>
              ) : null}
              {canManage && canArchiveBankAccount(profile.status) ? (
                <button type="button" disabled={Boolean(actionId)} onClick={() => void changeStatus("archive")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {tc("Archive")}
                </button>
              ) : null}
              {canManage && canReactivateBankAccount(profile.status) ? (
                <button type="button" disabled={Boolean(actionId)} onClick={() => void changeStatus("reactivate")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {tc("Reactivate")}
                </button>
              ) : null}
            </div>
            {profileOrganizationMismatch ? <StatusMessage type="error">{tc("This bank profile does not belong to the active organization. Reload before posting its opening balance.")}</StatusMessage> : null}
            {openingBalanceCurrencyMismatch ? <StatusMessage type="error">{tc("This bank profile uses {currency}; the organization base currency is {baseCurrency}. Its opening balance cannot be posted in this phase.", { currency: profile.currency, baseCurrency: baseCurrency ?? "" })}</StatusMessage> : null}
          </div>

          <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">{tc("Transactions")}</h2>
                <p className="mt-1 text-sm text-steel">{tc("Posted journal lines for the linked asset account.")}</p>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-steel">
                  {tc("Debits increase this bank asset balance, credits reduce it, and the running balance follows posted LedgerByte journals. Imported statement rows are matched here only after you explicitly review or categorize them.")}
                </p>
              </div>
              {canViewTransactions ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("From")}</span>
                    <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("To")}</span>
                    <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                </div>
              ) : null}
            </div>

            {!canViewTransactions ? <StatusMessage type="info">{tc("You can view the account profile, but transaction visibility requires bank transaction permission.")}</StatusMessage> : null}
            {loadingTransactions ? <StatusMessage type="loading">{tc("Loading transactions...")}</StatusMessage> : null}
            {transactionError ? <StatusMessage type="error">{transactionError}</StatusMessage> : null}
            {canViewTransactions && transactions && transactions.transactions.length === 0 ? (
              <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
                <StatusMessage type="empty">{tc("No posted transactions found for this date range.")}</StatusMessage>
                <div className="mt-3 flex flex-wrap gap-2">
                  {canImportStatements ? (
                    <Link href={`/bank-accounts/${profile.id}/statement-imports`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
                      {tc("Import statement rows")}
                    </Link>
                  ) : null}
                  {canCreateTransfers ? (
                    <Link href="/bank-transfers/new" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
                      {tc("Create transfer")}
                    </Link>
                  ) : null}
                  <Link href={`/reports/general-ledger?accountId=${profile.accountId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
                    {tc("Open ledger")}
                  </Link>
                </div>
              </div>
            ) : null}

            {canViewTransactions && transactions && transactions.transactions.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[980px] text-start text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">{tc("Date")}</th>
                      <th className="px-4 py-3">{tc("Entry")}</th>
                      <th className="px-4 py-3">{tc("Description")}</th>
                      <th className="px-4 py-3">{tc("Reference")}</th>
                      <th className="px-4 py-3">{tc("Source")}</th>
                      <th className="px-4 py-3 text-end">{tc("Debit")}</th>
                      <th className="px-4 py-3 text-end">{tc("Credit")}</th>
                      <th className="px-4 py-3 text-end">{tc("Balance")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-4 py-3 text-steel">{formatAppDate(transaction.date, locale, "-")}</td>
                        <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{transaction.entryNumber}</bdi></td>
                        <td className="px-4 py-3 text-ink">{transaction.description}</td>
                        <td className="px-4 py-3 font-mono text-xs">{transaction.reference ? <bdi dir="ltr">{transaction.reference}</bdi> : "-"}</td>
                        <td className="px-4 py-3 text-steel">{bankTransactionSourceContent(transaction, tc)}</td>
                        <td className="px-4 py-3 text-end font-mono text-xs">{formatAppMoney(transaction.debit, profile.currency, locale)}</td>
                        <td className="px-4 py-3 text-end font-mono text-xs">{formatAppMoney(transaction.credit, profile.currency, locale)}</td>
                        <td className="px-4 py-3 text-end font-mono text-xs">{formatAppMoney(transaction.runningBalance, profile.currency, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
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
  const { tc } = useAppLocale();

  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-base font-semibold text-ink">{tc("How to read this bank account")}</h2>
          <p className="mt-2 text-sm leading-6 text-steel">
            {tc("The balance comes from posted LedgerByte journals for the linked asset account. Transfers, payments, refunds, cash expenses, and opening-balance journals move this balance. Statement imports are manual review records until you match, categorize, ignore, or reconcile them.")}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-steel md:grid-cols-3">
            <p>
              <span className="font-medium text-ink">{tc("Debits")}</span> {tc("increase the bank asset balance.")}
            </p>
            <p>
              <span className="font-medium text-ink">{tc("Credits")}</span> {tc("reduce the bank asset balance.")}
            </p>
            <p>
              <span className="font-medium text-ink">{tc("Locked periods")}</span> {tc("come from closed reconciliations.")}
            </p>
          </div>
          <p className="mt-3 text-xs leading-5 text-steel">
            {tc("This is manual statement import and matching. LedgerByte is not connected to live bank feeds or external banking APIs.")}
          </p>
        </div>
        <div className="min-w-full lg:min-w-[260px]">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">{tc("What to do next")}</p>
          <div className="mt-2 flex flex-wrap gap-2 lg:flex-col">
            {canImportStatements ? (
              <Link href={`/bank-accounts/${profile.id}/statement-imports`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Import statement")}
              </Link>
            ) : null}
            {canCreateTransfers ? (
              <Link href="/bank-transfers/new" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Create transfer")}
              </Link>
            ) : null}
            {canViewStatements ? (
              <Link href={`/bank-accounts/${profile.id}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Review unmatched rows")}
              </Link>
            ) : null}
            {canViewStatements ? (
              <Link href={`/bank-accounts/${profile.id}/deposits`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Deposit batches")}
              </Link>
            ) : null}
            {canViewStatements ? (
              <Link href={`/bank-accounts/${profile.id}/cheques`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Cheques")}
              </Link>
            ) : null}
            <Link href={`/reports/general-ledger?accountId=${profile.accountId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("View bank ledger")}
            </Link>
            {canViewReconciliations ? (
              <Link href={`/bank-accounts/${profile.id}/reconciliations`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Reconciliation history")}
              </Link>
            ) : null}
            <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Dashboard")}
            </Link>
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

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

function bankTransactionSourceContent(
  transaction: Pick<BankAccountTransaction, "sourceType" | "sourceNumber">,
  tc: ReturnType<typeof useAppLocale>["tc"],
) {
  const sourceNumber = transaction.sourceNumber ? <><span> </span><bdi dir="ltr">{transaction.sourceNumber}</bdi></> : null;
  return (
    <>
      {tc(bankTransactionSourceBaseLabel(transaction.sourceType))}
      {sourceNumber}
    </>
  );
}

function bankTransactionSourceBaseLabel(sourceType: BankAccountTransaction["sourceType"]): string {
  switch (sourceType) {
    case "BANK_TRANSFER":
      return "Bank transfer";
    case "VOID_BANK_TRANSFER":
      return "Void bank transfer";
    case "BANK_ACCOUNT_OPENING_BALANCE":
      return "Opening balance";
    case "CustomerPayment":
      return "Customer payment";
    case "SupplierPayment":
      return "Supplier payment";
    case "CashExpense":
      return "Cash expense";
    case "CustomerRefund":
      return "Customer refund";
    case "SupplierRefund":
      return "Supplier refund";
    default:
      return sourceType.replace(/([a-z])([A-Z])/g, "$1 $2");
  }
}
