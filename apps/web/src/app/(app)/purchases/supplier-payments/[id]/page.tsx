"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { downloadPdf, supplierPaymentReceiptPdfPath } from "@/lib/pdf-download";
import type { SupplierPayment } from "@/lib/types";

export default function SupplierPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [payment, setPayment] = useState<SupplierPayment | null>(null);
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

    apiRequest<SupplierPayment>(`/supplier-payments/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setPayment(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load supplier payment.");
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
    if (!payment || !window.confirm(`Void supplier payment ${payment.paymentNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<SupplierPayment>(`/supplier-payments/${payment.id}/void`, { method: "POST" });
      setPayment(updated);
      setSuccess(`Voided supplier payment ${updated.paymentNumber}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to void supplier payment.");
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
      await downloadPdf(supplierPaymentReceiptPdfPath(payment.id), `supplier-payment-${payment.paymentNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download supplier payment receipt.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{payment ? payment.paymentNumber : "Supplier payment"}</h1>
          <p className="mt-1 text-sm text-steel">Supplier payment detail, bill allocations, and receipt PDF.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/purchases/supplier-payments" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {payment?.supplierId ? (
            <Link href={`/contacts/${payment.supplierId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Supplier ledger
            </Link>
          ) : null}
          {payment ? (
            <button type="button" onClick={() => void downloadReceiptPdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Download receipt
            </button>
          ) : null}
          {payment?.status === "POSTED" ? (
            <button type="button" onClick={() => void voidPayment()} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Void
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load supplier payments.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading supplier payment...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {payment ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Supplier" value={payment.supplier?.displayName ?? payment.supplier?.name ?? "-"} />
              <Summary label="Status" value={payment.status} />
              <Summary label="Payment date" value={formatOptionalDate(payment.paymentDate, "-")} />
              <Summary label="Amount paid" value={formatMoneyAmount(payment.amountPaid, payment.currency)} />
              <Summary label="Unapplied" value={formatMoneyAmount(payment.unappliedAmount, payment.currency)} />
              <Summary label="Paid through" value={payment.account ? `${payment.account.code} ${payment.account.name}` : "-"} />
              <Summary label="Journal entry" value={payment.journalEntry ? `${payment.journalEntry.entryNumber} (${payment.journalEntry.id})` : "-"} />
              <Summary label="Void reversal" value={payment.voidReversalJournalEntry ? `${payment.voidReversalJournalEntry.entryNumber} (${payment.voidReversalJournalEntry.id})` : "-"} />
            </div>
            {payment.description ? <p className="mt-4 text-sm text-steel">{payment.description}</p> : null}
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Bill</th>
                  <th className="px-4 py-3">Bill date</th>
                  <th className="px-4 py-3">Bill total</th>
                  <th className="px-4 py-3">Applied</th>
                  <th className="px-4 py-3">Bill balance due</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payment.allocations?.length ? (
                  payment.allocations.map((allocation) => (
                    <tr key={allocation.id}>
                      <td className="px-4 py-3">
                        <Link href={`/purchases/bills/${allocation.billId}`} className="font-mono text-xs text-palm hover:underline">
                          {allocation.bill?.billNumber ?? allocation.billId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-steel">{formatOptionalDate(allocation.bill?.billDate, "-")}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.bill?.total ?? "0.0000", payment.currency)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, payment.currency)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.bill?.balanceDue ?? "0.0000", payment.currency)}</td>
                      <td className="px-4 py-3 text-steel">{allocation.bill?.status ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-5 text-center text-steel">
                      This supplier payment has no bill allocations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  );
}
