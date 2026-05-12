"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { creditNoteAllocationStatusBadgeClass, creditNoteAllocationStatusLabel, creditNoteStatusBadgeClass, creditNoteStatusLabel } from "@/lib/credit-notes";
import { customerPaymentUnappliedAllocationStatusBadgeClass, customerPaymentUnappliedAllocationStatusLabel } from "@/lib/customer-payments";
import { deriveInvoicePaymentState, formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { downloadAuthenticatedFile, downloadPdf, invoicePdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import {
  shouldShowZatcaLocalOnlyWarning,
  truncateHash,
  zatcaInvoiceClearancePath,
  zatcaInvoiceComplianceCheckPath,
  zatcaInvoiceReportingPath,
  zatcaInvoiceXmlPath,
  zatcaInvoiceXmlValidationPath,
  zatcaSdkValidateXmlDryRunPath,
  zatcaStatusLabel,
  zatcaXmlValidationLabel,
} from "@/lib/zatca";
import type { SalesInvoice, ZatcaInvoiceMetadata, ZatcaQrResponse, ZatcaSdkDryRunResponse, ZatcaXmlValidationResult } from "@/lib/types";

export default function SalesInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [zatca, setZatca] = useState<ZatcaInvoiceMetadata | null>(null);
  const [xmlValidation, setXmlValidation] = useState<ZatcaXmlValidationResult | null>(null);
  const [sdkDryRun, setSdkDryRun] = useState<ZatcaSdkDryRunResponse | null>(null);
  const [qrPayload, setQrPayload] = useState("");
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
      apiRequest<SalesInvoice>(`/sales-invoices/${params.id}`),
      apiRequest<ZatcaInvoiceMetadata>(`/sales-invoices/${params.id}/zatca`).catch(() => null),
      apiRequest<ZatcaXmlValidationResult>(zatcaInvoiceXmlValidationPath(params.id)).catch(() => null),
    ])
      .then(([result, zatcaResult, validationResult]) => {
        if (!cancelled) {
          setInvoice(result);
          setZatca(zatcaResult);
          setXmlValidation(validationResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load sales invoice.");
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

  async function runAction(action: "finalize" | "void") {
    if (!invoice) {
      return;
    }

    if (action === "void" && !window.confirm(`Void invoice ${invoice.invoiceNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<SalesInvoice>(`/sales-invoices/${invoice.id}/${action}`, { method: "POST" });
      setInvoice(updated);
      if (action === "finalize") {
        await refreshZatca(updated.id);
      }
      setSuccess(action === "finalize" ? `Finalized invoice ${updated.invoiceNumber}.` : `Voided invoice ${updated.invoiceNumber}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action} invoice.`);
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteInvoice() {
    if (!invoice || !window.confirm(`Delete draft invoice ${invoice.invoiceNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ deleted: boolean }>(`/sales-invoices/${invoice.id}`, { method: "DELETE" });
      router.push("/sales/invoices");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete invoice.");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadInvoicePdf() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadPdf(invoicePdfPath(invoice.id), `invoice-${invoice.invoiceNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download invoice PDF.");
    } finally {
      setActionLoading(false);
    }
  }

  async function refreshZatca(invoiceId: string) {
    const result = await apiRequest<ZatcaInvoiceMetadata>(`/sales-invoices/${invoiceId}/zatca`);
    setZatca(result);
    return result;
  }

  async function fetchZatcaXmlValidation(invoiceId: string) {
    const result = await apiRequest<ZatcaXmlValidationResult>(zatcaInvoiceXmlValidationPath(invoiceId));
    setXmlValidation(result);
    return result;
  }

  async function generateZatca() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");
    setQrPayload("");
    setSdkDryRun(null);

    try {
      const result = await apiRequest<ZatcaInvoiceMetadata>(`/sales-invoices/${invoice.id}/zatca/generate`, { method: "POST" });
      setZatca(result);
      await fetchZatcaXmlValidation(invoice.id);
      setSuccess("Local ZATCA XML, QR payload, and hash metadata generated.");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Unable to generate ZATCA metadata.");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadZatcaXml() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadAuthenticatedFile(zatcaInvoiceXmlPath(invoice.id), `zatca-${invoice.invoiceNumber}.xml`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download ZATCA XML.");
    } finally {
      setActionLoading(false);
    }
  }

  async function loadQrPayload() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest<ZatcaQrResponse>(`/sales-invoices/${invoice.id}/zatca/qr`);
      setQrPayload(result.qrCodeBase64);
    } catch (qrError) {
      setError(qrError instanceof Error ? qrError.message : "Unable to load ZATCA QR payload.");
    } finally {
      setActionLoading(false);
    }
  }

  async function refreshXmlValidation() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await fetchZatcaXmlValidation(invoice.id);
      setSuccess("Local XML validation refreshed.");
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "Unable to validate local ZATCA XML.");
    } finally {
      setActionLoading(false);
    }
  }

  async function runSdkValidationDryRun() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest<ZatcaSdkDryRunResponse>(zatcaSdkValidateXmlDryRunPath(), {
        method: "POST",
        body: { invoiceId: invoice.id, mode: "dry-run" },
      });
      setSdkDryRun(result);
      setSuccess("SDK validation dry-run plan created. The SDK was not executed.");
    } catch (dryRunError) {
      setError(dryRunError instanceof Error ? dryRunError.message : "Unable to build SDK validation dry-run plan.");
    } finally {
      setActionLoading(false);
    }
  }

  async function runZatcaSubmission(action: "compliance-check" | "clearance" | "reporting") {
    if (!invoice) {
      return;
    }

    const pathByAction = {
      "compliance-check": zatcaInvoiceComplianceCheckPath(invoice.id),
      clearance: zatcaInvoiceClearancePath(invoice.id),
      reporting: zatcaInvoiceReportingPath(invoice.id),
    };

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest<ZatcaInvoiceMetadata>(pathByAction[action], { method: "POST" });
      setZatca(result);
      setSuccess(action === "compliance-check" ? "Local/mock compliance check recorded." : "ZATCA submission response recorded.");
    } catch (submissionError) {
      await refreshZatca(invoice.id).catch(() => undefined);
      setError(submissionError instanceof Error ? submissionError.message : "Unable to run ZATCA action.");
    } finally {
      setActionLoading(false);
    }
  }

  const latestZatcaSubmission = zatca?.submissionLogs?.[0];
  const canUpdateInvoice = can(PERMISSIONS.salesInvoices.update);
  const canFinalizeInvoice = can(PERMISSIONS.salesInvoices.finalize);
  const canVoidInvoice = can(PERMISSIONS.salesInvoices.void);
  const canCreateCustomerPayment = can(PERMISSIONS.customerPayments.create);
  const canCreateCreditNote = can(PERMISSIONS.creditNotes.create);
  const canViewZatca = can(PERMISSIONS.zatca.view);
  const canGenerateZatca = can(PERMISSIONS.zatca.generateXml);
  const canRunZatcaChecks = can(PERMISSIONS.zatca.runChecks);
  const canManageZatca = can(PERMISSIONS.zatca.manage);

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{invoice ? invoice.invoiceNumber : "Sales invoice"}</h1>
          <p className="mt-1 text-sm text-steel">Invoice detail, calculated totals, and linked journal entry.</p>
          {invoice ? <p className="mt-1 text-xs text-steel">Downloads are archived automatically.</p> : null}
        </div>
        <div className="flex gap-2">
          <Link href="/sales/invoices" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {invoice?.status === "DRAFT" && canUpdateInvoice ? (
            <Link href={`/sales/invoices/${invoice.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Edit
            </Link>
          ) : null}
          {invoice?.customerId ? (
            <Link href={`/contacts/${invoice.customerId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Customer ledger
            </Link>
          ) : null}
          {invoice ? (
            <button type="button" onClick={() => void downloadInvoicePdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Download PDF
            </button>
          ) : null}
          {invoice?.status === "FINALIZED" && invoice.customerId && canCreateCustomerPayment ? (
            <Link href={`/sales/customer-payments/new?customerId=${invoice.customerId}&invoiceId=${invoice.id}`} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
              Record payment
            </Link>
          ) : null}
          {invoice?.status === "FINALIZED" && invoice.customerId && canCreateCreditNote ? (
            <Link href={`/sales/credit-notes/new?customerId=${invoice.customerId}&invoiceId=${invoice.id}`} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
              Create credit note
            </Link>
          ) : null}
          {invoice?.status === "DRAFT" && canFinalizeInvoice ? (
            <button type="button" onClick={() => void runAction("finalize")} disabled={actionLoading} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              Finalize
            </button>
          ) : null}
          {invoice && invoice.status !== "VOIDED" && canVoidInvoice ? (
            <button type="button" onClick={() => void runAction("void")} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Void
            </button>
          ) : null}
          {invoice?.status === "DRAFT" && canUpdateInvoice ? (
            <button type="button" onClick={() => void deleteInvoice()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load invoices.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading invoice...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {invoice ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Customer" value={invoice.customer?.displayName ?? invoice.customer?.name ?? "-"} />
              <Summary label="Status" value={invoice.status} />
              <Summary label="Issue date" value={new Date(invoice.issueDate).toLocaleDateString()} />
              <Summary label="Due date" value={formatOptionalDate(invoice.dueDate)} />
              <Summary label="Currency" value={invoice.currency} />
              <Summary label="Branch" value={invoice.branch?.displayName ?? invoice.branch?.name ?? "-"} />
              <Summary label="Payment state" value={deriveInvoicePaymentState(invoice.total, invoice.balanceDue)} />
              <Summary label="Total" value={formatMoneyAmount(invoice.total, invoice.currency)} />
              <Summary label="Balance due" value={formatMoneyAmount(invoice.balanceDue, invoice.currency)} />
              <Summary label="Journal entry" value={invoice.journalEntry ? `${invoice.journalEntry.entryNumber} (${invoice.journalEntry.id})` : "-"} />
              <Summary label="Reversal journal" value={invoice.reversalJournalEntry ? `${invoice.reversalJournalEntry.entryNumber} (${invoice.reversalJournalEntry.id})` : "-"} />
              <Summary label="Finalized" value={invoice.finalizedAt ? new Date(invoice.finalizedAt).toLocaleString() : "-"} />
              <Summary label="Notes" value={invoice.notes ?? "-"} />
              <Summary label="Terms" value={invoice.terms ?? "-"} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full text-left text-sm">
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
                {invoice.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? `${line.account.code} ${line.account.name}` : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.unitPrice, invoice.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.lineGrossAmount, invoice.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.discountAmount, invoice.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.taxableAmount, invoice.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.taxAmount, invoice.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.lineTotal, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto grid max-w-sm grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm shadow-panel">
            <span className="text-steel">Subtotal</span>
            <span className="text-right font-mono">{formatMoneyAmount(invoice.subtotal, invoice.currency)}</span>
            <span className="text-steel">Discount</span>
            <span className="text-right font-mono">{formatMoneyAmount(invoice.discountTotal, invoice.currency)}</span>
            <span className="text-steel">Taxable</span>
            <span className="text-right font-mono">{formatMoneyAmount(invoice.taxableTotal, invoice.currency)}</span>
            <span className="text-steel">VAT</span>
            <span className="text-right font-mono">{formatMoneyAmount(invoice.taxTotal, invoice.currency)}</span>
            <span className="font-semibold text-ink">Total</span>
            <span className="text-right font-mono font-semibold text-ink">{formatMoneyAmount(invoice.total, invoice.currency)}</span>
            <span className="font-semibold text-ink">Balance due</span>
            <span className="text-right font-mono font-semibold text-ink">{formatMoneyAmount(invoice.balanceDue, invoice.currency)}</span>
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink">Payments</h2>
                <p className="mt-1 text-sm text-steel">{deriveInvoicePaymentState(invoice.total, invoice.balanceDue)} with {formatMoneyAmount(invoice.balanceDue, invoice.currency)} balance due.</p>
              </div>
              {invoice.status === "FINALIZED" && (canCreateCustomerPayment || canCreateCreditNote) ? (
                <div className="flex flex-wrap gap-2">
                  {canCreateCustomerPayment ? (
                    <Link href={`/sales/customer-payments/new?customerId=${invoice.customerId}&invoiceId=${invoice.id}`} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
                      Record payment
                    </Link>
                  ) : null}
                  {canCreateCreditNote ? (
                    <Link href={`/sales/credit-notes/new?customerId=${invoice.customerId}&invoiceId=${invoice.id}`} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
                      Create credit note
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
            {invoice.paymentAllocations && invoice.paymentAllocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Amount applied</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.paymentAllocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.payment?.paymentNumber ?? allocation.paymentId}</td>
                        <td className="px-4 py-3 text-steel">{allocation.payment ? new Date(allocation.payment.paymentDate).toLocaleDateString() : "-"}</td>
                        <td className="px-4 py-3 text-steel">{allocation.payment?.status ?? "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, invoice.currency)}</td>
                        <td className="px-4 py-3">
                          {allocation.payment ? (
                            <Link href={`/sales/customer-payments/${allocation.payment.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              View payment
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-4">
                <StatusMessage type="empty">No payments have been applied to this invoice.</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Unapplied payment applications</h2>
              <p className="mt-1 text-sm text-steel">Unapplied customer payment credits matched to this invoice. These rows are balance matching records, not accounting postings.</p>
            </div>
            {invoice.paymentUnappliedAllocations && invoice.paymentUnappliedAllocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Payment date</th>
                      <th className="px-4 py-3">Payment status</th>
                      <th className="px-4 py-3">Amount applied</th>
                      <th className="px-4 py-3">Allocation status</th>
                      <th className="px-4 py-3">Reversed</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.paymentUnappliedAllocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.payment?.paymentNumber ?? allocation.paymentId}</td>
                        <td className="px-4 py-3 text-steel">{allocation.payment ? new Date(allocation.payment.paymentDate).toLocaleDateString() : "-"}</td>
                        <td className="px-4 py-3 text-steel">{allocation.payment?.status ?? "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, invoice.currency)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${customerPaymentUnappliedAllocationStatusBadgeClass(allocation)}`}>
                            {customerPaymentUnappliedAllocationStatusLabel(allocation)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-steel">{allocation.reversedAt ? new Date(allocation.reversedAt).toLocaleString() : "-"}</td>
                        <td className="px-4 py-3">
                          <Link href={`/sales/customer-payments/${allocation.paymentId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            View payment
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-4">
                <StatusMessage type="empty">No unapplied payment credit has been matched to this invoice.</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink">Credit notes</h2>
                <p className="mt-1 text-sm text-steel">Linked credit notes reduce customer receivables when finalized. Applications reduce this invoice balance due without another journal entry.</p>
              </div>
              {invoice.status === "FINALIZED" && canCreateCreditNote ? (
                <Link href={`/sales/credit-notes/new?customerId=${invoice.customerId}&invoiceId=${invoice.id}`} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
                  Create credit note
                </Link>
              ) : null}
            </div>
            {invoice.creditNotes && invoice.creditNotes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">Credit note</th>
                      <th className="px-4 py-3">Issue date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Unapplied</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.creditNotes.map((creditNote) => (
                      <tr key={creditNote.id}>
                        <td className="px-4 py-3 font-mono text-xs">{creditNote.creditNoteNumber}</td>
                        <td className="px-4 py-3 text-steel">{new Date(creditNote.issueDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${creditNoteStatusBadgeClass(creditNote.status)}`}>{creditNoteStatusLabel(creditNote.status)}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(creditNote.total, creditNote.currency)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(creditNote.unappliedAmount, creditNote.currency)}</td>
                        <td className="px-4 py-3">
                          <Link href={`/sales/credit-notes/${creditNote.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            View credit note
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-4">
                <StatusMessage type="empty">No credit notes are linked to this invoice.</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Credit applications</h2>
              <p className="mt-1 text-sm text-steel">Credit note allocations applied to this invoice. These rows are matching records, not accounting postings.</p>
            </div>
            {invoice.creditNoteAllocations && invoice.creditNoteAllocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">Credit note</th>
                      <th className="px-4 py-3">Issue date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Amount applied</th>
                      <th className="px-4 py-3">Allocation</th>
                      <th className="px-4 py-3">Reversed</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.creditNoteAllocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.creditNote?.creditNoteNumber ?? allocation.creditNoteId}</td>
                        <td className="px-4 py-3 text-steel">{allocation.creditNote ? new Date(allocation.creditNote.issueDate).toLocaleDateString() : "-"}</td>
                        <td className="px-4 py-3">
                          {allocation.creditNote ? (
                            <span className={`rounded-md px-2 py-1 text-xs font-medium ${creditNoteStatusBadgeClass(allocation.creditNote.status)}`}>{creditNoteStatusLabel(allocation.creditNote.status)}</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, invoice.currency)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${creditNoteAllocationStatusBadgeClass(allocation)}`}>{creditNoteAllocationStatusLabel(allocation)}</span>
                        </td>
                        <td className="px-4 py-3 text-steel">{allocation.reversedAt ? new Date(allocation.reversedAt).toLocaleString() : "-"}</td>
                        <td className="px-4 py-3">
                          <Link href={`/sales/credit-notes/${allocation.creditNoteId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            View credit note
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-4">
                <StatusMessage type="empty">No credit note allocations have been applied to this invoice.</StatusMessage>
              </div>
            )}
          </div>

          {canViewZatca ? (
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-ink">ZATCA compliance groundwork</h2>
                <p className="mt-1 text-sm text-steel">Local ZATCA generation only. Not submitted to ZATCA yet.</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{zatcaStatusLabel(zatca?.zatcaStatus)}</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Invoice UUID" value={zatca?.invoiceUuid ?? "-"} />
              <Summary label="ICV" value={zatca?.icv === null || zatca?.icv === undefined ? "-" : String(zatca.icv)} />
              <Summary label="Invoice hash" value={truncateHash(zatca?.invoiceHash)} />
              <Summary label="Previous hash" value={truncateHash(zatca?.previousInvoiceHash)} />
              <Summary label="EGS unit" value={zatca?.egsUnit?.name ?? "-"} />
              <Summary label="Generated" value={zatca?.generatedAt ? new Date(zatca.generatedAt).toLocaleString() : "-"} />
              <Summary label="Latest submission" value={latestZatcaSubmission ? zatcaStatusLabel(latestZatcaSubmission.submissionType) : "-"} />
              <Summary label="Submission status" value={latestZatcaSubmission ? zatcaStatusLabel(latestZatcaSubmission.status) : "-"} />
              <Summary label="Last error" value={zatca?.lastErrorMessage ?? "-"} />
              <Summary label="Submission error" value={latestZatcaSubmission?.errorMessage ?? "-"} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {invoice.status === "FINALIZED" && canGenerateZatca ? (
                <button type="button" onClick={() => void generateZatca()} disabled={actionLoading} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                  Generate ZATCA XML/QR
                </button>
              ) : null}
              {zatca?.xmlBase64 ? (
                <button type="button" onClick={() => void downloadZatcaXml()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  Download XML
                </button>
              ) : null}
              {zatca?.qrCodeBase64 ? (
                <button type="button" onClick={() => void loadQrPayload()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  View QR payload
                </button>
              ) : null}
              {canRunZatcaChecks ? (
                <button type="button" onClick={() => void runZatcaSubmission("compliance-check")} disabled={!zatca?.xmlBase64 || actionLoading} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400">
                  Run local/mock compliance check
                </button>
              ) : null}
              {canManageZatca ? (
                <button type="button" onClick={() => void runZatcaSubmission("clearance")} disabled={!zatca?.xmlBase64 || actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  Request clearance
                </button>
              ) : null}
              {canManageZatca ? (
                <button type="button" onClick={() => void runZatcaSubmission("reporting")} disabled={!zatca?.xmlBase64 || actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  Request reporting
                </button>
              ) : null}
              {canRunZatcaChecks ? (
                <button type="button" onClick={() => void runSdkValidationDryRun()} disabled={!zatca?.xmlBase64 || actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  SDK validation dry run
                </button>
              ) : null}
              <button type="button" disabled className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-400 disabled:cursor-not-allowed">
                Run local SDK validation disabled
              </button>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink">Local XML validation</h3>
                  <p className="mt-1 text-xs text-steel">Local structural checks only. This is not official ZATCA SDK validation.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${xmlValidation?.valid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {zatcaXmlValidationLabel(xmlValidation?.valid)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void refreshXmlValidation()}
                    disabled={actionLoading}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Refresh check
                  </button>
                </div>
              </div>
              {shouldShowZatcaLocalOnlyWarning(xmlValidation) ? (
                <p className="mt-3 text-xs text-amber-700">Official ZATCA/FATOORA validation, signing, and clearance/reporting are still pending.</p>
              ) : null}
              {xmlValidation?.errors.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-rosewood">
                  {xmlValidation.errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {xmlValidation?.warnings.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-steel">
                  {xmlValidation.warnings.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            {sdkDryRun ? (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">SDK validation dry run</h3>
                    <p className="mt-1 text-xs text-steel">Command planning only. The official SDK was not executed and no ZATCA network call was made.</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${sdkDryRun.readiness.canAttemptSdkValidation ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {sdkDryRun.readiness.canAttemptSdkValidation ? "Plan ready" : "Plan blocked"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                  <Summary label="XML source" value={sdkDryRun.xmlSource} />
                  <Summary label="SDK JAR" value={sdkDryRun.readiness.sdkJarFound ? "Found" : "Missing"} />
                  <Summary label="Java" value={sdkDryRun.readiness.javaVersion ?? (sdkDryRun.readiness.javaFound ? "Detected" : "Missing")} />
                </div>
                {sdkDryRun.commandPlan.displayCommand ? (
                  <div className="mt-3 rounded-md bg-slate-50 p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-steel">Planned command</div>
                    <div className="mt-1 break-all font-mono text-xs text-ink">{sdkDryRun.commandPlan.displayCommand}</div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-amber-700">No executable SDK command could be planned with the current local setup.</p>
                )}
                {sdkDryRun.warnings.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-700">
                    {sdkDryRun.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {qrPayload ? (
              <div className="mt-4 rounded-md bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-steel">Basic TLV QR payload</div>
                <div className="mt-1 break-all font-mono text-xs text-ink">{qrPayload}</div>
              </div>
            ) : null}
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
