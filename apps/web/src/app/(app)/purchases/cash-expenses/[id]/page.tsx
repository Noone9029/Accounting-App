"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppDateTime, formatAppMoney } from "@/lib/app-i18n";
import { canVoidCashExpense, cashExpensePaidThroughLabel, cashExpenseStatusBadgeClass, cashExpenseStatusLabel } from "@/lib/cash-expenses";
import { cashExpensePdfPath, downloadPdf } from "@/lib/pdf-download";
import { safeReturnToFromSearch } from "@/lib/parties";
import { PERMISSIONS } from "@/lib/permissions";
import type { CashExpense, CashExpensePdfData } from "@/lib/types";

export default function CashExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [expense, setExpense] = useState<CashExpense | null>(null);
  const [pdfData, setPdfData] = useState<CashExpensePdfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canVoidExpense = can(PERMISSIONS.cashExpenses.void);
  const canDownloadGeneratedDocuments = can(PERMISSIONS.generatedDocuments.download);
  const returnTo = safeReturnToFromSearch(searchParams.toString() ? `?${searchParams.toString()}` : "");
  const detailHref = expense ? `/purchases/cash-expenses/${expense.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}` : "";

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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load cash expense."));
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
  }, [organizationId, params.id, tc]);

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
    if (!expense || !window.confirm(tc("Void cash expense {number}?", { number: expense.expenseNumber }))) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<CashExpense>(`/cash-expenses/${expense.id}/void`, { method: "POST" });
      setExpense(voided);
      await refresh();
      setSuccess(tc("Voided cash expense {number}.", { number: voided.expenseNumber }));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to void cash expense."));
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
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download cash expense PDF."));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{expense ? <bdi dir="ltr">{expense.expenseNumber}</bdi> : tc("Cash expense")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Immediate expense posting, journal audit, and receipt PDF.")}</p>
          <p className="mt-1 text-sm text-steel">{tc("Cash expense detail does not send supplier payments or bank transfers.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={returnTo || "/purchases/cash-expenses"} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
          {expense?.contactId ? (
            <Link href={`/contacts/${expense.contactId}${detailHref ? `?returnTo=${encodeURIComponent(detailHref)}` : ""}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Supplier ledger")}
            </Link>
          ) : null}
          {expense && canDownloadGeneratedDocuments ? (
            <button type="button" onClick={() => void downloadCashExpensePdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Download PDF")}
            </button>
          ) : null}
          {canVoidCashExpense(expense?.status) && canVoidExpense ? (
            <button type="button" onClick={() => void voidExpense()} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Void")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load cash expenses.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading cash expense...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {expense ? (
        <div className="mt-5 space-y-5">
          <AttachmentPanel linkedEntityType="CASH_EXPENSE" linkedEntityId={expense.id} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Contact" value={expense.contact?.displayName ?? expense.contact?.name ?? "-"} />
              <Summary label="Status" value={tc(cashExpenseStatusLabel(expense.status))} />
              <Summary label="Expense date" value={formatAppDate(expense.expenseDate, locale, "-")} />
              <Summary label="Currency" value={<bdi dir="ltr">{expense.currency}</bdi>} />
              <Summary label="Paid through" value={tc(cashExpensePaidThroughLabel(expense))} />
              <Summary label="Branch" value={expense.branch?.displayName ?? expense.branch?.name ?? "-"} />
              <Summary label="Total" value={formatAppMoney(expense.total, expense.currency, locale)} />
              <Summary label="VAT / Tax" value={formatAppMoney(expense.taxTotal, expense.currency, locale)} />
              <Summary label="Journal entry" value={expense.journalEntry ? <bdi dir="ltr">{expense.journalEntry.entryNumber} ({expense.journalEntry.id})</bdi> : "-"} />
              <Summary label="Void reversal" value={expense.voidReversalJournalEntry ? <bdi dir="ltr">{expense.voidReversalJournalEntry.entryNumber} ({expense.voidReversalJournalEntry.id})</bdi> : "-"} />
              <Summary label="Posted" value={formatAppDateTime(expense.postedAt, locale, "-")} />
              <Summary label="Voided" value={formatAppDateTime(expense.voidedAt, locale, "-")} />
              <Summary label="Description" value={expense.description ?? "-"} />
              <Summary label="Notes" value={expense.notes ?? "-"} />
            </div>
            <div className="mt-4">
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${cashExpenseStatusBadgeClass(expense.status)}`}>{tc(cashExpenseStatusLabel(expense.status))}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[980px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Description")}</th>
                  <th className="px-4 py-3">{tc("Account")}</th>
                  <th className="px-4 py-3">{tc("Qty")}</th>
                  <th className="px-4 py-3">{tc("Unit price")}</th>
                  <th className="px-4 py-3">{tc("Gross")}</th>
                  <th className="px-4 py-3">{tc("Discount")}</th>
                  <th className="px-4 py-3">{tc("Taxable")}</th>
                  <th className="px-4 py-3">{tc("Tax")}</th>
                  <th className="px-4 py-3">{tc("Line total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expense.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? <><bdi dir="ltr">{line.account.code}</bdi> {line.account.name}</> : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.unitPrice, expense.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.lineGrossAmount, expense.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.discountAmount, expense.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.taxableAmount, expense.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.taxAmount, expense.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.lineTotal, expense.currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex justify-end">
              <div className="min-w-[280px] space-y-2 text-sm">
                <TotalRow label="Subtotal" value={formatAppMoney(expense.subtotal, expense.currency, locale)} />
                <TotalRow label="Discount" value={formatAppMoney(expense.discountTotal, expense.currency, locale)} />
                <TotalRow label="Taxable" value={formatAppMoney(expense.taxableTotal, expense.currency, locale)} />
                <TotalRow label="VAT / Tax" value={formatAppMoney(expense.taxTotal, expense.currency, locale)} />
                <TotalRow label="Total" value={formatAppMoney(expense.total, expense.currency, locale)} strong />
              </div>
            </div>
          </div>

          {pdfData ? (
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">{tc("PDF data preview")}</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                <Summary label="Document" value={<bdi dir="ltr">{pdfData.expense.expenseNumber}</bdi>} />
                <Summary label="Generated" value={formatAppDateTime(pdfData.generatedAt, locale, "-")} />
                <Summary label="Lines" value={String(pdfData.lines.length)} />
                <Summary label="Total" value={formatAppMoney(pdfData.expense.total, pdfData.expense.currency, locale)} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: ReactNode }) {
  const { tc } = useAppLocale();
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{tc(label)}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const { tc } = useAppLocale();
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold text-ink" : "text-steel"}`}>
      <span>{tc(label)}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}
