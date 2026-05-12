"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { purchaseDebitNoteStatusLabel } from "@/lib/purchase-debit-notes";
import type { PurchaseDebitNote } from "@/lib/types";

export default function PurchaseDebitNotesPage() {
  const organizationId = useActiveOrganizationId();
  const [debitNotes, setDebitNotes] = useState<PurchaseDebitNote[]>([]);
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

    apiRequest<PurchaseDebitNote[]>("/purchase-debit-notes")
      .then((result) => {
        if (!cancelled) {
          setDebitNotes(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load debit notes.");
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

  async function finalizeDebitNote(debitNote: PurchaseDebitNote) {
    setActionId(debitNote.id);
    setError("");
    setSuccess("");

    try {
      const finalized = await apiRequest<PurchaseDebitNote>(`/purchase-debit-notes/${debitNote.id}/finalize`, { method: "POST" });
      setSuccess(`Finalized debit note ${finalized.debitNoteNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to finalize debit note.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Debit notes</h1>
          <p className="mt-1 text-sm text-steel">Supplier credits, purchase returns, and AP adjustment tracking.</p>
        </div>
        <Link href="/purchases/debit-notes/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
          Create debit note
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load debit notes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading debit notes...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && debitNotes.length === 0 ? <StatusMessage type="empty">No purchase debit notes found.</StatusMessage> : null}
      </div>

      {debitNotes.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Issue date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Unapplied</th>
                <th className="px-4 py-3">Original bill</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {debitNotes.map((debitNote) => (
                <tr key={debitNote.id}>
                  <td className="px-4 py-3 font-mono text-xs">{debitNote.debitNoteNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{debitNote.supplier?.displayName ?? debitNote.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(debitNote.issueDate, "-")}</td>
                  <td className="px-4 py-3 text-steel">{purchaseDebitNoteStatusLabel(debitNote.status)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(debitNote.total, debitNote.currency)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(debitNote.unappliedAmount, debitNote.currency)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{debitNote.originalBill?.billNumber ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/purchases/debit-notes/${debitNote.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        View
                      </Link>
                      {debitNote.status === "DRAFT" ? (
                        <button type="button" onClick={() => void finalizeDebitNote(debitNote)} disabled={actionId === debitNote.id} className="rounded-md bg-palm px-2 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
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
