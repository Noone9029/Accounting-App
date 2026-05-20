"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  canReverseCustomerPaymentUnappliedAllocation,
  customerPaymentActiveUnappliedAppliedAmount,
  customerPaymentUnappliedAllocationStatusBadgeClass,
  customerPaymentUnappliedAllocationStatusLabel,
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
  const [receiptData, setReceiptData] = useState<CustomerPaymentReceiptData | null>(null);
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

    Promise.all([
      apiRequest<CustomerPayment>(`/customer-payments/${params.id}`),
      apiRequest<CustomerPaymentReceiptData>(`/customer-payments/${params.id}/receipt-data`),
    ])
      .then(([paymentResult, receiptResult]) => {
        if (!cancelled) {
          setPayment(paymentResult);
          setReceiptData(receiptResult);
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
    const [paymentResult, receiptResult] = await Promise.all([
      apiRequest<CustomerPayment>(`/customer-payments/${params.id}`),
      apiRequest<CustomerPaymentReceiptData>(`/customer-payments/${params.id}/receipt-data`),
    ]);
    setPayment(paymentResult);
    setReceiptData(receiptResult);
  }

  async function applyUnapplied(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payment) {
      return;
    }

    const targetInvoice = openInvoices.find((invoice) => invoice.id === applyInvoiceId);
    const validationError = validateCustomerPaymentUnappliedAllocation(
      applyAmount,
      payment.unappliedAmount,
      targetInvoice?.balanceDue ?? "0.0000",
    );
    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<CustomerPayment>(`/customer-payments/${payment.id}/apply-unapplied`, {
        method: "POST",
        body: { invoiceId: applyInvoiceId, amountApplied: applyAmount },
      });
      setPayment(updated);
      setReceiptData(await apiRequest<CustomerPaymentReceiptData>(`/customer-payments/${payment.id}/receipt-data`));
      setApplyAmount("");
      setApplyInvoiceId("");
      setSuccess(`Applied ${formatMoneyAmount(applyAmount, payment.currency)} from ${payment.paymentNumber}.`);
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
      const updated = await apiRequest<CustomerPayment>(`/customer-payments/${payment.id}/unapplied-allocations/${allocationId}/reverse`, {
        method: "POST",
        body: { reason },
      });
      setPayment(updated);
      setReceiptData(await apiRequest<CustomerPaymentReceiptData>(`/customer-payments/${payment.id}/receipt-data`));
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

  const unappliedAppliedAmount = payment ? customerPaymentActiveUnappliedAppliedAmount(payment.unappliedAllocations) : "0.0000";
  const selectedOpenInvoice = openInvoices.find((invoice) => invoice.id === applyInvoiceId);
  const canCreatePayment = can(PERMISSIONS.customerPayments.create);
  const canVoidPaymentPermission = can(PERMISSIONS.customerPayments.void);
  const canApplyUnapplied = payment?.status === "POSTED" && Number(payment.unappliedAmount) > 0 && canCreatePayment;

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
            onDownloadReceiptPdf={() => void downloadReceiptPdf()}
          />

          <AttachmentPanel linkedEntityType="CUSTOMER_PAYMENT" linkedEntityId={payment.id} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Customer" value={payment.customer?.displayName ?? payment.customer?.name ?? "-"} />
              <Summary label="Status" value={payment.status} />
              <Summary label="Date" value={new Date(payment.paymentDate).toLocaleDateString()} />
              <Summary label="Currency" value={payment.currency} />
              <Summary label="Amount received" value={formatMoneyAmount(payment.amountReceived, payment.currency)} />
              <Summary label="Unapplied" value={formatMoneyAmount(payment.unappliedAmount, payment.currency)} />
              <Summary label="Applied from unapplied" value={formatMoneyAmount(unappliedAppliedAmount, payment.currency)} />
              <Summary label="Paid-through account" value={payment.account ? `${payment.account.code} ${payment.account.name}` : "-"} />
              <Summary label="Journal entry" value={payment.journalEntry ? `${payment.journalEntry.entryNumber} (${payment.journalEntry.id})` : "-"} />
              <Summary label="Void reversal journal" value={payment.voidReversalJournalEntry ? `${payment.voidReversalJournalEntry.entryNumber} (${payment.voidReversalJournalEntry.id})` : "-"} />
              <Summary label="Posted" value={payment.postedAt ? new Date(payment.postedAt).toLocaleString() : "-"} />
              <Summary label="Voided" value={payment.voidedAt ? new Date(payment.voidedAt).toLocaleString() : "-"} />
              <Summary label="Description" value={payment.description ?? "-"} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
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
            {payment.allocations?.length === 0 ? (
              <div className="px-4 py-5">
                <StatusMessage type="empty">
                  No invoice allocations found for this payment. If money remains unapplied, match it to an open invoice or refund it from the actions above.
                </StatusMessage>
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Unapplied payment applications</h2>
              <p className="mt-1 text-sm text-steel">Matching unapplied payment credit to later invoices updates balances only. No new journal entry is created.</p>
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
                    <input value={applyAmount} onChange={(event) => setApplyAmount(event.target.value)} placeholder="0.0000" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <button type="submit" disabled={actionLoading || !applyInvoiceId} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 md:self-end">
                    Apply
                  </button>
                  <div className="text-xs text-steel md:col-span-3">
                    Selected invoice balance: {selectedOpenInvoice ? formatMoneyAmount(selectedOpenInvoice.balanceDue, selectedOpenInvoice.currency) : "-"}.
                    Payment credit available: {formatMoneyAmount(payment.unappliedAmount, payment.currency)}.
                  </div>
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

          {receiptData ? (
            <div className="rounded-md border border-slate-200 bg-white shadow-panel">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink">Receipt data preview</h2>
                  <p className="mt-1 text-sm text-steel">Structured receipt payload for future PDF rendering. Downloads are archived automatically.</p>
                </div>
                <button type="button" onClick={() => void downloadReceiptPdf()} disabled={actionLoading} className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  Download receipt PDF
                </button>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                  <Summary label="Receipt number" value={receiptData.receiptNumber} />
                  <Summary label="Customer" value={receiptData.customer.displayName ?? receiptData.customer.name} />
                  <Summary label="Payment date" value={new Date(receiptData.paymentDate).toLocaleDateString()} />
                  <Summary label="Status" value={receiptData.status} />
                  <Summary label="Amount received" value={formatMoneyAmount(receiptData.amountReceived, receiptData.currency)} />
                  <Summary label="Unapplied" value={formatMoneyAmount(receiptData.unappliedAmount, receiptData.currency)} />
                  <Summary label="Paid through" value={`${receiptData.paidThroughAccount.code} ${receiptData.paidThroughAccount.name}`} />
                  <Summary label="Journal entry" value={receiptData.journalEntry ? `${receiptData.journalEntry.entryNumber} (${receiptData.journalEntry.id})` : "-"} />
                </div>
              </div>
              <div className="overflow-x-auto border-t border-slate-200">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Invoice date</th>
                      <th className="px-4 py-3">Invoice total</th>
                      <th className="px-4 py-3">Amount applied</th>
                      <th className="px-4 py-3">Invoice balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptData.allocations.map((allocation) => (
                      <tr key={allocation.invoiceId}>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.invoiceNumber}</td>
                        <td className="px-4 py-3 text-steel">{new Date(allocation.invoiceDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.invoiceTotal, receiptData.currency)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, receiptData.currency)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.invoiceBalanceDue, receiptData.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {receiptData.allocations.length === 0 ? (
                  <div className="px-4 py-5">
                    <StatusMessage type="empty">No invoice allocations are included in this receipt data.</StatusMessage>
                  </div>
                ) : null}
              </div>
              <div className="overflow-x-auto border-t border-slate-200">
                <table className="w-full min-w-[840px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">Unapplied invoice</th>
                      <th className="px-4 py-3">Invoice date</th>
                      <th className="px-4 py-3">Invoice total</th>
                      <th className="px-4 py-3">Amount applied</th>
                      <th className="px-4 py-3">Invoice balance</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptData.unappliedAllocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.invoiceNumber}</td>
                        <td className="px-4 py-3 text-steel">{new Date(allocation.invoiceDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.invoiceTotal, receiptData.currency)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, receiptData.currency)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.invoiceBalanceDue, receiptData.currency)}</td>
                        <td className="px-4 py-3 text-steel">{allocation.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {receiptData.unappliedAllocations.length === 0 ? (
                  <div className="px-4 py-5">
                    <StatusMessage type="empty">No unapplied credit applications are included in this receipt data.</StatusMessage>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
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
              Download receipt
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
        </div>
      </div>
    </div>
  );
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
