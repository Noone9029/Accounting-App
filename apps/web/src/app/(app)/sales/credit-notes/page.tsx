"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { creditNoteStatusBadgeClass, creditNoteStatusLabel } from "@/lib/credit-notes";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { CreditNote, CreditNoteStatus } from "@/lib/types";

type StatusFilter = "ALL" | CreditNoteStatus;

export default function CreditNotesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [customerSearch, setCustomerSearch] = useState("");
  const canCreateCreditNote = can(PERMISSIONS.creditNotes.create);
  const canFinalizeCreditNote = can(PERMISSIONS.creditNotes.finalize);

  const filteredCreditNotes = useMemo(() => {
    const normalizedSearch = customerSearch.trim().toLowerCase();
    return creditNotes.filter((creditNote) => {
      const statusMatches = statusFilter === "ALL" || creditNote.status === statusFilter;
      const customerName = creditNote.customer?.displayName ?? creditNote.customer?.name ?? "";
      const customerMatches = !normalizedSearch || customerName.toLowerCase().includes(normalizedSearch);
      return statusMatches && customerMatches;
    });
  }, [creditNotes, customerSearch, statusFilter]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<CreditNote[]>("/credit-notes")
      .then((result) => {
        if (!cancelled) {
          setCreditNotes(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load credit notes.");
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

  async function finalizeCreditNote(creditNote: CreditNote) {
    setActionId(creditNote.id);
    setError("");
    setSuccess("");

    try {
      const finalized = await apiRequest<CreditNote>(`/credit-notes/${creditNote.id}/finalize`, { method: "POST" });
      setSuccess(`Finalized credit note ${finalized.creditNoteNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to finalize credit note.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Sales credit notes</h1>
          <p className="mt-1 text-sm text-steel">Customer credit notes, revenue reversal posting, and PDF downloads.</p>
        </div>
        {canCreateCreditNote ? (
          <Link href="/sales/credit-notes/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Create credit note
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load credit notes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading credit notes...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && creditNotes.length === 0 ? <StatusMessage type="empty">No credit notes found.</StatusMessage> : null}
      </div>

      {creditNotes.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="ALL">All</option>
              <option value="DRAFT">Draft</option>
              <option value="FINALIZED">Finalized</option>
              <option value="VOIDED">Voided</option>
            </select>
          </label>
          <label className="block min-w-64">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Customer</span>
            <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customer" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
      ) : null}

      {creditNotes.length > 0 && filteredCreditNotes.length === 0 ? (
        <div className="mt-5">
          <StatusMessage type="empty">No credit notes match the current filters.</StatusMessage>
        </div>
      ) : null}

      {filteredCreditNotes.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Original invoice</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Unapplied</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCreditNotes.map((creditNote) => (
                <tr key={creditNote.id}>
                  <td className="px-4 py-3 font-mono text-xs">{creditNote.creditNoteNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{creditNote.customer?.displayName ?? creditNote.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{new Date(creditNote.issueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${creditNoteStatusBadgeClass(creditNote.status)}`}>{creditNoteStatusLabel(creditNote.status)}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{creditNote.originalInvoice?.invoiceNumber ?? "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(creditNote.total, creditNote.currency)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(creditNote.unappliedAmount, creditNote.currency)}</td>
                  <td className="px-4 py-3 text-steel">{creditNote.journalEntry ? creditNote.journalEntry.status : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/sales/credit-notes/${creditNote.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        View
                      </Link>
                      {creditNote.status === "DRAFT" && canFinalizeCreditNote ? (
                        <button type="button" onClick={() => void finalizeCreditNote(creditNote)} disabled={actionId === creditNote.id} className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-teal-50 disabled:cursor-not-allowed disabled:text-slate-400">
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
