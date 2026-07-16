"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { RelatedDeliveryNotesPanel } from "@/components/delivery-notes/related-delivery-notes-panel";
import { CustomerDocumentEmailDelivery } from "@/components/email/customer-document-email-delivery";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { downloadPdf, generatedDocumentDownloadPath, salesQuotePdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import { salesQuoteStatusBadgeClass, salesQuoteStatusLabel } from "@/lib/sales-quotes";
import type { DeliveryNote, GeneratedDocument, SalesQuote, SalesQuoteConversionResponse } from "@/lib/types";

type QuoteAction = "mark-sent" | "accept" | "reject" | "expire" | "cancel";

export default function SalesQuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [quote, setQuote] = useState<SalesQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([]);
  const [relatedDeliveryNotes, setRelatedDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [relatedDeliveryNotesLoading, setRelatedDeliveryNotesLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canUpdateQuote = can(PERMISSIONS.salesInvoices.update);
  const canCreateInvoice = can(PERMISSIONS.salesInvoices.create);
  const canViewGeneratedDocuments = can(PERMISSIONS.generatedDocuments.view);
  const canDownloadGeneratedDocuments = can(PERMISSIONS.generatedDocuments.download);
  const canSendQuote = can(PERMISSIONS.salesInvoices.send);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SalesQuote>(`/sales-quotes/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setQuote(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load sales quote."));
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
    if (!organizationId || !quote?.id || !quote.customerId) {
      setRelatedDeliveryNotes([]);
      setRelatedDeliveryNotesLoading(false);
      return;
    }

    let cancelled = false;
    setRelatedDeliveryNotesLoading(true);
    apiRequest<DeliveryNote[]>(`/delivery-notes?customerId=${encodeURIComponent(quote.customerId)}`)
      .then((result) => {
        if (!cancelled) {
          setRelatedDeliveryNotes(result.filter((deliveryNote) => deliveryNote.relatedSalesQuoteId === quote.id));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRelatedDeliveryNotes([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRelatedDeliveryNotesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, quote?.customerId, quote?.id]);

  useEffect(() => {
    if (!organizationId || !params.id || !canViewGeneratedDocuments) {
      setGeneratedDocuments([]);
      return;
    }

    let cancelled = false;
    apiRequest<GeneratedDocument[]>(`/generated-documents?documentType=SALES_QUOTE&sourceType=SalesQuote&sourceId=${encodeURIComponent(params.id)}`)
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

  async function runAction(action: QuoteAction) {
    if (!quote) {
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<SalesQuote>(`/sales-quotes/${quote.id}/${action}`, { method: "POST" });
      setQuote(updated);
      setSuccess(tc("Sales quote {number} is now {status}.", { number: updated.quoteNumber, status: tc(salesQuoteStatusLabel(updated.status)).toLowerCase() }));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to update sales quote."));
    } finally {
      setActionLoading(false);
    }
  }

  async function convertToInvoice() {
    if (!quote) {
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiRequest<SalesQuoteConversionResponse>(`/sales-quotes/${quote.id}/convert-to-invoice`, { method: "POST" });
      setQuote(result.quote);
      setSuccess(tc("Converted to draft invoice {number}. Review and finalize the invoice only when ready.", { number: result.invoice.invoiceNumber }));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to convert sales quote."));
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadSalesQuotePdf() {
    if (!quote) {
      return;
    }
    setPdfLoading(true);
    setError("");
    setSuccess("");
    try {
      await downloadPdf(salesQuotePdfPath(quote.id), `sales-quote-${quote.quoteNumber}.pdf`);
      setSuccess(tc("Sales quote PDF generated and downloaded for {number}.", { number: quote.quoteNumber }));
      if (canViewGeneratedDocuments) {
        const documents = await apiRequest<GeneratedDocument[]>(`/generated-documents?documentType=SALES_QUOTE&sourceType=SalesQuote&sourceId=${encodeURIComponent(quote.id)}`);
        setGeneratedDocuments(documents);
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download sales quote PDF."));
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
      setSuccess(tc("Downloaded archived sales quote PDF {filename}.", { filename: document.filename }));
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download archived sales quote PDF."));
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{quote ? <bdi dir="ltr">{quote.quoteNumber}</bdi> : tc("Sales quote")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{tc("Non-posting sales quote workspace for customer approval and draft invoice conversion.")}</p>
        </div>
        <Link href="/sales/quotes" className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back to quotes")}
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load this sales quote.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading sales quote...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {quote ? (
        <div className="mt-5 space-y-5">
          <StatusMessage type="info">{tc("This quote is non-posting. It is excluded from AR balances, revenue, VAT reports, ZATCA, inventory movement, payments, and customer statement balances.")}</StatusMessage>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-ink">{quote.customer?.displayName ?? quote.customer?.name ?? tc("Customer")}</h2>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${salesQuoteStatusBadgeClass(quote.status)}`}>{tc(salesQuoteStatusLabel(quote.status))}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-steel md:grid-cols-2">
                    <Summary label={tc("Issue date")} value={formatAppDate(quote.issueDate, locale, "-")} />
                    <Summary label={tc("Expiry date")} value={formatAppDate(quote.expiryDate, locale, "-")} />
                    <Summary label={tc("Reference")} value={quote.reference ? <bdi dir="ltr">{quote.reference}</bdi> : "-"} />
                    <Summary label={tc("Tax mode")} value={tc(taxModeLabel(quote.taxMode))} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {quote.status === "DRAFT" && canUpdateQuote ? (
                    <Link href={`/sales/quotes/${quote.id}/edit`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      {tc("Edit")}
                    </Link>
                  ) : null}
                  {quote.status === "DRAFT" && canUpdateQuote ? <ActionButton label={tc("Mark sent")} onClick={() => void runAction("mark-sent")} disabled={actionLoading} /> : null}
                  {quote.status === "SENT" && canUpdateQuote ? <ActionButton label={tc("Accept")} onClick={() => void runAction("accept")} disabled={actionLoading} /> : null}
                  {quote.status === "SENT" && canUpdateQuote ? <ActionButton label={tc("Reject")} onClick={() => void runAction("reject")} disabled={actionLoading} /> : null}
                  {quote.status === "SENT" && canUpdateQuote ? <ActionButton label={tc("Expire")} onClick={() => void runAction("expire")} disabled={actionLoading} /> : null}
                  {(quote.status === "DRAFT" || quote.status === "SENT") && canUpdateQuote ? <ActionButton label={tc("Cancel")} onClick={() => void runAction("cancel")} disabled={actionLoading} /> : null}
                  {quote.status === "ACCEPTED" && canCreateInvoice ? <ActionButton label={tc("Convert to invoice")} onClick={() => void convertToInvoice()} disabled={actionLoading} primary /> : null}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="text-xs font-semibold uppercase tracking-wide text-steel">{tc("Totals")}</div>
              <div className="mt-3 space-y-3">
                <BalanceLine label={tc("Subtotal")} value={formatAppMoney(quote.subtotal, quote.currency, locale)} />
                <BalanceLine label={tc("Discount")} value={formatAppMoney(quote.discountTotal, quote.currency, locale)} />
                <BalanceLine label={tc("Taxable")} value={formatAppMoney(quote.taxableTotal, quote.currency, locale)} />
                <BalanceLine label={tc("VAT")} value={formatAppMoney(quote.taxTotal, quote.currency, locale)} />
                <BalanceLine label={tc("Total")} value={formatAppMoney(quote.total, quote.currency, locale)} emphasized />
              </div>
              {quote.convertedSalesInvoice ? (
                <Link href={`/sales/invoices/${quote.convertedSalesInvoice.id}`} className="mt-4 inline-flex rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
                  {tc("Open invoice {number}", { number: quote.convertedSalesInvoice.invoiceNumber })}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[1040px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Description")}</th>
                  <th className="px-4 py-3">{tc("Account")}</th>
                  <th className="px-4 py-3">{tc("Qty")}</th>
                  <th className="px-4 py-3">{tc("Price")}</th>
                  <th className="px-4 py-3">{tc("Discount")}</th>
                  <th className="px-4 py-3">{tc("Tax")}</th>
                  <th className="px-4 py-3">{tc("Line total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(quote.lines ?? []).map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? <bdi dir="ltr">{`${line.account.code} ${line.account.name}`}</bdi> : <bdi dir="ltr">{line.accountId}</bdi>}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.unitPrice, quote.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.discountRate}%</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.taxAmount, quote.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.lineTotal, quote.currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">{tc("Notes and terms")}</h2>
            <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
              <Summary label={tc("Notes")} value={quote.notes ?? "-"} />
              <Summary label={tc("Terms")} value={quote.terms ?? "-"} />
            </div>
          </div>

          <RelatedDeliveryNotesPanel sourceKind="quote" deliveryNotes={relatedDeliveryNotes} loading={relatedDeliveryNotesLoading} />

          <CustomerDocumentEmailDelivery
            sourceId={quote.id}
            organizationId={organizationId}
            canSend={canSendQuote}
            eligible={quote.status === "SENT" || quote.status === "ACCEPTED"}
            sourceLabel={quote.documentKind === "PROFORMA" ? "proforma" : "quote"}
            documentFilename={`${quote.documentKind === "PROFORMA" ? "proforma" : "sales-quote"}-${quote.quoteNumber}.pdf`}
            recipientEmail={quote.customer?.email ?? ""}
            defaultSubject={`${quote.documentKind === "PROFORMA" ? "Proforma" : "Quote"} ${quote.quoteNumber}`}
            defaultMessage={`Please find your ${quote.documentKind === "PROFORMA" ? "proforma" : "sales quote"} attached for review.`}
            ineligibleMessage="Only sent or accepted quotes can be queued for email delivery."
            noPermissionMessage="You do not have permission to send quotes by email."
            successMessage={`${quote.documentKind === "PROFORMA" ? "Proforma" : "Quote"} queued for email delivery.`}
            emptyHistoryMessage={`No ${quote.documentKind === "PROFORMA" ? "proforma" : "quote"} email deliveries queued yet.`}
            endpoint={`/sales-quotes/${quote.id}/email-deliveries`}
          />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">{tc("Sales quote PDF archive")}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
                  {tc("Sales quote PDFs are non-posting quote outputs. They are not tax invoices and do not create journals, AR balances, VAT filing, ZATCA submission, email delivery, or payment collection.")}
                </p>
              </div>
              {canDownloadGeneratedDocuments ? <ActionButton label={tc("Download sales quote PDF")} onClick={() => void downloadSalesQuotePdf()} disabled={pdfLoading} primary /> : null}
            </div>

            {canViewGeneratedDocuments ? (
              <div className="mt-4 space-y-2">
                {generatedDocuments.length === 0 ? (
                  <p className="text-sm text-steel">{tc("No archived sales quote PDF has been generated yet.")}</p>
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

function BalanceLine({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-steel">{label}</span>
      <span className={`${emphasized ? "text-lg font-semibold" : "text-sm font-medium"} font-mono text-ink`}>{value}</span>
    </div>
  );
}

function taxModeLabel(taxMode: SalesQuote["taxMode"]): string {
  if (taxMode === "TAX_INCLUSIVE") {
    return "Tax inclusive";
  }
  if (taxMode === "NO_TAX") {
    return "No tax";
  }
  return "Tax exclusive";
}
