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
import {
  canReverseCustomerPaymentUnappliedAllocation,
  applyCustomerPaymentUnappliedAllocation,
  customerPaymentActiveUnappliedAppliedAmount,
  customerPaymentApplyMaximumAmount,
  customerPaymentDirectAllocatedAmount,
  customerPaymentUnappliedAllocationStatusBadgeClass,
  customerPaymentUnappliedAllocationStatusLabel,
  reverseCustomerPaymentUnappliedAllocation,
  validateCustomerPaymentUnappliedAllocation,
} from "@/lib/customer-payments";
import { formatMoneyAmount, formatUnits, parseDecimalToUnits } from "@/lib/money";
import { downloadPdf, receiptPdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { CustomerPayment, CustomerPaymentReceiptData, OpenSalesInvoice } from "@/lib/types";

export default function CustomerPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [payment, setPayment] = useState<CustomerPayment | null>(null);
  const [openInvoices, setOpenInvoices] = useState<OpenSalesInvoice[]>([]);
  const [applyInvoiceId, setApplyInvoiceId] = useState("");
  const [applyAmount, setApplyAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [wasJustRecorded, setWasJustRecorded] = useState(false);

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
    if (!organizationId || !payment || payment.status !== "POSTED") {
      setOpenInvoices([]);
      return;
    }

    let cancelled = false;
    apiRequest<OpenSalesInvoice[]>(`/sales-invoices/open?customerId=${encodeURIComponent(payment.customerId)}`)
      .then((result) => {
        if (!cancelled) {
          setOpenInvoices(result);
          setApplyInvoiceId((current) => current || result[0]?.id || "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpenInvoices([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, payment]);

  async function refreshPayment() {
    if (!params.id) {
      return;
    }
    const paymentResult = await apiRequest<CustomerPayment>(`/customer-payments/${params.id}`);
    setPayment(paymentResult);
  }

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

  async function reverseUnappliedAllocation(allocationId: string) {
    if (!payment) {
      return;
    }
    const reason = window.prompt("Reason for reversing this unapplied payment allocation?") ?? "";
    if (!window.confirm(`Reverse allocation on ${payment.paymentNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await reverseCustomerPaymentUnappliedAllocation(payment.id, allocationId, { reason });
      setPayment(updated);
      await refreshPayment();
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
      await downloadPdf(receiptPdfPath(payment.id), `receipt-${payment.paymentNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download receipt PDF.");
    } finally {
      setActionLoading(false);
    }
  }

  const selectedOpenInvoice = openInvoices.find((invoice) => invoice.id === applyInvoiceId);
  const canCreatePayment = can(PERMISSIONS.customerPayments.create);
  const canVoidPaymentPermission = can(PERMISSIONS.customerPayments.void);
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
            receiptData={null}
            actionLoading={actionLoading}
            onDownloadReceiptPdf={() => void downloadReceiptPdf()}
          />

          <AttachmentPanel linkedEntityType="CUSTOMER_PAYMENT" linkedEntityId={payment.id} />

          <CustomerPaymentStateDisplay payment={payment} />

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
                  No direct invoice allocations were returned for this payment.
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
                              <button type="button" onClick={() => void reverseUnappliedAllocation(allocation.id)} disabled={actionLoading} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
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
                <StatusMessage type="empty">No unapplied payment credit has been matched to later invoices.</StatusMessage>
              </div>
            )}
          </div>

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
          <span className={`self-start rounded-md px-2 py-1 text-xs font-semibold ${customerPaymentStatusBadgeClass(payment.status)}`}>
            {customerPaymentStatusLabel(payment.status)}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <StateMetric label="Amount received" value={formatMoneyAmount(payment.amountReceived, payment.currency)} />
          <StateMetric label="Unapplied amount" value={formatMoneyAmount(payment.unappliedAmount, payment.currency)} />
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

export function CustomerPaymentWorkflowGuidance({
  payment,
  recorded,
  receiptData,
  actionLoading,
  onDownloadReceiptPdf,
}: {
  payment: CustomerPayment;
  recorded: boolean;
  receiptData: CustomerPaymentReceiptData | null;
  actionLoading: boolean;
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
            <Summary label="Receipt" value={receiptData?.receiptNumber ?? payment.paymentNumber} />
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
              onClick={onDownloadReceiptPdf}
              disabled={actionLoading}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Download receipt PDF
            </button>
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

function customerPaymentStatusLabel(status: CustomerPayment["status"]): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "POSTED":
      return "Posted";
    case "VOIDED":
      return "Voided";
  }
}

function customerPaymentStatusBadgeClass(status: CustomerPayment["status"]): string {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";
    case "VOIDED":
      return "bg-rose-50 text-rosewood";
  }
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
