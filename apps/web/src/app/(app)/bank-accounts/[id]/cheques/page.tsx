"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { chequeStatusBadgeClass, chequeStatusLabel, chequeTypeLabel, validateChequeInput } from "@/lib/cheques";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, ChequeInstrument, ChequeInstrumentType } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ChequesPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.bankStatements.manage);
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [cheques, setCheques] = useState<ChequeInstrument[]>([]);
  const [chequeType, setChequeType] = useState<ChequeInstrumentType>("RECEIVED");
  const [chequeNumber, setChequeNumber] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [drawerBankName, setDrawerBankName] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [issueDate, setIssueDate] = useState(todayInputValue());
  const [receivedDate, setReceivedDate] = useState(todayInputValue());
  const [dueDate, setDueDate] = useState(todayInputValue());
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const currency = profile?.currency ?? "SAR";

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      apiRequest<BankAccountSummary>(`/bank-accounts/${params.id}`),
      apiRequest<ChequeInstrument[]>(`/cheques?bankAccountProfileId=${params.id}`),
    ])
      .then(([profileResult, chequeResult]) => {
        if (!cancelled) {
          setProfile(profileResult);
          setCheques(chequeResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load cheques.");
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

  const totals = useMemo(
    () =>
      cheques.reduce(
        (summary, cheque) => {
          summary.count += 1;
          summary.amount += Number(cheque.amount);
          return summary;
        },
        { count: 0, amount: 0 },
      ),
    [cheques],
  );

  async function createCheque(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateChequeInput({ chequeNumber, counterpartyName, amount, currency, chequeType, issueDate, receivedDate });
    if (validationError) {
      setError(validationError);
      return;
    }
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const created = await apiRequest<ChequeInstrument>("/cheques", {
        method: "POST",
        body: {
          chequeType,
          bankAccountProfileId: params.id,
          counterpartyType: "OTHER",
          counterpartyName: counterpartyName.trim(),
          chequeNumber: chequeNumber.trim(),
          drawerBankName: drawerBankName.trim() || undefined,
          payeeName: payeeName.trim() || undefined,
          issueDate: issueDate ? `${issueDate}T00:00:00.000Z` : undefined,
          receivedDate: chequeType === "RECEIVED" && receivedDate ? `${receivedDate}T00:00:00.000Z` : undefined,
          dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : undefined,
          amount,
          currency,
          reference: reference.trim() || undefined,
          memo: memo.trim() || undefined,
        },
      });
      setCheques((current) => [created, ...current]);
      setSuccess("Draft cheque created.");
      setChequeNumber("");
      setCounterpartyName("");
      setDrawerBankName("");
      setPayeeName("");
      setAmount("");
      setReference("");
      setMemo("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create cheque.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Cheques</h1>
          <p className="mt-1 text-sm text-steel">{profile ? `${profile.displayName} manual cheque register` : "Manual cheque register"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bank-accounts/${params.id}/deposits`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Deposits
          </Link>
          <Link href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Statement rows
          </Link>
          <Link href={`/bank-accounts/${params.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load cheques.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading cheques...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      <ChequeGuidance />

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Cheques" value={String(totals.count)} />
        <SummaryCard label="Total amount" value={formatMoneyAmount(totals.amount.toFixed(4), currency)} />
        <SummaryCard label="Currency" value={currency} />
      </div>

      {canManage ? (
        <form onSubmit={createCheque} className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">Create draft cheque</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Type</span>
              <select value={chequeType} onChange={(event) => setChequeType(event.target.value as ChequeInstrumentType)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="RECEIVED">Received cheque</option>
                <option value="ISSUED">Issued cheque</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Cheque number</span>
              <input value={chequeNumber} onChange={(event) => setChequeNumber(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Counterparty</span>
              <input value={counterpartyName} onChange={(event) => setCounterpartyName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Issue date</span>
              <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            {chequeType === "RECEIVED" ? (
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-steel">Received date</span>
                <input type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
              </label>
            ) : null}
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Due/clearing date</span>
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Amount</span>
              <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Drawer bank</span>
              <input value={drawerBankName} onChange={(event) => setDrawerBankName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Payee</span>
              <input value={payeeName} onChange={(event) => setPayeeName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Reference</span>
              <input value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Memo</span>
              <input value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <div className="flex items-end">
              <button type="submit" disabled={creating} className="w-full rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                {creating ? "Creating..." : "Create draft"}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Cheque</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Counterparty</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Deposit</th>
              <th className="px-4 py-3">Statement row</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cheques.map((cheque) => (
              <tr key={cheque.id}>
                <td className="px-4 py-3 font-medium text-ink">{cheque.chequeNumber}</td>
                <td className="px-4 py-3 text-steel">{chequeTypeLabel(cheque.chequeType)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${chequeStatusBadgeClass(cheque.status)}`}>{chequeStatusLabel(cheque.status)}</span>
                </td>
                <td className="px-4 py-3 text-steel">{cheque.counterpartyName}</td>
                <td className="px-4 py-3 text-steel">{formatOptionalDate(cheque.dueDate, "-")}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(cheque.amount, cheque.currency)}</td>
                <td className="px-4 py-3 text-steel">{cheque.depositBatch ? `Batch ${formatOptionalDate(cheque.depositBatch.depositDate, "-")}` : "-"}</td>
                <td className="px-4 py-3 text-steel">{cheque.statementTransaction ? cheque.statementTransaction.description : "Not matched"}</td>
                <td className="px-4 py-3">
                  <Link href={`/bank-accounts/${params.id}/cheques/${cheque.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && cheques.length === 0 ? (
          <div className="p-4">
            <StatusMessage type="empty">No cheques yet.</StatusMessage>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function ChequeGuidance() {
  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-base font-semibold text-ink">Manual cheque lifecycle</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        Cheques are tracked manually as received or issued treasury instruments. No live bank feed is added, no bank API is called, no bank credentials are collected, and no bank payment is sent.
      </p>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-steel">
        Journal-backed cheque-in-hand, outstanding-cheque, and clearing-account posting is deferred to the clearing-account accounting design prompt. Cheque actions here update operational status and explicit statement/deposit links only.
      </p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-2 font-mono text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
