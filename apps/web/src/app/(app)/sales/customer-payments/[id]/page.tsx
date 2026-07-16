"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { SourceDocumentGuidance } from "@/components/documents/document-guidance";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { CustomerDocumentEmailDelivery } from "@/components/email/customer-document-email-delivery";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerActionDialog } from "@/components/ui-ledger/action-dialog";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { auditActionLabel, auditEntityTypeLabel, buildAuditLogQuery } from "@/lib/audit-logs";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { documentFxRateEvidence } from "@/lib/document-fx";
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
import { formatUnits, parseDecimalToUnits } from "@/lib/money";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import { downloadPdf } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import { listOpenSalesInvoicesForCustomer } from "@/lib/sales-invoices";
import type {
  AuditLogEntry,
  AuditLogListResponse,
  CustomerPayment,
  CustomerPaymentAllocation,
  CustomerPaymentReceiptData,
  CustomerPaymentUnappliedAllocation,
  GeneratedDocument,
  OpenSalesInvoice,
} from "@/lib/types";

const PAYMENT_AUDIT_LOG_LIMIT = "8";
const ALLOCATION_AUDIT_LOG_LIMIT = "2";
const MAX_ALLOCATION_AUDIT_LOOKUPS = 10;

export default function CustomerPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { locale, tc } = useAppLocale();
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
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [reverseAllocationId, setReverseAllocationId] = useState("");
  const [reverseReason, setReverseReason] = useState("");
  const [success, setSuccess] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [wasJustRecorded, setWasJustRecorded] = useState(false);
  const canCreatePayment = can(PERMISSIONS.customerPayments.create);
  const canVoidPaymentPermission = can(PERMISSIONS.customerPayments.void);
  const canViewGeneratedDocuments = can(PERMISSIONS.generatedDocuments.view);
  const canViewAuditLogs = can(PERMISSIONS.auditLogs.view);
  const returnTo = safeReturnToFromSearch(searchParams.toString());

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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load customer payment."));
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
          setReceiptDocumentError(loadError instanceof Error ? loadError.message : tc("Unable to load receipt archive state."));
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
  }, [canViewGeneratedDocuments, organizationId, payment?.id, tc]);

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
          setAuditLogError(loadError instanceof Error ? loadError.message : tc("Unable to load payment audit status."));
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
  }, [canViewAuditLogs, organizationId, payment, tc]);

  useEffect(() => {
    if (!organizationId || !payment || payment.status !== "POSTED" || parseDecimalToUnits(payment.transactionUnappliedAmount ?? payment.unappliedAmount) <= 0 || !canCreatePayment) {
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
      setError(tc("Select an open invoice before applying unapplied payment amount."));
      setSuccess("");
      return;
    }

    const amountToApply = applyAmount;
    const validationError = validateCustomerPaymentUnappliedAllocation(amountToApply, payment.transactionUnappliedAmount ?? payment.unappliedAmount, targetInvoice.transactionBalanceDue ?? targetInvoice.balanceDue);
    if (validationError) {
      setError(tc(validationError));
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
      setSuccess(tc("Applied {amount} from {number}.", { amount: formatAppMoney(amountToApply, payment.currency, locale), number: payment.paymentNumber }));
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : tc("Unable to apply unapplied payment amount."));
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
      setError(tc("Only active unapplied allocations can be reversed."));
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
      setSuccess(tc("Unapplied payment allocation reversed."));
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : tc("Unable to reverse unapplied allocation."));
    } finally {
      setActionLoading(false);
    }
  }

  async function voidPayment(): Promise<boolean> {
    if (!payment) {
      return false;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<CustomerPayment>(`/customer-payments/${payment.id}/void`, { method: "POST" });
      setPayment(updated);
      await refreshPayment();
      setSuccess(tc("Voided payment {number}.", { number: updated.paymentNumber }));
      return true;
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : tc("Unable to void payment."));
      return false;
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
      setSuccess(tc("Receipt PDF generated and downloaded."));
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download receipt PDF."));
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
      setSuccess(tc("Receipt preview loaded. PDF generation remains an explicit download action."));
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : tc("Unable to load receipt preview."));
    } finally {
      setLoadingReceiptData(false);
    }
  }

  const selectedOpenInvoice = openInvoices.find((invoice) => invoice.id === applyInvoiceId);
  const canApplyUnapplied = payment?.status === "POSTED" && Number(payment.transactionUnappliedAmount ?? payment.unappliedAmount) > 0 && canCreatePayment;
  const maxApplyAmount = payment ? customerPaymentApplyMaximumAmount(payment.transactionUnappliedAmount ?? payment.unappliedAmount, selectedOpenInvoice?.transactionBalanceDue ?? selectedOpenInvoice?.balanceDue) : "0.0000";
  const applyValidationError =
    payment && applyAmount
      ? validateCustomerPaymentUnappliedAllocation(applyAmount, payment.transactionUnappliedAmount ?? payment.unappliedAmount, selectedOpenInvoice?.transactionBalanceDue ?? selectedOpenInvoice?.balanceDue ?? "0.0000")
      : null;
  const paymentDetailHref =
    payment ? `/sales/customer-payments/${payment.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}` : "";

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{payment ? <bdi dir="ltr">{payment.paymentNumber}</bdi> : tc("Customer payment")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Payment posting, allocations, and reversal reference.")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href={returnTo || "/sales/customer-payments"} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
          {payment?.status === "POSTED" && canVoidPaymentPermission ? (
            <button type="button" onClick={() => setVoidDialogOpen(true)} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Void")}
            </button>
          ) : null}
          {payment?.status === "POSTED" && Number(payment.transactionUnappliedAmount ?? payment.unappliedAmount) > 0 ? (
            <Link
              href={`/sales/customer-refunds/new?customerId=${encodeURIComponent(payment.customerId)}&sourceType=CUSTOMER_PAYMENT&sourcePaymentId=${encodeURIComponent(payment.id)}`}
              className="rounded-md bg-palm px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800"
            >
              {tc("Refund unapplied amount")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load payments.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading customer payment...")}</StatusMessage> : null}
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
            paymentDetailHref={paymentDetailHref}
            onPreviewReceiptData={() => void previewReceiptData()}
            onDownloadReceiptPdf={() => void downloadReceiptPdf()}
          />

          <AttachmentPanel linkedEntityType="CUSTOMER_PAYMENT" linkedEntityId={payment.id} />

          <CustomerDocumentEmailDelivery
            sourceId={payment.id}
            organizationId={organizationId}
            canSend={can(PERMISSIONS.customerPayments.send)}
            eligible={payment.status === "POSTED"}
            sourceLabel="payment receipt"
            documentFilename={`receipt-${payment.paymentNumber}.pdf`}
            recipientEmail={payment.customer?.email ?? ""}
            defaultSubject={`Payment receipt ${payment.paymentNumber}`}
            defaultMessage="Please find the posted payment receipt attached for review."
            ineligibleMessage="Only posted customer payments can be queued for email delivery."
            noPermissionMessage="You do not have permission to send payment receipts by email."
            successMessage="Payment receipt queued for email delivery."
            emptyHistoryMessage="No payment receipt email deliveries queued yet."
            endpoint={`/customer-payments/${payment.id}/email-deliveries`}
          />

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
                <h2 className="text-base font-semibold text-ink">{tc("Direct invoice allocations")}</h2>
                <p className="mt-1 text-sm text-steel">{tc("Frozen transaction, carrying, settlement, rate, and realized FX evidence from posting.")}</p>
              </div>
              <span className="self-start rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                {tc("{count} direct", { count: formatCount(payment.allocations?.length ?? 0, locale) })}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Invoice")}</th>
                  <th className="px-4 py-3">{tc("Issue date")}</th>
                  <th className="px-4 py-3">{tc("Invoice status")}</th>
                  <th className="px-4 py-3">{tc("Amount applied")}</th>
                  <th className="px-4 py-3">{tc("Invoice balance")}</th>
                  <th className="px-4 py-3">{tc("Action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payment.allocations?.map((allocation) => (
                  <tr key={allocation.id}>
                    <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{allocation.invoice?.invoiceNumber ?? allocation.invoiceId}</bdi></td>
                    <td className="px-4 py-3 text-steel">{allocation.invoice ? formatAppDate(allocation.invoice.issueDate, locale, "-") : "-"}</td>
                    <td className="px-4 py-3 text-steel">{allocation.invoice?.status ? tc(invoiceStatusDisplayLabel(allocation.invoice.status)) : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <div>{formatAppMoney(allocation.transactionAmountApplied ?? allocation.amountApplied, payment.currency, locale)}</div>
                      <AllocationFxEvidence allocation={allocation} baseCurrency={payment.baseCurrency ?? payment.currency} locale={locale} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{allocation.invoice ? formatAppMoney(allocation.invoice.balanceDue, payment.baseCurrency ?? payment.currency, locale) : "-"}</td>
                    <td className="px-4 py-3">
                      {allocation.invoice ? (
                        <Link href={`/sales/invoices/${allocation.invoice.id}${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          {tc("View invoice")}
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
                  {tc("No direct invoice allocations were recorded when this payment was posted.")}
                </StatusMessage>
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">{tc("Unapplied payment applications")}</h2>
                <p className="mt-1 text-sm text-steel">{tc("Amounts matched from remaining payment credit to later invoices.")}</p>
              </div>
              <span className="self-start rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                {tc("{count} applications", { count: formatCount(payment.unappliedAllocations?.length ?? 0, locale) })}
              </span>
            </div>
            {payment.unappliedAllocations && payment.unappliedAllocations.length > 0 ? (
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
                    {payment.unappliedAllocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{allocation.invoice?.invoiceNumber ?? allocation.invoiceId}</bdi></td>
                        <td className="px-4 py-3 text-steel">{allocation.invoice ? formatAppDate(allocation.invoice.issueDate, locale, "-") : "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.invoice ? formatAppMoney(allocation.invoice.total, payment.currency, locale) : "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          <div>{formatAppMoney(allocation.transactionAmountApplied ?? allocation.amountApplied, payment.currency, locale)}</div>
                          <AllocationFxEvidence allocation={allocation} baseCurrency={payment.baseCurrency ?? payment.currency} locale={locale} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.invoice ? formatAppMoney(allocation.invoice.balanceDue, payment.baseCurrency ?? payment.currency, locale) : "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${customerPaymentUnappliedAllocationStatusBadgeClass(allocation)}`}>
                            {tc(customerPaymentUnappliedAllocationStatusLabel(allocation))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-steel">{allocation.reversedAt ? formatAppDate(allocation.reversedAt, locale, "-") : "-"}</td>
                        <td className="px-4 py-3 text-steel">{allocation.reversalReason ?? "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/sales/invoices/${allocation.invoiceId}${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              {tc("View invoice")}
                            </Link>
                            {canReverseCustomerPaymentUnappliedAllocation(allocation) && canVoidPaymentPermission ? (
                              <button type="button" onClick={() => requestReverseUnappliedAllocation(allocation.id)} disabled={actionLoading} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
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
                <StatusMessage type="empty">{tc("No unapplied payment credit has been matched to another invoice.")}</StatusMessage>
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
                      {tc("Reverse unapplied allocation")}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-steel">
                      {tc("This restores payment credit and the invoice balance without creating another journal entry.")}
                    </p>
                  </div>
                  <span className="self-start rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rosewood">
                    {tc("Confirmation required")}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-3 rounded-md bg-slate-50 p-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-steel">{tc("Invoice")}</dt>
                    <dd className="mt-1 font-mono text-xs text-ink"><bdi dir="ltr">{pendingReverseAllocation.invoice?.invoiceNumber ?? pendingReverseAllocation.invoiceId}</bdi></dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-steel">{tc("Amount")}</dt>
                    <dd className="mt-1 font-mono text-xs text-ink">{formatAppMoney(pendingReverseAllocation.amountApplied, payment.currency, locale)}</dd>
                  </div>
                </dl>

                <label className="mt-4 block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Reason (optional)")}</span>
                  <textarea
                    value={reverseReason}
                    onChange={(event) => setReverseReason(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
                    placeholder={tc("Correction note for the audit trail")}
                  />
                </label>

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={cancelReverseUnappliedAllocation}
                    disabled={actionLoading}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {tc("Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="rounded-md bg-rosewood px-3 py-2 text-sm font-semibold text-white hover:bg-red-900 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {tc("Confirm reversal")}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">{tc("Apply unapplied amount")}</h2>
                <p className="mt-1 text-sm text-steel">{tc("Use remaining payment credit against finalized open invoices for the same customer.")}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{tc("No accounting journal")}</span>
            </div>
            {canApplyUnapplied ? (
              openInvoices.length > 0 ? (
                <form onSubmit={applyUnapplied} className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-[1.4fr_0.7fr_auto]">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Open invoice")}</span>
                    <select value={applyInvoiceId} onChange={(event) => setApplyInvoiceId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                      {openInvoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {tc("{number} - balance {amount}", { number: invoice.invoiceNumber, amount: formatAppMoney(invoice.balanceDue, invoice.currency, locale) })}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Amount to apply")}</span>
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
                    {tc("Apply")}
                  </button>
                  <div id="apply-unapplied-limits" className="text-xs text-steel md:col-span-3">
                    {tc("Selected invoice balance: {amount}.", { amount: selectedOpenInvoice ? formatAppMoney(selectedOpenInvoice.balanceDue, selectedOpenInvoice.currency, locale) : "-" })}{" "}
                    {tc("Payment credit available: {amount}.", { amount: formatAppMoney(payment.transactionUnappliedAmount ?? payment.unappliedAmount, payment.currency, locale) })}{" "}
                    {tc("Maximum application: {amount}.", { amount: formatAppMoney(maxApplyAmount, payment.currency, locale) })}
                  </div>
                  {applyValidationError ? <div className="text-xs text-rosewood md:col-span-3">{tc(applyValidationError)}</div> : null}
                </form>
              ) : (
                <div className="mt-4">
                  <StatusMessage type="empty">{tc("No finalized open invoices are available for this customer.")}</StatusMessage>
                </div>
              )
            ) : (
              <div className="mt-4">
                <StatusMessage type="info">{tc("Unapplied amount can be applied only while the payment is posted and credit remains.")}</StatusMessage>
              </div>
            )}
          </div>

        </div>
      ) : null}

      <LedgerActionDialog
        open={voidDialogOpen && Boolean(payment)}
        onOpenChange={(open) => {
          if (!open && !actionLoading) {
            setVoidDialogOpen(false);
          }
        }}
        tone="danger"
        title={tc("Void customer payment")}
        description={payment ? tc("Void customer payment {number}?", { number: payment.paymentNumber }) : ""}
        confirmLabel={tc("Void")}
        busy={actionLoading}
        onConfirm={async () => {
          if (await voidPayment()) {
            setVoidDialogOpen(false);
          }
        }}
      />
    </section>
  );
}

export function CustomerPaymentStateDisplay({ payment }: { payment: CustomerPayment }) {
  const { locale, tc } = useAppLocale();
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
            <h2 className="text-base font-semibold text-ink">{tc("Payment state")}</h2>
            <p className="mt-1 text-sm text-steel">{tc(paymentOutputStatus(payment))}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`self-start rounded-md px-2 py-1 text-xs font-semibold ${customerPaymentStatusBadgeClass(payment.status)}`}>
              {tc(customerPaymentStatusLabel(payment.status))}
            </span>
            <span className={`self-start rounded-md px-2 py-1 text-xs font-semibold ${customerPaymentAllocationStateBadgeClass(allocationState)}`}>
              {tc(customerPaymentAllocationStateLabel(allocationState))}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <StateMetric label={tc("Transaction amount received")} value={formatAppMoney(payment.transactionAmountReceived ?? payment.amountReceived, payment.currency, locale)} />
          <StateMetric label={tc("Transaction unapplied")} value={formatAppMoney(payment.transactionUnappliedAmount ?? payment.unappliedAmount, payment.currency, locale)} detail={tc(customerPaymentAllocationStateLabel(allocationState))} />
          <StateMetric label={tc("Base amount received")} value={formatAppMoney(payment.amountReceived, payment.baseCurrency ?? payment.currency, locale)} detail={documentFxRateEvidence(payment) ?? undefined} />
          <StateMetric label={tc("Base unapplied")} value={formatAppMoney(payment.unappliedAmount, payment.baseCurrency ?? payment.currency, locale)} />
          <StateMetric label={tc("Directly allocated")} value={formatAppMoney(directAllocatedAmount, payment.currency, locale)} detail={tc("{count} invoices", { count: formatCount(directAllocationCount, locale) })} />
          <StateMetric
            label={tc("Applied from unapplied")}
            value={formatAppMoney(unappliedAppliedAmount, payment.currency, locale)}
            detail={tc("{activeCount} active, {reversedCount} reversed", { activeCount: formatCount(activeUnappliedCount, locale), reversedCount: formatCount(reversedUnappliedCount, locale) })}
          />
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">{tc("Accounting summary")}</h2>
        <div className="mt-4 space-y-4 text-sm">
          <StateRow label={tc("Paid-through account")} value={payment.account ? <><bdi dir="ltr">{payment.account.code}</bdi> {payment.account.name}</> : tc("Not returned")} />
          <StateRow label={tc("Payment journal")} value={<JournalReference journal={payment.journalEntry} emptyLabel={tc("No payment journal returned")} />} />
          <StateRow
            label={tc("Void reversal journal")}
            value={<JournalReference journal={payment.voidReversalJournalEntry} emptyLabel={payment.status === "VOIDED" ? tc("Reversal journal not returned") : tc("Not voided")} />}
          />
          <StateRow label={tc("Posted")} value={payment.postedAt ? formatAppDate(payment.postedAt, locale, "-") : tc("Not posted")} />
          <StateRow label={tc("Voided")} value={payment.voidedAt ? formatAppDate(payment.voidedAt, locale, "-") : tc("Not voided")} />
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
  const { locale, tc } = useAppLocale();
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc("Receipt output")}</h2>
          <p className="mt-1 text-sm text-steel">{tc("Generated receipt PDFs are archived only after an explicit receipt action.")}</p>
        </div>
        <span className={`self-start rounded-md px-2 py-1 text-xs font-semibold ${documents.length > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
          {documents.length > 0 ? tc("{count} archived", { count: formatCount(documents.length, locale) }) : tc("No archived receipt")}
        </span>
      </div>

      <div className="mt-4">
        {!canViewGeneratedDocuments ? (
          <StatusMessage type="info">{tc("Generated document permission is required to view archived receipt output records.")}</StatusMessage>
        ) : loading ? (
          <StatusMessage type="loading">{tc("Loading receipt archive state...")}</StatusMessage>
        ) : error ? (
          <StatusMessage type="info">{tc("Receipt archive state is unavailable: {error}", { error })}</StatusMessage>
        ) : documents.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <StatusMessage type="empty">{tc("No receipt PDF has been generated or archived for this payment.")}</StatusMessage>
            <p className="mt-3 text-sm leading-6 text-steel">
              {tc("Use the explicit receipt PDF action when a customer-facing receipt output is needed. Payment posting, allocation, reversal, and void actions do not create receipt PDFs automatically.")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Filename")}</th>
                  <th className="px-4 py-3">{tc("Status")}</th>
                  <th className="px-4 py-3">{tc("Generated")}</th>
                  <th className="px-4 py-3">{tc("Action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td className="px-4 py-3 font-medium text-ink">{document.filename}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${generatedDocumentStatusBadgeClass(document.status)}`}>
                        {tc(generatedDocumentStatusLabel(document.status))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-steel">{formatAppDate(document.generatedAt, locale, "-")}</td>
                    <td className="px-4 py-3">
                      <Link href="/documents" className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {tc("Open archive")}
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
  const { locale, tc } = useAppLocale();
  const latestLog = logs[0];
  const auditHref = customerPaymentAuditHref();
  const badge = auditStatusBadge(logs, loading, error, canViewAuditLogs);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc("Audit status")}</h2>
          <p className="mt-1 text-sm text-steel">
            {latestLog ? tc("{action} on {date}", { action: tc(auditActionLabel(latestLog.action)), date: formatAppDate(latestLog.createdAt, locale, "-") }) : tc("Payment audit trail status.")}
          </p>
        </div>
        <span className={`self-start rounded-md px-2 py-1 text-xs font-semibold ${badge.className}`}>{tc(badge.label, badge.params)}</span>
      </div>

      <div className="mt-4">
        {!canViewAuditLogs ? (
          <StatusMessage type="info">{tc("Audit log permission is required to view customer payment audit events.")}</StatusMessage>
        ) : loading ? (
          <StatusMessage type="loading">{tc("Loading payment audit status...")}</StatusMessage>
        ) : error ? (
          <StatusMessage type="info">{tc("Payment audit status is unavailable: {error}", { error })}</StatusMessage>
        ) : logs.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <StatusMessage type="empty">{tc("No customer payment audit entries were returned for this payment.")}</StatusMessage>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Event")}</th>
                  <th className="px-4 py-3">{tc("Scope")}</th>
                  <th className="px-4 py-3">{tc("Actor")}</th>
                  <th className="px-4 py-3">{tc("Time")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 font-medium text-ink">{tc(auditActionLabel(log.action))}</td>
                    <td className="px-4 py-3 text-steel">
                      {tc(auditEntityTypeLabel(log.entityType))} / <span className="font-mono text-xs"><bdi dir="ltr">{log.entityId}</bdi></span>
                    </td>
                    <td className="px-4 py-3 text-steel">{auditActorLabel(log, tc)}</td>
                    <td className="px-4 py-3 text-steel">{formatAppDate(log.createdAt, locale, "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3">
              <Link href={auditHref} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Open audit logs")}
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
  paymentDetailHref,
  onPreviewReceiptData,
  onDownloadReceiptPdf,
}: {
  payment: CustomerPayment;
  recorded: boolean;
  receiptData: CustomerPaymentReceiptData | null;
  actionLoading: boolean;
  loadingReceiptData: boolean;
  paymentDetailHref: string;
  onPreviewReceiptData: () => void;
  onDownloadReceiptPdf: () => void;
}) {
  const { locale, tc } = useAppLocale();
  const firstAllocatedInvoice = payment.allocations?.find((allocation) => allocation.invoice)?.invoice ?? null;
  const appliedTotalUnits = payment.allocations?.reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.transactionAmountApplied ?? allocation.amountApplied), 0) ?? 0;
  const hasUnapplied = Number(payment.transactionUnappliedAmount ?? payment.unappliedAmount) > 0;

  return (
    <div className="space-y-4">
      {recorded ? (
        <StatusMessage type="success">
          {tc("Payment recorded. The receipt and allocation details below show what changed; linked invoice balances are updated.")}
        </StatusMessage>
      ) : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">{tc("What happened?")}</h2>
              <p className="mt-1 text-sm leading-6 text-steel">{tc(paymentOutcomeDescription(payment, hasUnapplied))}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${customerPaymentStatusBadgeClass(payment.status)}`}>
                {tc(customerPaymentStatusLabel(payment.status))}
              </span>
              {hasUnapplied ? (
                <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">{tc("Unapplied credit")}</span>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <Summary label={tc("Transaction amount received")} value={formatAppMoney(payment.transactionAmountReceived ?? payment.amountReceived, payment.currency, locale)} />
            <Summary label={tc("Base amount received")} value={formatAppMoney(payment.amountReceived, payment.baseCurrency ?? payment.currency, locale)} />
            <Summary label={tc("Applied to invoices")} value={formatAppMoney(formatUnits(appliedTotalUnits), payment.currency, locale)} />
            <Summary label={tc("Payment number")} value={receiptData?.receiptNumber ?? payment.paymentNumber} bidi />
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">{tc("Next actions")}</h2>
          <p className="mt-1 text-sm leading-6 text-steel">{tc(paymentNextActionDescription(payment, hasUnapplied))}</p>
          <div className="mt-4 flex flex-col gap-2">
            {firstAllocatedInvoice ? (
              <Link
                href={`/sales/invoices/${firstAllocatedInvoice.id}${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`}
                className="rounded-md bg-palm px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800"
              >
                {tc("View invoice")}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onPreviewReceiptData}
              disabled={actionLoading || loadingReceiptData}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {tc("Preview receipt")}
            </button>
            <button
              type="button"
              onClick={onDownloadReceiptPdf}
              disabled={actionLoading || loadingReceiptData}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {tc("Download receipt PDF")}
            </button>
            <p className="text-xs leading-5 text-steel">
              {tc("Downloading the PDF uses the explicit receipt PDF route and may archive a generated receipt record. Payment posting and allocation actions do not create receipts automatically.")}
            </p>
            <Link href={partyDetailHref("customer", payment.customerId)} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Open customer workspace")}
            </Link>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href={`/reports/aged-receivables${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`}
                className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {tc("AR report")}
              </Link>
              <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Dashboard")}
              </Link>
            </div>
          </div>
          {payment.status === "VOIDED" ? (
            <p className="mt-3 text-xs leading-5 text-steel">{tc("This payment is voided. Review the reversal journal below if present before taking further action.")}</p>
          ) : null}
          {loadingReceiptData ? (
            <div className="mt-4">
              <StatusMessage type="loading">{tc("Loading receipt preview...")}</StatusMessage>
            </div>
          ) : null}
          {receiptData ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-ink">{tc("Receipt preview")}</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Summary label={tc("Receipt number")} value={receiptData.receiptNumber} bidi />
                <Summary label={tc("Customer")} value={receiptData.customer.displayName ?? receiptData.customer.name} />
                <Summary label={tc("Payment date")} value={formatAppDate(receiptData.paymentDate, locale, "-")} />
                <Summary label={tc("Amount received")} value={formatAppMoney(receiptData.amountReceived, receiptData.currency, locale)} />
                <Summary label={tc("Unapplied amount")} value={formatAppMoney(receiptData.unappliedAmount, receiptData.currency, locale)} />
                <Summary label={tc("Receipt lines")} value={formatCount(receiptData.allocations.length + receiptData.unappliedAllocations.length, locale)} />
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
  const { tc } = useAppLocale();
  if (!journal) {
    return <span className="text-steel">{emptyLabel}</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Link href="/journal-entries" className="font-mono text-xs text-palm hover:underline">
        <bdi dir="ltr">{journal.entryNumber}</bdi>
      </Link>
      <span className={`rounded-md px-2 py-1 text-xs font-medium ${journalStatusBadgeClass(journal.status)}`}>{tc(journalStatusLabel(journal.status))}</span>
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

function auditActorLabel(log: AuditLogEntry, tc: (value: string, params?: Record<string, string | number>) => string): string {
  return log.actorUser?.name ?? log.actorUser?.email ?? tc("System");
}

function customerPaymentAuditHref(): string {
  return "/settings/audit-logs";
}

function auditStatusBadge(
  logs: AuditLogEntry[],
  loading: boolean,
  error: string,
  canViewAuditLogs: boolean,
): { label: string; className: string; params?: Record<string, string | number> } {
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
  return { label: "{count} events", className: "bg-emerald-50 text-emerald-700", params: { count: logs.length } };
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

function Summary({ label, value, bidi = false }: { label: string; value: string; bidi?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{bidi ? <bdi dir="ltr">{value}</bdi> : value}</div>
    </div>
  );
}

function AllocationFxEvidence({ allocation, baseCurrency, locale }: {
  allocation: CustomerPaymentAllocation | CustomerPaymentUnappliedAllocation;
  baseCurrency: string;
  locale: "en" | "ar";
}) {
  if (!allocation.documentBaseAmountApplied || !allocation.settlementBaseAmountApplied) return null;
  return (
    <div className="mt-1 space-y-0.5 text-[11px] font-normal text-steel">
      <div>Carrying {formatAppMoney(allocation.documentBaseAmountApplied, baseCurrency, locale)} · settlement {formatAppMoney(allocation.settlementBaseAmountApplied, baseCurrency, locale)}</div>
      <div>Rates {allocation.recognitionRate ?? "-"} → {allocation.settlementRate ?? "-"}</div>
      <div>Gain {formatAppMoney(allocation.realizedGainAmount ?? "0", baseCurrency, locale)} · loss {formatAppMoney(allocation.realizedLossAmount ?? "0", baseCurrency, locale)}</div>
      {allocation.realizedFxJournalEntryId ? <div><bdi dir="ltr">FX journal {allocation.realizedFxJournalEntryId}</bdi></div> : null}
      {"realizedFxReversalJournalEntryId" in allocation && allocation.realizedFxReversalJournalEntryId ? <div><bdi dir="ltr">Reversal {allocation.realizedFxReversalJournalEntryId}</bdi></div> : null}
    </div>
  );
}

function formatCount(value: number, locale: "en" | "ar"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").format(value);
}

function journalStatusLabel(status: NonNullable<CustomerPayment["journalEntry"]>["status"]): string {
  switch (status) {
    case "POSTED":
      return "Posted";
    case "REVERSED":
      return "Reversed";
    case "DRAFT":
      return "Draft";
    default:
      return status;
  }
}

function invoiceStatusDisplayLabel(status: string): string {
  switch (status) {
    case "FINALIZED":
      return "Finalized";
    case "DRAFT":
      return "Draft";
    case "VOIDED":
      return "Voided";
    default:
      return status;
  }
}
