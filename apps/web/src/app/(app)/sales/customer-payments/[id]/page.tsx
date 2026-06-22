"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { ArrowLeft, Download, Eye, ReceiptText, RotateCcw, Undo2 } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { SourceDocumentGuidance } from "@/components/documents/document-guidance";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerMetadataRow,
  LedgerMetricGrid,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { Textarea } from "@/components/ui/textarea";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { auditActionLabel, auditEntityTypeLabel, buildAuditLogQuery } from "@/lib/audit-logs";
import {
  canReverseCustomerPaymentUnappliedAllocation,
  applyCustomerPaymentUnappliedAllocation,
  customerPaymentAllocationState,
  type CustomerPaymentAllocationState,
  customerPaymentAllocationStateLabel,
  customerPaymentActiveUnappliedAppliedAmount,
  customerPaymentApplyMaximumAmount,
  customerPaymentDirectAllocatedAmount,
  customerPaymentReceiptPdfPath,
  customerPaymentStatusLabel,
  customerPaymentUnappliedAllocationStatusLabel,
  getCustomerPaymentReceiptData,
  reverseCustomerPaymentUnappliedAllocation,
  validateCustomerPaymentUnappliedAllocation,
} from "@/lib/customer-payments";
import { generatedDocumentStatusLabel } from "@/lib/documents";
import { formatMoneyAmount, formatUnits, parseDecimalToUnits } from "@/lib/money";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
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
  const searchParams = useSearchParams();
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
  const paymentDetailHref =
    payment ? `/sales/customer-payments/${payment.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}` : "";

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title={payment ? payment.paymentNumber : "Customer payment"}
        description="Payment posting, receipt output, invoice allocations, audit status, and unapplied credit review."
        badge={payment ? <LedgerStatusBadge tone={paymentStatusTone(payment.status)}>{customerPaymentStatusLabel(payment.status)}</LedgerStatusBadge> : null}
        actions={
          <LedgerActionBar>
            <LedgerButton href={returnTo || "/sales/customer-payments"} icon={ArrowLeft}>
              Back
            </LedgerButton>
            {payment?.status === "POSTED" && canVoidPaymentPermission ? (
              <LedgerButton type="button" variant="danger" icon={Undo2} onClick={() => void voidPayment()} disabled={actionLoading} className="self-start">
                Void
              </LedgerButton>
            ) : null}
            {payment?.status === "POSTED" && Number(payment.unappliedAmount) > 0 ? (
              <LedgerButton
                href={`/sales/customer-refunds/new?customerId=${encodeURIComponent(payment.customerId)}&sourceType=CUSTOMER_PAYMENT&sourcePaymentId=${encodeURIComponent(payment.id)}`}
                variant="primary"
              >
                Refund unapplied amount
              </LedgerButton>
            ) : null}
          </LedgerActionBar>
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
          {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load payments.</LedgerAlert> : null}
          {loading ? <StatusMessage type="loading">Loading customer payment...</StatusMessage> : null}
          {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
          {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        </div>

      {payment ? (
        <>
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

          <LedgerSection
            title="Direct invoice allocations"
            description="Amounts applied when this payment was posted."
            action={<LedgerStatusBadge tone="neutral">{(payment.allocations?.length ?? 0).toLocaleString()} direct</LedgerStatusBadge>}
          >
            {(payment.allocations?.length ?? 0) > 0 ? (
              <LedgerDataTable minWidth="760px">
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
                    <td className="px-4 py-3">{allocation.invoice ? <LedgerDate>{new Date(allocation.invoice.issueDate).toLocaleDateString()}</LedgerDate> : "-"}</td>
                    <td className="px-4 py-3">{allocation.invoice?.status ?? "-"}</td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(allocation.amountApplied, payment.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3">{allocation.invoice ? <LedgerMoney>{formatMoneyAmount(allocation.invoice.balanceDue, payment.currency)}</LedgerMoney> : "-"}</td>
                    <td className="px-4 py-3">
                      {allocation.invoice ? (
                        <LedgerButton href={`/sales/invoices/${allocation.invoice.id}${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`} size="sm">
                          View invoice
                        </LedgerButton>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              </LedgerDataTable>
            ) : (
              <LedgerEmptyState
                title="No direct invoice allocations"
                description="No direct invoice allocations were recorded when this payment was posted."
              />
            )}
          </LedgerSection>

          <LedgerSection
            title="Unapplied payment applications"
            description="Amounts matched from remaining payment credit to later invoices."
            action={<LedgerStatusBadge tone="neutral">{(payment.unappliedAllocations?.length ?? 0).toLocaleString()} applications</LedgerStatusBadge>}
          >
            {payment.unappliedAllocations && payment.unappliedAllocations.length > 0 ? (
              <LedgerDataTable minWidth="980px">
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
                      <td className="px-4 py-3">{allocation.invoice ? <LedgerDate>{new Date(allocation.invoice.issueDate).toLocaleDateString()}</LedgerDate> : "-"}</td>
                      <td className="px-4 py-3">{allocation.invoice ? <LedgerMoney>{formatMoneyAmount(allocation.invoice.total, payment.currency)}</LedgerMoney> : "-"}</td>
                      <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(allocation.amountApplied, payment.currency)}</LedgerMoney></td>
                      <td className="px-4 py-3">{allocation.invoice ? <LedgerMoney>{formatMoneyAmount(allocation.invoice.balanceDue, payment.currency)}</LedgerMoney> : "-"}</td>
                      <td className="px-4 py-3">
                        <LedgerStatusBadge tone={unappliedAllocationTone(allocation)}>
                          {customerPaymentUnappliedAllocationStatusLabel(allocation)}
                        </LedgerStatusBadge>
                      </td>
                      <td className="px-4 py-3">{allocation.reversedAt ? <LedgerDate>{new Date(allocation.reversedAt).toLocaleString()}</LedgerDate> : "-"}</td>
                      <td className="px-4 py-3 text-steel">{allocation.reversalReason ?? "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <LedgerButton href={`/sales/invoices/${allocation.invoiceId}${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`} size="sm">
                            View invoice
                          </LedgerButton>
                          {canReverseCustomerPaymentUnappliedAllocation(allocation) && canVoidPaymentPermission ? (
                            <LedgerButton type="button" variant="danger" size="sm" icon={RotateCcw} onClick={() => requestReverseUnappliedAllocation(allocation.id)} disabled={actionLoading}>
                              Reverse
                            </LedgerButton>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </LedgerDataTable>
            ) : null}
            {!payment.unappliedAllocations || payment.unappliedAllocations.length === 0 ? (
              <LedgerEmptyState
                title="No unapplied applications"
                description="No unapplied payment credit has been matched to another invoice."
              />
            ) : null}
          </LedgerSection>

          {pendingReverseAllocation ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
              <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="reverse-unapplied-title"
                onSubmit={reverseUnappliedAllocation}
                className="w-full max-w-lg"
              >
                <LedgerPanel className="p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 id="reverse-unapplied-title" className="text-base font-semibold text-ink">
                        Reverse unapplied allocation
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-steel">
                        This restores payment credit and the invoice balance without creating another journal entry.
                      </p>
                    </div>
                    <LedgerStatusBadge tone="danger">Confirmation required</LedgerStatusBadge>
                  </div>

                  <LedgerMetadataRow
                    items={[
                      { label: "Invoice", value: pendingReverseAllocation.invoice?.invoiceNumber ?? pendingReverseAllocation.invoiceId },
                      { label: "Amount", value: <LedgerMoney>{formatMoneyAmount(pendingReverseAllocation.amountApplied, payment.currency)}</LedgerMoney> },
                    ]}
                  />

                  <LedgerFieldLabel className="mt-4">
                    <LedgerFieldText>Reason (optional)</LedgerFieldText>
                    <Textarea
                      value={reverseReason}
                      onChange={(event) => setReverseReason(event.target.value)}
                      rows={3}
                      placeholder="Correction note for the audit trail"
                    />
                  </LedgerFieldLabel>

                  <LedgerActionBar className="mt-5 justify-end">
                    <LedgerButton type="button" onClick={cancelReverseUnappliedAllocation} disabled={actionLoading}>
                      Cancel
                    </LedgerButton>
                    <LedgerButton type="submit" variant="danger" icon={RotateCcw} disabled={actionLoading}>
                      Confirm reversal
                    </LedgerButton>
                  </LedgerActionBar>
                </LedgerPanel>
              </form>
            </div>
          ) : null}

          <LedgerSection
            title="Apply unapplied amount"
            description="Use remaining payment credit against finalized open invoices for the same customer."
            action={<LedgerStatusBadge tone="draft">No accounting journal</LedgerStatusBadge>}
          >
            {canApplyUnapplied ? (
              openInvoices.length > 0 ? (
                <form onSubmit={applyUnapplied} className="grid grid-cols-1 gap-4 text-sm md:grid-cols-[1.4fr_0.7fr_auto]">
                  <LedgerFieldLabel>
                    <LedgerFieldText>Open invoice</LedgerFieldText>
                    <LedgerSelect value={applyInvoiceId} onChange={(event) => setApplyInvoiceId(event.target.value)}>
                      {openInvoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - balance {formatMoneyAmount(invoice.balanceDue, invoice.currency)}
                        </option>
                      ))}
                    </LedgerSelect>
                  </LedgerFieldLabel>
                  <LedgerFieldLabel>
                    <LedgerFieldText>Amount to apply</LedgerFieldText>
                    <LedgerInput
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
                    />
                  </LedgerFieldLabel>
                  <LedgerButton type="submit" variant="primary" disabled={actionLoading || !applyInvoiceId || !applyAmount || Boolean(applyValidationError)} className="md:self-end">
                    Apply
                  </LedgerButton>
                  <div id="apply-unapplied-limits" className="md:col-span-3">
                    <LedgerSummaryBand tone="info">
                      Selected invoice balance: {selectedOpenInvoice ? formatMoneyAmount(selectedOpenInvoice.balanceDue, selectedOpenInvoice.currency) : "-"}.
                      Payment credit available: {formatMoneyAmount(payment.unappliedAmount, payment.currency)}.
                      Maximum application: {formatMoneyAmount(maxApplyAmount, payment.currency)}.
                    </LedgerSummaryBand>
                  </div>
                  {applyValidationError ? <div className="text-xs text-rosewood md:col-span-3">{applyValidationError}</div> : null}
                </form>
              ) : (
                <LedgerEmptyState title="No finalized open invoices" description="No finalized open invoices are available for this customer." />
              )
            ) : (
              <LedgerAlert tone="info">Unapplied amount can be applied only while the payment is posted and credit remains.</LedgerAlert>
            )}
          </LedgerSection>
        </>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
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
      <LedgerPanel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Payment state</h2>
            <p className="mt-1 text-sm text-steel">{paymentOutputStatus(payment)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LedgerStatusBadge tone={paymentStatusTone(payment.status)}>{customerPaymentStatusLabel(payment.status)}</LedgerStatusBadge>
            <LedgerStatusBadge tone={allocationStateTone(allocationState)}>{customerPaymentAllocationStateLabel(allocationState)}</LedgerStatusBadge>
          </div>
        </div>

        <LedgerMetricGrid className="mt-5">
          <StateMetric label="Amount received" value={formatMoneyAmount(payment.amountReceived, payment.currency)} />
          <StateMetric label="Unapplied amount" value={formatMoneyAmount(payment.unappliedAmount, payment.currency)} detail={customerPaymentAllocationStateLabel(allocationState)} />
          <StateMetric label="Directly allocated" value={formatMoneyAmount(directAllocatedAmount, payment.currency)} detail={`${directAllocationCount} invoice${directAllocationCount === 1 ? "" : "s"}`} />
          <StateMetric
            label="Applied from unapplied"
            value={formatMoneyAmount(unappliedAppliedAmount, payment.currency)}
            detail={`${activeUnappliedCount} active, ${reversedUnappliedCount} reversed`}
          />
        </LedgerMetricGrid>
      </LedgerPanel>

      <LedgerPanel>
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
      </LedgerPanel>
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
    <LedgerSection
      title="Receipt output"
      description="Generated receipt PDFs are archived only after an explicit receipt action."
      action={<LedgerStatusBadge tone={documents.length > 0 ? "success" : "neutral"}>{documents.length > 0 ? `${documents.length} archived` : "No archived receipt"}</LedgerStatusBadge>}
    >
        {!canViewGeneratedDocuments ? (
          <LedgerAlert tone="info">Generated document permission is required to view archived receipt output records.</LedgerAlert>
        ) : loading ? (
          <StatusMessage type="loading">Loading receipt archive state...</StatusMessage>
        ) : error ? (
          <LedgerAlert tone="info">Receipt archive state is unavailable: {error}</LedgerAlert>
        ) : documents.length === 0 ? (
          <LedgerEmptyState
            title="No receipt PDF has been generated or archived for this payment."
            description={
              <>
              Use the explicit receipt PDF action when a customer-facing receipt output is needed. Payment posting, allocation, reversal, and void actions do not create receipt PDFs automatically.
              </>
            }
          />
        ) : (
          <LedgerDataTable minWidth="720px">
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
                      <LedgerStatusBadge tone={generatedDocumentStatusTone(document.status)}>{generatedDocumentStatusLabel(document.status)}</LedgerStatusBadge>
                    </td>
                    <td className="px-4 py-3"><LedgerDate>{new Date(document.generatedAt).toLocaleString()}</LedgerDate></td>
                    <td className="px-4 py-3">
                      <LedgerButton href="/documents" size="sm">
                        Open archive
                      </LedgerButton>
                    </td>
                  </tr>
                ))}
              </tbody>
          </LedgerDataTable>
        )}
    </LedgerSection>
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
    <LedgerSection
      title="Audit status"
      description={latestLog ? `${auditActionLabel(latestLog.action)} on ${new Date(latestLog.createdAt).toLocaleString()}` : "Payment audit trail status."}
      action={<LedgerStatusBadge tone={badge.tone}>{badge.label}</LedgerStatusBadge>}
    >
        {!canViewAuditLogs ? (
          <LedgerAlert tone="info">Audit log permission is required to view customer payment audit events.</LedgerAlert>
        ) : loading ? (
          <StatusMessage type="loading">Loading payment audit status...</StatusMessage>
        ) : error ? (
          <LedgerAlert tone="info">Payment audit status is unavailable: {error}</LedgerAlert>
        ) : logs.length === 0 ? (
          <LedgerEmptyState title="No customer payment audit entries were returned for this payment." />
        ) : (
          <>
            <LedgerDataTable minWidth="760px">
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
                    <td className="px-4 py-3"><LedgerDate>{new Date(log.createdAt).toLocaleString()}</LedgerDate></td>
                  </tr>
                ))}
              </tbody>
            </LedgerDataTable>
            <div className="mt-3">
              <LedgerButton href={auditHref}>
                Open audit logs
              </LedgerButton>
            </div>
          </>
        )}
    </LedgerSection>
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
  const firstAllocatedInvoice = payment.allocations?.find((allocation) => allocation.invoice)?.invoice ?? null;
  const appliedTotalUnits = payment.allocations?.reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.amountApplied), 0) ?? 0;
  const hasUnapplied = Number(payment.unappliedAmount) > 0;

  return (
    <div className="space-y-4">
      {recorded ? (
        <LedgerAlert tone="success">
          Payment recorded. The receipt and allocation details below show what changed; linked invoice balances are updated.
        </LedgerAlert>
      ) : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <LedgerPanel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">What happened?</h2>
              <p className="mt-1 text-sm leading-6 text-steel">{paymentOutcomeDescription(payment, hasUnapplied)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LedgerStatusBadge tone={paymentStatusTone(payment.status)}>{customerPaymentStatusLabel(payment.status)}</LedgerStatusBadge>
              {hasUnapplied ? (
                <LedgerStatusBadge tone="warning">Unapplied credit</LedgerStatusBadge>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <Summary label="Amount received" value={formatMoneyAmount(payment.amountReceived, payment.currency)} />
            <Summary label="Applied to invoices" value={formatMoneyAmount(formatUnits(appliedTotalUnits), payment.currency)} />
            <Summary label="Payment number" value={receiptData?.receiptNumber ?? payment.paymentNumber} />
          </div>
        </LedgerPanel>

        <LedgerPanel>
          <h2 className="text-base font-semibold text-ink">Next actions</h2>
          <p className="mt-1 text-sm leading-6 text-steel">{paymentNextActionDescription(payment, hasUnapplied)}</p>
          <div className="mt-4 flex flex-col gap-2">
            {firstAllocatedInvoice ? (
              <LedgerButton
                href={`/sales/invoices/${firstAllocatedInvoice.id}${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`}
                variant="primary"
              >
                View invoice
              </LedgerButton>
            ) : null}
            <LedgerButton
              type="button"
              onClick={onPreviewReceiptData}
              disabled={actionLoading || loadingReceiptData}
              icon={Eye}
            >
              Preview receipt
            </LedgerButton>
            <LedgerButton
              type="button"
              onClick={onDownloadReceiptPdf}
              disabled={actionLoading || loadingReceiptData}
              icon={Download}
            >
              Download receipt PDF
            </LedgerButton>
            <p className="text-xs leading-5 text-steel">
              Downloading the PDF uses the explicit receipt PDF route and may archive a generated receipt record. Payment posting and allocation actions do not create receipts automatically.
            </p>
            <LedgerButton href={partyDetailHref("customer", payment.customerId)}>
              Open customer workspace
            </LedgerButton>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <LedgerButton
                href={`/reports/aged-receivables${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`}
              >
                AR report
              </LedgerButton>
              <LedgerButton href="/dashboard">
                Dashboard
              </LedgerButton>
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
              <div className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-palm" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-ink">Receipt preview</h3>
              </div>
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
        </LedgerPanel>
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
      <LedgerStatusBadge tone={journalStatusTone(journal.status)}>{journal.status}</LedgerStatusBadge>
    </span>
  );
}

function paymentStatusTone(status: CustomerPayment["status"]): LedgerStatusTone {
  switch (status) {
    case "POSTED":
      return "success";
    case "VOIDED":
      return "danger";
    case "DRAFT":
      return "draft";
  }
}

function allocationStateTone(state: CustomerPaymentAllocationState): LedgerStatusTone {
  switch (state) {
    case "FULLY_APPLIED":
      return "success";
    case "PARTIALLY_UNAPPLIED":
      return "warning";
    case "NO_ALLOCATIONS":
      return "neutral";
  }
}

function unappliedAllocationTone(
  allocation: Pick<NonNullable<CustomerPayment["unappliedAllocations"]>[number], "reversedAt">,
): LedgerStatusTone {
  return allocation.reversedAt ? "neutral" : "success";
}

function generatedDocumentStatusTone(status: GeneratedDocument["status"]): LedgerStatusTone {
  switch (status) {
    case "GENERATED":
      return "success";
    case "FAILED":
      return "danger";
    case "SUPERSEDED":
      return "warning";
  }
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

function journalStatusTone(status: NonNullable<CustomerPayment["journalEntry"]>["status"]): LedgerStatusTone {
  switch (status) {
    case "POSTED":
      return "success";
    case "REVERSED":
      return "neutral";
    case "DRAFT":
      return "warning";
    default:
      return "neutral";
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
): { label: string; tone: LedgerStatusTone } {
  if (!canViewAuditLogs) {
    return { label: "Permission required", tone: "neutral" };
  }
  if (loading) {
    return { label: "Loading", tone: "neutral" };
  }
  if (error) {
    return { label: "Unavailable", tone: "warning" };
  }
  if (logs.length === 0) {
    return { label: "No events", tone: "neutral" };
  }
  return { label: `${logs.length} event${logs.length === 1 ? "" : "s"}`, tone: "success" };
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
