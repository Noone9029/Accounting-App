"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { downloadPdf, purchaseDebitNotePdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import {
  canReversePurchaseDebitNoteAllocation,
  purchaseDebitNoteActiveAppliedAmount,
  purchaseDebitNoteAllocationStatusBadgeClass,
  purchaseDebitNoteAllocationStatusLabel,
  purchaseDebitNoteAppliedAmount,
  purchaseDebitNoteStatusBadgeClass,
  purchaseDebitNoteStatusLabel,
  validatePurchaseDebitNoteAllocation,
} from "@/lib/purchase-debit-notes";
import type { OpenPurchaseBill, PurchaseDebitNote } from "@/lib/types";

export default function PurchaseDebitNoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [debitNote, setDebitNote] = useState<PurchaseDebitNote | null>(null);
  const [openBills, setOpenBills] = useState<OpenPurchaseBill[]>([]);
  const [selectedBillId, setSelectedBillId] = useState("");
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

    apiRequest<PurchaseDebitNote>(`/purchase-debit-notes/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setDebitNote(result);
          setAmountApplied("");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load debit note.");
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
    if (!organizationId || !debitNote || debitNote.status !== "FINALIZED" || Number(debitNote.unappliedAmount) <= 0) {
      setOpenBills([]);
      setSelectedBillId("");
      return;
    }

    let cancelled = false;
    apiRequest<OpenPurchaseBill[]>(`/purchase-bills/open?supplierId=${encodeURIComponent(debitNote.supplierId)}`)
      .then((result) => {
        if (!cancelled) {
          setOpenBills(result);
          setSelectedBillId((current) => (current && result.some((bill) => bill.id === current) ? current : (result[0]?.id ?? "")));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpenBills([]);
          setSelectedBillId("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debitNote, organizationId]);

  async function runAction(action: "finalize" | "void") {
    if (!debitNote) {
      return;
    }

    if (action === "void" && !window.confirm(`Void debit note ${debitNote.debitNoteNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PurchaseDebitNote>(`/purchase-debit-notes/${debitNote.id}/${action}`, { method: "POST" });
      setDebitNote(updated);
      setSuccess(action === "finalize" ? `Finalized debit note ${updated.debitNoteNumber}.` : `Voided debit note ${updated.debitNoteNumber}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action} debit note.`);
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteDebitNote() {
    if (!debitNote || !window.confirm(`Delete draft debit note ${debitNote.debitNoteNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ deleted: boolean }>(`/purchase-debit-notes/${debitNote.id}`, { method: "DELETE" });
      router.push("/purchases/debit-notes");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete debit note.");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadDebitNotePdf() {
    if (!debitNote) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadPdf(purchaseDebitNotePdfPath(debitNote.id), `purchase-debit-note-${debitNote.debitNoteNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download debit note PDF.");
    } finally {
      setActionLoading(false);
    }
  }

  async function applyDebitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!debitNote || !selectedBillId) {
      return;
    }

    const selectedBill = openBills.find((bill) => bill.id === selectedBillId);
    const validationError = validatePurchaseDebitNoteAllocation(amountApplied, debitNote.unappliedAmount, selectedBill?.balanceDue ?? "0.0000");
    if (validationError) {
      setError(validationError);
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PurchaseDebitNote>(`/purchase-debit-notes/${debitNote.id}/apply`, {
        method: "POST",
        body: { billId: selectedBillId, amountApplied },
      });
      setDebitNote(updated);
      setAmountApplied("");
      const bills = await apiRequest<OpenPurchaseBill[]>(`/purchase-bills/open?supplierId=${encodeURIComponent(updated.supplierId)}`);
      setOpenBills(bills);
      setSelectedBillId(bills[0]?.id ?? "");
      setSuccess(`Applied ${formatMoneyAmount(amountApplied, updated.currency)} from ${updated.debitNoteNumber}.`);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Unable to apply debit note.");
    } finally {
      setActionLoading(false);
    }
  }

  async function reverseAllocation(allocationId: string) {
    if (!debitNote || !window.confirm("Reverse this debit note allocation?")) {
      return;
    }

    const reason = window.prompt("Reversal reason (optional)", "") ?? "";
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PurchaseDebitNote>(`/purchase-debit-notes/${debitNote.id}/allocations/${allocationId}/reverse`, {
        method: "POST",
        body: { reason },
      });
      setDebitNote(updated);
      const bills = await apiRequest<OpenPurchaseBill[]>(`/purchase-bills/open?supplierId=${encodeURIComponent(updated.supplierId)}`);
      setOpenBills(bills);
      setSelectedBillId(bills[0]?.id ?? "");
      setSuccess("Debit note allocation reversed.");
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : "Unable to reverse debit note allocation.");
    } finally {
      setActionLoading(false);
    }
  }

  const appliedAmount = debitNote
    ? debitNote.allocations?.length
      ? purchaseDebitNoteActiveAppliedAmount(debitNote.allocations)
      : purchaseDebitNoteAppliedAmount(debitNote.total, debitNote.unappliedAmount)
    : "0.0000";
  const selectedBill = openBills.find((bill) => bill.id === selectedBillId);
  const canCreateDebitNote = can(PERMISSIONS.purchaseDebitNotes.create);
  const canFinalizeDebitNote = can(PERMISSIONS.purchaseDebitNotes.finalize);
  const canVoidDebitNote = can(PERMISSIONS.purchaseDebitNotes.void);
  const canApplyDebitNote = debitNote?.status === "FINALIZED" && Number(debitNote.unappliedAmount) > 0 && canFinalizeDebitNote;

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{debitNote ? debitNote.debitNoteNumber : "Debit note"}</h1>
          <p className="mt-1 text-sm text-steel">Debit note detail, AP reversal posting, allocations, and PDF download.</p>
          {debitNote ? <p className="mt-1 text-xs text-steel">No ZATCA debit note XML/submission or inventory return movement is implemented in this MVP.</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/purchases/debit-notes" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {debitNote?.status === "DRAFT" ? (
            <Link href={`/purchases/debit-notes/${debitNote.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Edit
            </Link>
          ) : null}
          {debitNote?.supplierId ? (
            <Link href={`/contacts/${debitNote.supplierId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Supplier ledger
            </Link>
          ) : null}
          {debitNote?.status === "FINALIZED" && Number(debitNote.unappliedAmount) > 0 ? (
            <Link
              href={`/purchases/supplier-refunds/new?supplierId=${encodeURIComponent(debitNote.supplierId)}&sourceType=PURCHASE_DEBIT_NOTE&sourceDebitNoteId=${encodeURIComponent(debitNote.id)}`}
              className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Record supplier refund
            </Link>
          ) : null}
          {debitNote ? (
            <button type="button" onClick={() => void downloadDebitNotePdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Download PDF
            </button>
          ) : null}
          {debitNote?.status === "DRAFT" && canFinalizeDebitNote ? (
            <button type="button" onClick={() => void runAction("finalize")} disabled={actionLoading} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              Finalize
            </button>
          ) : null}
          {debitNote && debitNote.status !== "VOIDED" && canVoidDebitNote ? (
            <button type="button" onClick={() => void runAction("void")} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Void
            </button>
          ) : null}
          {debitNote?.status === "DRAFT" && canCreateDebitNote ? (
            <button type="button" onClick={() => void deleteDebitNote()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load debit notes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading debit note...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {debitNote ? (
        <div className="mt-5 space-y-5">
          <AttachmentPanel linkedEntityType="PURCHASE_DEBIT_NOTE" linkedEntityId={debitNote.id} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Supplier" value={debitNote.supplier?.displayName ?? debitNote.supplier?.name ?? "-"} />
              <Summary label="Status" value={purchaseDebitNoteStatusLabel(debitNote.status)} />
              <Summary label="Issue date" value={formatOptionalDate(debitNote.issueDate, "-")} />
              <Summary label="Currency" value={debitNote.currency} />
              <Summary label="Original bill" value={debitNote.originalBill?.billNumber ?? "-"} />
              <Summary label="Branch" value={debitNote.branch?.displayName ?? debitNote.branch?.name ?? "-"} />
              <Summary label="Total debit" value={formatMoneyAmount(debitNote.total, debitNote.currency)} />
              <Summary label="Applied amount" value={formatMoneyAmount(appliedAmount, debitNote.currency)} />
              <Summary label="Unapplied amount" value={formatMoneyAmount(debitNote.unappliedAmount, debitNote.currency)} />
              <Summary label="Journal entry" value={debitNote.journalEntry ? `${debitNote.journalEntry.entryNumber} (${debitNote.journalEntry.id})` : "-"} />
              <Summary label="Reversal journal" value={debitNote.reversalJournalEntry ? `${debitNote.reversalJournalEntry.entryNumber} (${debitNote.reversalJournalEntry.id})` : "-"} />
              <Summary label="Finalized" value={debitNote.finalizedAt ? new Date(debitNote.finalizedAt).toLocaleString() : "-"} />
              <Summary label="Reason" value={debitNote.reason ?? "-"} />
              <Summary label="Notes" value={debitNote.notes ?? "-"} />
            </div>
            <div className="mt-4">
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${purchaseDebitNoteStatusBadgeClass(debitNote.status)}`}>{purchaseDebitNoteStatusLabel(debitNote.status)}</span>
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
                {debitNote.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? `${line.account.code} ${line.account.name}` : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.unitPrice, debitNote.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.lineGrossAmount, debitNote.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.discountAmount, debitNote.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.taxableAmount, debitNote.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.taxAmount, debitNote.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.lineTotal, debitNote.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto grid max-w-sm grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm shadow-panel">
            <span className="text-steel">Subtotal</span>
            <span className="text-right font-mono">{formatMoneyAmount(debitNote.subtotal, debitNote.currency)}</span>
            <span className="text-steel">Discount</span>
            <span className="text-right font-mono">{formatMoneyAmount(debitNote.discountTotal, debitNote.currency)}</span>
            <span className="text-steel">Taxable</span>
            <span className="text-right font-mono">{formatMoneyAmount(debitNote.taxableTotal, debitNote.currency)}</span>
            <span className="text-steel">VAT</span>
            <span className="text-right font-mono">{formatMoneyAmount(debitNote.taxTotal, debitNote.currency)}</span>
            <span className="font-semibold text-ink">Total debit</span>
            <span className="text-right font-mono font-semibold text-ink">{formatMoneyAmount(debitNote.total, debitNote.currency)}</span>
            <span className="font-semibold text-ink">Applied amount</span>
            <span className="text-right font-mono font-semibold text-ink">{formatMoneyAmount(appliedAmount, debitNote.currency)}</span>
            <span className="font-semibold text-ink">Unapplied amount</span>
            <span className="text-right font-mono font-semibold text-ink">{formatMoneyAmount(debitNote.unappliedAmount, debitNote.currency)}</span>
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Debit allocations</h2>
              <p className="mt-1 text-sm text-steel">Applying a debit note only matches the existing AP reduction to bill balances. No new journal entry is created.</p>
            </div>
            {debitNote.allocations && debitNote.allocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">Bill</th>
                      <th className="px-4 py-3">Bill date</th>
                      <th className="px-4 py-3">Bill total</th>
                      <th className="px-4 py-3">Amount applied</th>
                      <th className="px-4 py-3">Bill balance due</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Reversed</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {debitNote.allocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.bill?.billNumber ?? allocation.billId}</td>
                        <td className="px-4 py-3 text-steel">{formatOptionalDate(allocation.bill?.billDate, "-")}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.bill ? formatMoneyAmount(allocation.bill.total, debitNote.currency) : "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, debitNote.currency)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.bill ? formatMoneyAmount(allocation.bill.balanceDue, debitNote.currency) : "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${purchaseDebitNoteAllocationStatusBadgeClass(allocation)}`}>{purchaseDebitNoteAllocationStatusLabel(allocation)}</span>
                        </td>
                        <td className="px-4 py-3 text-steel">{allocation.reversedAt ? new Date(allocation.reversedAt).toLocaleString() : "-"}</td>
                        <td className="px-4 py-3 text-steel">{allocation.reversalReason ?? "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/purchases/bills/${allocation.billId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              View bill
                            </Link>
                            {canReversePurchaseDebitNoteAllocation(allocation) && canVoidDebitNote ? (
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
                <StatusMessage type="empty">No debit has been applied to bills yet.</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Apply debit</h2>
                <p className="mt-1 text-sm text-steel">Use unapplied supplier debit against finalized open bills for the same supplier.</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">No accounting journal</span>
            </div>
            {canApplyDebitNote ? (
              openBills.length > 0 ? (
                <form onSubmit={applyDebitNote} className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-[1.4fr_0.7fr_auto]">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Open bill</span>
                    <select value={selectedBillId} onChange={(event) => setSelectedBillId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                      {openBills.map((bill) => (
                        <option key={bill.id} value={bill.id}>
                          {bill.billNumber} - balance {formatMoneyAmount(bill.balanceDue, bill.currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Amount to apply</span>
                    <input value={amountApplied} onChange={(event) => setAmountApplied(event.target.value)} placeholder="0.0000" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <button type="submit" disabled={actionLoading || !selectedBillId} className="self-end rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                    Apply
                  </button>
                  <div className="text-xs text-steel md:col-span-3">
                    Selected bill balance: {selectedBill ? formatMoneyAmount(selectedBill.balanceDue, selectedBill.currency) : "-"}.
                    Debit available: {formatMoneyAmount(debitNote.unappliedAmount, debitNote.currency)}.
                  </div>
                </form>
              ) : (
                <div className="mt-4">
                  <StatusMessage type="empty">No finalized open bills are available for this supplier.</StatusMessage>
                </div>
              )
            ) : (
              <div className="mt-4">
                <StatusMessage type="info">Debit notes can be applied only after finalization while unapplied amount remains.</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Purchase returns, inventory stock movements, bank reconciliation, and ZATCA debit note submission are intentionally not implemented in this MVP.
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
