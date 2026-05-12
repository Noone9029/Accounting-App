"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import type { PurchaseBill } from "@/lib/types";

export default function PurchaseBillsPage() {
  const organizationId = useActiveOrganizationId();
  const [bills, setBills] = useState<PurchaseBill[]>([]);
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

    apiRequest<PurchaseBill[]>("/purchase-bills")
      .then((result) => {
        if (!cancelled) {
          setBills(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load purchase bills.");
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

  async function finalizeBill(bill: PurchaseBill) {
    setActionId(bill.id);
    setError("");
    setSuccess("");

    try {
      const finalized = await apiRequest<PurchaseBill>(`/purchase-bills/${bill.id}/finalize`, { method: "POST" });
      setSuccess(`Finalized bill ${finalized.billNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to finalize purchase bill.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Purchase bills</h1>
          <p className="mt-1 text-sm text-steel">Supplier bills, AP status, and balance due tracking.</p>
        </div>
        <Link href="/purchases/bills/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
          Create bill
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load purchase bills.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase bills...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && bills.length === 0 ? <StatusMessage type="empty">No purchase bills found.</StatusMessage> : null}
      </div>

      {bills.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Bill date</th>
                <th className="px-4 py-3">Due date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Balance due</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td className="px-4 py-3 font-mono text-xs">{bill.billNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{bill.supplier?.displayName ?? bill.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(bill.billDate, "-")}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(bill.dueDate, "-")}</td>
                  <td className="px-4 py-3 text-steel">{bill.status}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(bill.total, bill.currency)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(bill.balanceDue, bill.currency)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{bill.journalEntry ? `${bill.journalEntry.entryNumber} (${bill.journalEntry.id})` : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/purchases/bills/${bill.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        View
                      </Link>
                      {bill.status === "DRAFT" ? (
                        <button type="button" onClick={() => void finalizeBill(bill)} disabled={actionId === bill.id} className="rounded-md bg-palm px-2 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
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
