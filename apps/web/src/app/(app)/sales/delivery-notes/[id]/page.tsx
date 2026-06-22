"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Edit3 } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerMetadataRow,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatusBadge,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { deliveryNoteStatusLabel } from "@/lib/delivery-notes";
import { formatOptionalDate } from "@/lib/invoice-display";
import { deliveryNotePdfPath, downloadPdf, generatedDocumentDownloadPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { DeliveryNote, GeneratedDocument } from "@/lib/types";

type DeliveryNoteAction = "issue" | "mark-delivered" | "cancel" | "void";

export default function DeliveryNoteDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canUpdate = can(PERMISSIONS.salesInvoices.update);
  const canViewGeneratedDocuments = can(PERMISSIONS.generatedDocuments.view);
  const canDownloadGeneratedDocuments = can(PERMISSIONS.generatedDocuments.download);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<DeliveryNote>(`/delivery-notes/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setDeliveryNote(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load delivery note.");
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
    if (!organizationId || !params.id || !canViewGeneratedDocuments) {
      setGeneratedDocuments([]);
      return;
    }

    let cancelled = false;
    apiRequest<GeneratedDocument[]>(`/generated-documents?documentType=DELIVERY_NOTE&sourceType=DeliveryNote&sourceId=${encodeURIComponent(params.id)}`)
      .then((result) => {
        if (!cancelled) {
          setGeneratedDocuments(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeneratedDocuments([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canViewGeneratedDocuments, organizationId, params.id]);

  async function runAction(action: DeliveryNoteAction) {
    if (!deliveryNote) {
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<DeliveryNote>(`/delivery-notes/${deliveryNote.id}/${action}`, { method: "POST" });
      setDeliveryNote(updated);
      setSuccess(`Delivery note ${updated.deliveryNoteNumber} is now ${deliveryNoteStatusLabel(updated.status).toLowerCase()}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update delivery note.");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadDeliveryNotePdf() {
    if (!deliveryNote) {
      return;
    }
    setPdfLoading(true);
    setError("");
    setSuccess("");
    try {
      await downloadPdf(deliveryNotePdfPath(deliveryNote.id), `delivery-note-${deliveryNote.deliveryNoteNumber}.pdf`);
      setSuccess(`Delivery note PDF generated and downloaded for ${deliveryNote.deliveryNoteNumber}.`);
      if (canViewGeneratedDocuments) {
        const documents = await apiRequest<GeneratedDocument[]>(`/generated-documents?documentType=DELIVERY_NOTE&sourceType=DeliveryNote&sourceId=${encodeURIComponent(deliveryNote.id)}`);
        setGeneratedDocuments(documents);
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download delivery note PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  async function downloadArchivedDocument(document: GeneratedDocument) {
    setPdfLoading(true);
    setError("");
    setSuccess("");
    try {
      await downloadPdf(generatedDocumentDownloadPath(document.id), document.filename);
      setSuccess(`Downloaded archived delivery note PDF ${document.filename}.`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download archived delivery note PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title={deliveryNote ? deliveryNote.deliveryNoteNumber : "Delivery note"}
        description="Operational delivery documentation for customer fulfillment. This is not a tax invoice, payment, posting, or stock movement."
        badge={deliveryNote ? <LedgerStatusBadge tone={deliveryNoteStatusTone(deliveryNote.status)}>{deliveryNoteStatusLabel(deliveryNote.status)}</LedgerStatusBadge> : null}
        actions={
          <LedgerButton href="/sales/delivery-notes" icon={ArrowLeft}>
            Back to delivery notes
          </LedgerButton>
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
          {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load this delivery note.</LedgerAlert> : null}
          {loading ? <StatusMessage type="loading">Loading delivery note...</StatusMessage> : null}
          {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
          {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        </div>

        {deliveryNote ? (
          <>
            <LedgerAlert tone="info">This Delivery Note is a non-posting fulfillment document: no accounting journals, no accounts receivable, no VAT filing, no ZATCA, no payment, no email, and no automatic stock movement.</LedgerAlert>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
              <LedgerPanel>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-ink">{deliveryNote.customer?.displayName ?? deliveryNote.customer?.name ?? "Customer"}</h2>
                      <LedgerStatusBadge tone={deliveryNoteStatusTone(deliveryNote.status)}>{deliveryNoteStatusLabel(deliveryNote.status)}</LedgerStatusBadge>
                    </div>
                    <LedgerMetadataRow
                      items={[
                        { label: "Issue date", value: <LedgerDate>{formatOptionalDate(deliveryNote.issueDate)}</LedgerDate> },
                        { label: "Delivery date", value: <LedgerDate>{formatOptionalDate(deliveryNote.deliveryDate)}</LedgerDate> },
                        { label: "Reference", value: deliveryNote.reference ?? "-" },
                        { label: "Branch", value: deliveryNote.branch?.displayName ?? deliveryNote.branch?.name ?? "-" },
                      ]}
                    />
                  </div>
                  <LedgerActionBar className="md:justify-end">
                    {deliveryNote.status === "DRAFT" && canUpdate ? (
                      <LedgerButton href={`/sales/delivery-notes/${deliveryNote.id}/edit`} icon={Edit3}>
                        Edit
                      </LedgerButton>
                    ) : null}
                    {deliveryNote.status === "DRAFT" && canUpdate ? <ActionButton label="Issue" onClick={() => void runAction("issue")} disabled={actionLoading} /> : null}
                    {deliveryNote.status === "ISSUED" && canUpdate ? <ActionButton label="Mark delivered" onClick={() => void runAction("mark-delivered")} disabled={actionLoading} primary /> : null}
                    {(deliveryNote.status === "DRAFT" || deliveryNote.status === "ISSUED") && canUpdate ? <ActionButton label="Cancel" onClick={() => void runAction("cancel")} disabled={actionLoading} /> : null}
                    {deliveryNote.status === "ISSUED" && canUpdate ? <ActionButton label="Void" onClick={() => void runAction("void")} disabled={actionLoading} /> : null}
                  </LedgerActionBar>
                </div>
              </LedgerPanel>

              <LedgerPanel>
                <div>
                  <h2 className="text-base font-semibold text-ink">Source documents</h2>
                  <p className="mt-1 text-sm leading-6 text-steel">
                    Source links are for traceability only. This Delivery Note does not change invoice, quote, stock issue, accounting, tax, email, payment, or inventory state.
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {deliveryNote.relatedSalesInvoice ? (
                    <SourceLink
                      label="Source invoice"
                      href={`/sales/invoices/${deliveryNote.relatedSalesInvoice.id}`}
                      value={deliveryNote.relatedSalesInvoice.invoiceNumber}
                      helper="Linked for fulfillment traceability. The Delivery Note does not finalize, void, post, or change this invoice."
                    />
                  ) : null}
                  {deliveryNote.relatedSalesQuote ? (
                    <SourceLink
                      label="Source quote"
                      href={`/sales/quotes/${deliveryNote.relatedSalesQuote.id}`}
                      value={deliveryNote.relatedSalesQuote.quoteNumber}
                      helper="Linked for fulfillment traceability. The Delivery Note does not convert, accept, reject, cancel, or invoice this quote."
                    />
                  ) : null}
                  {deliveryNote.relatedSalesStockIssue ? (
                    <SourceLink
                      label="Linked stock issue (reference only)"
                      href={`/inventory/sales-stock-issues/${deliveryNote.relatedSalesStockIssue.id}`}
                      value={deliveryNote.relatedSalesStockIssue.issueNumber}
                      helper="Linked stock issue is shown for reference. This Delivery Note does not create, approve, void, or reverse inventory movement."
                    />
                  ) : null}
                  {!deliveryNote.relatedSalesInvoice && !deliveryNote.relatedSalesQuote && !deliveryNote.relatedSalesStockIssue ? (
                    <p className="text-sm text-steel">Direct delivery note with no source document link.</p>
                  ) : null}
                </div>
              </LedgerPanel>
            </div>

            <LedgerSection title="Delivery address">
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-steel">{deliveryNote.deliveryAddress?.trim() || "No delivery address recorded."}</p>
            </LedgerSection>

            <LedgerDataTable minWidth="900px">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Source line</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(deliveryNote.lines ?? []).map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 text-steel">{line.item ? `${line.item.sku ? `${line.item.sku} - ` : ""}${line.item.name}` : "-"}</td>
                    <td className="px-4 py-3 text-ink">{line.description}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 text-steel">{line.unitOfMeasure ?? "-"}</td>
                    <td className="px-4 py-3 text-steel">{lineSourceLabel(line)}</td>
                  </tr>
                ))}
              </tbody>
            </LedgerDataTable>

            <LedgerSection title="Notes and instructions">
              <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
                <Summary label="Notes" value={deliveryNote.notes ?? "-"} />
                <Summary label="Instructions" value={deliveryNote.instructions ?? "-"} />
              </div>
            </LedgerSection>

            <LedgerSection
              title="Delivery note PDF archive"
              description="Delivery note PDFs are operational fulfillment outputs. They are not tax invoices and do not create journals, AR balances, VAT filing, ZATCA submission, email delivery, payment collection, or inventory movement."
              action={canDownloadGeneratedDocuments ? <ActionButton label="Download delivery note PDF" onClick={() => void downloadDeliveryNotePdf()} disabled={pdfLoading} primary icon={Download} /> : null}
            >
              {canViewGeneratedDocuments ? (
                <div className="space-y-2">
                  {generatedDocuments.length === 0 ? (
                    <LedgerEmptyState title="No archived delivery note PDF has been generated yet." />
                  ) : (
                    generatedDocuments.slice(0, 5).map((document) => (
                      <div key={document.id} className="flex flex-col gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-medium text-ink">{document.filename}</div>
                          <div className="text-xs text-steel">
                            {document.status} - {document.sizeBytes} bytes - {formatOptionalDate(document.generatedAt)}
                          </div>
                        </div>
                        {canDownloadGeneratedDocuments ? <ActionButton label="Download archived PDF" onClick={() => void downloadArchivedDocument(document)} disabled={pdfLoading} icon={Download} /> : null}
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </LedgerSection>
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function ActionButton({ label, onClick, disabled, primary = false, icon }: { label: string; onClick: () => void; disabled: boolean; primary?: boolean; icon?: typeof Download }) {
  return (
    <LedgerButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant={primary ? "primary" : "secondary"}
      icon={icon}
    >
      {label}
    </LedgerButton>
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

function SourceLink({ label, href, value, helper }: { label: string; href: string; value: string; helper: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <Link href={href} className="mt-1 inline-flex font-mono text-xs font-medium text-palm hover:underline">
        {value}
      </Link>
      <p className="mt-2 text-xs leading-5 text-steel">{helper}</p>
    </div>
  );
}

function lineSourceLabel(line: NonNullable<DeliveryNote["lines"]>[number]): string {
  if (line.sourceSalesInvoiceLineId) {
    return "Invoice line";
  }
  if (line.sourceSalesQuoteLineId) {
    return "Quote line";
  }
  if (line.sourceSalesStockIssueLineId) {
    return "Stock issue line (reference only)";
  }
  return "Manual";
}

function deliveryNoteStatusTone(status: DeliveryNote["status"]): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "ISSUED":
      return "info";
    case "DELIVERED":
      return "success";
    case "CANCELLED":
      return "warning";
    case "VOIDED":
      return "danger";
  }
}
