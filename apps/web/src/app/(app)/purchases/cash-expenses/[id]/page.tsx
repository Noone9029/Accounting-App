"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { canVoidCashExpense, cashExpensePaidThroughLabel, cashExpenseStatusBadgeClass, cashExpenseStatusLabel } from "@/lib/cash-expenses";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { cashExpensePdfPath, downloadPdf } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { CashExpense, CashExpensePdfData } from "@/lib/types";

export default function CashExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [expense, setExpense] = useState<CashExpense | null>(null);
  const [pdfData, setPdfData] = useState<CashExpensePdfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canVoidExpense = can(PERMISSIONS.cashExpenses.void);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([apiRequest<CashExpense>(`/cash-expenses/${params.id}`), apiRequest<CashExpensePdfData>(`/cash-expenses/${params.id}/pdf-data`)])
      .then(([expenseResult, pdfResult]) => {
        if (!cancelled) {
          setExpense(expenseResult);
          setPdfData(pdfResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load cash expense.");
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

  async function refresh() {
    if (!params.id) {
      return;
    }
    const [expenseResult, pdfResult] = await Promise.all([
      apiRequest<CashExpense>(`/cash-expenses/${params.id}`),
      apiRequest<CashExpensePdfData>(`/cash-expenses/${params.id}/pdf-data`),
    ]);
    setExpense(expenseResult);
    setPdfData(pdfResult);
  }

  async function voidExpense() {
    if (!expense || !window.confirm(`Void cash expense ${expense.expenseNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<CashExpense>(`/cash-expenses/${expense.id}/void`, { method: "POST" });
      setExpense(voided);
      await refresh();
      setSuccess(`Voided cash expense ${voided.expenseNumber}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to void cash expense.");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadCashExpensePdf() {
    if (!expense) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadPdf(cashExpensePdfPath(expense.id), `cash-expense-${expense.expenseNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download cash expense PDF.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{expense ? expense.expenseNumber : "Cash expense"}</h1>
          <p className="mt-1 text-sm text-steel">Immediate expense posting, journal audit, and receipt PDF.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/purchases/cash-expenses" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {expense?.contactId ? (
            <Link href={`/contacts/${expense.contactId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Supplier ledger
            </Link>
          ) : null}
          {expense ? (
            <button type="button" onClick={() => void downloadCashExpensePdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Download PDF
            </button>
          ) : null}
          {canVoidCashExpense(expense?.status) && canVoidExpense ? (
            <button type="button" onClick={() => void voidExpense()} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Void
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load cash expenses.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading cash expense...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {expense ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Contact" value={expense.contact?.displayName ?? expense.contact?.name ?? "-"} />
              <Summary label="Status" value={cashExpenseStatusLabel(expense.status)} />
              <Summary label="Expense date" value={formatOptionalDate(expense.expenseDate, "-")} />
              <Summary label="Currency" value={expense.currency} />
              <Summary label="Paid through" value={cashExpensePaidThroughLabel(expense)} />
              <Summary label="Branch" value={expense.branch?.displayName ?? expense.branch?.name ?? "-"} />
              <Summary label="Total" value={formatMoneyAmount(expense.total, expense.currency)} />
              <Summary label="VAT / Tax" value={formatMoneyAmount(expense.taxTotal, expense.currency)} />
              <Summary label="Journal entry" value={expense.journalEntry ? `${expense.journalEntry.entryNumber} (${expense.journalEntry.id})` : "-"} />
              <Summary label="Void reversal" value={expense.voidReversalJournalEntry ? `${expense.voidReversalJournalEntry.entryNumber} (${expense.voidReversalJournalEntry.id})` : "-"} />
              <Summary label="Posted" value={expense.postedAt ? new Date(expense.postedAt).toLocaleString() : "-"} />
              <Summary label="Voided" value={expense.voidedAt ? new Date(expense.voidedAt).toLocaleString() : "-"} />
              <Summary label="Description" value={expense.description ?? "-"} />
              <Summary label="Notes" value={expense.notes ?? "-"} />
            </div>
            <div className="mt-4">
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${cashExpenseStatusBadgeClass(expense.status)}`}>{cashExpenseStatusLabel(expense.status)}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Unit price</th>
                  <th className="px-4 py-3">Gross</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Taxable</th>
                  <th className="px-4 py-3">Tax</th>
                  <th className="px-4 py-3">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expense.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? `${line.account.code} ${line.account.name}` : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.unitPrice, expense.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.lineGrossAmount, expense.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.discountAmount, expense.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.taxableAmount, expense.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.taxAmount, expense.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.lineTotal, expense.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex justify-end">
              <div className="min-w-[280px] space-y-2 text-sm">
                <TotalRow label="Subtotal" value={formatMoneyAmount(expense.subtotal, expense.currency)} />
                <TotalRow label="Discount" value={formatMoneyAmount(expense.discountTotal, expense.currency)} />
                <TotalRow label="Taxable" value={formatMoneyAmount(expense.taxableTotal, expense.currency)} />
                <TotalRow label="VAT / Tax" value={formatMoneyAmount(expense.taxTotal, expense.currency)} />
                <TotalRow label="Total" value={formatMoneyAmount(expense.total, expense.currency)} strong />
              </div>
            </div>
          </div>

          {pdfData ? (
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">PDF data preview</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                <Summary label="Document" value={pdfData.expense.expenseNumber} />
                <Summary label="Generated" value={new Date(pdfData.generatedAt).toLocaleString()} />
                <Summary label="Lines" value={String(pdfData.lines.length)} />
                <Summary label="Total" value={formatMoneyAmount(pdfData.expense.total, pdfData.expense.currency)} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold text-ink" : "text-steel"}`}>
      <span>{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}
