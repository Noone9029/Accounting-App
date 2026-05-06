"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatMoneyAmount } from "@/lib/money";
import type { SalesInvoice } from "@/lib/types";

export default function SalesInvoicesPage() {
  const organizationId = useActiveOrganizationId();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SalesInvoice[]>("/sales-invoices")
      .then((result) => {
        if (!cancelled) {
          setInvoices(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load sales invoices.");
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
  }, [organizationId, reloadToken]);

  async function finalizeInvoice(invoice: SalesInvoice) {
    setActionId(invoice.id);
    setError("");
    setSuccess("");

    try {
      const finalized = await apiRequest<SalesInvoice>(`/sales-invoices/${invoice.id}/finalize`, { method: "POST" });
      setSuccess(`Finalized invoice ${finalized.invoiceNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to finalize invoice.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Sales invoices</h1>
          <p className="mt-1 text-sm text-steel">Draft and finalized customer invoices from the live API.</p>
        </div>
        <Link href="/sales/invoices/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
          Create invoice
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load invoices.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading sales invoices...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && invoices.length === 0 ? <StatusMessage type="empty">No sales invoices found.</StatusMessage> : null}
      </div>

      {invoices.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Balance due</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-mono text-xs">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{invoice.customer?.displayName ?? invoice.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-steel">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-steel">{invoice.status}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(invoice.total, invoice.currency)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(invoice.balanceDue, invoice.currency)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/sales/invoices/${invoice.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        View
                      </Link>
                      {invoice.status === "DRAFT" ? (
                        <button type="button" onClick={() => void finalizeInvoice(invoice)} disabled={actionId === invoice.id} className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-teal-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          Finalize
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
