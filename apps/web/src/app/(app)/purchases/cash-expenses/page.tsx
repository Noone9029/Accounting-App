"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { canVoidCashExpense, cashExpensePaidThroughLabel, cashExpenseStatusBadgeClass, cashExpenseStatusLabel } from "@/lib/cash-expenses";
import { PERMISSIONS } from "@/lib/permissions";
import type { CashExpense } from "@/lib/types";

export default function CashExpensesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [expenses, setExpenses] = useState<CashExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreateExpense = can(PERMISSIONS.cashExpenses.create);
  const canVoidExpensePermission = can(PERMISSIONS.cashExpenses.void);

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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load cash expenses."));
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
  }, [organizationId, reloadToken, tc]);

  async function voidExpense(expense: CashExpense) {
    if (!window.confirm(tc("Void cash expense {number}?", { number: expense.expenseNumber }))) {
      return;
    }

    setActionId(expense.id);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<CashExpense>(`/cash-expenses/${expense.id}/void`, { method: "POST" });
      setSuccess(tc("Voided cash expense {number}.", { number: voided.expenseNumber }));
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to void cash expense."));
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Cash expenses")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Immediate paid expenses that debit expense/VAT and credit cash or bank.")}</p>
          <p className="mt-1 text-sm text-steel">{tc("Cash expenses do not create accounts payable, supplier payment runs, bank transfers, or tax authority submissions.")}</p>
        </div>
        {canCreateExpense ? (
          <Link href="/purchases/cash-expenses/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            {tc("Post cash expense")}
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load cash expenses.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading cash expenses...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && expenses.length === 0 ? <StatusMessage type="empty">{tc("No cash expenses found.")}</StatusMessage> : null}
      </div>

      {expenses.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1080px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{tc("Number")}</th>
                <th className="px-4 py-3">{tc("Contact")}</th>
                <th className="px-4 py-3">{tc("Date")}</th>
                <th className="px-4 py-3">{tc("Paid through")}</th>
                <th className="px-4 py-3">{tc("Total")}</th>
                <th className="px-4 py-3">{tc("Status")}</th>
                <th className="px-4 py-3">{tc("Journal")}</th>
                <th className="px-4 py-3">{tc("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{expense.expenseNumber}</bdi></td>
                  <td className="px-4 py-3 font-medium text-ink">{expense.contact?.displayName ?? expense.contact?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(expense.expenseDate, locale, "-")}</td>
                  <td className="px-4 py-3 text-steel">{tc(cashExpensePaidThroughLabel(expense))}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(expense.total, expense.currency, locale)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${cashExpenseStatusBadgeClass(expense.status)}`}>
                      {tc(cashExpenseStatusLabel(expense.status))}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{expense.journalEntry ? <bdi dir="ltr">{expense.journalEntry.entryNumber} ({expense.journalEntry.id})</bdi> : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/purchases/cash-expenses/${expense.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {tc("View")}
                      </Link>
                      {canVoidCashExpense(expense.status) && canVoidExpensePermission ? (
                        <button type="button" onClick={() => void voidExpense(expense)} disabled={actionId === expense.id} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          {tc("Void")}
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
