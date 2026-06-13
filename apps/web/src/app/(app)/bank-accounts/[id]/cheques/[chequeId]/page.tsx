"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountingStatusPanel } from "@/components/banking/accounting-status-panel";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { getChequeAccountingPreflight, postChequeJournal } from "@/lib/banking-accounting";
import {
  canBounceCheque,
  canClearCheque,
  canDepositCheque,
  canMatchCheque,
  canOpenCheque,
  canVoidCheque,
  chequeStatusBadgeClass,
  chequeStatusLabel,
  chequeTypeLabel,
} from "@/lib/cheques";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankingAccountingPreflight, BankDepositBatch, BankStatementTransaction, ChequeInstrument } from "@/lib/types";

export default function ChequeDetailPage() {
  const params = useParams<{ id: string; chequeId: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.bankStatements.manage);
  const canReconcile = can(PERMISSIONS.bankStatements.reconcile);
  const canPostJournal = can(PERMISSIONS.journals.post);
  const [cheque, setCheque] = useState<ChequeInstrument | null>(null);
  const [accountingPreflight, setAccountingPreflight] = useState<BankingAccountingPreflight | null>(null);
  const [accountingLoading, setAccountingLoading] = useState(false);
  const [deposits, setDeposits] = useState<BankDepositBatch[]>([]);
  const [matchCandidates, setMatchCandidates] = useState<BankStatementTransaction[]>([]);
  const [selectedDepositId, setSelectedDepositId] = useState("");
  const [selectedStatementId, setSelectedStatementId] = useState("");
  const [bounceReason, setBounceReason] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId || !params.chequeId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    apiRequest<ChequeInstrument>(`/cheques/${params.chequeId}`)
      .then((result) => {
        if (!cancelled) {
          setCheque(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load cheque.");
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
  }, [organizationId, params.chequeId, reloadToken]);

  useEffect(() => {
    if (!organizationId || !cheque) {
      setDeposits([]);
      setMatchCandidates([]);
      return;
    }
    let cancelled = false;
    const requests: Array<Promise<unknown>> = [];
    if (canManage && canDepositCheque(cheque.chequeType, cheque.status)) {
      requests.push(apiRequest<BankDepositBatch[]>(`/bank-deposits?bankAccountProfileId=${params.id}`));
    } else {
      requests.push(Promise.resolve([]));
    }
    if (canReconcile && canMatchCheque(cheque.status)) {
      requests.push(apiRequest<BankStatementTransaction[]>(`/cheques/${cheque.id}/match-candidates`));
    } else {
      requests.push(Promise.resolve([]));
    }
    Promise.all(requests)
      .then(([depositResult, matchResult]) => {
        if (!cancelled) {
          const draftDeposits = (depositResult as BankDepositBatch[]).filter((deposit) => deposit.status === "DRAFT" && deposit.currency === cheque.currency);
          const candidates = matchResult as BankStatementTransaction[];
          setDeposits(draftDeposits);
          setMatchCandidates(candidates);
          setSelectedDepositId((current) => current || draftDeposits[0]?.id || "");
          setSelectedStatementId((current) => current || candidates[0]?.id || "");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load cheque supporting data.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canManage, canReconcile, cheque, organizationId, params.id]);

  useEffect(() => {
    if (!organizationId || !cheque) {
      setAccountingPreflight(null);
      return;
    }
    let cancelled = false;
    setAccountingLoading(true);
    getChequeAccountingPreflight(cheque.id)
      .then((preflight) => {
        if (!cancelled) {
          setAccountingPreflight(preflight);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setAccountingPreflight({
            status: "BLOCKED",
            ready: false,
            reasons: [loadError instanceof Error ? loadError.message : "Unable to load cheque accounting preflight."],
            warnings: [],
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAccountingLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cheque, organizationId]);

  async function runAction(actionName: "mark-received" | "mark-issued" | "clear" | "unmatch-statement-transaction") {
    if (!cheque) {
      return;
    }
    setAction(actionName);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<ChequeInstrument>(`/cheques/${cheque.id}/${actionName}`, { method: "POST" });
      setCheque(updated);
      setSuccess(actionName === "clear" ? "Cheque cleared." : actionName === "unmatch-statement-transaction" ? "Cheque unmatched." : "Cheque status updated.");
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update cheque.");
    } finally {
      setAction("");
    }
  }

  async function depositCheque() {
    if (!cheque || !selectedDepositId) {
      return;
    }
    setAction("deposit");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<ChequeInstrument>(`/cheques/${cheque.id}/deposit`, {
        method: "POST",
        body: { depositBatchId: selectedDepositId },
      });
      setCheque(updated);
      setSuccess("Cheque linked to deposit batch.");
      setReloadToken((current) => current + 1);
    } catch (depositError) {
      setError(depositError instanceof Error ? depositError.message : "Unable to deposit cheque.");
    } finally {
      setAction("");
    }
  }

  async function matchStatementRow() {
    if (!cheque || !selectedStatementId) {
      return;
    }
    setAction("match");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<ChequeInstrument>(`/cheques/${cheque.id}/match-statement-transaction`, {
        method: "POST",
        body: { statementTransactionId: selectedStatementId },
      });
      setCheque(updated);
      setSuccess("Cheque matched and cleared against statement row.");
      setReloadToken((current) => current + 1);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Unable to match cheque.");
    } finally {
      setAction("");
    }
  }

  async function bounceCheque() {
    if (!cheque) {
      return;
    }
    if (!bounceReason.trim()) {
      setError("Bounce reason is required.");
      return;
    }
    setAction("bounce");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<ChequeInstrument>(`/cheques/${cheque.id}/bounce`, {
        method: "POST",
        body: { bounceReason },
      });
      setCheque(updated);
      setSuccess("Cheque bounced or stopped.");
    } catch (bounceError) {
      setError(bounceError instanceof Error ? bounceError.message : "Unable to bounce cheque.");
    } finally {
      setAction("");
    }
  }

  async function voidCheque() {
    if (!cheque) {
      return;
    }
    if (!voidReason.trim()) {
      setError("Void reason is required.");
      return;
    }
    setAction("void");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<ChequeInstrument>(`/cheques/${cheque.id}/void`, {
        method: "POST",
        body: { voidReason },
      });
      setCheque(updated);
      setSuccess("Cheque voided.");
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : "Unable to void cheque.");
    } finally {
      setAction("");
    }
  }

  async function postAccountingJournal() {
    if (!cheque) {
      return;
    }
    setAction("post-journal");
    setError("");
    setSuccess("");
    try {
      const result = await postChequeJournal(cheque.id);
      setCheque(result.record);
      setSuccess(`Journal ${result.journalEntry.entryNumber} posted for this cheque.`);
      setReloadToken((current) => current + 1);
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "Cheque journal posting remains deferred.");
    } finally {
      setAction("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Cheque detail</h1>
          <p className="mt-1 text-sm text-steel">{cheque ? `${cheque.chequeNumber} - ${chequeTypeLabel(cheque.chequeType)}` : "Manual cheque lifecycle"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bank-accounts/${params.id}/cheques`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cheques
          </Link>
          <Link href={`/bank-accounts/${params.id}/deposits`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Deposits
          </Link>
          <Link href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Statement rows
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load this cheque.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading cheque...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {cheque ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Status" value={chequeStatusLabel(cheque.status)} badgeClass={chequeStatusBadgeClass(cheque.status)} />
            <SummaryCard label="Amount" value={formatMoneyAmount(cheque.amount, cheque.currency)} />
            <SummaryCard label="Due date" value={formatOptionalDate(cheque.dueDate, "-")} />
            <SummaryCard label="Type" value={chequeTypeLabel(cheque.chequeType)} />
          </div>

          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-6 text-steel">
              This is a manual cheque record. No live bank feed is added, no bank API is called, no bank credentials are collected, and no bank payment is sent.
            </p>
            <p className="mt-2 text-xs leading-5 text-steel">
              Direct cheque journal posting remains deferred unless a later accountant-reviewed source-accounting policy confirms cheque-in-hand or outstanding-cheque recognition. Matching and deposit links here require explicit user action.
            </p>
          </div>

          <div className="mt-5">
            <AccountingStatusPanel
              preflight={accountingPreflight}
              loading={accountingLoading}
              action={action}
              canPost={canPostJournal}
              onPost={() => void postAccountingJournal()}
              postLabel="Post cheque journal"
            />
          </div>

          <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Lifecycle actions</h2>
                <p className="mt-1 text-sm text-steel">{cheque.memo ?? "No memo"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canManage && canOpenCheque(cheque.status) && cheque.chequeType === "RECEIVED" ? (
                  <button type="button" disabled={Boolean(action)} onClick={() => void runAction("mark-received")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "mark-received" ? "Updating..." : "Mark received"}
                  </button>
                ) : null}
                {canManage && canOpenCheque(cheque.status) && cheque.chequeType === "ISSUED" ? (
                  <button type="button" disabled={Boolean(action)} onClick={() => void runAction("mark-issued")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "mark-issued" ? "Updating..." : "Mark issued"}
                  </button>
                ) : null}
                {canReconcile && canClearCheque(cheque.status) ? (
                  <button type="button" disabled={Boolean(action)} onClick={() => void runAction("clear")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "clear" ? "Clearing..." : "Clear"}
                  </button>
                ) : null}
                {canReconcile && cheque.statementTransactionId ? (
                  <button type="button" disabled={Boolean(action)} onClick={() => void runAction("unmatch-statement-transaction")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "unmatch-statement-transaction" ? "Unmatching..." : "Unmatch"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Detail label="Counterparty" value={cheque.counterpartyName} />
              <Detail label="Drawer bank" value={cheque.drawerBankName ?? "-"} />
              <Detail label="Payee" value={cheque.payeeName ?? "-"} />
              <Detail label="Issue date" value={formatOptionalDate(cheque.issueDate, "-")} />
              <Detail label="Received date" value={formatOptionalDate(cheque.receivedDate, "-")} />
              <Detail label="Reference" value={cheque.reference ?? "-"} />
              <Detail label="Deposited" value={formatOptionalDate(cheque.depositDate, "-")} />
              <Detail label="Cleared" value={formatOptionalDate(cheque.clearedDate, "-")} />
              <Detail label="Bounced" value={formatOptionalDate(cheque.bouncedDate, "-")} />
            </div>
          </div>

          {canManage && canDepositCheque(cheque.chequeType, cheque.status) ? (
            <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Deposit received cheque</h2>
              <p className="mt-1 text-sm text-steel">Depositing creates one cheque source line in a draft deposit batch. It does not post a journal entry.</p>
              {deposits.length === 0 ? <StatusMessage type="empty">No draft deposit batches are available for this bank account and currency.</StatusMessage> : null}
              {deposits.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Draft deposit batch</span>
                    <select value={selectedDepositId} onChange={(event) => setSelectedDepositId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                      {deposits.map((deposit) => (
                        <option key={deposit.id} value={deposit.id}>
                          {formatOptionalDate(deposit.depositDate, "-")} - {formatMoneyAmount(deposit.totalAmount, deposit.currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" disabled={!selectedDepositId || Boolean(action)} onClick={() => void depositCheque()} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "deposit" ? "Depositing..." : "Deposit cheque"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {canReconcile && canMatchCheque(cheque.status) ? (
            <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Match statement row</h2>
              <p className="mt-1 text-sm text-steel">Received cheques match credit rows. Issued cheques match debit rows. Matching is explicit.</p>
              {matchCandidates.length === 0 ? <StatusMessage type="empty">No matching statement rows found within the date window.</StatusMessage> : null}
              {matchCandidates.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Candidate row</span>
                    <select value={selectedStatementId} onChange={(event) => setSelectedStatementId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                      {matchCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {formatOptionalDate(candidate.transactionDate, "-")} - {candidate.description} - {candidate.type} - {formatMoneyAmount(candidate.amount, cheque.currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" disabled={!selectedStatementId || Boolean(action)} onClick={() => void matchStatementRow()} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {action === "match" ? "Matching..." : "Match cheque"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {canReconcile && canBounceCheque(cheque.status) ? (
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                <h2 className="text-base font-semibold text-ink">Bounce or stop</h2>
                <input value={bounceReason} onChange={(event) => setBounceReason(event.target.value)} placeholder="Reason required" className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                <button type="button" disabled={Boolean(action)} onClick={() => void bounceCheque()} className="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {action === "bounce" ? "Updating..." : "Bounce/stop cheque"}
                </button>
              </div>
            ) : null}
            {canReconcile && canVoidCheque(cheque.status) ? (
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                <h2 className="text-base font-semibold text-ink">Void</h2>
                <input value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="Reason required" className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                <button type="button" disabled={Boolean(action)} onClick={() => void voidCheque()} className="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {action === "void" ? "Voiding..." : "Void cheque"}
                </button>
              </div>
            ) : null}
          </div>

          {cheque.depositBatch ? (
            <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Linked deposit batch</h2>
              <p className="mt-2 text-sm text-steel">
                {formatOptionalDate(cheque.depositBatch.depositDate, "-")} - {formatMoneyAmount(cheque.depositBatch.totalAmount, cheque.currency)}
              </p>
              <Link href={`/bank-accounts/${params.id}/deposits/${cheque.depositBatch.id}`} className="mt-3 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Open deposit
              </Link>
            </div>
          ) : null}

          {cheque.statementTransaction ? (
            <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Linked statement row</h2>
              <p className="mt-2 text-sm text-steel">
                {formatOptionalDate(cheque.statementTransaction.transactionDate, "-")} - {cheque.statementTransaction.description} - {formatMoneyAmount(cheque.statementTransaction.amount, cheque.currency)}
              </p>
              <Link href={`/bank-statement-transactions/${cheque.statementTransaction.id}`} className="mt-3 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Open statement row
              </Link>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
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
