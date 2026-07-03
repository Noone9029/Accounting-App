"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useAppLocale } from "@/components/app-locale-provider";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankStatementTransactionStatusBadgeClass,
  bankStatementTransactionStatusLabel,
  bankStatementTransactionTypeLabel,
  bankRuleActionLabel,
  candidateScoreLabel,
  lockedStatementTransactionWarning,
} from "@/lib/bank-statements";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  Account,
  BankAccountSummary,
  BankDepositBatch,
  BankRuleApplyResponse,
  BankRuleSuggestion,
  BankRuleSuggestionsResponse,
  BankStatementMatchCandidate,
  BankStatementTransaction,
  BankStatementTransactionStatus,
  CardSettlement,
  ChequeInstrument,
} from "@/lib/types";

type ReviewFilter = "" | BankStatementTransactionStatus | "NEEDS_REVIEW" | "DEBIT" | "CREDIT";
type SortMode = "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "status";
type RowActionType = "categorize" | "ignore";
type RowResult = { type: "loading" | "success" | "error"; message: string };

const STATUS_FILTERS: Array<{ value: ReviewFilter; label: string }> = [
  { value: "", label: "All" },
  { value: "UNMATCHED", label: "Unmatched" },
  { value: "MATCHED", label: "Matched" },
  { value: "CATEGORIZED", label: "Categorized" },
  { value: "IGNORED", label: "Ignored" },
  { value: "NEEDS_REVIEW", label: "Needs review" },
  { value: "DEBIT", label: "Debit" },
  { value: "CREDIT", label: "Credit" },
];

const MUTABLE_STATUSES = new Set<BankStatementTransactionStatus>(["UNMATCHED"]);

function todayInputValue(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function initialReviewFilter(value: string | null): ReviewFilter {
  return STATUS_FILTERS.some((filter) => filter.value === value) ? (value as ReviewFilter) : "";
}

function apiStatusFilter(filter: ReviewFilter): BankStatementTransactionStatus | "" {
  return filter === "UNMATCHED" || filter === "MATCHED" || filter === "CATEGORIZED" || filter === "IGNORED" ? filter : "";
}

export default function BankStatementTransactionsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const canReconcile = can(PERMISSIONS.bankStatements.reconcile);
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [transactions, setTransactions] = useState<BankStatementTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>(initialReviewFilter(searchParams.get("status")));
  const [from, setFrom] = useState(todayInputValue(-30));
  const [to, setTo] = useState(todayInputValue());
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("date-desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReason, setBulkReason] = useState("");
  const [bulkAccountId, setBulkAccountId] = useState("");
  const [bulkMemo, setBulkMemo] = useState("");
  const [inlineAccountId, setInlineAccountId] = useState("");
  const [inlineDescription, setInlineDescription] = useState("");
  const [inlineIgnoreReason, setInlineIgnoreReason] = useState("");
  const [activeAction, setActiveAction] = useState<{ rowId: string; type: RowActionType } | null>(null);
  const [candidateRowId, setCandidateRowId] = useState<string | null>(null);
  const [candidatesByRow, setCandidatesByRow] = useState<Record<string, BankStatementMatchCandidate[]>>({});
  const [selectedCandidateByRow, setSelectedCandidateByRow] = useState<Record<string, string>>({});
  const [ruleSuggestionRowId, setRuleSuggestionRowId] = useState<string | null>(null);
  const [ruleSuggestionsByRow, setRuleSuggestionsByRow] = useState<Record<string, BankRuleSuggestion[]>>({});
  const [depositCandidatesByRow, setDepositCandidatesByRow] = useState<Record<string, BankDepositBatch[]>>({});
  const [cardSettlementCandidatesByRow, setCardSettlementCandidatesByRow] = useState<Record<string, CardSettlement[]>>({});
  const [chequeCandidatesByRow, setChequeCandidatesByRow] = useState<Record<string, ChequeInstrument[]>>({});
  const [loadingCandidatesFor, setLoadingCandidatesFor] = useState("");
  const [loadingRulesFor, setLoadingRulesFor] = useState("");
  const [applyingRuleId, setApplyingRuleId] = useState("");
  const [rowResults, setRowResults] = useState<Record<string, RowResult>>({});
  const [bulkMessage, setBulkMessage] = useState<RowResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const path = useMemo(() => {
    const query = new URLSearchParams();
    const backendStatus = apiStatusFilter(filter);
    if (backendStatus) {
      query.set("status", backendStatus);
    }
    if (from) {
      query.set("from", from);
    }
    if (to) {
      query.set("to", to);
    }
    const suffix = query.toString();
    return `/bank-accounts/${params.id}/statement-transactions${suffix ? `?${suffix}` : ""}`;
  }, [filter, from, params.id, to]);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const requests: Array<Promise<unknown>> = [apiRequest<BankAccountSummary>(`/bank-accounts/${params.id}`), apiRequest<BankStatementTransaction[]>(path)];
    if (canReconcile) {
      requests.push(apiRequest<Account[]>("/accounts"));
    }

    Promise.all(requests)
      .then(([profileResult, transactionsResult, accountsResult]) => {
        if (cancelled) {
          return;
        }
        setProfile(profileResult as BankAccountSummary);
        setTransactions(transactionsResult as BankStatementTransaction[]);
        if (Array.isArray(accountsResult)) {
          const postingAccounts = accountsResult.filter((account) => account.isActive && account.allowPosting);
          setAccounts(postingAccounts);
          setBulkAccountId((current) => current || postingAccounts[0]?.id || "");
          setInlineAccountId((current) => current || postingAccounts[0]?.id || "");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(tc(loadError instanceof Error ? loadError.message : "Unable to load statement transactions."));
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
  }, [canReconcile, organizationId, params.id, path]);

  const displayedTransactions = useMemo(
    () => sortStatementTransactions(filterStatementTransactions(transactions, filter, search), sortMode),
    [filter, search, sortMode, transactions],
  );

  const selectedRows = useMemo(() => transactions.filter((transaction) => selectedIds.has(transaction.id)), [selectedIds, transactions]);
  const actionableSelectedRows = selectedRows.filter(isActionableStatementRow);
  const allVisibleSelected = displayedTransactions.length > 0 && displayedTransactions.every((transaction) => selectedIds.has(transaction.id));
  const currency = profile?.currency ?? "SAR";

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const transaction of displayedTransactions) {
        if (checked) {
          next.add(transaction.id);
        } else {
          next.delete(transaction.id);
        }
      }
      return next;
    });
  }

  function updateTransaction(updated: BankStatementTransaction) {
    setTransactions((current) => current.map((transaction) => (transaction.id === updated.id ? updated : transaction)));
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(updated.id);
      return next;
    });
  }

  async function loadCandidates(transaction: BankStatementTransaction) {
    setCandidateRowId(transaction.id);
    setLoadingCandidatesFor(transaction.id);
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: tc("Loading match candidates...") } }));
    try {
      const candidates = await apiRequest<BankStatementMatchCandidate[]>(`/bank-statement-transactions/${transaction.id}/match-candidates`);
      setCandidatesByRow((current) => ({ ...current, [transaction.id]: candidates }));
      setSelectedCandidateByRow((current) => ({ ...current, [transaction.id]: current[transaction.id] || candidates[0]?.journalLineId || "" }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "success",
          message: candidates.length > 0 ? tc("{count} match candidates loaded.", { count: candidates.length }) : tc("No match candidates found."),
        },
      }));
    } catch (candidateError) {
      setCandidatesByRow((current) => ({ ...current, [transaction.id]: [] }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "error",
          message: tc(candidateError instanceof Error ? candidateError.message : "Unable to load match candidates."),
        },
      }));
    } finally {
      setLoadingCandidatesFor("");
    }
  }

  async function submitRowAction(transaction: BankStatementTransaction, action: "match" | "categorize" | "ignore", body: unknown) {
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: tc("Updating {description}...", { description: transaction.description }) } }));
    try {
      const updated = await apiRequest<BankStatementTransaction>(`/bank-statement-transactions/${transaction.id}/${action}`, {
        method: "POST",
        body,
      });
      updateTransaction(updated);
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "success",
          message: tc("Row {status}.", { status: tc(bankStatementTransactionStatusLabel(updated.status).toLowerCase()) }),
        },
      }));
      setActiveAction(null);
      setInlineDescription("");
      setInlineIgnoreReason("");
      if (action === "match") {
        setCandidateRowId(null);
      }
    } catch (actionError) {
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "error",
          message: tc(actionError instanceof Error ? actionError.message : "Unable to update statement transaction."),
        },
      }));
    }
  }

  async function loadRuleSuggestions(transaction: BankStatementTransaction) {
    setRuleSuggestionRowId(transaction.id);
    setLoadingRulesFor(transaction.id);
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: tc("Loading rule suggestions...") } }));
    try {
      const result = await apiRequest<BankRuleSuggestionsResponse>(`/bank-statement-transactions/${transaction.id}/rule-suggestions`, {
        method: "POST",
      });
      setRuleSuggestionsByRow((current) => ({ ...current, [transaction.id]: result.suggestions }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "success",
          message: result.suggestions.length > 0 ? tc("{count} rule suggestions loaded.", { count: result.suggestions.length }) : tc("No bank rules matched this row."),
        },
      }));
    } catch (ruleError) {
      setRuleSuggestionsByRow((current) => ({ ...current, [transaction.id]: [] }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "error",
          message: tc(ruleError instanceof Error ? ruleError.message : "Unable to load rule suggestions."),
        },
      }));
    } finally {
      setLoadingRulesFor("");
    }
  }

  async function loadDepositCandidates(transaction: BankStatementTransaction) {
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: tc("Loading deposit batches...") } }));
    try {
      const deposits = await apiRequest<BankDepositBatch[]>(`/bank-deposits?bankAccountProfileId=${params.id}`);
      const matches = deposits.filter((deposit) => deposit.status === "POSTED" && Number(deposit.totalAmount) === Number(transaction.amount));
      setDepositCandidatesByRow((current) => ({ ...current, [transaction.id]: matches }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "success",
          message: matches.length > 0 ? tc("{count} deposit batch candidates loaded.", { count: matches.length }) : tc("No posted deposit batches match this credit row."),
        },
      }));
    } catch (depositError) {
      setDepositCandidatesByRow((current) => ({ ...current, [transaction.id]: [] }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "error",
          message: tc(depositError instanceof Error ? depositError.message : "Unable to load deposit batches."),
        },
      }));
    }
  }

  async function loadCardSettlementCandidates(transaction: BankStatementTransaction) {
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: tc("Loading card settlements...") } }));
    try {
      const settlements = await apiRequest<CardSettlement[]>(`/card-settlements?bankAccountProfileId=${params.id}&status=POSTED`);
      const rowCurrency = transactionCurrency(transaction, currency);
      const matches = settlements.filter((settlement) => {
        const sameAmount = Number(settlement.amount) === Number(transaction.amount);
        const sameCurrency = settlement.currency === rowCurrency;
        const matchesDebitFundingRow =
          transaction.type === "DEBIT" &&
          (settlement.settlementType === "CREDIT_CARD_PAYDOWN" || settlement.settlementType === "PREPAID_CARD_TOP_UP") &&
          settlement.fundingBankAccountProfileId === params.id;
        const matchesCreditCardRow =
          transaction.type === "CREDIT" && settlement.settlementType === "CREDIT_CARD_CREDIT" && settlement.cardAccountProfileId === params.id;
        return sameAmount && sameCurrency && (matchesDebitFundingRow || matchesCreditCardRow);
      });
      setCardSettlementCandidatesByRow((current) => ({ ...current, [transaction.id]: matches }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "success",
          message: matches.length > 0 ? tc("{count} card settlement candidates loaded.", { count: matches.length }) : tc("No posted card settlements match this row."),
        },
      }));
    } catch (cardError) {
      setCardSettlementCandidatesByRow((current) => ({ ...current, [transaction.id]: [] }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "error",
          message: tc(cardError instanceof Error ? cardError.message : "Unable to load card settlements."),
        },
      }));
    }
  }

  async function loadChequeCandidates(transaction: BankStatementTransaction) {
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: tc("Loading cheque candidates...") } }));
    try {
      const cheques = await apiRequest<ChequeInstrument[]>(`/cheques?bankAccountProfileId=${params.id}`);
      const rowCurrency = transactionCurrency(transaction, currency);
      const matches = cheques.filter((cheque) => {
        const sameAmount = Number(cheque.amount) === Number(transaction.amount);
        const sameCurrency = cheque.currency === rowCurrency;
        const openStatus = cheque.status === "RECEIVED" || cheque.status === "ISSUED" || cheque.status === "DEPOSITED";
        const directionMatches =
          (transaction.type === "CREDIT" && cheque.chequeType === "RECEIVED") ||
          (transaction.type === "DEBIT" && cheque.chequeType === "ISSUED");
        return sameAmount && sameCurrency && openStatus && directionMatches;
      });
      setChequeCandidatesByRow((current) => ({ ...current, [transaction.id]: matches }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "success",
          message: matches.length > 0 ? tc("{count} cheque candidates loaded.", { count: matches.length }) : tc("No open cheques match this row."),
        },
      }));
    } catch (chequeError) {
      setChequeCandidatesByRow((current) => ({ ...current, [transaction.id]: [] }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "error",
          message: tc(chequeError instanceof Error ? chequeError.message : "Unable to load cheques."),
        },
      }));
    }
  }

  async function applyRuleSuggestion(transaction: BankStatementTransaction, suggestion: BankRuleSuggestion) {
    setApplyingRuleId(suggestion.ruleId);
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: tc("Applying {name}...", { name: suggestion.ruleName }) } }));
    try {
      const result = await apiRequest<BankRuleApplyResponse>(`/bank-statement-transactions/${transaction.id}/apply-rule-suggestion`, {
        method: "POST",
        body: { ruleId: suggestion.ruleId, actionType: suggestion.actionType },
      });
      updateTransaction(result.transaction);
      setRuleSuggestionRowId(null);
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "success",
          message: tc("Rule suggestion applied: {status}.", { status: tc(bankStatementTransactionStatusLabel(result.transaction.status).toLowerCase()) }),
        },
      }));
    } catch (ruleError) {
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "error",
          message: tc(ruleError instanceof Error ? ruleError.message : "Unable to apply rule suggestion."),
        },
      }));
    } finally {
      setApplyingRuleId("");
    }
  }

  async function submitBulkAction(action: "categorize" | "ignore") {
    if (actionableSelectedRows.length === 0) {
      setBulkMessage({ type: "error", message: tc("Select at least one unlocked unmatched row.") });
      return;
    }
    if (action === "ignore" && !bulkReason.trim()) {
      setBulkMessage({ type: "error", message: tc("Bulk ignore requires one reason.") });
      return;
    }
    if (action === "categorize" && !bulkAccountId) {
      setBulkMessage({ type: "error", message: tc("Bulk categorize requires one posting account.") });
      return;
    }

    setBulkMessage({ type: "loading", message: tc("Applying {action} to {count} rows...", { action: tc(action), count: actionableSelectedRows.length }) });
    let successCount = 0;
    let failureCount = 0;

    for (const transaction of actionableSelectedRows) {
      try {
        const updated = await apiRequest<BankStatementTransaction>(`/bank-statement-transactions/${transaction.id}/${action}`, {
          method: "POST",
          body:
            action === "ignore"
              ? { reason: bulkReason.trim() }
              : { accountId: bulkAccountId, description: bulkMemo.trim() || undefined },
        });
        successCount += 1;
        updateTransaction(updated);
        setRowResults((current) => ({
          ...current,
          [transaction.id]: { type: "success", message: tc("Bulk {action} succeeded.", { action: tc(action) }) },
        }));
      } catch (bulkError) {
        failureCount += 1;
        setRowResults((current) => ({
          ...current,
          [transaction.id]: {
            type: "error",
            message: tc(bulkError instanceof Error ? bulkError.message : "Bulk {action} failed for this row.", { action: tc(action) }),
          },
        }));
      }
    }

    setBulkMessage({
      type: failureCount > 0 ? "error" : "success",
      message:
        failureCount > 0
          ? tc("{successCount} rows updated, {failureCount} rows failed. Failed rows remain visible.", { successCount, failureCount })
          : tc("{successCount} rows updated.", { successCount }),
    });
    if (failureCount === 0) {
      setBulkReason("");
      setBulkMemo("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Statement transaction review")}</h1>
          <p className="mt-1 text-sm text-steel">
            {profile
              ? tc("{name} imported statement rows for manual match, categorize, or ignore review.", { name: profile.displayName })
              : tc("Imported statement rows for manual match, categorize, or ignore review.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bank-accounts/${params.id}/statement-imports`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Imports")}
          </Link>
          <Link href={`/bank-accounts/${params.id}/rules`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Rules")}
          </Link>
          <Link href={`/bank-accounts/${params.id}/reconciliation`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Reconciliation")}
          </Link>
          <Link href={`/bank-accounts/${params.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load statement transactions.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading statement transactions...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {bulkMessage ? <StatusMessage type={bulkMessage.type === "loading" ? "loading" : bulkMessage.type}>{bulkMessage.message}</StatusMessage> : null}
        {!canReconcile ? <StatusMessage type="info">{tc("Your role can view statement rows, but inline review actions require bank statement reconcile permission.")}</StatusMessage> : null}
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <StatementTransactionsGuidance profileId={params.id} />
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={tc("Statement transaction filters")}>
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.value || "ALL"}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                filter === item.value ? "border-palm bg-emerald-50 text-palm" : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tc(item.label)}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
          <label className="block lg:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Search")}</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tc("Description, reference, bank ref, counterparty")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("From")}</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("To")}</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Sort")}</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="date-desc">{tc("Date newest")}</option>
              <option value="date-asc">{tc("Date oldest")}</option>
              <option value="amount-desc">{tc("Amount high")}</option>
              <option value="amount-asc">{tc("Amount low")}</option>
              <option value="status">{tc("Status")}</option>
            </select>
          </label>
        </div>
      </div>

      {canReconcile ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">{tc("Bulk review")}</h2>
              <p className="mt-1 text-sm text-steel">
                {tc("{selected} selected, {actionable} unlocked unmatched rows can be updated. Bulk match is intentionally per-row because each row needs its own candidate.", {
                  selected: selectedRows.length,
                  actionable: actionableSelectedRows.length,
                })}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:min-w-[760px] xl:grid-cols-4">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Ignore reason")}</span>
                <input value={bulkReason} onChange={(event) => setBulkReason(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
              </label>
              <button type="button" onClick={() => void submitBulkAction("ignore")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Bulk ignore")}
              </button>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Category account")}</span>
                <select value={bulkAccountId} onChange={(event) => setBulkAccountId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => void submitBulkAction("categorize")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50">
                {tc("Bulk categorize")}
              </button>
            </div>
          </div>
          <label className="mt-3 block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Bulk categorize memo")}</span>
            <input value={bulkMemo} onChange={(event) => setBulkMemo(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[1280px] text-start text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">
                <input aria-label={tc("Select visible statement rows")} type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} />
              </th>
              <th className="px-4 py-3">{tc("Date")}</th>
              <th className="px-4 py-3">{tc("Description")}</th>
              <th className="px-4 py-3">{tc("Reference")}</th>
              <th className="px-4 py-3">{tc("Counterparty")}</th>
              <th className="px-4 py-3">{tc("Currency")}</th>
              <th className="px-4 py-3 text-end">{tc("Debit")}</th>
              <th className="px-4 py-3 text-end">{tc("Credit")}</th>
              <th className="px-4 py-3">{tc("Status")}</th>
              <th className="px-4 py-3">{tc("Suggested match")}</th>
              <th className="px-4 py-3">{tc("Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedTransactions.map((transaction) => {
              const lockedWarning = lockedStatementTransactionWarning(transaction);
              const actionable = isActionableStatementRow(transaction);
              const candidates = candidatesByRow[transaction.id];
              const depositCandidates = depositCandidatesByRow[transaction.id] ?? [];
              const firstDepositCandidate = depositCandidates[0];
              const cardSettlementCandidates = cardSettlementCandidatesByRow[transaction.id] ?? [];
              const firstCardSettlementCandidate = cardSettlementCandidates[0];
              const chequeCandidates = chequeCandidatesByRow[transaction.id] ?? [];
              const firstChequeCandidate = chequeCandidates[0];
              const result = rowResults[transaction.id];
              const rowCurrency = transactionCurrency(transaction, currency);
              return (
                <tr key={transaction.id} className={result?.type === "error" ? "bg-rose-50/40" : undefined}>
                  <td className="px-4 py-3 align-top">
                    <input
                      aria-label={tc("Select {description}", { description: transaction.description })}
                      type="checkbox"
                      checked={selectedIds.has(transaction.id)}
                      onChange={(event) => toggleSelected(transaction.id, event.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-steel">{formatAppDate(transaction.transactionDate, locale, "-")}</td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-ink">{transaction.description}</p>
                    <p className="mt-1 font-mono text-xs text-steel">{readStatementRawField(transaction.rawData, "bankReference") ?? "-"}</p>
                    {result ? <p className={`mt-2 text-xs ${result.type === "error" ? "text-rose-700" : result.type === "success" ? "text-emerald-700" : "text-steel"}`}>{result.message}</p> : null}
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-xs">{transaction.reference ?? "-"}</td>
                  <td className="px-4 py-3 align-top text-steel">{readStatementRawField(transaction.rawData, "counterparty") ?? "-"}</td>
                  <td className="px-4 py-3 align-top font-mono text-xs">{rowCurrency}</td>
                  <td className="px-4 py-3 align-top text-end font-mono text-xs">{transaction.type === "DEBIT" ? formatAppMoney(transaction.amount, rowCurrency, locale) : "-"}</td>
                  <td className="px-4 py-3 align-top text-end font-mono text-xs">{transaction.type === "CREDIT" ? formatAppMoney(transaction.amount, rowCurrency, locale) : "-"}</td>
                  <td className="px-4 py-3 align-top">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankStatementTransactionStatusBadgeClass(transaction.status)}`}>
                      {tc(bankStatementTransactionStatusLabel(transaction.status))}
                    </span>
                    {actionable ? <span className="ms-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">{tc("Needs review")}</span> : null}
                    {lockedWarning ? <p className="mt-2 text-xs leading-5 text-amber-800">{tc(lockedWarning)}</p> : null}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-steel">{candidateSummary(candidates, rowCurrency, locale, tc)}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      {canReconcile && actionable ? (
                        <>
                          {firstDepositCandidate ? (
                            <Link
                              href={`/bank-accounts/${params.id}/deposits/${firstDepositCandidate.id}`}
                              className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-emerald-50"
                            >
                              {tc("Match deposit batch")}
                            </Link>
                          ) : null}
                          {transaction.type === "CREDIT" && !firstDepositCandidate ? (
                            <button
                              type="button"
                              onClick={() => void loadDepositCandidates(transaction)}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {tc("Find deposit batches")}
                            </button>
                          ) : null}
                          {firstCardSettlementCandidate ? (
                            <Link
                              href={`/bank-accounts/${params.id}/card-settlements/${firstCardSettlementCandidate.id}`}
                              className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-emerald-50"
                            >
                              {tc("Match card settlement")}
                            </Link>
                          ) : null}
                          {!firstCardSettlementCandidate ? (
                            <button
                              type="button"
                              onClick={() => void loadCardSettlementCandidates(transaction)}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {tc("Find card settlements")}
                            </button>
                          ) : null}
                          {firstChequeCandidate ? (
                            <Link
                              href={`/bank-accounts/${params.id}/cheques/${firstChequeCandidate.id}`}
                              className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-emerald-50"
                            >
                              {tc("Match cheque")}
                            </Link>
                          ) : null}
                          {!firstChequeCandidate ? (
                            <button
                              type="button"
                              onClick={() => void loadChequeCandidates(transaction)}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {tc("Find cheques")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void loadCandidates(transaction)}
                            disabled={loadingCandidatesFor === transaction.id}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            {loadingCandidatesFor === transaction.id ? tc("Loading...") : tc("View candidates")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void loadRuleSuggestions(transaction)}
                            disabled={loadingRulesFor === transaction.id}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            {loadingRulesFor === transaction.id ? tc("Loading...") : tc("Rule suggestions")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAction({ rowId: transaction.id, type: "categorize" });
                              setInlineAccountId((current) => current || accounts[0]?.id || "");
                            }}
                            className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-emerald-50"
                          >
                            {tc("Categorize")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveAction({ rowId: transaction.id, type: "ignore" })}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {tc("Ignore")}
                          </button>
                        </>
                      ) : null}
                      <Link href={`/bank-statement-transactions/${transaction.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {tc("View row detail")}
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && displayedTransactions.length === 0 ? (
          <div className="p-4">
            <StatusMessage type="empty">{tc("No statement transactions found for this filter.")}</StatusMessage>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/bank-accounts/${params.id}/statement-imports`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Import statement")}
              </Link>
              <Link href={`/bank-accounts/${params.id}/reconciliation`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Reconciliation summary")}
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {activeAction ? (
        <InlineRowActionPanel
          transaction={transactions.find((transaction) => transaction.id === activeAction.rowId) ?? null}
          type={activeAction.type}
          accounts={accounts}
          accountId={inlineAccountId}
          description={inlineDescription}
          ignoreReason={inlineIgnoreReason}
          onAccountChange={setInlineAccountId}
          onDescriptionChange={setInlineDescription}
          onIgnoreReasonChange={setInlineIgnoreReason}
          onCancel={() => setActiveAction(null)}
          onSubmit={(transaction) =>
            activeAction.type === "categorize"
              ? submitRowAction(transaction, "categorize", { accountId: inlineAccountId, description: inlineDescription.trim() || undefined })
              : submitRowAction(transaction, "ignore", { reason: inlineIgnoreReason.trim() })
          }
        />
      ) : null}

      {candidateRowId ? (
        <CandidateReviewPanel
          transaction={transactions.find((transaction) => transaction.id === candidateRowId) ?? null}
          candidates={candidatesByRow[candidateRowId] ?? []}
          selectedJournalLineId={selectedCandidateByRow[candidateRowId] ?? ""}
          currency={currency}
          onSelect={(journalLineId) => setSelectedCandidateByRow((current) => ({ ...current, [candidateRowId]: journalLineId }))}
          onClose={() => setCandidateRowId(null)}
          onConfirm={(transaction, journalLineId) => submitRowAction(transaction, "match", { journalLineId })}
        />
      ) : null}

      {ruleSuggestionRowId ? (
        <RuleSuggestionPanel
          transaction={transactions.find((transaction) => transaction.id === ruleSuggestionRowId) ?? null}
          suggestions={ruleSuggestionsByRow[ruleSuggestionRowId] ?? []}
          applyingRuleId={applyingRuleId}
          onClose={() => setRuleSuggestionRowId(null)}
          onApply={applyRuleSuggestion}
        />
      ) : null}
    </section>
  );
}

export function StatementTransactionsGuidance({ profileId }: { profileId: string }) {
  const { tc } = useAppLocale();
  return (
    <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-base font-semibold text-ink">{tc("Inline statement review")}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        {tc("Review imported manual statement rows without leaving the bank account. Match links a row to existing posted bank ledger activity, categorize posts through the existing manual journal path, and ignore keeps a row out of reconciliation totals. Every row-changing action is explicit.")}
      </p>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-steel">
        {tc("This workspace is manual banking only. Bank rules create suggestions for review; it does not connect to live bank feeds, collect bank credentials, initiate payments, silently ignore rows, or auto-reconcile.")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/bank-accounts/${profileId}/rules`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Bank rules")}
        </Link>
        <Link href={`/bank-accounts/${profileId}/statement-imports`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Import statement")}
        </Link>
        <Link href={`/bank-accounts/${profileId}/reconciliation`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Reconciliation summary")}
        </Link>
        <Link href="/dashboard" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Dashboard")}
        </Link>
      </div>
    </div>
  );
}

function InlineRowActionPanel({
  transaction,
  type,
  accounts,
  accountId,
  description,
  ignoreReason,
  onAccountChange,
  onDescriptionChange,
  onIgnoreReasonChange,
  onCancel,
  onSubmit,
}: {
  transaction: BankStatementTransaction | null;
  type: RowActionType;
  accounts: Account[];
  accountId: string;
  description: string;
  ignoreReason: string;
  onAccountChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onIgnoreReasonChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (transaction: BankStatementTransaction) => Promise<void>;
}) {
  const { tc } = useAppLocale();
  if (!transaction) {
    return null;
  }

  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{type === "categorize" ? tc("Categorize row") : tc("Ignore row")}</h2>
          <p className="mt-1 text-sm text-steel">{transaction.description}</p>
        </div>
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Close")}
        </button>
      </div>
      {type === "categorize" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Offset account")}</span>
            <select value={accountId} onChange={(event) => onAccountChange(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Memo")}</span>
            <input value={description} onChange={(event) => onDescriptionChange(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <button type="button" disabled={!accountId} onClick={() => void onSubmit(transaction)} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
            {tc("Post categorization journal")}
          </button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Reason")}</span>
            <input value={ignoreReason} onChange={(event) => onIgnoreReasonChange(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <button type="button" disabled={!ignoreReason.trim()} onClick={() => void onSubmit(transaction)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
            {tc("Ignore row")}
          </button>
        </div>
      )}
    </div>
  );
}

function RuleSuggestionPanel({
  transaction,
  suggestions,
  applyingRuleId,
  onClose,
  onApply,
}: {
  transaction: BankStatementTransaction | null;
  suggestions: BankRuleSuggestion[];
  applyingRuleId: string;
  onClose: () => void;
  onApply: (transaction: BankStatementTransaction, suggestion: BankRuleSuggestion) => Promise<void>;
}) {
  const { tc } = useAppLocale();
  if (!transaction) {
    return null;
  }

  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc("Rule suggestions")}</h2>
          <p className="mt-1 text-sm text-steel">{transaction.description}</p>
          <p className="mt-1 text-xs leading-5 text-steel">{tc("Suggestions do not change this row until an operator applies one explicitly.")}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Close")}
        </button>
      </div>
      {suggestions.length === 0 ? <StatusMessage type="empty">{tc("No bank rules matched this statement row.")}</StatusMessage> : null}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {suggestions.map((suggestion) => {
          const canApply = suggestion.actionType !== "SUGGEST_MATCH_CANDIDATES";
          return (
            <div key={suggestion.ruleId} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-ink">{suggestion.ruleName}</h3>
                  <p className="mt-1 text-xs text-steel">
                    {tc(bankRuleActionLabel(suggestion.actionType))} - {tc("score")} {suggestion.score}
                  </p>
                </div>
                <span className="rounded-md bg-mist px-2 py-1 text-xs font-medium text-ink">{tc("Priority {priority}", { priority: suggestion.priority })}</span>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-steel">
                {suggestion.matchedReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {canApply ? (
                <button
                  type="button"
                  disabled={Boolean(applyingRuleId)}
                  onClick={() => void onApply(transaction, suggestion)}
                  className="mt-3 rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {applyingRuleId === suggestion.ruleId ? tc("Applying...") : tc("Apply suggestion")}
                </button>
              ) : (
                <p className="mt-3 text-xs leading-5 text-steel">{tc("Match-candidate rules surface candidates only. Choose a specific candidate before matching.")}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CandidateReviewPanel({
  transaction,
  candidates,
  selectedJournalLineId,
  currency,
  onSelect,
  onClose,
  onConfirm,
}: {
  transaction: BankStatementTransaction | null;
  candidates: BankStatementMatchCandidate[];
  selectedJournalLineId: string;
  currency: string;
  onSelect: (journalLineId: string) => void;
  onClose: () => void;
  onConfirm: (transaction: BankStatementTransaction, journalLineId: string) => Promise<void>;
}) {
  const { locale, tc } = useAppLocale();
  if (!transaction) {
    return null;
  }

  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc("Match candidates")}</h2>
          <p className="mt-1 text-sm text-steel">{transaction.description}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Close")}
        </button>
      </div>
      {candidates.length === 0 ? <StatusMessage type="empty">{tc("No posted bank journal candidates matched this row.")}</StatusMessage> : null}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {candidates.map((candidate) => (
          <label key={candidate.journalLineId} className="block rounded-md border border-slate-200 p-3">
            <div className="flex items-start gap-3">
              <input type="radio" name="match-candidate" checked={selectedJournalLineId === candidate.journalLineId} onChange={() => onSelect(candidate.journalLineId)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{candidate.entryNumber}</p>
                  <span className="rounded-md bg-mist px-2 py-1 text-xs font-medium text-ink">{tc(candidateScoreLabel(candidate))}</span>
                </div>
                <p className="mt-1 text-xs text-steel">
                  {formatAppDate(candidate.date, locale, "-")} - {candidate.description ?? candidate.reference ?? tc("Posted bank journal line")}
                </p>
                <p className="mt-1 text-xs text-steel">{candidate.reason}</p>
                <p className="mt-2 font-mono text-xs text-steel">
                  {tc("Dr")} {formatAppMoney(candidate.debit, currency, locale)} / {tc("Cr")} {formatAppMoney(candidate.credit, currency, locale)}
                </p>
              </div>
            </div>
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={!selectedJournalLineId}
        onClick={() => void onConfirm(transaction, selectedJournalLineId)}
        className="mt-4 rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        {tc("Match selected candidate")}
      </button>
    </div>
  );
}

function filterStatementTransactions(transactions: BankStatementTransaction[], filter: ReviewFilter, search: string): BankStatementTransaction[] {
  const normalizedSearch = normalizeSearch(search);
  return transactions.filter((transaction) => {
    if (filter === "DEBIT" || filter === "CREDIT") {
      if (transaction.type !== filter) {
        return false;
      }
    } else if (filter === "NEEDS_REVIEW") {
      if (!isActionableStatementRow(transaction)) {
        return false;
      }
    } else if (filter && transaction.status !== filter) {
      return false;
    }
    if (!normalizedSearch) {
      return true;
    }
    return normalizeSearch(
      [
        transaction.description,
        transaction.reference,
        readStatementRawField(transaction.rawData, "bankReference"),
        readStatementRawField(transaction.rawData, "counterparty"),
      ]
        .filter(Boolean)
        .join(" "),
    ).includes(normalizedSearch);
  });
}

function sortStatementTransactions(transactions: BankStatementTransaction[], sortMode: SortMode): BankStatementTransaction[] {
  return [...transactions].sort((left, right) => {
    if (sortMode === "date-asc" || sortMode === "date-desc") {
      const result = Date.parse(left.transactionDate) - Date.parse(right.transactionDate);
      return sortMode === "date-asc" ? result : -result;
    }
    if (sortMode === "amount-asc" || sortMode === "amount-desc") {
      const result = Number(left.amount) - Number(right.amount);
      return sortMode === "amount-asc" ? result : -result;
    }
    return bankStatementTransactionStatusLabel(left.status).localeCompare(bankStatementTransactionStatusLabel(right.status));
  });
}

function isActionableStatementRow(transaction: BankStatementTransaction): boolean {
  return MUTABLE_STATUSES.has(transaction.status) && !lockedStatementTransactionWarning(transaction);
}

function candidateSummary(
  candidates: BankStatementMatchCandidate[] | undefined,
  currency: string,
  locale: ReturnType<typeof useAppLocale>["locale"],
  tc: ReturnType<typeof useAppLocale>["tc"],
): string {
  if (!candidates) {
    return tc("Open candidates to preview");
  }
  if (candidates.length === 0) {
    return tc("No candidates found");
  }
  const first = candidates[0]!;
  return `${tc(candidateScoreLabel(first))}: ${first.entryNumber} (${formatAppMoney(first.debit !== "0.0000" ? first.debit : first.credit, currency, locale)})`;
}

function transactionCurrency(transaction: BankStatementTransaction, fallback: string): string {
  return readStatementRawField(transaction.rawData, "currency") ?? transaction.bankAccountProfile?.currency ?? fallback;
}

function readStatementRawField(rawData: unknown, field: "bankReference" | "counterparty" | "currency"): string | null {
  if (!isRecord(rawData)) {
    return null;
  }
  const normalized = rawData.normalized;
  const normalizedValue = isRecord(normalized) ? normalized[field] : undefined;
  const directValue = rawData[field];
  const value = typeof normalizedValue === "string" ? normalizedValue : typeof directValue === "string" ? directValue : null;
  return value?.trim() || null;
}

function normalizeSearch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
