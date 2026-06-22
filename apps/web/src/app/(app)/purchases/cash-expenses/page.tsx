"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { canVoidCashExpense, cashExpensePaidThroughLabel, cashExpenseStatusLabel } from "@/lib/cash-expenses";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { CashExpense } from "@/lib/types";

export default function CashExpensesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title="Cash expenses"
        description="Immediate paid expenses that debit expense/VAT and credit cash or bank."
        actions={
          canCreateExpense ? (
            <LedgerActionBar>
              <LedgerButton href="/purchases/cash-expenses/new" variant="primary">
                Post cash expense
              </LedgerButton>
            </LedgerActionBar>
          ) : undefined
        }
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          Cash expenses post immediately and do not create accounts payable, supplier payment runs, bank transfers, or tax authority submissions.
        </LedgerSummaryBand>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load cash expenses.</LedgerAlert> : null}
        {loading ? <LedgerAlert tone="info">Loading cash expenses...</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {!loading && organizationId && expenses.length === 0 ? (
          <LedgerEmptyState
            title="No cash expenses found"
            description="Post an immediate paid expense only after the paid-through cash or bank account is known."
            action={canCreateExpense ? <LedgerButton href="/purchases/cash-expenses/new" variant="primary">Post cash expense</LedgerButton> : null}
          />
        ) : null}

        {expenses.length > 0 ? (
          <LedgerDataTable minWidth="1080px">
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
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(expense.expenseDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-steel">{cashExpensePaidThroughLabel(expense)}</td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(expense.total, expense.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3">
                    <LedgerStatusBadge tone={cashExpenseStatusTone(expense.status)}>
                      {cashExpenseStatusLabel(expense.status)}
                    </LedgerStatusBadge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{expense.journalEntry ? `${expense.journalEntry.entryNumber} (${expense.journalEntry.id})` : "-"}</td>
                  <td className="px-4 py-3">
                    <LedgerActionBar className="sm:flex-nowrap">
                      <LedgerButton href={`/purchases/cash-expenses/${expense.id}`} size="sm">
                        View
                      </LedgerButton>
                      {canVoidCashExpense(expense.status) && canVoidExpensePermission ? (
                        <LedgerButton type="button" onClick={() => void voidExpense(expense)} disabled={actionId === expense.id} variant="danger" size="sm">
                          Void
                        </LedgerButton>
                      ) : null}
                    </LedgerActionBar>
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function cashExpenseStatusTone(status: CashExpense["status"]): LedgerStatusTone {
  switch (status) {
    case "POSTED":
      return "success";
    case "VOIDED":
      return "danger";
    case "DRAFT":
      return "draft";
    default:
      return "neutral";
  }
}
