"use client";

import { ArrowLeft, CheckCircle2, Download, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { UaeEinvoiceReadinessPanel } from "@/components/compliance/uae-einvoice-readiness-panel";
import { SourceDocumentGuidance } from "@/components/documents/document-guidance";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerMetadataRow,
  LedgerMetricGrid,
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
import { getCreditNoteComplianceReadiness, prepareCreditNoteCompliance, validateComplianceDocument } from "@/lib/compliance";
import {
  canReverseCreditNoteAllocation,
  creditNoteActiveAppliedAmount,
  creditNoteAllocationStatusLabel,
  creditNoteAppliedAmount,
  creditNoteStatusLabel,
  validateCreditNoteAllocation,
} from "@/lib/credit-notes";
import { formatMoneyAmount } from "@/lib/money";
import { creditNotePdfPath, downloadPdf } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { ComplianceSourceReadinessResponse, CreditNote, CreditNoteStatus, OpenSalesInvoice } from "@/lib/types";

function creditNoteStatusTone(status: CreditNoteStatus): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "FINALIZED":
      return "success";
    case "VOIDED":
      return "danger";
    default:
      return "neutral";
  }
}

function allocationStatusTone(allocation: NonNullable<CreditNote["allocations"]>[number]): LedgerStatusTone {
  if (allocation.reversedAt) {
    return "danger";
  }
  return "success";
}

export default function CreditNoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
  const [uaeReadiness, setUaeReadiness] = useState<ComplianceSourceReadinessResponse | null>(null);
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

    Promise.all([
      apiRequest<CreditNote>(`/credit-notes/${params.id}`),
      getCreditNoteComplianceReadiness(params.id).catch(() => null),
    ])
      .then(([result, readinessResult]) => {
        if (!cancelled) {
          setCreditNote(result);
          setUaeReadiness(readinessResult);
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
      if (action === "finalize") {
        await fetchUaeReadiness(updated.id).catch(() => undefined);
      }
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

  async function fetchUaeReadiness(creditNoteId: string) {
    const result = await getCreditNoteComplianceReadiness(creditNoteId);
    setUaeReadiness(result);
    return result;
  }

  async function validateUaeReadiness() {
    if (!creditNote) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const prepared = await prepareCreditNoteCompliance(creditNote.id);
      await validateComplianceDocument(prepared.id);
      await fetchUaeReadiness(creditNote.id);
      setSuccess("Local UAE credit-note readiness validation completed. No ASP submission, FTA reporting, or network call was performed.");
    } catch (validationError) {
      await fetchUaeReadiness(creditNote.id).catch(() => undefined);
      setError(validationError instanceof Error ? validationError.message : "Unable to validate UAE credit-note readiness.");
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
  const canCreateCreditNote = can(PERMISSIONS.creditNotes.create);
  const canFinalizeCreditNote = can(PERMISSIONS.creditNotes.finalize);
  const canVoidCreditNote = can(PERMISSIONS.creditNotes.void);
  const canApplyCredit = creditNote?.status === "FINALIZED" && Number(creditNote.unappliedAmount) > 0 && canFinalizeCreditNote;
  const canViewCompliance = can(PERMISSIONS.compliance.view);
  const canValidateCompliance = can(PERMISSIONS.compliance.manage) && can(PERMISSIONS.compliance.validate);

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title={creditNote ? creditNote.creditNoteNumber : "Credit note"}
        badge={creditNote ? <LedgerStatusBadge tone={creditNoteStatusTone(creditNote.status)}>{creditNoteStatusLabel(creditNote.status)}</LedgerStatusBadge> : null}
        description={
          <>
            Credit note detail, reversal posting, and PDF download.
            {creditNote ? <span className="mt-1 block text-xs">Credit note PDF downloads create an archive record. ZATCA credit note XML is not implemented yet.</span> : null}
          </>
        }
        actions={
          <LedgerActionBar>
            <LedgerButton href="/sales/credit-notes" icon={ArrowLeft}>
              Back
            </LedgerButton>
            {creditNote?.status === "DRAFT" ? <LedgerButton href={`/sales/credit-notes/${creditNote.id}/edit`}>Edit</LedgerButton> : null}
            {creditNote?.customerId ? <LedgerButton href={`/contacts/${creditNote.customerId}`}>Customer ledger</LedgerButton> : null}
            {creditNote?.status === "FINALIZED" && Number(creditNote.unappliedAmount) > 0 ? (
              <LedgerButton
                href={`/sales/customer-refunds/new?customerId=${encodeURIComponent(creditNote.customerId)}&sourceType=CREDIT_NOTE&sourceCreditNoteId=${encodeURIComponent(creditNote.id)}`}
                variant="primary"
              >
                Refund credit
              </LedgerButton>
            ) : null}
            {creditNote ? (
              <LedgerButton type="button" onClick={() => void downloadCreditNotePdf()} disabled={actionLoading} icon={Download}>
                Download credit note PDF
              </LedgerButton>
            ) : null}
            {creditNote?.status === "DRAFT" && canFinalizeCreditNote ? (
              <LedgerButton type="button" onClick={() => void runAction("finalize")} disabled={actionLoading} variant="primary" icon={CheckCircle2}>
                Finalize
              </LedgerButton>
            ) : null}
            {creditNote && creditNote.status !== "VOIDED" && canVoidCreditNote ? (
              <LedgerButton type="button" onClick={() => void runAction("void")} disabled={actionLoading} variant="danger" icon={Undo2} className="self-start">
                Void
              </LedgerButton>
            ) : null}
            {creditNote?.status === "DRAFT" && canCreateCreditNote ? (
              <LedgerButton type="button" onClick={() => void deleteCreditNote()} disabled={actionLoading} icon={Trash2}>
                Delete
              </LedgerButton>
            ) : null}
          </LedgerActionBar>
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
          {!organizationId ? <StatusMessage type="info">Log in and select an organization to load credit notes.</StatusMessage> : null}
          {loading ? <StatusMessage type="loading">Loading credit note...</StatusMessage> : null}
          {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
          {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        </div>

      {creditNote ? (
        <div className="space-y-5">
          <AttachmentPanel linkedEntityType="CREDIT_NOTE" linkedEntityId={creditNote.id} />

          <LedgerPanel>
            <LedgerMetricGrid>
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
            </LedgerMetricGrid>
            <div className="mt-4">
              <LedgerMetadataRow
                items={[
                  { label: "Reason", value: creditNote.reason ?? "-" },
                  { label: "Notes", value: creditNote.notes ?? "-" },
                ]}
              />
            </div>
          </LedgerPanel>

          {canViewCompliance ? (
            <UaeEinvoiceReadinessPanel
              title="UAE credit-note eInvoicing/PINT-AE readiness"
              response={uaeReadiness}
              actionLoading={actionLoading}
              canValidate={canValidateCompliance}
              onValidate={() => void validateUaeReadiness()}
            />
          ) : (
            <StatusMessage type="info">UAE credit-note readiness requires compliance view permission.</StatusMessage>
          )}

          <LedgerSection title="Credit note lines" description="Revenue reversal lines retained from the current credit note payload.">
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
                {creditNote.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? `${line.account.code} ${line.account.name}` : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.unitPrice, creditNote.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.lineGrossAmount, creditNote.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.discountAmount, creditNote.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.taxableAmount, creditNote.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.taxAmount, creditNote.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.lineTotal, creditNote.currency)}</LedgerMoney></td>
                  </tr>
                ))}
              </tbody>
            </LedgerDataTable>
          </LedgerSection>

          <LedgerSummaryBand>
            <dl className="ml-auto grid max-w-sm grid-cols-2 gap-2 text-sm">
              <dt>Subtotal</dt>
              <dd className="text-right"><LedgerMoney>{formatMoneyAmount(creditNote.subtotal, creditNote.currency)}</LedgerMoney></dd>
              <dt>Discount</dt>
              <dd className="text-right"><LedgerMoney>{formatMoneyAmount(creditNote.discountTotal, creditNote.currency)}</LedgerMoney></dd>
              <dt>Taxable</dt>
              <dd className="text-right"><LedgerMoney>{formatMoneyAmount(creditNote.taxableTotal, creditNote.currency)}</LedgerMoney></dd>
              <dt>VAT</dt>
              <dd className="text-right"><LedgerMoney>{formatMoneyAmount(creditNote.taxTotal, creditNote.currency)}</LedgerMoney></dd>
              <dt className="font-semibold text-ink">Total credit</dt>
              <dd className="text-right font-semibold text-ink"><LedgerMoney>{formatMoneyAmount(creditNote.total, creditNote.currency)}</LedgerMoney></dd>
              <dt className="font-semibold text-ink">Applied amount</dt>
              <dd className="text-right font-semibold text-ink"><LedgerMoney>{formatMoneyAmount(appliedAmount, creditNote.currency)}</LedgerMoney></dd>
              <dt className="font-semibold text-ink">Unapplied amount</dt>
              <dd className="text-right font-semibold text-ink"><LedgerMoney>{formatMoneyAmount(creditNote.unappliedAmount, creditNote.currency)}</LedgerMoney></dd>
            </dl>
          </LedgerSummaryBand>

          <LedgerSection
            title="Credit allocations"
            description="Applying a credit note only matches the existing AR reduction to invoice balances. No new journal entry is created."
          >
            {creditNote.allocations && creditNote.allocations.length > 0 ? (
              <LedgerDataTable minWidth="1040px" className="shadow-none">
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
                        <td className="px-4 py-3">{allocation.invoice ? <LedgerDate>{new Date(allocation.invoice.issueDate).toLocaleDateString()}</LedgerDate> : "-"}</td>
                        <td className="px-4 py-3">{allocation.invoice ? <LedgerMoney>{formatMoneyAmount(allocation.invoice.total, creditNote.currency)}</LedgerMoney> : "-"}</td>
                        <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(allocation.amountApplied, creditNote.currency)}</LedgerMoney></td>
                        <td className="px-4 py-3">{allocation.invoice ? <LedgerMoney>{formatMoneyAmount(allocation.invoice.balanceDue, creditNote.currency)}</LedgerMoney> : "-"}</td>
                        <td className="px-4 py-3">
                          <LedgerStatusBadge tone={allocationStatusTone(allocation)}>{creditNoteAllocationStatusLabel(allocation)}</LedgerStatusBadge>
                        </td>
                        <td className="px-4 py-3">{allocation.reversedAt ? <LedgerDate>{new Date(allocation.reversedAt).toLocaleString()}</LedgerDate> : "-"}</td>
                        <td className="px-4 py-3 text-steel">{allocation.reversalReason ?? "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <LedgerButton href={`/sales/invoices/${allocation.invoiceId}`} size="sm">
                              View invoice
                            </LedgerButton>
                            {canReverseCreditNoteAllocation(allocation) && canVoidCreditNote ? (
                              <LedgerButton type="button" onClick={() => void reverseAllocation(allocation.id)} disabled={actionLoading} size="sm" variant="danger" icon={RotateCcw}>
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
              <LedgerEmptyState title="No credit has been applied to invoices yet" />
            )}
          </LedgerSection>

          <LedgerSection
            title="Apply credit"
            description="Use unapplied credit against finalized open invoices for the same customer."
            action={<LedgerStatusBadge tone="neutral">No accounting journal</LedgerStatusBadge>}
          >
            {canApplyCredit ? (
              openInvoices.length > 0 ? (
                <form onSubmit={applyCreditNote} className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-[1.4fr_0.7fr_auto]">
                  <LedgerFieldLabel>
                    <LedgerFieldText>Open invoice</LedgerFieldText>
                    <LedgerSelect value={selectedInvoiceId} onChange={(event) => setSelectedInvoiceId(event.target.value)}>
                      {openInvoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - balance {formatMoneyAmount(invoice.balanceDue, invoice.currency)}
                        </option>
                      ))}
                    </LedgerSelect>
                  </LedgerFieldLabel>
                  <LedgerFieldLabel>
                    <LedgerFieldText>Amount to apply</LedgerFieldText>
                    <LedgerInput value={amountApplied} onChange={(event) => setAmountApplied(event.target.value)} placeholder="0.0000" />
                  </LedgerFieldLabel>
                  <LedgerButton type="submit" disabled={actionLoading || !selectedInvoiceId} variant="primary" className="self-end">
                    Apply
                  </LedgerButton>
                  <div className="md:col-span-3 text-xs text-steel">
                    Selected invoice balance: {selectedInvoice ? formatMoneyAmount(selectedInvoice.balanceDue, selectedInvoice.currency) : "-"}.
                    Credit available: {formatMoneyAmount(creditNote.unappliedAmount, creditNote.currency)}.
                  </div>
                </form>
              ) : (
                <LedgerEmptyState title="No finalized open invoices are available for this customer" />
              )
            ) : (
              <LedgerSummaryBand tone="info">Credit can be applied only after finalization while unapplied amount remains.</LedgerSummaryBand>
            )}
          </LedgerSection>

          <LedgerAlert tone="warning">
            ZATCA credit note XML, signing, PDF/A-3 embedding, and clearance/reporting are intentionally not implemented in this MVP.
          </LedgerAlert>
          <SourceDocumentGuidance />
        </div>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
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
