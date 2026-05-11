"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatMoneyAmount } from "@/lib/money";
import { downloadPdf, receiptPdfPath } from "@/lib/pdf-download";
import type { CustomerPayment, CustomerPaymentReceiptData } from "@/lib/types";

export default function CustomerPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [payment, setPayment] = useState<CustomerPayment | null>(null);
  const [receiptData, setReceiptData] = useState<CustomerPaymentReceiptData | null>(null);
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

  async function voidPayment() {
    if (!payment || !window.confirm(`Void customer payment ${payment.paymentNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<CustomerPayment>(`/customer-payments/${payment.id}/void`, { method: "POST" });
      const receipt = await apiRequest<CustomerPaymentReceiptData>(`/customer-payments/${payment.id}/receipt-data`);
      setPayment(updated);
      setReceiptData(receipt);
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

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{payment ? payment.paymentNumber : "Customer payment"}</h1>
          <p className="mt-1 text-sm text-steel">Payment posting, allocations, and reversal reference.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/customer-payments" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {payment?.status === "POSTED" ? (
            <button type="button" onClick={() => void voidPayment()} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Void
            </button>
          ) : null}
          {payment?.status === "POSTED" && Number(payment.unappliedAmount) > 0 ? (
            <Link
              href={`/sales/customer-refunds/new?customerId=${encodeURIComponent(payment.customerId)}&sourceType=CUSTOMER_PAYMENT&sourcePaymentId=${encodeURIComponent(payment.id)}`}
              className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
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
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Customer" value={payment.customer?.displayName ?? payment.customer?.name ?? "-"} />
              <Summary label="Status" value={payment.status} />
              <Summary label="Date" value={new Date(payment.paymentDate).toLocaleDateString()} />
              <Summary label="Currency" value={payment.currency} />
              <Summary label="Amount received" value={formatMoneyAmount(payment.amountReceived, payment.currency)} />
              <Summary label="Unapplied" value={formatMoneyAmount(payment.unappliedAmount, payment.currency)} />
              <Summary label="Paid-through account" value={payment.account ? `${payment.account.code} ${payment.account.name}` : "-"} />
              <Summary label="Journal entry" value={payment.journalEntry ? `${payment.journalEntry.entryNumber} (${payment.journalEntry.id})` : "-"} />
              <Summary label="Void reversal journal" value={payment.voidReversalJournalEntry ? `${payment.voidReversalJournalEntry.entryNumber} (${payment.voidReversalJournalEntry.id})` : "-"} />
              <Summary label="Posted" value={payment.postedAt ? new Date(payment.postedAt).toLocaleString() : "-"} />
              <Summary label="Voided" value={payment.voidedAt ? new Date(payment.voidedAt).toLocaleString() : "-"} />
              <Summary label="Description" value={payment.description ?? "-"} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full text-left text-sm">
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
                <StatusMessage type="empty">No allocations found for this payment.</StatusMessage>
              </div>
            ) : null}
          </div>

          {receiptData ? (
            <div className="rounded-md border border-slate-200 bg-white shadow-panel">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">Receipt data preview</h2>
                  <p className="mt-1 text-sm text-steel">Structured receipt payload for future PDF rendering. Downloads are archived automatically.</p>
                </div>
                <button type="button" onClick={() => void downloadReceiptPdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
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
                <table className="w-full text-left text-sm">
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
