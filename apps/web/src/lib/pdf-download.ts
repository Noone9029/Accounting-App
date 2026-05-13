import { ApiError, apiBaseUrl, getAccessToken, getActiveOrganizationId } from "./api";

export function invoicePdfPath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/pdf`;
}

export function creditNotePdfPath(creditNoteId: string): string {
  return `/credit-notes/${encodeURIComponent(creditNoteId)}/pdf`;
}

export function receiptPdfPath(paymentId: string): string {
  return `/customer-payments/${encodeURIComponent(paymentId)}/receipt.pdf`;
}

export function customerRefundPdfPath(refundId: string): string {
  return `/customer-refunds/${encodeURIComponent(refundId)}/pdf`;
}

export function purchaseBillPdfPath(billId: string): string {
  return `/purchase-bills/${encodeURIComponent(billId)}/pdf`;
}

export function purchaseOrderPdfPath(orderId: string): string {
  return `/purchase-orders/${encodeURIComponent(orderId)}/pdf`;
}

export function purchaseDebitNotePdfPath(debitNoteId: string): string {
  return `/purchase-debit-notes/${encodeURIComponent(debitNoteId)}/pdf`;
}

export function supplierPaymentReceiptPdfPath(paymentId: string): string {
  return `/supplier-payments/${encodeURIComponent(paymentId)}/receipt.pdf`;
}

export function supplierRefundPdfPath(refundId: string): string {
  return `/supplier-refunds/${encodeURIComponent(refundId)}/pdf`;
}

export function cashExpensePdfPath(expenseId: string): string {
  return `/cash-expenses/${encodeURIComponent(expenseId)}/pdf`;
}

export function statementPdfPath(contactId: string, from?: string, to?: string): string {
  const query = new URLSearchParams();
  if (from) {
    query.set("from", from);
  }
  if (to) {
    query.set("to", to);
  }

  const suffix = query.toString();
  return `/contacts/${encodeURIComponent(contactId)}/statement.pdf${suffix ? `?${suffix}` : ""}`;
}

export function generatedDocumentDownloadPath(documentId: string): string {
  return `/generated-documents/${encodeURIComponent(documentId)}/download`;
}

export function pdfApiUrl(path: string): string {
  return new URL(path, apiBaseUrl).toString();
}

export async function downloadPdf(path: string, filename?: string): Promise<void> {
  return downloadAuthenticatedFile(path, filename);
}

export async function downloadAuthenticatedFile(path: string, filename?: string): Promise<void> {
  const headers = new Headers();
  const token = getAccessToken();
  const organizationId = getActiveOrganizationId();

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  if (organizationId) {
    headers.set("x-organization-id", organizationId);
  }

  const response = await fetch(pdfApiUrl(path), { headers });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(text || `PDF request failed with ${response.status}`, response.status, text);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.target = "_blank";
  link.rel = "noreferrer";
  if (filename) {
    link.download = filename;
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}
