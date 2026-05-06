"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { deriveInvoicePaymentState, formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import type { SalesInvoice } from "@/lib/types";

export default function SalesInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
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

    apiRequest<SalesInvoice>(`/sales-invoices/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setInvoice(result);
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

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{invoice ? invoice.invoiceNumber : "Sales invoice"}</h1>
          <p className="mt-1 text-sm text-steel">Invoice detail, calculated totals, and linked journal entry.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/invoices" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {invoice?.status === "DRAFT" ? (
            <Link href={`/sales/invoices/${invoice.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Edit
            </Link>
          ) : null}
          {invoice?.status === "FINALIZED" && invoice.customerId ? (
            <Link href={`/sales/customer-payments/new?customerId=${invoice.customerId}&invoiceId=${invoice.id}`} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
              Record payment
            </Link>
          ) : null}
          {invoice?.status === "DRAFT" ? (
            <button type="button" onClick={() => void runAction("finalize")} disabled={actionLoading} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              Finalize
            </button>
          ) : null}
          {invoice && invoice.status !== "VOIDED" ? (
            <button type="button" onClick={() => void runAction("void")} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Void
            </button>
          ) : null}
          {invoice?.status === "DRAFT" ? (
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
              {invoice.status === "FINALIZED" ? (
                <Link href={`/sales/customer-payments/new?customerId=${invoice.customerId}&invoiceId=${invoice.id}`} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
                  Record payment
                </Link>
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
