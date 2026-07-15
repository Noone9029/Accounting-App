"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { SourceDocumentGuidance } from "@/components/documents/document-guidance";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerActionDialog } from "@/components/ui-ledger/action-dialog";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppDateTime, formatAppMoney } from "@/lib/app-i18n";
import { documentFxPostingIsReady, documentFxRateEvidence, INCOMPLETE_DOCUMENT_FX_CONTEXT_MESSAGE, isForeignCurrencyDocument, transactionDocumentDisplayTotals, transactionLineDisplayAmounts } from "@/lib/document-fx";
import { partyDetailHref } from "@/lib/parties";
import { downloadPdf, purchaseDebitNotePdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import {
  canReversePurchaseDebitNoteAllocation,
  purchaseDebitNoteActiveAppliedAmount,
  purchaseDebitNoteAllocationStatusBadgeClass,
  purchaseDebitNoteAllocationStatusLabel,
  purchaseDebitNoteAppliedAmount,
  purchaseDebitNoteStatusBadgeClass,
  purchaseDebitNoteStatusLabel,
  validatePurchaseDebitNoteAllocation,
} from "@/lib/purchase-debit-notes";
import type { OpenPurchaseBill, PurchaseDebitNote } from "@/lib/types";

export default function PurchaseDebitNoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [debitNote, setDebitNote] = useState<PurchaseDebitNote | null>(null);
  const [openBills, setOpenBills] = useState<OpenPurchaseBill[]>([]);
  const [selectedBillId, setSelectedBillId] = useState("");
  const [amountApplied, setAmountApplied] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingAction, setPendingAction] = useState<"void" | "delete" | "reverse" | null>(null);
  const [pendingAllocationId, setPendingAllocationId] = useState("");
  const [pendingReason, setPendingReason] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<PurchaseDebitNote>(`/purchase-debit-notes/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setDebitNote(result);
          setAmountApplied("");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load debit note."));
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

  useEffect(() => {
    if (!organizationId || !debitNote || debitNote.status !== "FINALIZED" || Number(debitNote.unappliedAmount) <= 0) {
      setOpenBills([]);
      setSelectedBillId("");
      return;
    }

    let cancelled = false;
    apiRequest<OpenPurchaseBill[]>(`/purchase-bills/open?supplierId=${encodeURIComponent(debitNote.supplierId)}`)
      .then((result) => {
        if (!cancelled) {
          setOpenBills(result);
          setSelectedBillId((current) => (current && result.some((bill) => bill.id === current) ? current : (result[0]?.id ?? "")));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpenBills([]);
          setSelectedBillId("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debitNote, organizationId]);

  async function runAction(action: "finalize" | "void"): Promise<boolean> {
    if (!debitNote) {
      return false;
    }

    if (action === "finalize" && !documentFxPostingIsReady(debitNote)) {
      setError(tc(INCOMPLETE_DOCUMENT_FX_CONTEXT_MESSAGE));
      return false;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PurchaseDebitNote>(`/purchase-debit-notes/${debitNote.id}/${action}`, { method: "POST" });
      setDebitNote(updated);
      setSuccess(action === "finalize" ? tc("Finalized debit note {number}.", { number: updated.debitNoteNumber }) : tc("Voided debit note {number}.", { number: updated.debitNoteNumber }));
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : action === "finalize" ? tc("Unable to finalize debit note.") : tc("Unable to void debit note."));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteDebitNote(): Promise<boolean> {
    if (!debitNote) {
      return false;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ deleted: boolean }>(`/purchase-debit-notes/${debitNote.id}`, { method: "DELETE" });
      router.push("/purchases/debit-notes");
      return true;
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : tc("Unable to delete debit note."));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadDebitNotePdf() {
    if (!debitNote) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadPdf(purchaseDebitNotePdfPath(debitNote.id), `purchase-debit-note-${debitNote.debitNoteNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download debit note PDF."));
    } finally {
      setActionLoading(false);
    }
  }

  async function applyDebitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!debitNote || !selectedBillId) {
      return;
    }

    const selectedBill = openBills.find((bill) => bill.id === selectedBillId);
    const validationError = validatePurchaseDebitNoteAllocation(amountApplied, debitNote.unappliedAmount, selectedBill?.balanceDue ?? "0.0000");
    if (validationError) {
      setError(tc(validationError));
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PurchaseDebitNote>(`/purchase-debit-notes/${debitNote.id}/apply`, {
        method: "POST",
        body: { billId: selectedBillId, amountApplied },
      });
      setDebitNote(updated);
      setAmountApplied("");
      const bills = await apiRequest<OpenPurchaseBill[]>(`/purchase-bills/open?supplierId=${encodeURIComponent(updated.supplierId)}`);
      setOpenBills(bills);
      setSelectedBillId(bills[0]?.id ?? "");
      setSuccess(tc("Applied {amount} from {number}.", { amount: formatAppMoney(amountApplied, updated.currency, locale), number: updated.debitNoteNumber }));
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : tc("Unable to apply debit note."));
    } finally {
      setActionLoading(false);
    }
  }

  async function reverseAllocation(allocationId: string, reason: string): Promise<boolean> {
    if (!debitNote) {
      return false;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PurchaseDebitNote>(`/purchase-debit-notes/${debitNote.id}/allocations/${allocationId}/reverse`, {
        method: "POST",
        body: { reason },
      });
      setDebitNote(updated);
      const bills = await apiRequest<OpenPurchaseBill[]>(`/purchase-bills/open?supplierId=${encodeURIComponent(updated.supplierId)}`);
      setOpenBills(bills);
      setSelectedBillId(bills[0]?.id ?? "");
      setSuccess(tc("Debit note allocation reversed."));
      return true;
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : tc("Unable to reverse debit note allocation."));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  const appliedAmount = debitNote
    ? debitNote.allocations?.length
      ? purchaseDebitNoteActiveAppliedAmount(debitNote.allocations)
      : purchaseDebitNoteAppliedAmount(debitNote.total, debitNote.unappliedAmount)
    : "0.0000";
  const selectedBill = openBills.find((bill) => bill.id === selectedBillId);
  const canCreateDebitNote = can(PERMISSIONS.purchaseDebitNotes.create);
  const canFinalizeDebitNote = can(PERMISSIONS.purchaseDebitNotes.finalize);
  const foreignCurrencyDocument = debitNote ? isForeignCurrencyDocument(debitNote) : false;
  const fxPostingReady = debitNote ? documentFxPostingIsReady(debitNote) : false;
  const fxRateEvidence = debitNote ? documentFxRateEvidence(debitNote) : null;
  const debitDisplayTotals = debitNote ? transactionDocumentDisplayTotals(debitNote) : null;
  const debitDisplayUnapplied = debitNote?.status === "DRAFT" ? (debitDisplayTotals?.total ?? debitNote.total) : (debitNote?.unappliedAmount ?? "0");
  const canVoidDebitNote = can(PERMISSIONS.purchaseDebitNotes.void);
  const canDownloadGeneratedDocuments = can(PERMISSIONS.generatedDocuments.download);
  const canApplyDebitNote = debitNote?.status === "FINALIZED" && Number(debitNote.unappliedAmount) > 0 && canFinalizeDebitNote;

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{debitNote ? <bdi dir="ltr">{debitNote.debitNoteNumber}</bdi> : tc("Debit note")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Debit note detail, AP reversal posting, allocations, and PDF download.")}</p>
          {debitNote ? <p className="mt-1 text-xs text-steel">{tc("Local AP adjustment only. No real ZATCA network, CSID, clearance/reporting, PDF/A-3, or inventory return movement is enabled here.")}</p> : null}
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Link href="/purchases/debit-notes" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
          {debitNote?.status === "DRAFT" ? (
            <Link href={`/purchases/debit-notes/${debitNote.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Edit")}
            </Link>
          ) : null}
          {debitNote?.supplierId ? (
            <Link href={partyDetailHref("supplier", debitNote.supplierId)} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Supplier workspace")}
            </Link>
          ) : null}
          {debitNote?.status === "FINALIZED" && Number(debitNote.unappliedAmount) > 0 ? (
            <Link
              href={`/purchases/supplier-refunds/new?supplierId=${encodeURIComponent(debitNote.supplierId)}&sourceType=PURCHASE_DEBIT_NOTE&sourceDebitNoteId=${encodeURIComponent(debitNote.id)}`}
              className="rounded-md bg-palm px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800"
            >
              {tc("Record supplier refund")}
            </Link>
          ) : null}
          {debitNote && canDownloadGeneratedDocuments ? (
            <button type="button" onClick={() => void downloadDebitNotePdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Download debit note PDF")}
            </button>
          ) : null}
          {debitNote?.status === "DRAFT" && canFinalizeDebitNote ? (
            <button type="button" onClick={() => void runAction("finalize")} disabled={actionLoading || !fxPostingReady} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {tc("Finalize")}
            </button>
          ) : null}
          {debitNote && debitNote.status !== "VOIDED" && canVoidDebitNote ? (
            <button type="button" onClick={() => setPendingAction("void")} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Void")}
            </button>
          ) : null}
          {debitNote?.status === "DRAFT" && canCreateDebitNote ? (
            <button type="button" onClick={() => setPendingAction("delete")} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Delete")}
            </button>
          ) : null}
        </div>
      </div>


      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load debit notes.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading debit note...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {debitNote?.status === "DRAFT" && !fxPostingReady ? <StatusMessage type="info">{tc(INCOMPLETE_DOCUMENT_FX_CONTEXT_MESSAGE)}</StatusMessage> : null}
      </div>

      {debitNote ? (
        <div className="mt-5 space-y-5">
          <PurchaseDebitNoteWorkflowGuidance
            debitNote={debitNote}
            appliedAmount={appliedAmount}
            actionLoading={actionLoading}
            canFinalizeDebitNote={canFinalizeDebitNote}
            canApplyDebitNote={canApplyDebitNote}
            canDownloadGeneratedDocuments={canDownloadGeneratedDocuments}
            onFinalize={() => void runAction("finalize")}
            onDownloadPdf={() => void downloadDebitNotePdf()}
          />

          <AttachmentPanel linkedEntityType="PURCHASE_DEBIT_NOTE" linkedEntityId={debitNote.id} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label={tc("Supplier")} value={debitNote.supplier?.displayName ?? debitNote.supplier?.name ?? "-"} />
              <Summary label={tc("Status")} value={tc(purchaseDebitNoteStatusLabel(debitNote.status))} />
              <Summary label={tc("Issue date")} value={formatAppDate(debitNote.issueDate, locale, "-")} />
              <Summary label={tc("Currency")} value={<bdi dir="ltr">{debitNote.currency}</bdi>} />
              <Summary label={tc("Original bill")} value={debitNote.originalBill ? <bdi dir="ltr">{debitNote.originalBill.billNumber}</bdi> : "-"} />
              <Summary label={tc("Branch")} value={debitNote.branch?.displayName ?? debitNote.branch?.name ?? "-"} />
              <Summary label={tc("Total debit")} value={formatAppMoney(debitDisplayTotals?.total ?? debitNote.total, debitNote.currency, locale)} />
              <Summary label={tc("Applied amount")} value={formatAppMoney(appliedAmount, debitNote.currency, locale)} />
              <Summary label={tc("Unapplied amount")} value={formatAppMoney(debitDisplayUnapplied, debitNote.currency, locale)} />
              {foreignCurrencyDocument ? <Summary label={tc("Base equivalent")} value={formatAppMoney(debitNote.total, debitNote.baseCurrency ?? debitNote.currency, locale)} /> : null}
              {foreignCurrencyDocument ? <Summary label={tc("Captured FX rate")} value={fxRateEvidence ?? tc("Incomplete FX context")} /> : null}
              {foreignCurrencyDocument ? <Summary label={tc("FX rate status")} value={debitNote.status === "DRAFT" ? tc("Freezes on finalization") : tc("Frozen; reverse to correct")} /> : null}
              <Summary label={tc("Journal entry")} value={debitNote.journalEntry ? <bdi dir="ltr">{`${debitNote.journalEntry.entryNumber} (${debitNote.journalEntry.id})`}</bdi> : "-"} />
              <Summary label={tc("Reversal journal")} value={debitNote.reversalJournalEntry ? <bdi dir="ltr">{`${debitNote.reversalJournalEntry.entryNumber} (${debitNote.reversalJournalEntry.id})`}</bdi> : "-"} />
              <Summary label={tc("Finalized")} value={formatAppDateTime(debitNote.finalizedAt, locale, "-")} />
              <Summary label={tc("Reason")} value={debitNote.reason ?? "-"} />
              <Summary label={tc("Notes")} value={debitNote.notes ?? "-"} />
            </div>
            <div className="mt-4">
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${purchaseDebitNoteStatusBadgeClass(debitNote.status)}`}>{tc(purchaseDebitNoteStatusLabel(debitNote.status))}</span>
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
                {debitNote.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? <bdi dir="ltr">{`${line.account.code} ${line.account.name}`}</bdi> : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{line.quantity}</bdi></td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.unitPrice, debitNote.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).lineGrossAmount, debitNote.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).discountAmount, debitNote.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).taxableAmount, debitNote.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).taxAmount, debitNote.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).lineTotal, debitNote.currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ms-auto grid max-w-sm grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm shadow-panel">
            <span className="text-steel">{tc("Subtotal")}</span>
            <span className="text-end font-mono">{formatAppMoney(debitDisplayTotals?.subtotal ?? debitNote.subtotal, debitNote.currency, locale)}</span>
            <span className="text-steel">{tc("Discount")}</span>
            <span className="text-end font-mono">{formatAppMoney(debitDisplayTotals?.discountTotal ?? debitNote.discountTotal, debitNote.currency, locale)}</span>
            <span className="text-steel">{tc("Taxable")}</span>
            <span className="text-end font-mono">{formatAppMoney(debitDisplayTotals?.taxableTotal ?? debitNote.taxableTotal, debitNote.currency, locale)}</span>
            <span className="text-steel">{tc("VAT")}</span>
            <span className="text-end font-mono">{formatAppMoney(debitDisplayTotals?.taxTotal ?? debitNote.taxTotal, debitNote.currency, locale)}</span>
            <span className="font-semibold text-ink">{tc("Total debit")}</span>
            <span className="text-end font-mono font-semibold text-ink">{formatAppMoney(debitDisplayTotals?.total ?? debitNote.total, debitNote.currency, locale)}</span>
            <span className="font-semibold text-ink">{tc("Applied amount")}</span>
            <span className="text-end font-mono font-semibold text-ink">{formatAppMoney(appliedAmount, debitNote.currency, locale)}</span>
            <span className="font-semibold text-ink">{tc("Unapplied amount")}</span>
            <span className="text-end font-mono font-semibold text-ink">{formatAppMoney(debitDisplayUnapplied, debitNote.currency, locale)}</span>
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-ink">{tc("Debit allocations")}</h2>
              <p className="mt-1 text-sm text-steel">{tc("Applying a debit note only matches the existing AP reduction to bill balances. No new journal entry is created.")}</p>
            </div>
            {debitNote.allocations && debitNote.allocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-start text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">{tc("Bill")}</th>
                      <th className="px-4 py-3">{tc("Bill date")}</th>
                      <th className="px-4 py-3">{tc("Bill total")}</th>
                      <th className="px-4 py-3">{tc("Amount applied")}</th>
                      <th className="px-4 py-3">{tc("Bill balance due")}</th>
                      <th className="px-4 py-3">{tc("Status")}</th>
                      <th className="px-4 py-3">{tc("Reversed")}</th>
                      <th className="px-4 py-3">{tc("Reason")}</th>
                      <th className="px-4 py-3">{tc("Action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {debitNote.allocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{allocation.bill?.billNumber ?? allocation.billId}</bdi></td>
                        <td className="px-4 py-3 text-steel">{formatAppDate(allocation.bill?.billDate, locale, "-")}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.bill ? formatAppMoney(allocation.bill.total, debitNote.currency, locale) : "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(allocation.amountApplied, debitNote.currency, locale)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.bill ? formatAppMoney(allocation.bill.balanceDue, debitNote.currency, locale) : "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${purchaseDebitNoteAllocationStatusBadgeClass(allocation)}`}>{tc(purchaseDebitNoteAllocationStatusLabel(allocation))}</span>
                        </td>
                        <td className="px-4 py-3 text-steel">{formatAppDateTime(allocation.reversedAt, locale, "-")}</td>
                        <td className="px-4 py-3 text-steel">{allocation.reversalReason ?? "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/purchases/bills/${allocation.billId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              {tc("View bill")}
                            </Link>
                            {canReversePurchaseDebitNoteAllocation(allocation) && canVoidDebitNote ? (
                              <button type="button" onClick={() => { setPendingAction("reverse"); setPendingAllocationId(allocation.id); setPendingReason(""); }} disabled={actionLoading} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
                                {tc("Reverse")}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-4">
                <StatusMessage type="empty">{tc("No debit has been applied to bills yet.")}</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">{tc("Apply debit")}</h2>
                <p className="mt-1 text-sm text-steel">{tc("Use unapplied supplier debit against finalized open bills for the same supplier.")}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{tc("No accounting journal")}</span>
            </div>
            {canApplyDebitNote ? (
              openBills.length > 0 ? (
                <form onSubmit={applyDebitNote} className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-[1.4fr_0.7fr_auto]">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Open bill")}</span>
                    <select value={selectedBillId} onChange={(event) => setSelectedBillId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                      {openBills.map((bill) => (
                        <option key={bill.id} value={bill.id}>
                          {tc("{number} - balance {amount}", { number: bill.billNumber, amount: formatAppMoney(bill.balanceDue, bill.currency, locale) })}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Amount to apply")}</span>
                    <input value={amountApplied} onChange={(event) => setAmountApplied(event.target.value)} placeholder="0.0000" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <button type="submit" disabled={actionLoading || !selectedBillId} className="self-end rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                    {tc("Apply")}
                  </button>
                  <div className="text-xs text-steel md:col-span-3">
                    {tc("Selected bill balance: {amount}.", { amount: selectedBill ? formatAppMoney(selectedBill.balanceDue, selectedBill.currency, locale) : "-" })}{" "}
                    {tc("Debit available: {amount}.", { amount: formatAppMoney(debitNote.unappliedAmount, debitNote.currency, locale) })}
                  </div>
                </form>
              ) : (
                <div className="mt-4">
                  <StatusMessage type="empty">{tc("No finalized open bills are available for this supplier.")}</StatusMessage>
                </div>
              )
            ) : (
              <div className="mt-4">
                <StatusMessage type="info">{tc("Debit notes can be applied only after finalization while unapplied amount remains.")}</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {tc("Purchase returns, inventory stock movements, bank reconciliation, and ZATCA debit note submission are intentionally not implemented in this MVP.")}
          </div>
        </div>
      ) : null}
      <LedgerActionDialog
        open={Boolean(pendingAction && debitNote)}
        onOpenChange={(open) => {
          if (!open && !actionLoading) {
            setPendingAction(null);
            setPendingAllocationId("");
            setPendingReason("");
          }
        }}
        tone="danger"
        title={pendingAction === "delete" ? tc("Delete draft debit note") : pendingAction === "reverse" ? tc("Reverse debit allocation") : tc("Void debit note")}
        description={debitNote ? pendingAction === "delete" ? tc("Delete draft debit note {number}?", { number: debitNote.debitNoteNumber }) : pendingAction === "reverse" ? tc("Reverse this debit note allocation?") : tc("Void debit note {number}?", { number: debitNote.debitNoteNumber }) : ""}
        confirmLabel={pendingAction === "delete" ? tc("Delete") : pendingAction === "reverse" ? tc("Reverse") : tc("Void")}
        busy={actionLoading}
        reason={pendingAction === "reverse" ? {
          id: "debit-note-reversal-reason",
          label: tc("Reversal reason (optional)"),
          value: pendingReason,
          onChange: setPendingReason,
          placeholder: tc("Add context for the reversal"),
        } : undefined}
        onConfirm={async () => {
          const succeeded = pendingAction === "delete" ? await deleteDebitNote() : pendingAction === "reverse" ? await reverseAllocation(pendingAllocationId, pendingReason) : await runAction("void");
          if (succeeded) {
            setPendingAction(null);
            setPendingAllocationId("");
            setPendingReason("");
          }
        }}
      />
    </section>
  );
}

export function PurchaseDebitNoteWorkflowGuidance({
  debitNote,
  appliedAmount,
  actionLoading,
  canFinalizeDebitNote,
  canApplyDebitNote,
  canDownloadGeneratedDocuments,
  onFinalize,
  onDownloadPdf,
}: {
  debitNote: PurchaseDebitNote;
  appliedAmount: string;
  actionLoading: boolean;
  canFinalizeDebitNote: boolean;
  canApplyDebitNote: boolean;
  canDownloadGeneratedDocuments: boolean;
  onFinalize: () => void;
  onDownloadPdf: () => void;
}) {
  const hasUnapplied = Number(debitNote.unappliedAmount) > 0;
  const { locale, tc } = useAppLocale();
  const displayTotals = transactionDocumentDisplayTotals(debitNote);
  const displayUnapplied = debitNote.status === "DRAFT" ? displayTotals.total : debitNote.unappliedAmount;
  const fxPostingReady = documentFxPostingIsReady(debitNote);
  const fxRateEvidence = documentFxRateEvidence(debitNote);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">{tc("What happened?")}</h2>
            <p className="mt-1 text-sm leading-6 text-steel">{tc(purchaseDebitNoteOutcomeDescription(debitNote, hasUnapplied))}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${purchaseDebitNoteStatusBadgeClass(debitNote.status)}`}>
              {tc(purchaseDebitNoteStatusLabel(debitNote.status))}
            </span>
            {debitNote.status === "FINALIZED" && hasUnapplied ? (
              <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">{tc("Unapplied debit")}</span>
            ) : null}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <Summary label={tc("Total debit")} value={formatAppMoney(displayTotals.total, debitNote.currency, locale)} />
          <Summary label={tc("Applied to bills")} value={formatAppMoney(appliedAmount, debitNote.currency, locale)} />
          <Summary label={tc("Unapplied")} value={formatAppMoney(displayUnapplied, debitNote.currency, locale)} />
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">{tc("Next actions")}</h2>
        <p className="mt-1 text-sm leading-6 text-steel">{tc(purchaseDebitNoteNextActionDescription(debitNote, hasUnapplied))}</p>
        <div className="mt-4 flex flex-col gap-2">
          {debitNote.status === "DRAFT" && canFinalizeDebitNote ? (
            <button
              type="button"
              onClick={onFinalize}
              disabled={actionLoading || !fxPostingReady}
              className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {tc("Finalize debit note")}
            </button>
          ) : null}
          {debitNote.status === "DRAFT" && !fxPostingReady ? (
            <p className="text-xs leading-5 text-amber-700">{tc(INCOMPLETE_DOCUMENT_FX_CONTEXT_MESSAGE)}</p>
          ) : null}
          {fxRateEvidence ? <p className="text-xs leading-5 text-steel"><bdi dir="ltr">{fxRateEvidence}</bdi> · {tc(debitNote.status === "DRAFT" ? "Freezes on finalization" : "Frozen; reverse to correct")}</p> : null}
          {debitNote.originalBillId ? (
            <Link href={`/purchases/bills/${debitNote.originalBillId}`} className="rounded-md bg-palm px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800">
              {tc("View original bill")}
            </Link>
          ) : null}
          {canDownloadGeneratedDocuments ? (
            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={actionLoading}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {tc("Download debit note PDF")}
            </button>
          ) : null}
          <Link href={partyDetailHref("supplier", debitNote.supplierId)} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Open supplier workspace")}
          </Link>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href="/reports/aged-payables" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("AP report")}
            </Link>
            <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Dashboard")}
            </Link>
          </div>
        </div>
        {debitNote.status === "DRAFT" && !canFinalizeDebitNote ? (
          <p className="mt-3 text-xs leading-5 text-steel">{tc("You need debit note finalization permission before this AP reduction can post.")}</p>
        ) : null}
        {debitNote.status === "FINALIZED" && hasUnapplied && !canApplyDebitNote ? (
          <p className="mt-3 text-xs leading-5 text-steel">{tc("This debit note still has unapplied amount, but your role cannot apply it to supplier bills.")}</p>
        ) : null}
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-900">
          {tc("ZATCA handling here is local/readiness only. Real network submission, CSID execution, clearance/reporting, PDF/A-3 generation, and production compliance are not enabled.")}
        </div>
        <SourceDocumentGuidance className="mt-4" />
      </div>
    </div>
  );
}

function purchaseDebitNoteOutcomeDescription(debitNote: PurchaseDebitNote, hasUnapplied: boolean): string {
  if (debitNote.status === "DRAFT") {
    return "This draft debit note is saved and editable. It has not posted the AP reduction yet, so finalize it only after supplier, bill, tax, and totals are ready.";
  }

  if (debitNote.status === "VOIDED") {
    return "This debit note is voided. It is closed for new allocations, and reversal journal details remain visible for review.";
  }

  if (hasUnapplied) {
    return "This debit note is finalized and posted. It reduced the supplier payable, and the remaining unapplied amount can be applied to open bills or refunded.";
  }

  return "This debit note is finalized and fully applied. Related bill balances and the supplier ledger show the AP reduction trail.";
}

function purchaseDebitNoteNextActionDescription(debitNote: PurchaseDebitNote, hasUnapplied: boolean): string {
  if (debitNote.status === "DRAFT") {
    return "Finalize the debit note to post the supplier balance reduction, then apply it to open bills from the allocation panel below.";
  }

  if (debitNote.status === "VOIDED") {
    return "Use the links below for review and reporting. Create a replacement debit note if the supplier adjustment still applies.";
  }

  if (hasUnapplied) {
    return "Apply the remaining debit to an open bill below, record a supplier refund if appropriate, then review AP reports.";
  }

  return "Review the original bill, supplier ledger, and AP report to confirm the adjustment is reflected.";
}

function Summary({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}
