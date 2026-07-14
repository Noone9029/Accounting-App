"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { UaeEinvoiceReadinessPanel } from "@/components/compliance/uae-einvoice-readiness-panel";
import { SourceDocumentGuidance } from "@/components/documents/document-guidance";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { getCreditNoteComplianceReadiness, prepareCreditNoteCompliance, validateComplianceDocument } from "@/lib/compliance";
import {
  canReverseCreditNoteAllocation,
  creditNoteActiveAppliedAmount,
  creditNoteAllocationStatusBadgeClass,
  creditNoteAllocationStatusLabel,
  creditNoteAppliedAmount,
  creditNoteStatusBadgeClass,
  creditNoteStatusLabel,
  validateCreditNoteAllocation,
} from "@/lib/credit-notes";
import { formatAppDate, formatAppDateTime, formatAppMoney } from "@/lib/app-i18n";
import { documentFxPostingIsReady, documentFxRateEvidence, INCOMPLETE_DOCUMENT_FX_CONTEXT_MESSAGE, isForeignCurrencyDocument, transactionDocumentDisplayTotals, transactionLineDisplayAmounts } from "@/lib/document-fx";
import { partyDetailHref } from "@/lib/parties";
import { creditNotePdfPath, downloadPdf } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { ComplianceSourceReadinessResponse, CreditNote, OpenSalesInvoice } from "@/lib/types";

export default function CreditNoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
  const [uaeReadiness, setUaeReadiness] = useState<ComplianceSourceReadinessResponse | null>(null);
  const [openInvoices, setOpenInvoices] = useState<OpenSalesInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amountApplied, setAmountApplied] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<CreditNote>(`/credit-notes/${params.id}`),
      getCreditNoteComplianceReadiness(params.id).catch(() => null),
    ])
      .then(([result, readinessResult]) => {
        if (!cancelled) {
          setCreditNote(result);
          setUaeReadiness(readinessResult);
          setAmountApplied("");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load credit note."));
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
    if (!organizationId || !creditNote || creditNote.status !== "FINALIZED" || Number(creditNote.unappliedAmount) <= 0) {
      setOpenInvoices([]);
      setSelectedInvoiceId("");
      return;
    }

    let cancelled = false;
    apiRequest<OpenSalesInvoice[]>(`/sales-invoices/open?customerId=${encodeURIComponent(creditNote.customerId)}`)
      .then((result) => {
        if (!cancelled) {
          setOpenInvoices(result);
          setSelectedInvoiceId((current) => (current && result.some((invoice) => invoice.id === current) ? current : (result[0]?.id ?? "")));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpenInvoices([]);
          setSelectedInvoiceId("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, creditNote]);

  async function runAction(action: "finalize" | "void") {
    if (!creditNote) {
      return;
    }

    if (action === "finalize" && !documentFxPostingIsReady(creditNote)) {
      setError(tc(INCOMPLETE_DOCUMENT_FX_CONTEXT_MESSAGE));
      return;
    }

    if (action === "void" && !window.confirm(tc("Void credit note {number}?", { number: creditNote.creditNoteNumber }))) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<CreditNote>(`/credit-notes/${creditNote.id}/${action}`, { method: "POST" });
      setCreditNote(updated);
      if (action === "finalize") {
        await fetchUaeReadiness(updated.id).catch(() => undefined);
      }
      setSuccess(action === "finalize" ? tc("Finalized credit note {number}.", { number: updated.creditNoteNumber }) : tc("Voided credit note {number}.", { number: updated.creditNoteNumber }));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : action === "finalize" ? tc("Unable to finalize credit note.") : tc("Unable to void credit note."));
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteCreditNote() {
    if (!creditNote || !window.confirm(tc("Delete draft credit note {number}?", { number: creditNote.creditNoteNumber }))) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ deleted: boolean }>(`/credit-notes/${creditNote.id}`, { method: "DELETE" });
      router.push("/sales/credit-notes");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : tc("Unable to delete credit note."));
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadCreditNotePdf() {
    if (!creditNote) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadPdf(creditNotePdfPath(creditNote.id), `credit-note-${creditNote.creditNoteNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download credit note PDF."));
    } finally {
      setActionLoading(false);
    }
  }

  async function fetchUaeReadiness(creditNoteId: string) {
    const result = await getCreditNoteComplianceReadiness(creditNoteId);
    setUaeReadiness(result);
    return result;
  }

  async function validateUaeReadiness() {
    if (!creditNote) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const prepared = await prepareCreditNoteCompliance(creditNote.id);
      await validateComplianceDocument(prepared.id);
      await fetchUaeReadiness(creditNote.id);
      setSuccess(tc("Local UAE credit-note readiness validation completed. No ASP submission, FTA reporting, or network call was performed."));
    } catch (validationError) {
      await fetchUaeReadiness(creditNote.id).catch(() => undefined);
      setError(validationError instanceof Error ? validationError.message : tc("Unable to validate UAE credit-note readiness."));
    } finally {
      setActionLoading(false);
    }
  }

  async function applyCreditNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!creditNote || !selectedInvoiceId) {
      return;
    }

    const selectedInvoice = openInvoices.find((invoice) => invoice.id === selectedInvoiceId);
    const validationError = validateCreditNoteAllocation(amountApplied, creditNote.unappliedAmount, selectedInvoice?.balanceDue ?? "0.0000");
    if (validationError) {
      setError(tc(validationError));
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<CreditNote>(`/credit-notes/${creditNote.id}/apply`, {
        method: "POST",
        body: { invoiceId: selectedInvoiceId, amountApplied },
      });
      setCreditNote(updated);
      setAmountApplied("");
      const invoices = await apiRequest<OpenSalesInvoice[]>(`/sales-invoices/open?customerId=${encodeURIComponent(updated.customerId)}`);
      setOpenInvoices(invoices);
      setSelectedInvoiceId(invoices[0]?.id ?? "");
      setSuccess(tc("Applied {amount} from {number}.", { amount: formatAppMoney(amountApplied, updated.currency, locale), number: updated.creditNoteNumber }));
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : tc("Unable to apply credit note."));
    } finally {
      setActionLoading(false);
    }
  }

  async function reverseAllocation(allocationId: string) {
    if (!creditNote || !window.confirm(tc("Reverse this credit note allocation?"))) {
      return;
    }

    const reason = window.prompt(tc("Reversal reason (optional)"), "") ?? "";
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<CreditNote>(`/credit-notes/${creditNote.id}/allocations/${allocationId}/reverse`, {
        method: "POST",
        body: { reason },
      });
      setCreditNote(updated);
      const invoices = await apiRequest<OpenSalesInvoice[]>(`/sales-invoices/open?customerId=${encodeURIComponent(updated.customerId)}`);
      setOpenInvoices(invoices);
      setSelectedInvoiceId(invoices[0]?.id ?? "");
      setSuccess(tc("Credit allocation reversed."));
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : tc("Unable to reverse credit allocation."));
    } finally {
      setActionLoading(false);
    }
  }

  const appliedAmount = creditNote
    ? creditNote.allocations?.length
      ? creditNoteActiveAppliedAmount(creditNote.allocations)
      : creditNoteAppliedAmount(creditNote.total, creditNote.unappliedAmount)
    : "0.0000";
  const selectedInvoice = openInvoices.find((invoice) => invoice.id === selectedInvoiceId);
  const canCreateCreditNote = can(PERMISSIONS.creditNotes.create);
  const canFinalizeCreditNote = can(PERMISSIONS.creditNotes.finalize);
  const foreignCurrencyDocument = creditNote ? isForeignCurrencyDocument(creditNote) : false;
  const fxPostingReady = creditNote ? documentFxPostingIsReady(creditNote) : false;
  const fxRateEvidence = creditNote ? documentFxRateEvidence(creditNote) : null;
  const creditDisplayTotals = creditNote ? transactionDocumentDisplayTotals(creditNote) : null;
  const creditDisplayUnapplied = creditNote?.status === "DRAFT" ? (creditDisplayTotals?.total ?? creditNote.total) : (creditNote?.unappliedAmount ?? "0");
  const canVoidCreditNote = can(PERMISSIONS.creditNotes.void);
  const canApplyCredit = creditNote?.status === "FINALIZED" && Number(creditNote.unappliedAmount) > 0 && canFinalizeCreditNote;
  const canViewCompliance = can(PERMISSIONS.compliance.view);
  const canValidateCompliance = can(PERMISSIONS.compliance.manage) && can(PERMISSIONS.compliance.validate);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{creditNote ? <bdi dir="ltr">{creditNote.creditNoteNumber}</bdi> : tc("Credit note")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Credit note detail, reversal posting, and PDF download.")}</p>
          {creditNote ? <p className="mt-1 text-xs text-steel">{tc("Credit note PDF downloads create an archive record. ZATCA credit note XML is not implemented yet.")}</p> : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/sales/credit-notes" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
          {creditNote?.status === "DRAFT" ? (
            <Link href={`/sales/credit-notes/${creditNote.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Edit")}
            </Link>
          ) : null}
          {creditNote?.customerId ? (
            <Link href={partyDetailHref("customer", creditNote.customerId)} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Customer workspace")}
            </Link>
          ) : null}
          {creditNote?.status === "FINALIZED" && Number(creditNote.unappliedAmount) > 0 ? (
            <Link
              href={`/sales/customer-refunds/new?customerId=${encodeURIComponent(creditNote.customerId)}&sourceType=CREDIT_NOTE&sourceCreditNoteId=${encodeURIComponent(creditNote.id)}`}
              className="rounded-md bg-palm px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800"
            >
              {tc("Refund credit")}
            </Link>
          ) : null}
          {creditNote ? (
            <button type="button" onClick={() => void downloadCreditNotePdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Download credit note PDF")}
            </button>
          ) : null}
          {creditNote?.status === "DRAFT" && canFinalizeCreditNote ? (
            <button type="button" onClick={() => void runAction("finalize")} disabled={actionLoading || !fxPostingReady} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {tc("Finalize")}
            </button>
          ) : null}
          {creditNote && creditNote.status !== "VOIDED" && canVoidCreditNote ? (
            <button type="button" onClick={() => void runAction("void")} disabled={actionLoading} className="self-start rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Void")}
            </button>
          ) : null}
          {creditNote?.status === "DRAFT" && canCreateCreditNote ? (
            <button type="button" onClick={() => void deleteCreditNote()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Delete")}
            </button>
          ) : null}
        </div>
      </div>


      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load credit notes.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading credit note...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {creditNote?.status === "DRAFT" && !fxPostingReady ? <StatusMessage type="info">{tc(INCOMPLETE_DOCUMENT_FX_CONTEXT_MESSAGE)}</StatusMessage> : null}
      </div>

      {creditNote ? (
        <div className="mt-5 space-y-5">
          <AttachmentPanel linkedEntityType="CREDIT_NOTE" linkedEntityId={creditNote.id} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label={tc("Customer")} value={creditNote.customer?.displayName ?? creditNote.customer?.name ?? "-"} />
              <Summary label={tc("Status")} value={tc(creditNoteStatusLabel(creditNote.status))} />
              <Summary label={tc("Issue date")} value={formatAppDate(creditNote.issueDate, locale, "-")} />
              <Summary label={tc("Currency")} value={<bdi dir="ltr">{creditNote.currency}</bdi>} />
              <Summary label={tc("Original invoice")} value={creditNote.originalInvoice ? <bdi dir="ltr">{creditNote.originalInvoice.invoiceNumber}</bdi> : "-"} />
              <Summary label={tc("Branch")} value={creditNote.branch?.displayName ?? creditNote.branch?.name ?? "-"} />
              <Summary label={tc("Total credit")} value={formatAppMoney(creditDisplayTotals?.total ?? creditNote.total, creditNote.currency, locale)} />
              <Summary label={tc("Applied amount")} value={formatAppMoney(appliedAmount, creditNote.currency, locale)} />
              <Summary label={tc("Unapplied amount")} value={formatAppMoney(creditDisplayUnapplied, creditNote.currency, locale)} />
              {foreignCurrencyDocument ? <Summary label={tc("Base equivalent")} value={formatAppMoney(creditNote.total, creditNote.baseCurrency ?? creditNote.currency, locale)} /> : null}
              {foreignCurrencyDocument ? <Summary label={tc("Captured FX rate")} value={fxRateEvidence ?? tc("Incomplete FX context")} /> : null}
              {foreignCurrencyDocument ? <Summary label={tc("FX rate status")} value={creditNote.status === "DRAFT" ? tc("Freezes on finalization") : tc("Frozen; reverse to correct")} /> : null}
              <Summary label={tc("Journal entry")} value={creditNote.journalEntry ? <bdi dir="ltr">{`${creditNote.journalEntry.entryNumber} (${creditNote.journalEntry.id})`}</bdi> : "-"} />
              <Summary label={tc("Reversal journal")} value={creditNote.reversalJournalEntry ? <bdi dir="ltr">{`${creditNote.reversalJournalEntry.entryNumber} (${creditNote.reversalJournalEntry.id})`}</bdi> : "-"} />
              <Summary label={tc("Finalized")} value={formatAppDateTime(creditNote.finalizedAt, locale, "-")} />
              <Summary label={tc("Reason")} value={creditNote.reason ?? "-"} />
              <Summary label={tc("Notes")} value={creditNote.notes ?? "-"} />
            </div>
            <div className="mt-4">
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${creditNoteStatusBadgeClass(creditNote.status)}`}>{tc(creditNoteStatusLabel(creditNote.status))}</span>
            </div>
          </div>

          {canViewCompliance ? (
            <UaeEinvoiceReadinessPanel
              title={tc("UAE credit-note eInvoicing/PINT-AE readiness")}
              response={uaeReadiness}
              actionLoading={actionLoading}
              canValidate={canValidateCompliance}
              onValidate={() => void validateUaeReadiness()}
            />
          ) : (
            <StatusMessage type="info">{tc("UAE credit-note readiness requires compliance view permission.")}</StatusMessage>
          )}

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
                {creditNote.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? <bdi dir="ltr">{`${line.account.code} ${line.account.name}`}</bdi> : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{line.quantity}</bdi></td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.unitPrice, creditNote.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).lineGrossAmount, creditNote.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).discountAmount, creditNote.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).taxableAmount, creditNote.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).taxAmount, creditNote.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).lineTotal, creditNote.currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ms-auto grid max-w-sm grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm shadow-panel">
            <span className="text-steel">{tc("Subtotal")}</span>
            <span className="text-end font-mono">{formatAppMoney(creditDisplayTotals?.subtotal ?? creditNote.subtotal, creditNote.currency, locale)}</span>
            <span className="text-steel">{tc("Discount")}</span>
            <span className="text-end font-mono">{formatAppMoney(creditDisplayTotals?.discountTotal ?? creditNote.discountTotal, creditNote.currency, locale)}</span>
            <span className="text-steel">{tc("Taxable")}</span>
            <span className="text-end font-mono">{formatAppMoney(creditDisplayTotals?.taxableTotal ?? creditNote.taxableTotal, creditNote.currency, locale)}</span>
            <span className="text-steel">{tc("VAT")}</span>
            <span className="text-end font-mono">{formatAppMoney(creditDisplayTotals?.taxTotal ?? creditNote.taxTotal, creditNote.currency, locale)}</span>
            <span className="font-semibold text-ink">{tc("Total credit")}</span>
            <span className="text-end font-mono font-semibold text-ink">{formatAppMoney(creditDisplayTotals?.total ?? creditNote.total, creditNote.currency, locale)}</span>
            <span className="font-semibold text-ink">{tc("Applied amount")}</span>
            <span className="text-end font-mono font-semibold text-ink">{formatAppMoney(appliedAmount, creditNote.currency, locale)}</span>
            <span className="font-semibold text-ink">{tc("Unapplied amount")}</span>
            <span className="text-end font-mono font-semibold text-ink">{formatAppMoney(creditDisplayUnapplied, creditNote.currency, locale)}</span>
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-ink">{tc("Credit allocations")}</h2>
              <p className="mt-1 text-sm text-steel">{tc("Applying a credit note only matches the existing AR reduction to invoice balances. No new journal entry is created.")}</p>
            </div>
            {creditNote.allocations && creditNote.allocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-start text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">{tc("Invoice")}</th>
                      <th className="px-4 py-3">{tc("Invoice date")}</th>
                      <th className="px-4 py-3">{tc("Invoice total")}</th>
                      <th className="px-4 py-3">{tc("Amount applied")}</th>
                      <th className="px-4 py-3">{tc("Invoice balance due")}</th>
                      <th className="px-4 py-3">{tc("Status")}</th>
                      <th className="px-4 py-3">{tc("Reversed")}</th>
                      <th className="px-4 py-3">{tc("Reason")}</th>
                      <th className="px-4 py-3">{tc("Action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {creditNote.allocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{allocation.invoice?.invoiceNumber ?? allocation.invoiceId}</bdi></td>
                        <td className="px-4 py-3 text-steel">{formatAppDate(allocation.invoice?.issueDate, locale, "-")}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.invoice ? formatAppMoney(allocation.invoice.total, creditNote.currency, locale) : "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(allocation.amountApplied, creditNote.currency, locale)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.invoice ? formatAppMoney(allocation.invoice.balanceDue, creditNote.currency, locale) : "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${creditNoteAllocationStatusBadgeClass(allocation)}`}>{tc(creditNoteAllocationStatusLabel(allocation))}</span>
                        </td>
                        <td className="px-4 py-3 text-steel">{formatAppDateTime(allocation.reversedAt, locale, "-")}</td>
                        <td className="px-4 py-3 text-steel">{allocation.reversalReason ?? "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/sales/invoices/${allocation.invoiceId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              {tc("View invoice")}
                            </Link>
                            {canReverseCreditNoteAllocation(allocation) && canVoidCreditNote ? (
                              <button type="button" onClick={() => void reverseAllocation(allocation.id)} disabled={actionLoading} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
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
                <StatusMessage type="empty">{tc("No credit has been applied to invoices yet.")}</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">{tc("Apply credit")}</h2>
                <p className="mt-1 text-sm text-steel">{tc("Use unapplied credit against finalized open invoices for the same customer.")}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{tc("No accounting journal")}</span>
            </div>
            {canApplyCredit ? (
              openInvoices.length > 0 ? (
                <form onSubmit={applyCreditNote} className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-[1.4fr_0.7fr_auto]">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Open invoice")}</span>
                    <select value={selectedInvoiceId} onChange={(event) => setSelectedInvoiceId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                      {openInvoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {tc("{number} - balance {amount}", { number: invoice.invoiceNumber, amount: formatAppMoney(invoice.balanceDue, invoice.currency, locale) })}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Amount to apply")}</span>
                    <input value={amountApplied} onChange={(event) => setAmountApplied(event.target.value)} placeholder="0.0000" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <button type="submit" disabled={actionLoading || !selectedInvoiceId} className="self-end rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                    {tc("Apply")}
                  </button>
                  <div className="text-xs text-steel md:col-span-3">
                    {tc("Selected invoice balance: {amount}.", { amount: selectedInvoice ? formatAppMoney(selectedInvoice.balanceDue, selectedInvoice.currency, locale) : "-" })}{" "}
                    {tc("Credit available: {amount}.", { amount: formatAppMoney(creditNote.unappliedAmount, creditNote.currency, locale) })}
                  </div>
                </form>
              ) : (
                <div className="mt-4">
                  <StatusMessage type="empty">{tc("No finalized open invoices are available for this customer.")}</StatusMessage>
                </div>
              )
            ) : (
              <div className="mt-4">
                <StatusMessage type="info">{tc("Credit can be applied only after finalization while unapplied amount remains.")}</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {tc("ZATCA credit note XML, signing, PDF/A-3 embedding, and clearance/reporting are intentionally not implemented in this MVP.")}
          </div>
          <SourceDocumentGuidance />
        </div>
      ) : null}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}
