"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerLoadingState,
  LedgerMetadataRow,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { canVoidCashExpense, cashExpensePaidThroughLabel, cashExpenseStatusLabel } from "@/lib/cash-expenses";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { safeReturnToFromSearch } from "@/lib/parties";
import { cashExpensePdfPath, downloadPdf } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { CashExpense, CashExpensePdfData } from "@/lib/types";

export default function CashExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [expense, setExpense] = useState<CashExpense | null>(null);
  const [pdfData, setPdfData] = useState<CashExpensePdfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canVoidExpense = can(PERMISSIONS.cashExpenses.void);
  const canDownloadGeneratedDocuments = can(PERMISSIONS.generatedDocuments.download);
  const returnTo = safeReturnToFromSearch(searchParams.toString());
  const expenseDetailHref = `/purchases/cash-expenses/${params.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;

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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title={expense ? expense.expenseNumber : "Cash expense"}
        description="Immediate expense posting, journal audit, and receipt PDF."
        badge={expense ? <LedgerStatusBadge tone={cashExpenseStatusTone(expense.status)}>{cashExpenseStatusLabel(expense.status)}</LedgerStatusBadge> : undefined}
        actions={
          <LedgerActionBar className="items-start sm:items-center">
            <LedgerButton href={returnTo || "/purchases/cash-expenses"}>
              Back
            </LedgerButton>
            {expense?.contactId ? (
              <LedgerButton href={`/contacts/${expense.contactId}?returnTo=${encodeURIComponent(expenseDetailHref)}`}>
                Supplier ledger
              </LedgerButton>
            ) : null}
            {expense && canDownloadGeneratedDocuments ? (
              <LedgerButton type="button" onClick={() => void downloadCashExpensePdf()} disabled={actionLoading}>
                Download PDF
              </LedgerButton>
            ) : null}
            {canVoidCashExpense(expense?.status) && canVoidExpense ? (
              <LedgerButton type="button" onClick={() => void voidExpense()} disabled={actionLoading} variant="danger">
                Void
              </LedgerButton>
            ) : null}
          </LedgerActionBar>
        }
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          Cash expenses are already posted direct-spend entries. Voiding uses the existing reversal flow; this page does not send supplier payments or bank transfers.
        </LedgerSummaryBand>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load cash expenses.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading cash expense" description="Fetching expense, journal, and PDF preview data." /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {expense ? (
          <>
            <AttachmentPanel linkedEntityType="CASH_EXPENSE" linkedEntityId={expense.id} />

            <LedgerSection title="Expense details" description="Posted cash expense context, account, journal, and reversal state.">
              <LedgerMetadataRow
                items={[
                  { label: "Contact", value: expense.contact?.displayName ?? expense.contact?.name ?? "-" },
                  { label: "Status", value: cashExpenseStatusLabel(expense.status) },
                  { label: "Expense date", value: <LedgerDate>{formatOptionalDate(expense.expenseDate, "-")}</LedgerDate> },
                  { label: "Currency", value: expense.currency },
                  { label: "Paid through", value: cashExpensePaidThroughLabel(expense) },
                  { label: "Branch", value: expense.branch?.displayName ?? expense.branch?.name ?? "-" },
                  { label: "Total", value: <LedgerMoney>{formatMoneyAmount(expense.total, expense.currency)}</LedgerMoney> },
                  { label: "VAT / Tax", value: <LedgerMoney>{formatMoneyAmount(expense.taxTotal, expense.currency)}</LedgerMoney> },
                  { label: "Journal entry", value: expense.journalEntry ? `${expense.journalEntry.entryNumber} (${expense.journalEntry.id})` : "-" },
                  { label: "Void reversal", value: expense.voidReversalJournalEntry ? `${expense.voidReversalJournalEntry.entryNumber} (${expense.voidReversalJournalEntry.id})` : "-" },
                  { label: "Posted", value: expense.postedAt ? new Date(expense.postedAt).toLocaleString() : "-" },
                  { label: "Voided", value: expense.voidedAt ? new Date(expense.voidedAt).toLocaleString() : "-" },
                  { label: "Description", value: expense.description ?? "-" },
                  { label: "Notes", value: expense.notes ?? "-" },
                ]}
              />
            </LedgerSection>

            <LedgerSection title="Expense line items" description="Line details used for the existing direct spend posting." className="p-0">
              <LedgerDataTable minWidth="980px" className="rounded-t-none border-0 shadow-none">
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
                      <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.unitPrice, expense.currency)}</LedgerMoney></td>
                      <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.lineGrossAmount, expense.currency)}</LedgerMoney></td>
                      <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.discountAmount, expense.currency)}</LedgerMoney></td>
                      <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.taxableAmount, expense.currency)}</LedgerMoney></td>
                      <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.taxAmount, expense.currency)}</LedgerMoney></td>
                      <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.lineTotal, expense.currency)}</LedgerMoney></td>
                    </tr>
                  ))}
                </tbody>
              </LedgerDataTable>
            </LedgerSection>

            <LedgerPanel>
              <div className="flex justify-end">
                <div className="min-w-[280px] space-y-2 text-sm">
                  <TotalRow label="Subtotal" value={formatMoneyAmount(expense.subtotal, expense.currency)} />
                  <TotalRow label="Discount" value={formatMoneyAmount(expense.discountTotal, expense.currency)} />
                  <TotalRow label="Taxable" value={formatMoneyAmount(expense.taxableTotal, expense.currency)} />
                  <TotalRow label="VAT / Tax" value={formatMoneyAmount(expense.taxTotal, expense.currency)} />
                  <TotalRow label="Total" value={formatMoneyAmount(expense.total, expense.currency)} strong />
                </div>
              </div>
            </LedgerPanel>

            {pdfData ? (
              <LedgerSection title="PDF data preview" description="Source data used by the existing explicit cash expense PDF download.">
                <LedgerMetadataRow
                  items={[
                    { label: "Document", value: pdfData.expense.expenseNumber },
                    { label: "Generated", value: new Date(pdfData.generatedAt).toLocaleString() },
                    { label: "Lines", value: String(pdfData.lines.length) },
                    { label: "Total", value: <LedgerMoney>{formatMoneyAmount(pdfData.expense.total, pdfData.expense.currency)}</LedgerMoney> },
                  ]}
                />
              </LedgerSection>
            ) : null}
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold text-ink" : "text-steel"}`}>
      <span>{label}</span>
      <LedgerMoney>{value}</LedgerMoney>
    </div>
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
