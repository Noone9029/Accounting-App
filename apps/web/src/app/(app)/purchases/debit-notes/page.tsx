"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import { purchaseDebitNoteStatusLabel } from "@/lib/purchase-debit-notes";
import type { PurchaseDebitNote } from "@/lib/types";

export default function PurchaseDebitNotesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [debitNotes, setDebitNotes] = useState<PurchaseDebitNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreateDebitNote = can(PERMISSIONS.purchaseDebitNotes.create);
  const canFinalizeDebitNote = can(PERMISSIONS.purchaseDebitNotes.finalize);

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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load debit notes."));
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
  }, [organizationId, reloadToken, tc]);

  async function finalizeDebitNote(debitNote: PurchaseDebitNote) {
    setActionId(debitNote.id);
    setError("");
    setSuccess("");

    try {
      const finalized = await apiRequest<PurchaseDebitNote>(`/purchase-debit-notes/${debitNote.id}/finalize`, { method: "POST" });
      setSuccess(tc("Finalized debit note {number}.", { number: finalized.debitNoteNumber }));
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to finalize debit note."));
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Debit notes")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Supplier credits, purchase returns, and AP adjustment tracking.")}</p>
        </div>
        {canCreateDebitNote ? (
          <Link href="/purchases/debit-notes/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            {tc("Create debit note")}
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load debit notes.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading debit notes...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && debitNotes.length === 0 ? <StatusMessage type="empty">{tc("No purchase debit notes found.")}</StatusMessage> : null}
      </div>

      {debitNotes.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1080px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{tc("Number")}</th>
                <th className="px-4 py-3">{tc("Supplier")}</th>
                <th className="px-4 py-3">{tc("Issue date")}</th>
                <th className="px-4 py-3">{tc("Status")}</th>
                <th className="px-4 py-3">{tc("Total")}</th>
                <th className="px-4 py-3">{tc("Unapplied")}</th>
                <th className="px-4 py-3">{tc("Original bill")}</th>
                <th className="px-4 py-3">{tc("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {debitNotes.map((debitNote) => (
                <tr key={debitNote.id}>
                  <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{debitNote.debitNoteNumber}</bdi></td>
                  <td className="px-4 py-3 font-medium text-ink">{debitNote.supplier?.displayName ?? debitNote.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(debitNote.issueDate, locale, "-")}</td>
                  <td className="px-4 py-3 text-steel">{tc(purchaseDebitNoteStatusLabel(debitNote.status))}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(debitNote.total, debitNote.currency, locale)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(debitNote.unappliedAmount, debitNote.currency, locale)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{debitNote.originalBill ? <bdi dir="ltr">{debitNote.originalBill.billNumber}</bdi> : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/purchases/debit-notes/${debitNote.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {tc("View")}
                      </Link>
                      {debitNote.status === "DRAFT" && canFinalizeDebitNote ? (
                        <button type="button" onClick={() => void finalizeDebitNote(debitNote)} disabled={actionId === debitNote.id} className="rounded-md bg-palm px-2 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                          {tc("Finalize")}
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
