"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankDepositSourceTypeLabel,
  bankDepositStatusBadgeClass,
  bankDepositStatusLabel,
  canMatchBankDeposit,
  canPostBankDeposit,
  canVoidBankDeposit,
  validateBankDepositLineInput,
} from "@/lib/bank-deposits";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  BankDepositBatch,
  BankDepositBatchLineSourceType,
  BankDepositSourceCandidate,
  BankStatementTransaction,
} from "@/lib/types";

const SOURCE_TYPES: BankDepositBatchLineSourceType[] = [
  "CUSTOMER_PAYMENT",
  "MANUAL_CASH_RECEIPT",
  "RECEIPT",
  "CHEQUE_PLACEHOLDER",
  "OTHER_CLEARING_ITEM",
];

export default function BankDepositDetailPage() {
  const params = useParams<{ id: string; depositId: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.bankStatements.manage);
  const canReconcile = can(PERMISSIONS.bankStatements.reconcile);
  const [deposit, setDeposit] = useState<BankDepositBatch | null>(null);
  const [sourceCandidates, setSourceCandidates] = useState<BankDepositSourceCandidate[]>([]);
  const [matchCandidates, setMatchCandidates] = useState<BankStatementTransaction[]>([]);
  const [sourceType, setSourceType] = useState<BankDepositBatchLineSourceType>("MANUAL_CASH_RECEIPT");
  const [sourceId, setSourceId] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [selectedStatementId, setSelectedStatementId] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId || !params.depositId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankDepositBatch>(`/bank-deposits/${params.depositId}`)
      .then((result) => {
        if (!cancelled) {
          setDeposit(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bank deposit batch.");
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
  }, [organizationId, params.depositId, params.id, reloadToken]);

  useEffect(() => {
    if (!organizationId || !deposit) {
      return;
    }

    let cancelled = false;
    const requests: Array<Promise<unknown>> = [];
    if (deposit.status === "DRAFT") {
      requests.push(apiRequest<BankDepositSourceCandidate[]>(`/bank-deposits/source-candidates?bankAccountProfileId=${deposit.bankAccountProfileId}&currency=${deposit.currency}`));
    } else {
      requests.push(Promise.resolve([]));
    }
    if (deposit.status === "POSTED") {
      requests.push(apiRequest<BankStatementTransaction[]>(`/bank-deposits/${deposit.id}/match-candidates`));
    } else {
      requests.push(Promise.resolve([]));
    }

    Promise.all(requests)
      .then(([sourceResult, matchResult]) => {
        if (!cancelled) {
          setSourceCandidates(sourceResult as BankDepositSourceCandidate[]);
          const candidates = matchResult as BankStatementTransaction[];
          setMatchCandidates(candidates);
          setSelectedStatementId((current) => current || candidates[0]?.id || "");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load deposit supporting data.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deposit, organizationId]);

  const selectedSource = useMemo(() => sourceCandidates.find((candidate) => candidate.sourceId === sourceId), [sourceCandidates, sourceId]);
  const currency = deposit?.currency ?? "SAR";

  function chooseSource(nextSourceId: string) {
    setSourceId(nextSourceId);
    const candidate = sourceCandidates.find((item) => item.sourceId === nextSourceId);
    if (candidate) {
      setAmount(candidate.amount);
      setReference(candidate.reference);
      setCounterpartyName(candidate.counterpartyName);
    }
  }

  async function addLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deposit) {
      return;
    }
    const validationError = validateBankDepositLineInput({ sourceType, sourceId, amount, currency });
    if (validationError) {
      setError(validationError);
      return;
    }
    setAction("add-line");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankDepositBatch>(`/bank-deposits/${deposit.id}/lines`, {
        method: "POST",
        body: {
          sourceType,
          sourceId: sourceId || undefined,
          counterpartyName: counterpartyName.trim() || undefined,
          reference: reference.trim() || undefined,
          amount,
          currency,
          memo: memo.trim() || undefined,
        },
      });
      setDeposit(updated);
      setSuccess("Deposit line added.");
      setAmount("");
      setMemo("");
      setReference("");
      setCounterpartyName("");
      setSourceId("");
      setReloadToken((current) => current + 1);
    } catch (lineError) {
      setError(lineError instanceof Error ? lineError.message : "Unable to add deposit line.");
    } finally {
      setAction("");
    }
  }

  async function removeLine(lineId: string) {
    if (!deposit) {
      return;
    }
    setAction(lineId);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankDepositBatch>(`/bank-deposits/${deposit.id}/lines/${lineId}`, { method: "DELETE" });
      setDeposit(updated);
      setSuccess("Deposit line removed.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove deposit line.");
    } finally {
      setAction("");
    }
  }

  async function runDepositAction(actionName: "post" | "void" | "unmatch-statement-transaction") {
    if (!deposit) {
      return;
    }
    setAction(actionName);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankDepositBatch>(`/bank-deposits/${deposit.id}/${actionName}`, { method: "POST" });
      setDeposit(updated);
      setSuccess(actionName === "post" ? "Deposit batch posted for operational matching." : actionName === "void" ? "Deposit batch voided." : "Deposit batch unmatched.");
      setReloadToken((current) => current + 1);
    } catch (depositError) {
      setError(depositError instanceof Error ? depositError.message : "Unable to update deposit batch.");
    } finally {
      setAction("");
    }
  }

  async function matchStatementRow() {
    if (!deposit || !selectedStatementId) {
      return;
    }
    setAction("match");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankDepositBatch>(`/bank-deposits/${deposit.id}/match-statement-transaction`, {
        method: "POST",
        body: { statementTransactionId: selectedStatementId },
      });
      setDeposit(updated);
      setSuccess("Deposit batch matched to statement credit row.");
      setReloadToken((current) => current + 1);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Unable to match statement row.");
    } finally {
      setAction("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Deposit batch detail</h1>
          <p className="mt-1 text-sm text-steel">{deposit?.bankAccountProfile?.displayName ?? "Bank deposit batch"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bank-accounts/${params.id}/deposits`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Deposits
          </Link>
          <Link href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Statement rows
          </Link>
          <Link href={`/bank-accounts/${params.id}/cheques`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cheques
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load this deposit batch.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading deposit batch...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {deposit ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Status" value={bankDepositStatusLabel(deposit.status)} badgeClass={bankDepositStatusBadgeClass(deposit.status)} />
            <SummaryCard label="Total" value={formatMoneyAmount(deposit.totalAmount, deposit.currency)} />
            <SummaryCard label="Lines" value={String(deposit.lines.length)} />
            <SummaryCard label="Deposit date" value={formatOptionalDate(deposit.depositDate, "-")} />
          </div>

          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-6 text-steel">
              This deposit batch groups receipts, cash, or clearing references for manual reconciliation. No live bank feed is added, no bank API is called, no bank payment is sent, and posting this batch does not create a journal because undeposited-funds clearing is not yet confirmed.
            </p>
          </div>

          <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Lines</h2>
                <p className="mt-1 text-sm text-steel">{deposit.memo ?? "No memo"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canReconcile && canPostBankDeposit(deposit.status, deposit.totalAmount, deposit.lines.length) ? (
                  <button type="button" disabled={Boolean(action)} onClick={() => void runDepositAction("post")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "post" ? "Posting..." : "Post batch"}
                  </button>
                ) : null}
                {canReconcile && deposit.status === "MATCHED" ? (
                  <button type="button" disabled={Boolean(action)} onClick={() => void runDepositAction("unmatch-statement-transaction")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "unmatch-statement-transaction" ? "Unmatching..." : "Unmatch"}
                  </button>
                ) : null}
                {canReconcile && canVoidBankDeposit(deposit.status) ? (
                  <button type="button" disabled={Boolean(action)} onClick={() => void runDepositAction("void")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "void" ? "Voiding..." : "Void"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                  <tr>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Counterparty</th>
                    <th className="px-4 py-3">Memo</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deposit.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-steel">{bankDepositSourceTypeLabel(line.sourceType)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{line.reference ?? line.sourceId ?? "-"}</td>
                      <td className="px-4 py-3 text-ink">{line.counterpartyName ?? "-"}</td>
                      <td className="px-4 py-3 text-steel">{line.memo ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(line.amount, line.currency)}</td>
                      <td className="px-4 py-3">
                        {canManage && deposit.status === "DRAFT" ? (
                          <button type="button" disabled={Boolean(action)} onClick={() => void removeLine(line.id)} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                            {action === line.id ? "Removing..." : "Remove"}
                          </button>
                        ) : (
                          <span className="text-xs text-steel">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {deposit.lines.length === 0 ? <StatusMessage type="empty">No deposit lines yet.</StatusMessage> : null}
            </div>
          </div>

          {canManage && deposit.status === "DRAFT" ? (
            <form onSubmit={addLine} className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Add line</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Source type</span>
                  <select value={sourceType} onChange={(event) => setSourceType(event.target.value as BankDepositBatchLineSourceType)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                    {SOURCE_TYPES.map((item) => (
                      <option key={item} value={item}>
                        {bankDepositSourceTypeLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>
                {sourceType === "CUSTOMER_PAYMENT" ? (
                  <label className="block lg:col-span-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Customer payment</span>
                    <select value={sourceId} onChange={(event) => chooseSource(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                      <option value="">Select customer payment</option>
                      {sourceCandidates.map((candidate) => (
                        <option key={candidate.sourceId} value={candidate.sourceId}>
                          {candidate.reference} - {candidate.counterpartyName} - {formatMoneyAmount(candidate.amount, candidate.currency)}
                        </option>
                      ))}
                    </select>
                    {selectedSource ? (
                      <p className="mt-1 text-xs leading-5 text-steel">
                        {selectedSource.depositReadiness === "ALREADY_POSTED_TO_THIS_BANK_ACCOUNT"
                          ? "This payment is already posted to this bank account."
                          : "Operational grouping only. Clearing-account journal movement is deferred."}
                      </p>
                    ) : null}
                  </label>
                ) : (
                  <label className="block lg:col-span-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Source id</span>
                    <input value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                )}
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Amount</span>
                  <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Reference</span>
                  <input value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Counterparty</span>
                  <input value={counterpartyName} onChange={(event) => setCounterpartyName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Memo</span>
                  <input value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
                <div className="flex items-end">
                  <button type="submit" disabled={Boolean(action)} className="w-full rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                    {action === "add-line" ? "Adding..." : "Add line"}
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {canReconcile && canMatchBankDeposit(deposit.status) ? (
            <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Match statement credit row</h2>
              <p className="mt-1 text-sm text-steel">Matching is explicit and only accepts same-account credit rows with the same amount.</p>
              {matchCandidates.length === 0 ? <StatusMessage type="empty">No matching statement credit rows found within the date window.</StatusMessage> : null}
              {matchCandidates.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Candidate row</span>
                    <select value={selectedStatementId} onChange={(event) => setSelectedStatementId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                      {matchCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {formatOptionalDate(candidate.transactionDate, "-")} - {candidate.description} - {formatMoneyAmount(candidate.amount, currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" disabled={!selectedStatementId || Boolean(action)} onClick={() => void matchStatementRow()} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "match" ? "Matching..." : "Match deposit batch"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {deposit.statementTransaction ? (
            <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Linked statement row</h2>
              <p className="mt-2 text-sm text-steel">
                {formatOptionalDate(deposit.statementTransaction.transactionDate, "-")} - {deposit.statementTransaction.description} -{" "}
                {formatMoneyAmount(deposit.statementTransaction.amount, deposit.currency)}
              </p>
              <Link href={`/bank-statement-transactions/${deposit.statementTransaction.id}`} className="mt-3 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Open statement row
              </Link>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, value, badgeClass }: { label: string; value: string; badgeClass?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className={`mt-2 inline-flex rounded-md text-sm font-semibold ${badgeClass ? `${badgeClass} px-2 py-1` : "font-mono text-ink"}`}>{value}</p>
    </div>
  );
}
