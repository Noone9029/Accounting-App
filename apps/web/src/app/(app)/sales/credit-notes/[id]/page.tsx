"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  canReverseCreditNoteAllocation,
  creditNoteActiveAppliedAmount,
  creditNoteAllocationStatusBadgeClass,
  creditNoteAllocationStatusLabel,
  creditNoteAppliedAmount,
  creditNoteStatusBadgeClass,
  creditNoteStatusLabel,
  validateCreditNoteAllocation,
} from "@/lib/credit-notes";
import { formatMoneyAmount } from "@/lib/money";
import { creditNotePdfPath, downloadPdf } from "@/lib/pdf-download";
import type { CreditNote, OpenSalesInvoice } from "@/lib/types";

export default function CreditNoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
  const [openInvoices, setOpenInvoices] = useState<OpenSalesInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amountApplied, setAmountApplied] = useState("");
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
          setAmountApplied("");
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

  useEffect(() => {
    if (!organizationId || !creditNote || creditNote.status !== "FINALIZED" || Number(creditNote.unappliedAmount) <= 0) {
      setOpenInvoices([]);
      setSelectedInvoiceId("");
      return;
    }

    let cancelled = false;
    apiRequest<OpenSalesInvoice[]>(`/sales-invoices/open?customerId=${encodeURIComponent(creditNote.customerId)}`)
      .then((result) => {
        if (!cancelled) {
          setOpenInvoices(result);
          setSelectedInvoiceId((current) => (current && result.some((invoice) => invoice.id === current) ? current : (result[0]?.id ?? "")));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpenInvoices([]);
          setSelectedInvoiceId("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, creditNote]);

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

  async function applyCreditNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!creditNote || !selectedInvoiceId) {
      return;
    }

    const selectedInvoice = openInvoices.find((invoice) => invoice.id === selectedInvoiceId);
    const validationError = validateCreditNoteAllocation(amountApplied, creditNote.unappliedAmount, selectedInvoice?.balanceDue ?? "0.0000");
    if (validationError) {
      setError(validationError);
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<CreditNote>(`/credit-notes/${creditNote.id}/apply`, {
        method: "POST",
        body: { invoiceId: selectedInvoiceId, amountApplied },
      });
      setCreditNote(updated);
      setAmountApplied("");
      const invoices = await apiRequest<OpenSalesInvoice[]>(`/sales-invoices/open?customerId=${encodeURIComponent(updated.customerId)}`);
      setOpenInvoices(invoices);
      setSelectedInvoiceId(invoices[0]?.id ?? "");
      setSuccess(`Applied ${formatMoneyAmount(amountApplied, updated.currency)} from ${updated.creditNoteNumber}.`);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Unable to apply credit note.");
    } finally {
      setActionLoading(false);
    }
  }

  async function reverseAllocation(allocationId: string) {
    if (!creditNote || !window.confirm("Reverse this credit note allocation?")) {
      return;
    }

    const reason = window.prompt("Reversal reason (optional)", "") ?? "";
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<CreditNote>(`/credit-notes/${creditNote.id}/allocations/${allocationId}/reverse`, {
        method: "POST",
        body: { reason },
      });
      setCreditNote(updated);
      const invoices = await apiRequest<OpenSalesInvoice[]>(`/sales-invoices/open?customerId=${encodeURIComponent(updated.customerId)}`);
      setOpenInvoices(invoices);
      setSelectedInvoiceId(invoices[0]?.id ?? "");
      setSuccess("Credit allocation reversed.");
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : "Unable to reverse credit allocation.");
    } finally {
      setActionLoading(false);
    }
  }

  const appliedAmount = creditNote
    ? creditNote.allocations?.length
      ? creditNoteActiveAppliedAmount(creditNote.allocations)
      : creditNoteAppliedAmount(creditNote.total, creditNote.unappliedAmount)
    : "0.0000";
  const selectedInvoice = openInvoices.find((invoice) => invoice.id === selectedInvoiceId);
  const canApplyCredit = creditNote?.status === "FINALIZED" && Number(creditNote.unappliedAmount) > 0;

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
          {creditNote?.status === "FINALIZED" && Number(creditNote.unappliedAmount) > 0 ? (
            <Link
              href={`/sales/customer-refunds/new?customerId=${encodeURIComponent(creditNote.customerId)}&sourceType=CREDIT_NOTE&sourceCreditNoteId=${encodeURIComponent(creditNote.id)}`}
              className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Refund credit
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
              <Summary label="Applied amount" value={formatMoneyAmount(appliedAmount, creditNote.currency)} />
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
            <span className="font-semibold text-ink">Applied amount</span>
            <span className="text-right font-mono font-semibold text-ink">{formatMoneyAmount(appliedAmount, creditNote.currency)}</span>
            <span className="font-semibold text-ink">Unapplied amount</span>
            <span className="text-right font-mono font-semibold text-ink">{formatMoneyAmount(creditNote.unappliedAmount, creditNote.currency)}</span>
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Credit allocations</h2>
              <p className="mt-1 text-sm text-steel">Applying a credit note only matches the existing AR reduction to invoice balances. No new journal entry is created.</p>
            </div>
            {creditNote.allocations && creditNote.allocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
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
                    {creditNote.allocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.invoice?.invoiceNumber ?? allocation.invoiceId}</td>
                        <td className="px-4 py-3 text-steel">{allocation.invoice ? new Date(allocation.invoice.issueDate).toLocaleDateString() : "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.invoice ? formatMoneyAmount(allocation.invoice.total, creditNote.currency) : "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, creditNote.currency)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.invoice ? formatMoneyAmount(allocation.invoice.balanceDue, creditNote.currency) : "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${creditNoteAllocationStatusBadgeClass(allocation)}`}>{creditNoteAllocationStatusLabel(allocation)}</span>
                        </td>
                        <td className="px-4 py-3 text-steel">{allocation.reversedAt ? new Date(allocation.reversedAt).toLocaleString() : "-"}</td>
                        <td className="px-4 py-3 text-steel">{allocation.reversalReason ?? "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/sales/invoices/${allocation.invoiceId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              View invoice
                            </Link>
                            {canReverseCreditNoteAllocation(allocation) ? (
                              <button type="button" onClick={() => void reverseAllocation(allocation.id)} disabled={actionLoading} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
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
                <StatusMessage type="empty">No credit has been applied to invoices yet.</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Apply credit</h2>
                <p className="mt-1 text-sm text-steel">Use unapplied credit against finalized open invoices for the same customer.</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">No accounting journal</span>
            </div>
            {canApplyCredit ? (
              openInvoices.length > 0 ? (
                <form onSubmit={applyCreditNote} className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-[1.4fr_0.7fr_auto]">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Open invoice</span>
                    <select value={selectedInvoiceId} onChange={(event) => setSelectedInvoiceId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                      {openInvoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - balance {formatMoneyAmount(invoice.balanceDue, invoice.currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Amount to apply</span>
                    <input value={amountApplied} onChange={(event) => setAmountApplied(event.target.value)} placeholder="0.0000" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <button type="submit" disabled={actionLoading || !selectedInvoiceId} className="self-end rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                    Apply
                  </button>
                  <div className="md:col-span-3 text-xs text-steel">
                    Selected invoice balance: {selectedInvoice ? formatMoneyAmount(selectedInvoice.balanceDue, selectedInvoice.currency) : "-"}.
                    Credit available: {formatMoneyAmount(creditNote.unappliedAmount, creditNote.currency)}.
                  </div>
                </form>
              ) : (
                <div className="mt-4">
                  <StatusMessage type="empty">No finalized open invoices are available for this customer.</StatusMessage>
                </div>
              )
            ) : (
              <div className="mt-4">
                <StatusMessage type="info">Credit can be applied only after finalization while unapplied amount remains.</StatusMessage>
              </div>
            )}
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
