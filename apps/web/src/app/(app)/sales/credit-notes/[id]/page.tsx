"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { creditNoteStatusBadgeClass, creditNoteStatusLabel } from "@/lib/credit-notes";
import { formatMoneyAmount } from "@/lib/money";
import { creditNotePdfPath, downloadPdf } from "@/lib/pdf-download";
import type { CreditNote } from "@/lib/types";

export default function CreditNoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
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

    apiRequest<CreditNote>(`/credit-notes/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setCreditNote(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load credit note.");
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
    if (!creditNote) {
      return;
    }

    if (action === "void" && !window.confirm(`Void credit note ${creditNote.creditNoteNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<CreditNote>(`/credit-notes/${creditNote.id}/${action}`, { method: "POST" });
      setCreditNote(updated);
      setSuccess(action === "finalize" ? `Finalized credit note ${updated.creditNoteNumber}.` : `Voided credit note ${updated.creditNoteNumber}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action} credit note.`);
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteCreditNote() {
    if (!creditNote || !window.confirm(`Delete draft credit note ${creditNote.creditNoteNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ deleted: boolean }>(`/credit-notes/${creditNote.id}`, { method: "DELETE" });
      router.push("/sales/credit-notes");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete credit note.");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadCreditNotePdf() {
    if (!creditNote) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadPdf(creditNotePdfPath(creditNote.id), `credit-note-${creditNote.creditNoteNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download credit note PDF.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{creditNote ? creditNote.creditNoteNumber : "Credit note"}</h1>
          <p className="mt-1 text-sm text-steel">Credit note detail, reversal posting, and PDF download.</p>
          {creditNote ? <p className="mt-1 text-xs text-steel">Downloads are archived automatically. ZATCA credit note XML is not implemented yet.</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sales/credit-notes" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {creditNote?.status === "DRAFT" ? (
            <Link href={`/sales/credit-notes/${creditNote.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Edit
            </Link>
          ) : null}
          {creditNote?.customerId ? (
            <Link href={`/contacts/${creditNote.customerId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Customer ledger
            </Link>
          ) : null}
          {creditNote ? (
            <button type="button" onClick={() => void downloadCreditNotePdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Download PDF
            </button>
          ) : null}
          {creditNote?.status === "DRAFT" ? (
            <button type="button" onClick={() => void runAction("finalize")} disabled={actionLoading} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              Finalize
            </button>
          ) : null}
          {creditNote && creditNote.status !== "VOIDED" ? (
            <button type="button" onClick={() => void runAction("void")} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Void
            </button>
          ) : null}
          {creditNote?.status === "DRAFT" ? (
            <button type="button" onClick={() => void deleteCreditNote()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load credit notes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading credit note...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {creditNote ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Customer" value={creditNote.customer?.displayName ?? creditNote.customer?.name ?? "-"} />
              <Summary label="Status" value={creditNoteStatusLabel(creditNote.status)} />
              <Summary label="Issue date" value={new Date(creditNote.issueDate).toLocaleDateString()} />
              <Summary label="Currency" value={creditNote.currency} />
              <Summary label="Original invoice" value={creditNote.originalInvoice?.invoiceNumber ?? "-"} />
              <Summary label="Branch" value={creditNote.branch?.displayName ?? creditNote.branch?.name ?? "-"} />
              <Summary label="Total credit" value={formatMoneyAmount(creditNote.total, creditNote.currency)} />
              <Summary label="Unapplied amount" value={formatMoneyAmount(creditNote.unappliedAmount, creditNote.currency)} />
              <Summary label="Journal entry" value={creditNote.journalEntry ? `${creditNote.journalEntry.entryNumber} (${creditNote.journalEntry.id})` : "-"} />
              <Summary label="Reversal journal" value={creditNote.reversalJournalEntry ? `${creditNote.reversalJournalEntry.entryNumber} (${creditNote.reversalJournalEntry.id})` : "-"} />
              <Summary label="Finalized" value={creditNote.finalizedAt ? new Date(creditNote.finalizedAt).toLocaleString() : "-"} />
              <Summary label="Reason" value={creditNote.reason ?? "-"} />
              <Summary label="Notes" value={creditNote.notes ?? "-"} />
            </div>
            <div className="mt-4">
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${creditNoteStatusBadgeClass(creditNote.status)}`}>{creditNoteStatusLabel(creditNote.status)}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[980px] text-left text-sm">
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
                {creditNote.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? `${line.account.code} ${line.account.name}` : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.unitPrice, creditNote.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.lineGrossAmount, creditNote.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.discountAmount, creditNote.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.taxableAmount, creditNote.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.taxAmount, creditNote.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.lineTotal, creditNote.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto grid max-w-sm grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm shadow-panel">
            <span className="text-steel">Subtotal</span>
            <span className="text-right font-mono">{formatMoneyAmount(creditNote.subtotal, creditNote.currency)}</span>
            <span className="text-steel">Discount</span>
            <span className="text-right font-mono">{formatMoneyAmount(creditNote.discountTotal, creditNote.currency)}</span>
            <span className="text-steel">Taxable</span>
            <span className="text-right font-mono">{formatMoneyAmount(creditNote.taxableTotal, creditNote.currency)}</span>
            <span className="text-steel">VAT</span>
            <span className="text-right font-mono">{formatMoneyAmount(creditNote.taxTotal, creditNote.currency)}</span>
            <span className="font-semibold text-ink">Total credit</span>
            <span className="text-right font-mono font-semibold text-ink">{formatMoneyAmount(creditNote.total, creditNote.currency)}</span>
            <span className="font-semibold text-ink">Unapplied amount</span>
            <span className="text-right font-mono font-semibold text-ink">{formatMoneyAmount(creditNote.unappliedAmount, creditNote.currency)}</span>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            ZATCA credit note XML, signing, PDF/A-3 embedding, and clearance/reporting are intentionally not implemented in this MVP.
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
