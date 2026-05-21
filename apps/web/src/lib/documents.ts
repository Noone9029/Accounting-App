import type { DocumentType, GeneratedDocumentStatus } from "./types";

const documentTypeLabels: Record<DocumentType, string> = {
  SALES_INVOICE: "Sales Invoice",
  CREDIT_NOTE: "Credit Note",
  CUSTOMER_PAYMENT_RECEIPT: "Customer Payment Receipt",
  CUSTOMER_REFUND: "Customer Refund",
  CUSTOMER_STATEMENT: "Customer Statement",
  SUPPLIER_STATEMENT: "Supplier Statement",
  PURCHASE_ORDER: "Purchase Order",
  PURCHASE_BILL: "Purchase Bill",
  PURCHASE_DEBIT_NOTE: "Purchase Debit Note",
  SUPPLIER_PAYMENT_RECEIPT: "Supplier Payment Receipt",
  SUPPLIER_REFUND: "Supplier Refund",
  CASH_EXPENSE: "Cash Expense",
  REPORT_GENERAL_LEDGER: "General Ledger Report",
  REPORT_TRIAL_BALANCE: "Trial Balance Report",
  REPORT_PROFIT_AND_LOSS: "Profit & Loss Report",
  REPORT_BALANCE_SHEET: "Balance Sheet Report",
  REPORT_VAT_SUMMARY: "VAT Summary Report",
  REPORT_AGED_RECEIVABLES: "Aged Receivables Report",
  REPORT_AGED_PAYABLES: "Aged Payables Report",
  BANK_RECONCILIATION_REPORT: "Bank Reconciliation Report",
};

export function documentTypeLabel(type: DocumentType): string {
  return documentTypeLabels[type];
}

export function generatedDocumentStatusLabel(status: GeneratedDocumentStatus): string {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function generatedDocumentStatusBadgeClass(status: GeneratedDocumentStatus): string {
  switch (status) {
    case "GENERATED":
      return "bg-emerald-50 text-emerald-700";
    case "FAILED":
      return "bg-rose-50 text-rosewood";
    case "SUPERSEDED":
      return "bg-slate-100 text-slate-700";
  }
}

export function documentSourceTypeLabel(sourceType: string): string {
  return sourceType
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
