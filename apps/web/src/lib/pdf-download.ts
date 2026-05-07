import { ApiError, apiBaseUrl, getAccessToken, getActiveOrganizationId } from "./api";

export function invoicePdfPath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/pdf`;
}

export function receiptPdfPath(paymentId: string): string {
  return `/customer-payments/${encodeURIComponent(paymentId)}/receipt.pdf`;
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

export function pdfApiUrl(path: string): string {
  return new URL(path, apiBaseUrl).toString();
}

export async function downloadPdf(path: string, filename?: string): Promise<void> {
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
