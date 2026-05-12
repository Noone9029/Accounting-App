"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { canVoidCashExpense, cashExpensePaidThroughLabel, cashExpenseStatusBadgeClass, cashExpenseStatusLabel } from "@/lib/cash-expenses";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import type { CashExpense } from "@/lib/types";

export default function CashExpensesPage() {
  const organizationId = useActiveOrganizationId();
  const [expenses, setExpenses] = useState<CashExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<CashExpense[]>("/cash-expenses")
      .then((result) => {
        if (!cancelled) {
          setExpenses(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load cash expenses.");
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

  async function voidExpense(expense: CashExpense) {
    if (!window.confirm(`Void cash expense ${expense.expenseNumber}?`)) {
      return;
    }

    setActionId(expense.id);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<CashExpense>(`/cash-expenses/${expense.id}/void`, { method: "POST" });
      setSuccess(`Voided cash expense ${voided.expenseNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to void cash expense.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Cash expenses</h1>
          <p className="mt-1 text-sm text-steel">Immediate paid expenses that debit expense/VAT and credit cash or bank.</p>
        </div>
        <Link href="/purchases/cash-expenses/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
          Post cash expense
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load cash expenses.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading cash expenses...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && expenses.length === 0 ? <StatusMessage type="empty">No cash expenses found.</StatusMessage> : null}
      </div>

      {expenses.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Paid through</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-4 py-3 font-mono text-xs">{expense.expenseNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{expense.contact?.displayName ?? expense.contact?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(expense.expenseDate, "-")}</td>
                  <td className="px-4 py-3 text-steel">{cashExpensePaidThroughLabel(expense)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(expense.total, expense.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${cashExpenseStatusBadgeClass(expense.status)}`}>
                      {cashExpenseStatusLabel(expense.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{expense.journalEntry ? `${expense.journalEntry.entryNumber} (${expense.journalEntry.id})` : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/purchases/cash-expenses/${expense.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        View
                      </Link>
                      {canVoidCashExpense(expense.status) ? (
                        <button type="button" onClick={() => void voidExpense(expense)} disabled={actionId === expense.id} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          Void
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
