"use client";

import { useParams, useSearchParams } from "next/navigation";
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
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankStatementTransactionStatusLabel,
  bankStatementTransactionTypeLabel,
  bankRuleActionLabel,
  candidateScoreLabel,
  lockedStatementTransactionWarning,
} from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load statement transactions.");
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
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: "Loading match candidates..." } }));
    try {
      const candidates = await apiRequest<BankStatementMatchCandidate[]>(`/bank-statement-transactions/${transaction.id}/match-candidates`);
      setCandidatesByRow((current) => ({ ...current, [transaction.id]: candidates }));
      setSelectedCandidateByRow((current) => ({ ...current, [transaction.id]: current[transaction.id] || candidates[0]?.journalLineId || "" }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "success",
          message: candidates.length > 0 ? `${candidates.length} match candidates loaded.` : "No match candidates found.",
        },
      }));
    } catch (candidateError) {
      setCandidatesByRow((current) => ({ ...current, [transaction.id]: [] }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "error",
          message: candidateError instanceof Error ? candidateError.message : "Unable to load match candidates.",
        },
      }));
    } finally {
      setLoadingCandidatesFor("");
    }
  }

  async function submitRowAction(transaction: BankStatementTransaction, action: "match" | "categorize" | "ignore", body: unknown) {
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: `Updating ${transaction.description}...` } }));
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
          message: `Row ${bankStatementTransactionStatusLabel(updated.status).toLowerCase()}.`,
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
          message: actionError instanceof Error ? actionError.message : "Unable to update statement transaction.",
        },
      }));
    }
  }

  async function loadRuleSuggestions(transaction: BankStatementTransaction) {
    setRuleSuggestionRowId(transaction.id);
    setLoadingRulesFor(transaction.id);
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: "Loading rule suggestions..." } }));
    try {
      const result = await apiRequest<BankRuleSuggestionsResponse>(`/bank-statement-transactions/${transaction.id}/rule-suggestions`, {
        method: "POST",
      });
      setRuleSuggestionsByRow((current) => ({ ...current, [transaction.id]: result.suggestions }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "success",
          message: result.suggestions.length > 0 ? `${result.suggestions.length} rule suggestions loaded.` : "No bank rules matched this row.",
        },
      }));
    } catch (ruleError) {
      setRuleSuggestionsByRow((current) => ({ ...current, [transaction.id]: [] }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "error",
          message: ruleError instanceof Error ? ruleError.message : "Unable to load rule suggestions.",
        },
      }));
    } finally {
      setLoadingRulesFor("");
    }
  }

  async function loadDepositCandidates(transaction: BankStatementTransaction) {
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: "Loading deposit batches..." } }));
    try {
      const deposits = await apiRequest<BankDepositBatch[]>(`/bank-deposits?bankAccountProfileId=${params.id}`);
      const matches = deposits.filter((deposit) => deposit.status === "POSTED" && Number(deposit.totalAmount) === Number(transaction.amount));
      setDepositCandidatesByRow((current) => ({ ...current, [transaction.id]: matches }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "success",
          message: matches.length > 0 ? `${matches.length} deposit batch candidates loaded.` : "No posted deposit batches match this credit row.",
        },
      }));
    } catch (depositError) {
      setDepositCandidatesByRow((current) => ({ ...current, [transaction.id]: [] }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "error",
          message: depositError instanceof Error ? depositError.message : "Unable to load deposit batches.",
        },
      }));
    }
  }

  async function loadCardSettlementCandidates(transaction: BankStatementTransaction) {
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: "Loading card settlements..." } }));
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
          message: matches.length > 0 ? `${matches.length} card settlement candidates loaded.` : "No posted card settlements match this row.",
        },
      }));
    } catch (cardError) {
      setCardSettlementCandidatesByRow((current) => ({ ...current, [transaction.id]: [] }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "error",
          message: cardError instanceof Error ? cardError.message : "Unable to load card settlements.",
        },
      }));
    }
  }

  async function loadChequeCandidates(transaction: BankStatementTransaction) {
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: "Loading cheque candidates..." } }));
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
          message: matches.length > 0 ? `${matches.length} cheque candidates loaded.` : "No open cheques match this row.",
        },
      }));
    } catch (chequeError) {
      setChequeCandidatesByRow((current) => ({ ...current, [transaction.id]: [] }));
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "error",
          message: chequeError instanceof Error ? chequeError.message : "Unable to load cheques.",
        },
      }));
    }
  }

  async function applyRuleSuggestion(transaction: BankStatementTransaction, suggestion: BankRuleSuggestion) {
    setApplyingRuleId(suggestion.ruleId);
    setRowResults((current) => ({ ...current, [transaction.id]: { type: "loading", message: `Applying ${suggestion.ruleName}...` } }));
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
          message: `Rule suggestion applied: ${bankStatementTransactionStatusLabel(result.transaction.status).toLowerCase()}.`,
        },
      }));
    } catch (ruleError) {
      setRowResults((current) => ({
        ...current,
        [transaction.id]: {
          type: "error",
          message: ruleError instanceof Error ? ruleError.message : "Unable to apply rule suggestion.",
        },
      }));
    } finally {
      setApplyingRuleId("");
    }
  }

  async function submitBulkAction(action: "categorize" | "ignore") {
    if (actionableSelectedRows.length === 0) {
      setBulkMessage({ type: "error", message: "Select at least one unlocked unmatched row." });
      return;
    }
    if (action === "ignore" && !bulkReason.trim()) {
      setBulkMessage({ type: "error", message: "Bulk ignore requires one reason." });
      return;
    }
    if (action === "categorize" && !bulkAccountId) {
      setBulkMessage({ type: "error", message: "Bulk categorize requires one posting account." });
      return;
    }

    setBulkMessage({ type: "loading", message: `Applying ${action} to ${actionableSelectedRows.length} rows...` });
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
          [transaction.id]: { type: "success", message: `Bulk ${action} succeeded.` },
        }));
      } catch (bulkError) {
        failureCount += 1;
        setRowResults((current) => ({
          ...current,
          [transaction.id]: {
            type: "error",
            message: bulkError instanceof Error ? bulkError.message : `Bulk ${action} failed for this row.`,
          },
        }));
      }
    }

    setBulkMessage({
      type: failureCount > 0 ? "error" : "success",
      message:
        failureCount > 0
          ? `${successCount} rows updated, ${failureCount} rows failed. Failed rows remain visible.`
          : `${successCount} rows updated.`,
    });
    if (failureCount === 0) {
      setBulkReason("");
      setBulkMemo("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking / Manual review"
        title="Statement transaction review"
        description={profile ? `${profile.displayName} imported statement rows for manual match, categorize, or ignore review.` : "Imported statement rows for manual match, categorize, or ignore review."}
        actions={
          <LedgerActionBar className="sm:justify-end">
            <LedgerButton href={`/bank-accounts/${params.id}/statement-imports`}>Imports</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}/rules`}>Rules</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}/reconciliation`}>Reconciliation</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}`}>Back</LedgerButton>
          </LedgerActionBar>
        }
      />
      <LedgerSummaryBand tone="warning">
        Every row-changing action here is explicit. Match creates no journal, categorize posts through the existing manual journal path, and ignore keeps the row out of reconciliation review.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load statement transactions.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading statement transactions...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {bulkMessage ? <StatusMessage type={bulkMessage.type === "loading" ? "loading" : bulkMessage.type}>{bulkMessage.message}</StatusMessage> : null}
        {!canReconcile ? <StatusMessage type="info">Your role can view statement rows, but inline review actions require bank statement reconcile permission.</StatusMessage> : null}

      <LedgerSection title="Review filters" description="Filter imported statement rows before explicit matching, categorization, or ignore actions.">
        <StatementTransactionsGuidance profileId={params.id} />
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Statement transaction filters">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.value || "ALL"}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                filter === item.value ? "border-palm bg-emerald-50 text-palm" : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
          <LedgerFieldLabel className="lg:col-span-2">
            Search
            <LedgerInput
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Description, reference, bank ref, counterparty"
            />
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            From
            <LedgerInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            To
            <LedgerInput type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            Sort
            <LedgerSelect value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="date-desc">Date newest</option>
              <option value="date-asc">Date oldest</option>
              <option value="amount-desc">Amount high</option>
              <option value="amount-asc">Amount low</option>
              <option value="status">Status</option>
            </LedgerSelect>
          </LedgerFieldLabel>
        </div>
      </LedgerSection>

      {canReconcile ? (
        <LedgerSection title="Bulk review" description={`${selectedRows.length} selected, ${actionableSelectedRows.length} unlocked unmatched rows can be updated. Bulk match is intentionally per-row because each row needs its own candidate.`}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:min-w-[760px] xl:grid-cols-4">
              <LedgerFieldLabel>
                Ignore reason
                <LedgerInput value={bulkReason} onChange={(event) => setBulkReason(event.target.value)} />
              </LedgerFieldLabel>
              <LedgerButton type="button" onClick={() => void submitBulkAction("ignore")}>Bulk ignore</LedgerButton>
              <LedgerFieldLabel>
                Category account
                <LedgerSelect value={bulkAccountId} onChange={(event) => setBulkAccountId(event.target.value)}>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} {account.name}
                    </option>
                  ))}
                </LedgerSelect>
              </LedgerFieldLabel>
              <LedgerButton type="button" onClick={() => void submitBulkAction("categorize")} variant="primary">Bulk categorize</LedgerButton>
            </div>
          </div>
          <LedgerFieldLabel className="mt-3">
            Bulk categorize memo
            <LedgerInput value={bulkMemo} onChange={(event) => setBulkMemo(event.target.value)} />
          </LedgerFieldLabel>
        </LedgerSection>
      ) : null}

      <LedgerSection title="Statement rows" description="Imported rows and manual review actions.">
        <LedgerDataTable minWidth="1280px" className="shadow-none">
          <thead className="ledger-table-header">
            <tr>
              <th className="px-4 py-3">
                <input aria-label="Select visible statement rows" type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} />
              </th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Counterparty</th>
              <th className="px-4 py-3">Currency</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Suggested match</th>
              <th className="px-4 py-3">Actions</th>
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
                      aria-label={`Select ${transaction.description}`}
                      type="checkbox"
                      checked={selectedIds.has(transaction.id)}
                      onChange={(event) => toggleSelected(transaction.id, event.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-3 align-top"><LedgerDate>{formatOptionalDate(transaction.transactionDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-ink">{transaction.description}</p>
                    <p className="mt-1 font-mono text-xs text-steel">{readStatementRawField(transaction.rawData, "bankReference") ?? "-"}</p>
                    {result ? <p className={`mt-2 text-xs ${result.type === "error" ? "text-rose-700" : result.type === "success" ? "text-emerald-700" : "text-steel"}`}>{result.message}</p> : null}
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-xs">{transaction.reference ?? "-"}</td>
                  <td className="px-4 py-3 align-top text-steel">{readStatementRawField(transaction.rawData, "counterparty") ?? "-"}</td>
                  <td className="px-4 py-3 align-top font-mono text-xs">{rowCurrency}</td>
                  <td className="px-4 py-3 align-top text-right font-mono text-xs">{transaction.type === "DEBIT" ? formatMoneyAmount(transaction.amount, rowCurrency) : "-"}</td>
                  <td className="px-4 py-3 align-top text-right font-mono text-xs">{transaction.type === "CREDIT" ? formatMoneyAmount(transaction.amount, rowCurrency) : "-"}</td>
                  <td className="px-4 py-3 align-top">
                    <StatementStatusBadge status={transaction.status} />
                    {actionable ? <LedgerStatusBadge tone="warning">Needs review</LedgerStatusBadge> : null}
                    {lockedWarning ? <p className="mt-2 text-xs leading-5 text-amber-800">{lockedWarning}</p> : null}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-steel">{candidateSummary(candidates, rowCurrency)}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      {canReconcile && actionable ? (
                        <>
                          {firstDepositCandidate ? (
                            <LedgerButton href={`/bank-accounts/${params.id}/deposits/${firstDepositCandidate.id}`} size="sm" variant="primary">Match deposit batch</LedgerButton>
                          ) : null}
                          {transaction.type === "CREDIT" && !firstDepositCandidate ? (
                            <LedgerButton
                              type="button"
                              onClick={() => void loadDepositCandidates(transaction)}
                              size="sm"
                            >
                              Find deposit batches
                            </LedgerButton>
                          ) : null}
                          {firstCardSettlementCandidate ? (
                            <LedgerButton href={`/bank-accounts/${params.id}/card-settlements/${firstCardSettlementCandidate.id}`} size="sm" variant="primary">Match card settlement</LedgerButton>
                          ) : null}
                          {!firstCardSettlementCandidate ? (
                            <LedgerButton
                              type="button"
                              onClick={() => void loadCardSettlementCandidates(transaction)}
                              size="sm"
                            >
                              Find card settlements
                            </LedgerButton>
                          ) : null}
                          {firstChequeCandidate ? (
                            <LedgerButton href={`/bank-accounts/${params.id}/cheques/${firstChequeCandidate.id}`} size="sm" variant="primary">Match cheque</LedgerButton>
                          ) : null}
                          {!firstChequeCandidate ? (
                            <LedgerButton
                              type="button"
                              onClick={() => void loadChequeCandidates(transaction)}
                              size="sm"
                            >
                              Find cheques
                            </LedgerButton>
                          ) : null}
                          <LedgerButton
                            type="button"
                            onClick={() => void loadCandidates(transaction)}
                            disabled={loadingCandidatesFor === transaction.id}
                            size="sm"
                          >
                            {loadingCandidatesFor === transaction.id ? "Loading..." : "View candidates"}
                          </LedgerButton>
                          <LedgerButton
                            type="button"
                            onClick={() => void loadRuleSuggestions(transaction)}
                            disabled={loadingRulesFor === transaction.id}
                            size="sm"
                          >
                            {loadingRulesFor === transaction.id ? "Loading..." : "Rule suggestions"}
                          </LedgerButton>
                          <LedgerButton
                            type="button"
                            onClick={() => {
                              setActiveAction({ rowId: transaction.id, type: "categorize" });
                              setInlineAccountId((current) => current || accounts[0]?.id || "");
                            }}
                            size="sm"
                            variant="primary"
                          >
                            Categorize
                          </LedgerButton>
                          <LedgerButton
                            type="button"
                            onClick={() => setActiveAction({ rowId: transaction.id, type: "ignore" })}
                            size="sm"
                          >
                            Ignore
                          </LedgerButton>
                        </>
                      ) : null}
                      <LedgerButton href={`/bank-statement-transactions/${transaction.id}`} size="sm">Detail</LedgerButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </LedgerDataTable>
        {!loading && displayedTransactions.length === 0 ? (
          <LedgerEmptyState
            title="No statement transactions found"
            description="No imported statement rows match this filter."
            action={
              <LedgerActionBar className="justify-center">
                <LedgerButton href={`/bank-accounts/${params.id}/statement-imports`}>Import statement</LedgerButton>
                <LedgerButton href={`/bank-accounts/${params.id}/reconciliation`}>Reconciliation summary</LedgerButton>
              </LedgerActionBar>
            }
          />
        ) : null}
      </LedgerSection>

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
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function StatementTransactionsGuidance({ profileId }: { profileId: string }) {
  return (
    <LedgerPanel>
      <h2 className="text-base font-semibold text-ink">Inline statement review</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        Review imported manual statement rows without leaving the bank account. Match links a row to existing posted bank ledger activity, categorize posts through the existing manual journal path, and ignore keeps a row out of reconciliation totals. Every row-changing action is explicit.
      </p>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-steel">
        This workspace is manual banking only. Bank rules create suggestions for review; it does not connect to live bank feeds, collect bank credentials, initiate payments, silently ignore rows, or auto-reconcile.
      </p>
      <LedgerActionBar className="mt-3">
        <LedgerButton href={`/bank-accounts/${profileId}/rules`}>Bank rules</LedgerButton>
        <LedgerButton href={`/bank-accounts/${profileId}/statement-imports`}>Import statement</LedgerButton>
        <LedgerButton href={`/bank-accounts/${profileId}/reconciliation`}>Reconciliation summary</LedgerButton>
        <LedgerButton href="/dashboard">Dashboard</LedgerButton>
      </LedgerActionBar>
    </LedgerPanel>
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
  if (!transaction) {
    return null;
  }

  return (
    <LedgerPanel>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{type === "categorize" ? "Categorize row" : "Ignore row"}</h2>
          <p className="mt-1 text-sm text-steel">{transaction.description}</p>
        </div>
        <LedgerButton type="button" onClick={onCancel}>Close</LedgerButton>
      </div>
      {type === "categorize" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <LedgerFieldLabel>
            Offset account
            <LedgerSelect value={accountId} onChange={(event) => onAccountChange(event.target.value)}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} {account.name}
                </option>
              ))}
            </LedgerSelect>
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            Memo
            <LedgerInput value={description} onChange={(event) => onDescriptionChange(event.target.value)} />
          </LedgerFieldLabel>
          <LedgerButton type="button" disabled={!accountId} onClick={() => void onSubmit(transaction)} variant="primary">
            Post categorization journal
          </LedgerButton>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <LedgerFieldLabel>
            Reason
            <LedgerInput value={ignoreReason} onChange={(event) => onIgnoreReasonChange(event.target.value)} />
          </LedgerFieldLabel>
          <LedgerButton type="button" disabled={!ignoreReason.trim()} onClick={() => void onSubmit(transaction)}>
            Ignore row
          </LedgerButton>
        </div>
      )}
    </LedgerPanel>
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
  if (!transaction) {
    return null;
  }

  return (
    <LedgerPanel>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Rule suggestions</h2>
          <p className="mt-1 text-sm text-steel">{transaction.description}</p>
          <p className="mt-1 text-xs leading-5 text-steel">Suggestions do not change this row until an operator applies one explicitly.</p>
        </div>
        <LedgerButton type="button" onClick={onClose}>Close</LedgerButton>
      </div>
      {suggestions.length === 0 ? <StatusMessage type="empty">No bank rules matched this statement row.</StatusMessage> : null}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {suggestions.map((suggestion) => {
          const canApply = suggestion.actionType !== "SUGGEST_MATCH_CANDIDATES";
          return (
            <div key={suggestion.ruleId} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-ink">{suggestion.ruleName}</h3>
                  <p className="mt-1 text-xs text-steel">{bankRuleActionLabel(suggestion.actionType)} - score {suggestion.score}</p>
                </div>
                <LedgerStatusBadge tone="draft">Priority {suggestion.priority}</LedgerStatusBadge>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-steel">
                {suggestion.matchedReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {canApply ? (
                <LedgerButton
                  type="button"
                  disabled={Boolean(applyingRuleId)}
                  onClick={() => void onApply(transaction, suggestion)}
                  className="mt-3"
                  variant="primary"
                >
                  {applyingRuleId === suggestion.ruleId ? "Applying..." : "Apply suggestion"}
                </LedgerButton>
              ) : (
                <p className="mt-3 text-xs leading-5 text-steel">Match-candidate rules surface candidates only. Choose a specific candidate before matching.</p>
              )}
            </div>
          );
        })}
      </div>
    </LedgerPanel>
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
  if (!transaction) {
    return null;
  }

  return (
    <LedgerPanel>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Match candidates</h2>
          <p className="mt-1 text-sm text-steel">{transaction.description}</p>
        </div>
        <LedgerButton type="button" onClick={onClose}>Close</LedgerButton>
      </div>
      {candidates.length === 0 ? <StatusMessage type="empty">No posted bank journal candidates matched this row.</StatusMessage> : null}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {candidates.map((candidate) => (
          <label key={candidate.journalLineId} className="block rounded-md border border-slate-200 p-3">
            <div className="flex items-start gap-3">
              <input type="radio" name="match-candidate" checked={selectedJournalLineId === candidate.journalLineId} onChange={() => onSelect(candidate.journalLineId)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{candidate.entryNumber}</p>
                  <LedgerStatusBadge tone="draft">{candidateScoreLabel(candidate)}</LedgerStatusBadge>
                </div>
                <p className="mt-1 text-xs text-steel">
                  {formatOptionalDate(candidate.date, "-")} - {candidate.description ?? candidate.reference ?? "Posted bank journal line"}
                </p>
                <p className="mt-1 text-xs text-steel">{candidate.reason}</p>
                <p className="mt-2 font-mono text-xs text-steel">
                  Dr {formatMoneyAmount(candidate.debit, currency)} / Cr {formatMoneyAmount(candidate.credit, currency)}
                </p>
              </div>
            </div>
          </label>
        ))}
      </div>
      <LedgerButton
        type="button"
        disabled={!selectedJournalLineId}
        onClick={() => void onConfirm(transaction, selectedJournalLineId)}
        className="mt-4"
        variant="primary"
      >
        Match selected candidate
      </LedgerButton>
    </LedgerPanel>
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

function StatementStatusBadge({ status }: { status: BankStatementTransactionStatus }) {
  return <LedgerStatusBadge tone={statementStatusTone(status)}>{bankStatementTransactionStatusLabel(status)}</LedgerStatusBadge>;
}

function statementStatusTone(status: BankStatementTransactionStatus): LedgerStatusTone {
  if (status === "MATCHED" || status === "CATEGORIZED") return "success";
  if (status === "IGNORED") return "neutral";
  return "warning";
}

function candidateSummary(candidates: BankStatementMatchCandidate[] | undefined, currency: string): string {
  if (!candidates) {
    return "Open candidates to preview";
  }
  if (candidates.length === 0) {
    return "No candidates found";
  }
  const first = candidates[0]!;
  return `${candidateScoreLabel(first)}: ${first.entryNumber} (${formatMoneyAmount(first.debit !== "0.0000" ? first.debit : first.credit, currency)})`;
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
