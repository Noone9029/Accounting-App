import { DocumentType } from "@prisma/client";
import { PERMISSIONS } from "@ledgerbyte/shared";

export const AP_GENERATED_DOCUMENT_EMAIL_PROVIDER = "mock-no-send";

export const AP_GENERATED_DOCUMENT_EMAIL_SUPPORTED_SOURCES = {
  PurchaseOrder: {
    documentType: DocumentType.PURCHASE_ORDER,
    requiredPermission: PERMISSIONS.purchaseOrders.view,
  },
  PurchaseBill: {
    documentType: DocumentType.PURCHASE_BILL,
    requiredPermission: PERMISSIONS.purchaseBills.view,
  },
  SupplierPayment: {
    documentType: DocumentType.SUPPLIER_PAYMENT_RECEIPT,
    requiredPermission: PERMISSIONS.supplierPayments.view,
  },
  SupplierRefund: {
    documentType: DocumentType.SUPPLIER_REFUND,
    requiredPermission: PERMISSIONS.supplierRefunds.view,
  },
  PurchaseDebitNote: {
    documentType: DocumentType.PURCHASE_DEBIT_NOTE,
    requiredPermission: PERMISSIONS.purchaseDebitNotes.view,
  },
  CashExpense: {
    documentType: DocumentType.CASH_EXPENSE,
    requiredPermission: PERMISSIONS.cashExpenses.view,
  },
} as const;

export type ApGeneratedDocumentEmailSourceType = keyof typeof AP_GENERATED_DOCUMENT_EMAIL_SUPPORTED_SOURCES;

export interface ApGeneratedDocumentEmailAttachmentMetadata {
  generatedDocumentId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
}

export interface ApGeneratedDocumentEmailSourceMetadata {
  sourceType: ApGeneratedDocumentEmailSourceType;
  sourceId: string;
  documentType: DocumentType;
  documentNumber: string;
}
