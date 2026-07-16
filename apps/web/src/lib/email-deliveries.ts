import type { CustomerDocumentEmailDeliveryEntry, SalesInvoiceEmailDeliveryEntry } from "./types";

export const DEFAULT_SALES_INVOICE_MESSAGE = "Please find your finalized sales invoice attached. The PDF is archived in LedgerByte for review.";

export function createEmailDeliveryIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `document-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function invoiceEmailSubject(invoiceNumber: string): string {
  return `Invoice ${invoiceNumber}`;
}

export function deliveryStatusTone(status: SalesInvoiceEmailDeliveryEntry["status"]): "neutral" | "success" | "warning" | "danger" {
  if (status === "SENT_MOCK" || status === "SENT_PROVIDER") return "success";
  if (status === "FAILED") return "danger";
  return "warning";
}

export function deliveryStatusLabel(entry: Pick<SalesInvoiceEmailDeliveryEntry, "status" | "userFacingStatus">): string {
  if (entry.userFacingStatus.trim()) return entry.userFacingStatus;
  if (entry.status === "SENT_MOCK") return "Simulated locally";
  if (entry.status === "SENT_PROVIDER") return "Accepted by email provider";
  if (entry.status === "FAILED") return "Delivery failed; retry";
  return "Queued";
}

export function formatDeliveryRecipient(maskedRecipient: string): string {
  return maskedRecipient || "Recipient hidden";
}

export type CustomerDocumentDeliveryHistoryEntry = CustomerDocumentEmailDeliveryEntry | SalesInvoiceEmailDeliveryEntry;
