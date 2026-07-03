"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate } from "@/lib/app-i18n";
import { deliveryNoteStatusBadgeClass, deliveryNoteStatusLabel } from "@/lib/delivery-notes";
import { deliveryNotePdfPath, downloadPdf, generatedDocumentDownloadPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { DeliveryNote, GeneratedDocument } from "@/lib/types";

type DeliveryNoteAction = "issue" | "mark-delivered" | "cancel" | "void";

export default function DeliveryNoteDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load delivery note."));
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
  }, [organizationId, params.id, tc]);

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
      setSuccess(tc("Delivery note {number} is now {status}.", { number: updated.deliveryNoteNumber, status: tc(deliveryNoteStatusLabel(updated.status)).toLowerCase() }));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to update delivery note."));
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
      setSuccess(tc("Delivery note PDF generated and downloaded for {number}.", { number: deliveryNote.deliveryNoteNumber }));
      if (canViewGeneratedDocuments) {
        const documents = await apiRequest<GeneratedDocument[]>(`/generated-documents?documentType=DELIVERY_NOTE&sourceType=DeliveryNote&sourceId=${encodeURIComponent(deliveryNote.id)}`);
        setGeneratedDocuments(documents);
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download delivery note PDF."));
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
      setSuccess(tc("Downloaded archived delivery note PDF {filename}.", { filename: document.filename }));
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download archived delivery note PDF."));
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{deliveryNote ? <bdi dir="ltr">{deliveryNote.deliveryNoteNumber}</bdi> : tc("Delivery note")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{tc("Operational delivery documentation for customer fulfillment. This is not a tax invoice, payment, posting, or stock movement.")}</p>
        </div>
        <Link href="/sales/delivery-notes" className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back to delivery notes")}
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load this delivery note.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading delivery note...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {deliveryNote ? (
        <div className="mt-5 space-y-5">
          <StatusMessage type="info">{tc("This Delivery Note is a non-posting fulfillment document: no accounting journals, no accounts receivable, no VAT filing, no ZATCA, no payment, no email, and no automatic stock movement.")}</StatusMessage>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-ink">{deliveryNote.customer?.displayName ?? deliveryNote.customer?.name ?? tc("Customer")}</h2>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${deliveryNoteStatusBadgeClass(deliveryNote.status)}`}>{tc(deliveryNoteStatusLabel(deliveryNote.status))}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-steel md:grid-cols-2">
                    <Summary label={tc("Issue date")} value={formatAppDate(deliveryNote.issueDate, locale, "-")} />
                    <Summary label={tc("Delivery date")} value={formatAppDate(deliveryNote.deliveryDate, locale, "-")} />
                    <Summary label={tc("Reference")} value={deliveryNote.reference ? <bdi dir="ltr">{deliveryNote.reference}</bdi> : "-"} />
                    <Summary label={tc("Branch")} value={deliveryNote.branch?.displayName ?? deliveryNote.branch?.name ?? "-"} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {deliveryNote.status === "DRAFT" && canUpdate ? (
                    <Link href={`/sales/delivery-notes/${deliveryNote.id}/edit`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      {tc("Edit")}
                    </Link>
                  ) : null}
                  {deliveryNote.status === "DRAFT" && canUpdate ? <ActionButton label={locale === "ar" ? tc("Issue delivery note") : tc("Issue")} onClick={() => void runAction("issue")} disabled={actionLoading} /> : null}
                  {deliveryNote.status === "ISSUED" && canUpdate ? <ActionButton label={tc("Mark delivered")} onClick={() => void runAction("mark-delivered")} disabled={actionLoading} primary /> : null}
                  {(deliveryNote.status === "DRAFT" || deliveryNote.status === "ISSUED") && canUpdate ? <ActionButton label={tc("Cancel")} onClick={() => void runAction("cancel")} disabled={actionLoading} /> : null}
                  {deliveryNote.status === "ISSUED" && canUpdate ? <ActionButton label={tc("Void")} onClick={() => void runAction("void")} disabled={actionLoading} /> : null}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div>
                <h2 className="text-base font-semibold text-ink">{tc("Source documents")}</h2>
                <p className="mt-1 text-sm leading-6 text-steel">
                  {tc("Source links are for traceability only. This Delivery Note does not change invoice, quote, stock issue, accounting, tax, email, payment, or inventory state.")}
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {deliveryNote.relatedSalesInvoice ? (
                  <SourceLink
                    label="Source invoice"
                    href={`/sales/invoices/${deliveryNote.relatedSalesInvoice.id}`}
                    value={deliveryNote.relatedSalesInvoice.invoiceNumber}
                    helper={tc("Linked for fulfillment traceability. The Delivery Note does not finalize, void, post, or change this invoice.")}
                  />
                ) : null}
                {deliveryNote.relatedSalesQuote ? (
                  <SourceLink
                    label="Source quote"
                    href={`/sales/quotes/${deliveryNote.relatedSalesQuote.id}`}
                    value={deliveryNote.relatedSalesQuote.quoteNumber}
                    helper={tc("Linked for fulfillment traceability. The Delivery Note does not convert, accept, reject, cancel, or invoice this quote.")}
                  />
                ) : null}
                {deliveryNote.relatedSalesStockIssue ? (
                  <SourceLink
                    label="Linked stock issue (reference only)"
                    href={`/inventory/sales-stock-issues/${deliveryNote.relatedSalesStockIssue.id}`}
                    value={deliveryNote.relatedSalesStockIssue.issueNumber}
                    helper={tc("Linked stock issue is shown for reference. This Delivery Note does not create, approve, void, or reverse inventory movement.")}
                  />
                ) : null}
                {!deliveryNote.relatedSalesInvoice && !deliveryNote.relatedSalesQuote && !deliveryNote.relatedSalesStockIssue ? (
                  <p className="text-sm text-steel">{tc("Direct delivery note with no source document link.")}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">{tc("Delivery address")}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-steel">{deliveryNote.deliveryAddress?.trim() || tc("No delivery address recorded.")}</p>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[900px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Item")}</th>
                  <th className="px-4 py-3">{tc("Description")}</th>
                  <th className="px-4 py-3">{tc("Quantity")}</th>
                  <th className="px-4 py-3">{tc("Unit")}</th>
                  <th className="px-4 py-3">{tc("Source line")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(deliveryNote.lines ?? []).map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 text-steel">{line.item ? <bdi dir="ltr">{`${line.item.sku ? `${line.item.sku} - ` : ""}${line.item.name}`}</bdi> : "-"}</td>
                    <td className="px-4 py-3 text-ink">{line.description}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 text-steel">{line.unitOfMeasure ?? "-"}</td>
                    <td className="px-4 py-3 text-steel">{tc(lineSourceLabel(line))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">{tc("Notes and instructions")}</h2>
            <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
              <Summary label={tc("Notes")} value={deliveryNote.notes ?? "-"} />
              <Summary label={tc("Instructions")} value={deliveryNote.instructions ?? "-"} />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">{tc("Delivery note PDF archive")}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
                  {tc("Delivery note PDFs are operational fulfillment outputs. They are not tax invoices and do not create journals, AR balances, VAT filing, ZATCA submission, email delivery, payment collection, or inventory movement.")}
                </p>
              </div>
              {canDownloadGeneratedDocuments ? <ActionButton label={tc("Download delivery note PDF")} onClick={() => void downloadDeliveryNotePdf()} disabled={pdfLoading} primary /> : null}
            </div>

            {canViewGeneratedDocuments ? (
              <div className="mt-4 space-y-2">
                {generatedDocuments.length === 0 ? (
                  <p className="text-sm text-steel">{tc("No archived delivery note PDF has been generated yet.")}</p>
                ) : (
                  generatedDocuments.slice(0, 5).map((document) => (
                    <div key={document.id} className="flex flex-col gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-medium text-ink">{document.filename}</div>
                        <div className="text-xs text-steel">
                          {tc(document.status)} - {document.sizeBytes} {tc("bytes")} - {formatAppDate(document.generatedAt, locale, "-")}
                        </div>
                      </div>
                      {canDownloadGeneratedDocuments ? <ActionButton label={tc("Download archived PDF")} onClick={() => void downloadArchivedDocument(document)} disabled={pdfLoading} /> : null}
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ActionButton({ label, onClick, disabled, primary = false }: { label: string; onClick: () => void; disabled: boolean; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${primary ? "border-palm bg-palm text-white hover:bg-teal-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"} rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`}
    >
      {label}
    </button>
  );
}

function Summary({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}

function SourceLink({ label, href, value, helper }: { label: string; href: string; value: string; helper: string }) {
  const { tc } = useAppLocale();
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-wide text-steel">{tc(label)}</div>
      <Link href={href} className="mt-1 inline-flex font-mono text-xs font-medium text-palm hover:underline">
        <bdi dir="ltr">{value}</bdi>
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
