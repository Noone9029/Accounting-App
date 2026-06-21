"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { RelatedDeliveryNotesPanel } from "@/components/delivery-notes/related-delivery-notes-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { downloadPdf, generatedDocumentDownloadPath, salesQuotePdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import { salesQuoteStatusLabel } from "@/lib/sales-quotes";
import type { DeliveryNote, GeneratedDocument, SalesQuote, SalesQuoteConversionResponse } from "@/lib/types";

type QuoteAction = "mark-sent" | "accept" | "reject" | "expire" | "cancel";

export default function SalesQuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load sales quote.");
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
      setSuccess(`Sales quote ${updated.quoteNumber} is now ${salesQuoteStatusLabel(updated.status).toLowerCase()}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update sales quote.");
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
      setSuccess(`Converted to draft invoice ${result.invoice.invoiceNumber}. Review and finalize the invoice only when ready.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to convert sales quote.");
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
      setSuccess(`Sales quote PDF generated and downloaded for ${quote.quoteNumber}.`);
      if (canViewGeneratedDocuments) {
        const documents = await apiRequest<GeneratedDocument[]>(`/generated-documents?documentType=SALES_QUOTE&sourceType=SalesQuote&sourceId=${encodeURIComponent(quote.id)}`);
        setGeneratedDocuments(documents);
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download sales quote PDF.");
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
      setSuccess(`Downloaded archived sales quote PDF ${document.filename}.`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download archived sales quote PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales quote"
        title={quote ? quote.quoteNumber : "Sales quote"}
        description="Non-posting sales quote workspace for customer approval and draft invoice conversion."
        badge={quote ? <LedgerStatusBadge tone={salesQuoteStatusTone(quote.status)}>{salesQuoteStatusLabel(quote.status)}</LedgerStatusBadge> : null}
        actions={<LedgerButton href="/sales/quotes">Back to quotes</LedgerButton>}
      />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load this sales quote.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading sales quote...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {quote ? (
        <LedgerPageBody>
          <LedgerSummaryBand tone="info">This quote is non-posting. It is excluded from AR balances, revenue, VAT reports, ZATCA, inventory movement, payments, and customer statement balances.</LedgerSummaryBand>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <LedgerSection
              title={quote.customer?.displayName ?? quote.customer?.name ?? "Customer"}
              description="Customer-facing quote context and workflow actions."
              action={
                <LedgerActionBar>
                  {quote.status === "DRAFT" && canUpdateQuote ? (
                    <LedgerButton href={`/sales/quotes/${quote.id}/edit`}>
                      Edit
                    </LedgerButton>
                  ) : null}
                  {quote.status === "DRAFT" && canUpdateQuote ? <ActionButton label="Mark sent" onClick={() => void runAction("mark-sent")} disabled={actionLoading} /> : null}
                  {quote.status === "SENT" && canUpdateQuote ? <ActionButton label="Accept" onClick={() => void runAction("accept")} disabled={actionLoading} /> : null}
                  {quote.status === "SENT" && canUpdateQuote ? <ActionButton label="Reject" onClick={() => void runAction("reject")} disabled={actionLoading} /> : null}
                  {quote.status === "SENT" && canUpdateQuote ? <ActionButton label="Expire" onClick={() => void runAction("expire")} disabled={actionLoading} /> : null}
                  {(quote.status === "DRAFT" || quote.status === "SENT") && canUpdateQuote ? <ActionButton label="Cancel" onClick={() => void runAction("cancel")} disabled={actionLoading} /> : null}
                  {quote.status === "ACCEPTED" && canCreateInvoice ? <ActionButton label="Convert to invoice" onClick={() => void convertToInvoice()} disabled={actionLoading} primary /> : null}
                </LedgerActionBar>
              }
            >
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <Summary label="Issue date" value={formatOptionalDate(quote.issueDate)} />
                    <Summary label="Expiry date" value={formatOptionalDate(quote.expiryDate)} />
                    <Summary label="Reference" value={quote.reference ?? "-"} />
                    <Summary label="Tax mode" value={taxModeLabel(quote.taxMode)} />
                  </div>
            </LedgerSection>

            <LedgerPanel>
              <h2 className="text-base font-semibold text-ink">Totals</h2>
              <div className="mt-3 space-y-3">
                <BalanceLine label="Subtotal" value={formatMoneyAmount(quote.subtotal, quote.currency)} />
                <BalanceLine label="Discount" value={formatMoneyAmount(quote.discountTotal, quote.currency)} />
                <BalanceLine label="Taxable" value={formatMoneyAmount(quote.taxableTotal, quote.currency)} />
                <BalanceLine label="VAT" value={formatMoneyAmount(quote.taxTotal, quote.currency)} />
                <BalanceLine label="Total" value={formatMoneyAmount(quote.total, quote.currency)} emphasized />
              </div>
              {quote.convertedSalesInvoice ? (
                <LedgerButton href={`/sales/invoices/${quote.convertedSalesInvoice.id}`} className="mt-4">
                  Open invoice {quote.convertedSalesInvoice.invoiceNumber}
                </LedgerButton>
              ) : null}
            </LedgerPanel>
          </div>

          <LedgerDataTable minWidth="1040px">
              <thead className="bg-mist text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Tax</th>
                  <th className="px-4 py-3">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(quote.lines ?? []).map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? `${line.account.code} ${line.account.name}` : line.accountId}</td>
                    <td className="px-4 py-3"><LedgerMoney>{line.quantity}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.unitPrice, quote.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{line.discountRate}%</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.taxAmount, quote.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.lineTotal, quote.currency)}</LedgerMoney></td>
                  </tr>
                ))}
              </tbody>
          </LedgerDataTable>

          <LedgerSection title="Notes and terms">
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <Summary label="Notes" value={quote.notes ?? "-"} />
              <Summary label="Terms" value={quote.terms ?? "-"} />
            </div>
          </LedgerSection>

          <RelatedDeliveryNotesPanel sourceKind="quote" deliveryNotes={relatedDeliveryNotes} loading={relatedDeliveryNotesLoading} />

          <LedgerSection
            title="Sales quote PDF archive"
            description={
              <>
                  Sales quote PDFs are non-posting quote outputs. They are not tax invoices and do not create journals, AR balances, VAT filing, ZATCA submission, email delivery, or payment collection.
              </>
            }
            action={canDownloadGeneratedDocuments ? <ActionButton label="Download sales quote PDF" onClick={() => void downloadSalesQuotePdf()} disabled={pdfLoading} primary /> : null}
          >

            {canViewGeneratedDocuments ? (
              <div className="mt-4 space-y-2">
                {generatedDocuments.length === 0 ? (
                  <p className="text-sm text-steel">No archived sales quote PDF has been generated yet.</p>
                ) : (
                  generatedDocuments.slice(0, 5).map((document) => (
                    <div key={document.id} className="flex flex-col gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-medium text-ink">{document.filename}</div>
                        <div className="text-xs text-steel">
                          {document.status} - {document.sizeBytes} bytes - <LedgerDate>{formatOptionalDate(document.generatedAt)}</LedgerDate>
                        </div>
                      </div>
                      {canDownloadGeneratedDocuments ? <ActionButton label="Download archived PDF" onClick={() => void downloadArchivedDocument(document)} disabled={pdfLoading} /> : null}
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </LedgerSection>
        </LedgerPageBody>
      ) : null}
    </LedgerPage>
  );
}

function ActionButton({ label, onClick, disabled, primary = false }: { label: string; onClick: () => void; disabled: boolean; primary?: boolean }) {
  return (
    <LedgerButton type="button" onClick={onClick} disabled={disabled} variant={primary ? "primary" : "secondary"}>
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

function BalanceLine({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-steel">{label}</span>
      <span className={emphasized ? "text-lg font-semibold text-ink" : "text-sm font-medium text-ink"}>
        <LedgerMoney>{value}</LedgerMoney>
      </span>
    </div>
  );
}

function salesQuoteStatusTone(status: SalesQuote["status"]): LedgerStatusTone {
  if (status === "ACCEPTED" || status === "CONVERTED") {
    return "success";
  }
  if (status === "REJECTED" || status === "CANCELLED" || status === "EXPIRED") {
    return "danger";
  }
  if (status === "SENT") {
    return "info";
  }
  return "draft";
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
