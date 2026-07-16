"use client";

import { CustomerDocumentEmailDelivery } from "@/components/email/customer-document-email-delivery";
import { DEFAULT_SALES_INVOICE_MESSAGE, invoiceEmailSubject } from "@/lib/email-deliveries";
import type { SalesInvoice } from "@/lib/types";

interface InvoiceEmailDeliveryPanelProps {
  invoice: SalesInvoice;
  organizationId: string | null;
  canSend: boolean;
}

export function InvoiceEmailDeliveryPanel({ invoice, organizationId, canSend }: Readonly<InvoiceEmailDeliveryPanelProps>) {
  return <CustomerDocumentEmailDelivery
    sourceId={invoice.id}
    organizationId={organizationId}
    canSend={canSend}
    eligible={invoice.status === "FINALIZED"}
    sourceLabel="invoice"
    documentFilename={`invoice-${invoice.invoiceNumber}.pdf`}
    recipientEmail={invoice.customer?.email ?? ""}
    defaultSubject={invoiceEmailSubject(invoice.invoiceNumber)}
    defaultMessage={DEFAULT_SALES_INVOICE_MESSAGE}
    ineligibleMessage="Only finalized invoices can be queued for email delivery."
    noPermissionMessage="You do not have permission to send invoices by email."
    successMessage="Invoice queued for email delivery."
    emptyHistoryMessage="No invoice email deliveries queued yet."
    endpoint={`/sales-invoices/${invoice.id}/email-deliveries`}
  />;
}
