"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { SourceDocumentGuidance } from "@/components/documents/document-guidance";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { auditActionLabel, auditEntityTypeLabel, buildAuditLogQuery } from "@/lib/audit-logs";
import {
  canReverseCustomerPaymentUnappliedAllocation,
  applyCustomerPaymentUnappliedAllocation,
  customerPaymentAllocationState,
  customerPaymentAllocationStateBadgeClass,
  customerPaymentAllocationStateLabel,
  customerPaymentActiveUnappliedAppliedAmount,
  customerPaymentApplyMaximumAmount,
  customerPaymentDirectAllocatedAmount,
  customerPaymentReceiptPdfPath,
  customerPaymentStatusBadgeClass,
  customerPaymentStatusLabel,
  customerPaymentUnappliedAllocationStatusBadgeClass,
  customerPaymentUnappliedAllocationStatusLabel,
  getCustomerPaymentReceiptData,
  reverseCustomerPaymentUnappliedAllocation,
  validateCustomerPaymentUnappliedAllocation,
} from "@/lib/customer-payments";
import { generatedDocumentStatusBadgeClass, generatedDocumentStatusLabel } from "@/lib/documents";
import { formatMoneyAmount, formatUnits, parseDecimalToUnits } from "@/lib/money";
import { downloadPdf } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import { listOpenSalesInvoicesForCustomer } from "@/lib/sales-invoices";
import type {
  AuditLogEntry,
  AuditLogListResponse,
  CustomerPayment,
  CustomerPaymentReceiptData,
  GeneratedDocument,
  OpenSalesInvoice,
} from "@/lib/types";

const PAYMENT_AUDIT_LOG_LIMIT = "8";
const ALLOCATION_AUDIT_LOG_LIMIT = "2";
const MAX_ALLOCATION_AUDIT_LOOKUPS = 10;

export default function CustomerPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [payment, setPayment] = useState<CustomerPayment | null>(null);
  const [receiptData, setReceiptData] = useState<CustomerPaymentReceiptData | null>(null);
  const [receiptDocuments, setReceiptDocuments] = useState<GeneratedDocument[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OpenSalesInvoice[]>([]);
  const [applyInvoiceId, setApplyInvoiceId] = useState("");
  const [applyAmount, setApplyAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingReceiptData, setLoadingReceiptData] = useState(false);
  const [loadingReceiptDocuments, setLoadingReceiptDocuments] = useState(false);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [receiptDocumentError, setReceiptDocumentError] = useState("");
  const [auditLogError, setAuditLogError] = useState("");
  const [reverseAllocationId, setReverseAllocationId] = useState("");
  const [reverseReason, setReverseReason] = useState("");
  const [success, setSuccess] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [wasJustRecorded, setWasJustRecorded] = useState(false);
  const canCreatePayment = can(PERMISSIONS.customerPayments.create);
  const canVoidPaymentPermission = can(PERMISSIONS.customerPayments.void);
  const canViewGeneratedDocuments = can(PERMISSIONS.generatedDocuments.view);
  const canViewAuditLogs = can(PERMISSIONS.auditLogs.view);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setWasJustRecorded(new URLSearchParams(window.location.search).get("recorded") === "1");
  }, []);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setReceiptData(null);

    apiRequest<CustomerPayment>(`/customer-payments/${params.id}`)
      .then((paymentResult) => {
        if (!cancelled) {
          setPayment(paymentResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load customer payment.");
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

  useEffect(() => {
    if (!organizationId || !payment?.id || !canViewGeneratedDocuments) {
      setReceiptDocuments([]);
      setReceiptDocumentError("");
      setLoadingReceiptDocuments(false);
      return;
    }

    let cancelled = false;
    setLoadingReceiptDocuments(true);
    setReceiptDocumentError("");

    loadReceiptDocuments(payment.id)
      .then((documents) => {
        if (!cancelled) {
          setReceiptDocuments(documents);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setReceiptDocuments([]);
          setReceiptDocumentError(loadError instanceof Error ? loadError.message : "Unable to load receipt archive state.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingReceiptDocuments(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canViewGeneratedDocuments, organizationId, payment?.id]);

  useEffect(() => {
    if (!organizationId || !payment?.id || !canViewAuditLogs) {
      setAuditLogs([]);
      setAuditLogError("");
      setLoadingAuditLogs(false);
      return;
    }

    let cancelled = false;
    setLoadingAuditLogs(true);
    setAuditLogError("");

    loadPaymentAuditLogs(payment)
      .then((logs) => {
        if (!cancelled) {
          setAuditLogs(logs);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setAuditLogs([]);
          setAuditLogError(loadError instanceof Error ? loadError.message : "Unable to load payment audit status.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAuditLogs(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canViewAuditLogs, organizationId, payment]);

  useEffect(() => {
    if (!organizationId || !payment || payment.status !== "POSTED" || parseDecimalToUnits(payment.unappliedAmount) <= 0 || !canCreatePayment) {
      setOpenInvoices([]);
      setApplyInvoiceId("");
      return;
    }

    let cancelled = false;
    listOpenSalesInvoicesForCustomer(payment.customerId)
      .then((result) => {
        if (!cancelled) {
          setOpenInvoices(result);
          setApplyInvoiceId((current) => (result.some((invoice) => invoice.id === current) ? current : result[0]?.id || ""));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpenInvoices([]);
          setApplyInvoiceId("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canCreatePayment, organizationId, payment?.customerId, payment?.status, payment?.unappliedAmount]);

  async function refreshPayment() {
    if (!params.id) {
      return;
    }
    const paymentResult = await apiRequest<CustomerPayment>(`/customer-payments/${params.id}`);
    setPayment(paymentResult);
    setReceiptData(null);
  }

  const pendingReverseAllocation = payment?.unappliedAllocations?.find((allocation) => allocation.id === reverseAllocationId) ?? null;

  async function applyUnapplied(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payment) {
      return;
    }

    const targetInvoice = openInvoices.find((invoice) => invoice.id === applyInvoiceId);
    if (!targetInvoice) {
      setError("Select an open invoice before applying unapplied payment amount.");
      setSuccess("");
      return;
    }

    const amountToApply = applyAmount;
    const validationError = validateCustomerPaymentUnappliedAllocation(amountToApply, payment.unappliedAmount, targetInvoice.balanceDue);
    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await applyCustomerPaymentUnappliedAllocation(payment.id, {
        invoiceId: applyInvoiceId,
        amountApplied: amountToApply,
      });
      setPayment(updated);
      await refreshPayment();
      setApplyAmount("");
      setApplyInvoiceId("");
      setSuccess(`Applied ${formatMoneyAmount(amountToApply, payment.currency)} from ${payment.paymentNumber}.`);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Unable to apply unapplied payment amount.");
    } finally {
      setActionLoading(false);
    }
  }

  function requestReverseUnappliedAllocation(allocationId: string) {
    const allocation = payment?.unappliedAllocations?.find((candidate) => candidate.id === allocationId);
    if (!allocation || !canReverseCustomerPaymentUnappliedAllocation(allocation)) {
      return;
    }

    setReverseAllocationId(allocationId);
    setReverseReason("");
    setError("");
    setSuccess("");
  }

  function cancelReverseUnappliedAllocation() {
    if (actionLoading) {
      return;
    }
    setReverseAllocationId("");
    setReverseReason("");
  }

  async function reverseUnappliedAllocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payment || !pendingReverseAllocation) {
      return;
    }
    if (!canReverseCustomerPaymentUnappliedAllocation(pendingReverseAllocation)) {
      setError("Only active unapplied allocations can be reversed.");
      setReverseAllocationId("");
      setReverseReason("");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await reverseCustomerPaymentUnappliedAllocation(payment.id, pendingReverseAllocation.id, { reason: reverseReason });
      setPayment(updated);
      await refreshPayment();
      setReverseAllocationId("");
      setReverseReason("");
      setSuccess("Unapplied payment allocation reversed.");
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : "Unable to reverse unapplied allocation.");
    } finally {
      setActionLoading(false);
    }
  }

  async function voidPayment() {
    if (!payment || !window.confirm(`Void customer payment ${payment.paymentNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<CustomerPayment>(`/customer-payments/${payment.id}/void`, { method: "POST" });
      setPayment(updated);
      await refreshPayment();
      setSuccess(`Voided payment ${updated.paymentNumber}.`);
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : "Unable to void payment.");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadReceiptPdf() {
    if (!payment) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadPdf(customerPaymentReceiptPdfPath(payment.id), `receipt-${payment.paymentNumber}.pdf`);
      if (canViewGeneratedDocuments) {
        setReceiptDocuments(await loadReceiptDocuments(payment.id));
      }
      setSuccess("Receipt PDF generated and downloaded.");
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download receipt PDF.");
    } finally {
      setActionLoading(false);
    }
  }

  async function previewReceiptData() {
    if (!payment) {
      return;
    }

    setLoadingReceiptData(true);
    setError("");
    setSuccess("");

    try {
      setReceiptData(await getCustomerPaymentReceiptData(payment.id));
      setSuccess("Receipt preview loaded. PDF generation remains an explicit download action.");
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Unable to load receipt preview.");
    } finally {
      setLoadingReceiptData(false);
    }
  }

  const selectedOpenInvoice = openInvoices.find((invoice) => invoice.id === applyInvoiceId);
  const canApplyUnapplied = payment?.status === "POSTED" && Number(payment.unappliedAmount) > 0 && canCreatePayment;
  const maxApplyAmount = payment ? customerPaymentApplyMaximumAmount(payment.unappliedAmount, selectedOpenInvoice?.balanceDue) : "0.0000";
  const applyValidationError =
    payment && applyAmount
      ? validateCustomerPaymentUnappliedAllocation(applyAmount, payment.unappliedAmount, selectedOpenInvoice?.balanceDue ?? "0.0000")
      : null;

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{payment ? payment.paymentNumber : "Customer payment"}</h1>
          <p className="mt-1 text-sm text-steel">Payment posting, allocations, and reversal reference.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/sales/customer-payments" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {payment?.status === "POSTED" && canVoidPaymentPermission ? (
            <button type="button" onClick={() => void voidPayment()} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Void
            </button>
          ) : null}
          {payment?.status === "POSTED" && Number(payment.unappliedAmount) > 0 ? (
            <Link
              href={`/sales/customer-refunds/new?customerId=${encodeURIComponent(payment.customerId)}&sourceType=CUSTOMER_PAYMENT&sourcePaymentId=${encodeURIComponent(payment.id)}`}
              className="rounded-md bg-palm px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800"
            >
              Refund unapplied amount
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load payments.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading customer payment...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {payment ? (
        <div className="mt-5 space-y-5">
          <CustomerPaymentWorkflowGuidance
            payment={payment}
            recorded={wasJustRecorded}
            receiptData={receiptData}
            actionLoading={actionLoading}
            loadingReceiptData={loadingReceiptData}
            onPreviewReceiptData={() => void previewReceiptData()}
            onDownloadReceiptPdf={() => void downloadReceiptPdf()}
          />

          <AttachmentPanel linkedEntityType="CUSTOMER_PAYMENT" linkedEntityId={payment.id} />

          <CustomerPaymentStateDisplay payment={payment} />

          <CustomerPaymentReceiptArchiveState
            documents={receiptDocuments}
            loading={loadingReceiptDocuments}
            error={receiptDocumentError}
            canViewGeneratedDocuments={canViewGeneratedDocuments}
          />

          <CustomerPaymentAuditStatus
            payment={payment}
            logs={auditLogs}
            loading={loadingAuditLogs}
            error={auditLogError}
            canViewAuditLogs={canViewAuditLogs}
          />

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">Direct invoice allocations</h2>
                <p className="mt-1 text-sm text-steel">Amounts applied when this payment was posted.</p>
              </div>
              <span className="self-start rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                {(payment.allocations?.length ?? 0).toLocaleString()} direct
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Issue date</th>
                  <th className="px-4 py-3">Invoice status</th>
                  <th className="px-4 py-3">Amount applied</th>
                  <th className="px-4 py-3">Invoice balance</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payment.allocations?.map((allocation) => (
                  <tr key={allocation.id}>
                    <td className="px-4 py-3 font-mono text-xs">{allocation.invoice?.invoiceNumber ?? allocation.invoiceId}</td>
                    <td className="px-4 py-3 text-steel">{allocation.invoice ? new Date(allocation.invoice.issueDate).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3 text-steel">{allocation.invoice?.status ?? "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, payment.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{allocation.invoice ? formatMoneyAmount(allocation.invoice.balanceDue, payment.currency) : "-"}</td>
                    <td className="px-4 py-3">
                      {allocation.invoice ? (
                        <Link href={`/sales/invoices/${allocation.invoice.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          View invoice
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
            {(payment.allocations?.length ?? 0) === 0 ? (
              <div className="px-4 py-5">
                <StatusMessage type="empty">
                  No direct invoice allocations were recorded when this payment was posted.
                </StatusMessage>
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">Unapplied payment applications</h2>
                <p className="mt-1 text-sm text-steel">Amounts matched from remaining payment credit to later invoices.</p>
              </div>
              <span className="self-start rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                {(payment.unappliedAllocations?.length ?? 0).toLocaleString()} applications
              </span>
            </div>
            {payment.unappliedAllocations && payment.unappliedAllocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Invoice date</th>
                      <th className="px-4 py-3">Invoice total</th>
                      <th className="px-4 py-3">Amount applied</th>
                      <th className="px-4 py-3">Invoice balance due</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Reversed</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payment.unappliedAllocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.invoice?.invoiceNumber ?? allocation.invoiceId}</td>
                        <td className="px-4 py-3 text-steel">{allocation.invoice ? new Date(allocation.invoice.issueDate).toLocaleDateString() : "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.invoice ? formatMoneyAmount(allocation.invoice.total, payment.currency) : "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, payment.currency)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.invoice ? formatMoneyAmount(allocation.invoice.balanceDue, payment.currency) : "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${customerPaymentUnappliedAllocationStatusBadgeClass(allocation)}`}>
                            {customerPaymentUnappliedAllocationStatusLabel(allocation)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-steel">{allocation.reversedAt ? new Date(allocation.reversedAt).toLocaleString() : "-"}</td>
                        <td className="px-4 py-3 text-steel">{allocation.reversalReason ?? "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/sales/invoices/${allocation.invoiceId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              View invoice
                            </Link>
                            {canReverseCustomerPaymentUnappliedAllocation(allocation) && canVoidPaymentPermission ? (
                              <button type="button" onClick={() => requestReverseUnappliedAllocation(allocation.id)} disabled={actionLoading} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
                                Reverse
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
                <StatusMessage type="empty">No unapplied payment credit has been matched to another invoice.</StatusMessage>
              </div>
            )}
          </div>

          {pendingReverseAllocation ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
              <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="reverse-unapplied-title"
                onSubmit={reverseUnappliedAllocation}
                className="w-full max-w-lg rounded-md border border-slate-200 bg-white p-5 shadow-panel"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 id="reverse-unapplied-title" className="text-base font-semibold text-ink">
                      Reverse unapplied allocation
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-steel">
                      This restores payment credit and the invoice balance without creating another journal entry.
                    </p>
                  </div>
                  <span className="self-start rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rosewood">
                    Confirmation required
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-3 rounded-md bg-slate-50 p-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-steel">Invoice</dt>
                    <dd className="mt-1 font-mono text-xs text-ink">{pendingReverseAllocation.invoice?.invoiceNumber ?? pendingReverseAllocation.invoiceId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-steel">Amount</dt>
                    <dd className="mt-1 font-mono text-xs text-ink">{formatMoneyAmount(pendingReverseAllocation.amountApplied, payment.currency)}</dd>
                  </div>
                </dl>

                <label className="mt-4 block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Reason (optional)</span>
                  <textarea
                    value={reverseReason}
                    onChange={(event) => setReverseReason(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
                    placeholder="Correction note for the audit trail"
                  />
                </label>

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={cancelReverseUnappliedAllocation}
                    disabled={actionLoading}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="rounded-md bg-rosewood px-3 py-2 text-sm font-semibold text-white hover:bg-red-900 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Confirm reversal
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Apply unapplied amount</h2>
                <p className="mt-1 text-sm text-steel">Use remaining payment credit against finalized open invoices for the same customer.</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">No accounting journal</span>
            </div>
            {canApplyUnapplied ? (
              openInvoices.length > 0 ? (
                <form onSubmit={applyUnapplied} className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-[1.4fr_0.7fr_auto]">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Open invoice</span>
                    <select value={applyInvoiceId} onChange={(event) => setApplyInvoiceId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                      {openInvoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - balance {formatMoneyAmount(invoice.balanceDue, invoice.currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Amount to apply</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.0001"
                      max={maxApplyAmount}
                      step="0.0001"
                      value={applyAmount}
                      onChange={(event) => setApplyAmount(event.target.value)}
                      placeholder="0.0000"
                      aria-invalid={Boolean(applyValidationError)}
                      aria-describedby="apply-unapplied-limits"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
                    />
                  </label>
                  <button type="submit" disabled={actionLoading || !applyInvoiceId || !applyAmount || Boolean(applyValidationError)} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 md:self-end">
                    Apply
                  </button>
                  <div id="apply-unapplied-limits" className="text-xs text-steel md:col-span-3">
                    Selected invoice balance: {selectedOpenInvoice ? formatMoneyAmount(selectedOpenInvoice.balanceDue, selectedOpenInvoice.currency) : "-"}.
                    Payment credit available: {formatMoneyAmount(payment.unappliedAmount, payment.currency)}.
                    Maximum application: {formatMoneyAmount(maxApplyAmount, payment.currency)}.
                  </div>
                  {applyValidationError ? <div className="text-xs text-rosewood md:col-span-3">{applyValidationError}</div> : null}
                </form>
              ) : (
                <div className="mt-4">
                  <StatusMessage type="empty">No finalized open invoices are available for this customer.</StatusMessage>
                </div>
              )
            ) : (
              <div className="mt-4">
                <StatusMessage type="info">Unapplied amount can be applied only while the payment is posted and credit remains.</StatusMessage>
              </div>
            )}
          </div>

        </div>
      ) : null}
    </section>
  );
}

export function CustomerPaymentStateDisplay({ payment }: { payment: CustomerPayment }) {
  const directAllocatedAmount = customerPaymentDirectAllocatedAmount(payment.allocations);
  const unappliedAppliedAmount = customerPaymentActiveUnappliedAppliedAmount(payment.unappliedAllocations);
  const allocationState = customerPaymentAllocationState(payment);
  const directAllocationCount = payment.allocations?.length ?? 0;
  const unappliedAllocations = payment.unappliedAllocations ?? [];
  const activeUnappliedCount = unappliedAllocations.filter((allocation) => !allocation.reversedAt).length;
  const reversedUnappliedCount = unappliedAllocations.length - activeUnappliedCount;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Payment state</h2>
            <p className="mt-1 text-sm text-steel">{paymentOutputStatus(payment)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`self-start rounded-md px-2 py-1 text-xs font-semibold ${customerPaymentStatusBadgeClass(payment.status)}`}>
              {customerPaymentStatusLabel(payment.status)}
            </span>
            <span className={`self-start rounded-md px-2 py-1 text-xs font-semibold ${customerPaymentAllocationStateBadgeClass(allocationState)}`}>
              {customerPaymentAllocationStateLabel(allocationState)}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <StateMetric label="Amount received" value={formatMoneyAmount(payment.amountReceived, payment.currency)} />
          <StateMetric label="Unapplied amount" value={formatMoneyAmount(payment.unappliedAmount, payment.currency)} detail={customerPaymentAllocationStateLabel(allocationState)} />
          <StateMetric label="Directly allocated" value={formatMoneyAmount(directAllocatedAmount, payment.currency)} detail={`${directAllocationCount} invoice${directAllocationCount === 1 ? "" : "s"}`} />
          <StateMetric
            label="Applied from unapplied"
            value={formatMoneyAmount(unappliedAppliedAmount, payment.currency)}
            detail={`${activeUnappliedCount} active, ${reversedUnappliedCount} reversed`}
          />
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Accounting summary</h2>
        <div className="mt-4 space-y-4 text-sm">
          <StateRow label="Paid-through account" value={payment.account ? `${payment.account.code} ${payment.account.name}` : "Not returned"} />
          <StateRow label="Payment journal" value={<JournalReference journal={payment.journalEntry} emptyLabel="No payment journal returned" />} />
          <StateRow
            label="Void reversal journal"
            value={<JournalReference journal={payment.voidReversalJournalEntry} emptyLabel={payment.status === "VOIDED" ? "Reversal journal not returned" : "Not voided"} />}
          />
          <StateRow label="Posted" value={payment.postedAt ? new Date(payment.postedAt).toLocaleString() : "Not posted"} />
          <StateRow label="Voided" value={payment.voidedAt ? new Date(payment.voidedAt).toLocaleString() : "Not voided"} />
        </div>
      </section>
    </div>
  );
}

export function CustomerPaymentReceiptArchiveState({
  documents,
  loading,
  error,
  canViewGeneratedDocuments,
}: {
  documents: GeneratedDocument[];
  loading: boolean;
  error: string;
  canViewGeneratedDocuments: boolean;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Receipt output</h2>
          <p className="mt-1 text-sm text-steel">Generated receipt PDFs are archived only after an explicit receipt action.</p>
        </div>
        <span className={`self-start rounded-md px-2 py-1 text-xs font-semibold ${documents.length > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
          {documents.length > 0 ? `${documents.length} archived` : "No archived receipt"}
        </span>
      </div>

      <div className="mt-4">
        {!canViewGeneratedDocuments ? (
          <StatusMessage type="info">Generated document permission is required to view archived receipt output records.</StatusMessage>
        ) : loading ? (
          <StatusMessage type="loading">Loading receipt archive state...</StatusMessage>
        ) : error ? (
          <StatusMessage type="info">Receipt archive state is unavailable: {error}</StatusMessage>
        ) : documents.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <StatusMessage type="empty">No receipt PDF has been generated or archived for this payment.</StatusMessage>
            <p className="mt-3 text-sm leading-6 text-steel">
              Use the explicit receipt PDF action when a customer-facing receipt output is needed. Payment posting, allocation, reversal, and void actions do not create receipt PDFs automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Filename</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Generated</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td className="px-4 py-3 font-medium text-ink">{document.filename}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${generatedDocumentStatusBadgeClass(document.status)}`}>
                        {generatedDocumentStatusLabel(document.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-steel">{new Date(document.generatedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Link href="/documents" className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        Open archive
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export function CustomerPaymentAuditStatus({
  payment,
  logs,
  loading,
  error,
  canViewAuditLogs,
}: {
  payment: CustomerPayment;
  logs: AuditLogEntry[];
  loading: boolean;
  error: string;
  canViewAuditLogs: boolean;
}) {
  const latestLog = logs[0];
  const auditHref = customerPaymentAuditHref();
  const badge = auditStatusBadge(logs, loading, error, canViewAuditLogs);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Audit status</h2>
          <p className="mt-1 text-sm text-steel">
            {latestLog ? `${auditActionLabel(latestLog.action)} on ${new Date(latestLog.createdAt).toLocaleString()}` : "Payment audit trail status."}
          </p>
        </div>
        <span className={`self-start rounded-md px-2 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
      </div>

      <div className="mt-4">
        {!canViewAuditLogs ? (
          <StatusMessage type="info">Audit log permission is required to view customer payment audit events.</StatusMessage>
        ) : loading ? (
          <StatusMessage type="loading">Loading payment audit status...</StatusMessage>
        ) : error ? (
          <StatusMessage type="info">Payment audit status is unavailable: {error}</StatusMessage>
        ) : logs.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <StatusMessage type="empty">No customer payment audit entries were returned for this payment.</StatusMessage>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 font-medium text-ink">{auditActionLabel(log.action)}</td>
                    <td className="px-4 py-3 text-steel">
                      {auditEntityTypeLabel(log.entityType)} / <span className="font-mono text-xs">{log.entityId}</span>
                    </td>
                    <td className="px-4 py-3 text-steel">{auditActorLabel(log)}</td>
                    <td className="px-4 py-3 text-steel">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3">
              <Link href={auditHref} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Open audit logs
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function CustomerPaymentWorkflowGuidance({
  payment,
  recorded,
  receiptData,
  actionLoading,
  loadingReceiptData,
  onPreviewReceiptData,
  onDownloadReceiptPdf,
}: {
  payment: CustomerPayment;
  recorded: boolean;
  receiptData: CustomerPaymentReceiptData | null;
  actionLoading: boolean;
  loadingReceiptData: boolean;
  onPreviewReceiptData: () => void;
  onDownloadReceiptPdf: () => void;
}) {
  const firstAllocatedInvoice = payment.allocations?.find((allocation) => allocation.invoice)?.invoice ?? null;
  const appliedTotalUnits = payment.allocations?.reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.amountApplied), 0) ?? 0;
  const hasUnapplied = Number(payment.unappliedAmount) > 0;

  return (
    <div className="space-y-4">
      {recorded ? (
        <StatusMessage type="success">
          Payment recorded. The receipt and allocation details below show what changed; linked invoice balances are updated.
        </StatusMessage>
      ) : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">What happened?</h2>
              <p className="mt-1 text-sm leading-6 text-steel">{paymentOutcomeDescription(payment, hasUnapplied)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${customerPaymentStatusBadgeClass(payment.status)}`}>
                {customerPaymentStatusLabel(payment.status)}
              </span>
              {hasUnapplied ? (
                <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Unapplied credit</span>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <Summary label="Amount received" value={formatMoneyAmount(payment.amountReceived, payment.currency)} />
            <Summary label="Applied to invoices" value={formatMoneyAmount(formatUnits(appliedTotalUnits), payment.currency)} />
            <Summary label="Payment number" value={receiptData?.receiptNumber ?? payment.paymentNumber} />
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">Next actions</h2>
          <p className="mt-1 text-sm leading-6 text-steel">{paymentNextActionDescription(payment, hasUnapplied)}</p>
          <div className="mt-4 flex flex-col gap-2">
            {firstAllocatedInvoice ? (
              <Link href={`/sales/invoices/${firstAllocatedInvoice.id}`} className="rounded-md bg-palm px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800">
                View invoice
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onPreviewReceiptData}
              disabled={actionLoading || loadingReceiptData}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Preview receipt
            </button>
            <button
              type="button"
              onClick={onDownloadReceiptPdf}
              disabled={actionLoading || loadingReceiptData}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Download receipt PDF
            </button>
            <p className="text-xs leading-5 text-steel">
              Downloading the PDF uses the explicit receipt PDF route and may archive a generated receipt record. Payment posting and allocation actions do not create receipts automatically.
            </p>
            <Link href={`/contacts/${payment.customerId}`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              View customer ledger
            </Link>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link href="/reports/aged-receivables" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                AR report
              </Link>
              <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                Dashboard
              </Link>
            </div>
          </div>
          {payment.status === "VOIDED" ? (
            <p className="mt-3 text-xs leading-5 text-steel">This payment is voided. Review the reversal journal below if present before taking further action.</p>
          ) : null}
          {loadingReceiptData ? (
            <div className="mt-4">
              <StatusMessage type="loading">Loading receipt preview...</StatusMessage>
            </div>
          ) : null}
          {receiptData ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-ink">Receipt preview</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Summary label="Receipt number" value={receiptData.receiptNumber} />
                <Summary label="Customer" value={receiptData.customer.displayName ?? receiptData.customer.name} />
                <Summary label="Payment date" value={new Date(receiptData.paymentDate).toLocaleDateString()} />
                <Summary label="Amount received" value={formatMoneyAmount(receiptData.amountReceived, receiptData.currency)} />
                <Summary label="Unapplied amount" value={formatMoneyAmount(receiptData.unappliedAmount, receiptData.currency)} />
                <Summary label="Receipt lines" value={`${receiptData.allocations.length + receiptData.unappliedAllocations.length}`} />
              </div>
            </div>
          ) : null}
          <SourceDocumentGuidance className="mt-4" />
        </div>
      </div>
    </div>
  );
}

function StateMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="border-l-2 border-slate-200 py-1 pl-3">
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-2 font-mono text-sm font-semibold text-ink">{value}</div>
      {detail ? <div className="mt-1 text-xs text-steel">{detail}</div> : null}
    </div>
  );
}

function StateRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[9rem_1fr]">
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="min-w-0 break-words font-medium text-ink">{value}</div>
    </div>
  );
}

function JournalReference({
  journal,
  emptyLabel,
}: {
  journal?: Pick<NonNullable<CustomerPayment["journalEntry"]>, "id" | "entryNumber" | "status"> | null;
  emptyLabel: string;
}) {
  if (!journal) {
    return <span className="text-steel">{emptyLabel}</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Link href="/journal-entries" className="font-mono text-xs text-palm hover:underline">
        {journal.entryNumber}
      </Link>
      <span className={`rounded-md px-2 py-1 text-xs font-medium ${journalStatusBadgeClass(journal.status)}`}>{journal.status}</span>
    </span>
  );
}

function paymentOutputStatus(payment: CustomerPayment): string {
  if (payment.status === "VOIDED") {
    return payment.voidReversalJournalEntry ? "Voided with reversal accounting returned." : "Voided with no reversal journal returned.";
  }

  if (payment.status === "POSTED") {
    return payment.journalEntry ? "Posted with payment accounting returned." : "Posted with no payment journal returned.";
  }

  return "Draft payment with no posted accounting output.";
}

function journalStatusBadgeClass(status: NonNullable<CustomerPayment["journalEntry"]>["status"]): string {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";
    case "REVERSED":
      return "bg-slate-100 text-slate-700";
    case "DRAFT":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function loadReceiptDocuments(paymentId: string): Promise<GeneratedDocument[]> {
  const query = new URLSearchParams({
    documentType: "CUSTOMER_PAYMENT_RECEIPT",
    sourceType: "CustomerPayment",
    sourceId: paymentId,
  });
  return apiRequest<GeneratedDocument[]>(`/generated-documents?${query.toString()}`);
}

async function loadPaymentAuditLogs(payment: CustomerPayment): Promise<AuditLogEntry[]> {
  const paymentAuditPath = buildAuditLogQuery({
    entityType: "CustomerPayment",
    entityId: payment.id,
    limit: PAYMENT_AUDIT_LOG_LIMIT,
  });
  const allocationAuditPaths = (payment.unappliedAllocations ?? [])
    .slice(0, MAX_ALLOCATION_AUDIT_LOOKUPS)
    .map((allocation) =>
      buildAuditLogQuery({
        entityType: "CustomerPaymentUnappliedAllocation",
        entityId: allocation.id,
        limit: ALLOCATION_AUDIT_LOG_LIMIT,
      }),
    );

  const responses = await Promise.all(
    [paymentAuditPath, ...allocationAuditPaths].map((path) => apiRequest<AuditLogListResponse>(path)),
  );
  const uniqueLogs = new Map<string, AuditLogEntry>();
  responses.flatMap((response) => response.data).forEach((log) => uniqueLogs.set(log.id, log));

  return Array.from(uniqueLogs.values())
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, Number(PAYMENT_AUDIT_LOG_LIMIT));
}

function auditActorLabel(log: AuditLogEntry): string {
  return log.actorUser?.name ?? log.actorUser?.email ?? "System";
}

function customerPaymentAuditHref(): string {
  return "/settings/audit-logs";
}

function auditStatusBadge(
  logs: AuditLogEntry[],
  loading: boolean,
  error: string,
  canViewAuditLogs: boolean,
): { label: string; className: string } {
  if (!canViewAuditLogs) {
    return { label: "Permission required", className: "bg-slate-100 text-slate-700" };
  }
  if (loading) {
    return { label: "Loading", className: "bg-slate-100 text-slate-700" };
  }
  if (error) {
    return { label: "Unavailable", className: "bg-amber-50 text-amber-700" };
  }
  if (logs.length === 0) {
    return { label: "No events", className: "bg-slate-100 text-slate-700" };
  }
  return { label: `${logs.length} event${logs.length === 1 ? "" : "s"}`, className: "bg-emerald-50 text-emerald-700" };
}

function paymentOutcomeDescription(payment: CustomerPayment, hasUnapplied: boolean): string {
  if (payment.status === "VOIDED") {
    return "This payment is voided. The original payment is closed and reversal journal details remain visible for review.";
  }

  if (payment.status === "DRAFT") {
    return "This payment is still a draft. It has not posted cash movement or invoice allocations yet.";
  }

  if (hasUnapplied) {
    return "This payment is posted. Allocated amounts reduced invoice balances, and the remaining unapplied credit can be matched to a later invoice or refunded.";
  }

  return "This payment is posted. Customer receipt details are available, and linked invoice balances were reduced by the allocations below.";
}

function paymentNextActionDescription(payment: CustomerPayment, hasUnapplied: boolean): string {
  if (payment.status === "VOIDED") {
    return "Use the links below for review and reporting. Record a new payment if the customer sends replacement funds.";
  }

  if (hasUnapplied) {
    return "Review the receipt, then either apply the remaining credit to another invoice or refund the customer from the actions above.";
  }

  return "Review the invoice, customer ledger, and reports to confirm the receivables loop is closed.";
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}
