"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { SourceDocumentGuidance } from "@/components/documents/document-guidance";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerInput,
  LedgerLoadingState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
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
  const searchParams = useSearchParams();
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
  const canDownloadGeneratedDocuments = can(PERMISSIONS.generatedDocuments.download);
  const canApplyDebitNote = debitNote?.status === "FINALIZED" && Number(debitNote.unappliedAmount) > 0 && canFinalizeDebitNote;
  const returnTo = safeReturnToFromSearch(searchParams.toString());

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title={debitNote ? debitNote.debitNoteNumber : "Debit note"}
        description={
          <>
            <span>Debit note detail, AP reversal posting, allocations, and PDF download.</span>
            {debitNote ? <span className="mt-1 block text-xs">Local AP adjustment only. No ZATCA network, CSID, clearance/reporting, PDF/A-3, or inventory return movement is enabled here.</span> : null}
          </>
        }
        badge={debitNote ? <LedgerStatusBadge tone={purchaseDebitNoteStatusTone(debitNote.status)}>{purchaseDebitNoteStatusLabel(debitNote.status)}</LedgerStatusBadge> : undefined}
        actions={
          <LedgerActionBar className="items-start sm:items-center">
            <LedgerButton href={returnTo || "/purchases/debit-notes"}>Back</LedgerButton>
          {debitNote?.status === "DRAFT" ? (
            <LedgerButton href={`/purchases/debit-notes/${debitNote.id}/edit`}>Edit</LedgerButton>
          ) : null}
          {debitNote?.supplierId ? (
            <LedgerButton href={partyDetailHref("supplier", debitNote.supplierId)}>Supplier workspace</LedgerButton>
          ) : null}
          {debitNote?.status === "FINALIZED" && Number(debitNote.unappliedAmount) > 0 ? (
            <LedgerButton href={`/purchases/supplier-refunds/new?supplierId=${encodeURIComponent(debitNote.supplierId)}&sourceType=PURCHASE_DEBIT_NOTE&sourceDebitNoteId=${encodeURIComponent(debitNote.id)}`} variant="primary">
              Record supplier refund
            </LedgerButton>
          ) : null}
          {debitNote && canDownloadGeneratedDocuments ? (
            <LedgerButton onClick={() => void downloadDebitNotePdf()} disabled={actionLoading}>
              Download debit note PDF
            </LedgerButton>
          ) : null}
          {debitNote?.status === "DRAFT" && canFinalizeDebitNote ? (
            <LedgerButton onClick={() => void runAction("finalize")} disabled={actionLoading} variant="primary">
              Finalize
            </LedgerButton>
          ) : null}
          {debitNote && debitNote.status !== "VOIDED" && canVoidDebitNote ? (
            <LedgerButton onClick={() => void runAction("void")} disabled={actionLoading} variant="danger">
              Void
            </LedgerButton>
          ) : null}
          {debitNote?.status === "DRAFT" && canCreateDebitNote ? (
            <LedgerButton onClick={() => void deleteDebitNote()} disabled={actionLoading} variant="danger">
              Delete
            </LedgerButton>
          ) : null}
          </LedgerActionBar>
        }
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load debit notes.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading debit note" description="Fetching AP adjustment, allocation, and source document context." /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

      {debitNote ? (
        <div className="space-y-5">
          <PurchaseDebitNoteWorkflowGuidance
            debitNote={debitNote}
            appliedAmount={appliedAmount}
            actionLoading={actionLoading}
            canFinalizeDebitNote={canFinalizeDebitNote}
            canApplyDebitNote={canApplyDebitNote}
            canDownloadGeneratedDocuments={canDownloadGeneratedDocuments}
            onFinalize={() => void runAction("finalize")}
            onDownloadPdf={() => void downloadDebitNotePdf()}
          />

          <AttachmentPanel linkedEntityType="PURCHASE_DEBIT_NOTE" linkedEntityId={debitNote.id} />

          <LedgerPanel>
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
              <LedgerStatusBadge tone={purchaseDebitNoteStatusTone(debitNote.status)}>{purchaseDebitNoteStatusLabel(debitNote.status)}</LedgerStatusBadge>
            </div>
          </LedgerPanel>

          <LedgerDataTable minWidth="980px">
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
                    <td className="px-4 py-3"><LedgerMoney>{line.quantity}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.unitPrice, debitNote.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.lineGrossAmount, debitNote.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.discountAmount, debitNote.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.taxableAmount, debitNote.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.taxAmount, debitNote.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.lineTotal, debitNote.currency)}</LedgerMoney></td>
                  </tr>
                ))}
              </tbody>
          </LedgerDataTable>

          <LedgerPanel className="ml-auto max-w-sm">
            <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-steel">Subtotal</span>
            <span className="text-right"><LedgerMoney>{formatMoneyAmount(debitNote.subtotal, debitNote.currency)}</LedgerMoney></span>
            <span className="text-steel">Discount</span>
            <span className="text-right"><LedgerMoney>{formatMoneyAmount(debitNote.discountTotal, debitNote.currency)}</LedgerMoney></span>
            <span className="text-steel">Taxable</span>
            <span className="text-right"><LedgerMoney>{formatMoneyAmount(debitNote.taxableTotal, debitNote.currency)}</LedgerMoney></span>
            <span className="text-steel">VAT</span>
            <span className="text-right"><LedgerMoney>{formatMoneyAmount(debitNote.taxTotal, debitNote.currency)}</LedgerMoney></span>
            <span className="font-semibold text-ink">Total debit</span>
            <span className="text-right font-semibold text-ink"><LedgerMoney>{formatMoneyAmount(debitNote.total, debitNote.currency)}</LedgerMoney></span>
            <span className="font-semibold text-ink">Applied amount</span>
            <span className="text-right font-semibold text-ink"><LedgerMoney>{formatMoneyAmount(appliedAmount, debitNote.currency)}</LedgerMoney></span>
            <span className="font-semibold text-ink">Unapplied amount</span>
            <span className="text-right font-semibold text-ink"><LedgerMoney>{formatMoneyAmount(debitNote.unappliedAmount, debitNote.currency)}</LedgerMoney></span>
            </div>
          </LedgerPanel>

          <LedgerSection title="Debit allocations" description="Applying a debit note only matches the existing AP reduction to bill balances. No new journal entry is created.">
            {debitNote.allocations && debitNote.allocations.length > 0 ? (
              <LedgerDataTable minWidth="980px">
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
                        <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(allocation.bill?.billDate, "-")}</LedgerDate></td>
                        <td className="px-4 py-3">{allocation.bill ? <LedgerMoney>{formatMoneyAmount(allocation.bill.total, debitNote.currency)}</LedgerMoney> : "-"}</td>
                        <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(allocation.amountApplied, debitNote.currency)}</LedgerMoney></td>
                        <td className="px-4 py-3">{allocation.bill ? <LedgerMoney>{formatMoneyAmount(allocation.bill.balanceDue, debitNote.currency)}</LedgerMoney> : "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${purchaseDebitNoteAllocationStatusBadgeClass(allocation)}`}>{purchaseDebitNoteAllocationStatusLabel(allocation)}</span>
                        </td>
                        <td className="px-4 py-3"><LedgerDate>{allocation.reversedAt ? new Date(allocation.reversedAt).toLocaleString() : "-"}</LedgerDate></td>
                        <td className="px-4 py-3 text-steel">{allocation.reversalReason ?? "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <LedgerButton href={`/purchases/bills/${allocation.billId}`} size="sm">
                              View bill
                            </LedgerButton>
                            {canReversePurchaseDebitNoteAllocation(allocation) && canVoidDebitNote ? (
                              <LedgerButton onClick={() => void reverseAllocation(allocation.id)} disabled={actionLoading} variant="danger" size="sm">
                                Reverse
                              </LedgerButton>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      ))}
                    </tbody>
              </LedgerDataTable>
            ) : (
              <StatusMessage type="empty">No debit has been applied to bills yet.</StatusMessage>
            )}
          </LedgerSection>

          <LedgerPanel>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Apply debit</h2>
                <p className="mt-1 text-sm text-steel">Use unapplied supplier debit against finalized open bills for the same supplier.</p>
              </div>
              <LedgerStatusBadge>No accounting journal</LedgerStatusBadge>
            </div>
            {canApplyDebitNote ? (
              openBills.length > 0 ? (
                <form onSubmit={applyDebitNote} className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-[1.4fr_0.7fr_auto]">
                  <LedgerFieldLabel>
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Open bill</span>
                    <LedgerSelect value={selectedBillId} onChange={(event) => setSelectedBillId(event.target.value)} className="mt-1">
                      {openBills.map((bill) => (
                        <option key={bill.id} value={bill.id}>
                          {bill.billNumber} - balance {formatMoneyAmount(bill.balanceDue, bill.currency)}
                        </option>
                      ))}
                    </LedgerSelect>
                  </LedgerFieldLabel>
                  <LedgerFieldLabel>
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Amount to apply</span>
                    <LedgerInput value={amountApplied} onChange={(event) => setAmountApplied(event.target.value)} placeholder="0.0000" className="mt-1" />
                  </LedgerFieldLabel>
                  <LedgerButton type="submit" disabled={actionLoading || !selectedBillId} variant="primary" className="self-end">
                    Apply
                  </LedgerButton>
                  <div className="md:col-span-3">
                    <LedgerFieldHelp>
                      Selected bill balance: {selectedBill ? formatMoneyAmount(selectedBill.balanceDue, selectedBill.currency) : "-"}.
                      Debit available: {formatMoneyAmount(debitNote.unappliedAmount, debitNote.currency)}.
                    </LedgerFieldHelp>
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
          </LedgerPanel>

          <LedgerAlert tone="warning">
            Purchase returns, inventory stock movements, bank reconciliation, and ZATCA debit note submission are intentionally not implemented in this MVP.
          </LedgerAlert>
        </div>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function PurchaseDebitNoteWorkflowGuidance({
  debitNote,
  appliedAmount,
  actionLoading,
  canFinalizeDebitNote,
  canApplyDebitNote,
  canDownloadGeneratedDocuments,
  onFinalize,
  onDownloadPdf,
}: {
  debitNote: PurchaseDebitNote;
  appliedAmount: string;
  actionLoading: boolean;
  canFinalizeDebitNote: boolean;
  canApplyDebitNote: boolean;
  canDownloadGeneratedDocuments: boolean;
  onFinalize: () => void;
  onDownloadPdf: () => void;
}) {
  const hasUnapplied = Number(debitNote.unappliedAmount) > 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <LedgerPanel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">What happened?</h2>
            <p className="mt-1 text-sm leading-6 text-steel">{purchaseDebitNoteOutcomeDescription(debitNote, hasUnapplied)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LedgerStatusBadge tone={purchaseDebitNoteStatusTone(debitNote.status)}>{purchaseDebitNoteStatusLabel(debitNote.status)}</LedgerStatusBadge>
            {debitNote.status === "FINALIZED" && hasUnapplied ? (
              <LedgerStatusBadge tone="warning">Unapplied debit</LedgerStatusBadge>
            ) : null}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <Summary label="Total debit" value={formatMoneyAmount(debitNote.total, debitNote.currency)} />
          <Summary label="Applied to bills" value={formatMoneyAmount(appliedAmount, debitNote.currency)} />
          <Summary label="Unapplied" value={formatMoneyAmount(debitNote.unappliedAmount, debitNote.currency)} />
        </div>
      </LedgerPanel>

      <LedgerPanel>
        <h2 className="text-base font-semibold text-ink">Next actions</h2>
        <p className="mt-1 text-sm leading-6 text-steel">{purchaseDebitNoteNextActionDescription(debitNote, hasUnapplied)}</p>
        <div className="mt-4 flex flex-col gap-2">
          {debitNote.status === "DRAFT" && canFinalizeDebitNote ? (
            <LedgerButton onClick={onFinalize} disabled={actionLoading} variant="primary">
              Finalize debit note
            </LedgerButton>
          ) : null}
          {debitNote.originalBillId ? (
            <LedgerButton href={`/purchases/bills/${debitNote.originalBillId}`} variant="primary">
              View original bill
            </LedgerButton>
          ) : null}
          {canDownloadGeneratedDocuments ? (
            <LedgerButton onClick={onDownloadPdf} disabled={actionLoading}>
              Download debit note PDF
            </LedgerButton>
          ) : null}
          <LedgerButton href={partyDetailHref("supplier", debitNote.supplierId)}>
            Open supplier workspace
          </LedgerButton>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <LedgerButton href="/reports/aged-payables">
              AP report
            </LedgerButton>
            <LedgerButton href="/dashboard">
              Dashboard
            </LedgerButton>
          </div>
        </div>
        {debitNote.status === "DRAFT" && !canFinalizeDebitNote ? (
          <p className="mt-3 text-xs leading-5 text-steel">You need debit note finalization permission before this AP reduction can post.</p>
        ) : null}
        {debitNote.status === "FINALIZED" && hasUnapplied && !canApplyDebitNote ? (
          <p className="mt-3 text-xs leading-5 text-steel">This debit note still has unapplied amount, but your role cannot apply it to supplier bills.</p>
        ) : null}
        <LedgerSummaryBand tone="warning">
          ZATCA handling here is local/readiness only. Network submission, CSID execution, clearance/reporting, PDF/A-3 generation, and production compliance are not enabled.
        </LedgerSummaryBand>
        <SourceDocumentGuidance className="mt-4" />
      </LedgerPanel>
    </div>
  );
}

function purchaseDebitNoteOutcomeDescription(debitNote: PurchaseDebitNote, hasUnapplied: boolean): string {
  if (debitNote.status === "DRAFT") {
    return "This draft debit note is saved and editable. It has not posted the AP reduction yet, so finalize it only after supplier, bill, tax, and totals are ready.";
  }

  if (debitNote.status === "VOIDED") {
    return "This debit note is voided. It is closed for new allocations, and reversal journal details remain visible for review.";
  }

  if (hasUnapplied) {
    return "This debit note is finalized and posted. It reduced the supplier payable, and the remaining unapplied amount can be applied to open bills or refunded.";
  }

  return "This debit note is finalized and fully applied. Related bill balances and the supplier ledger show the AP reduction trail.";
}

function purchaseDebitNoteNextActionDescription(debitNote: PurchaseDebitNote, hasUnapplied: boolean): string {
  if (debitNote.status === "DRAFT") {
    return "Finalize the debit note to post the supplier balance reduction, then apply it to open bills from the allocation panel below.";
  }

  if (debitNote.status === "VOIDED") {
    return "Use the links below for review and reporting. Create a replacement debit note if the supplier adjustment still applies.";
  }

  if (hasUnapplied) {
    return "Apply the remaining debit to an open bill below, record a supplier refund if appropriate, then review AP reports.";
  }

  return "Review the original bill, supplier ledger, and AP report to confirm the adjustment is reflected.";
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}

function purchaseDebitNoteStatusTone(status: PurchaseDebitNote["status"]): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "FINALIZED":
      return "success";
    case "VOIDED":
      return "danger";
  }
}
