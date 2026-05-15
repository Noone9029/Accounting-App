import type { NumberSequenceSetting } from "./types";

const scopeLabels: Record<string, string> = {
  JOURNAL_ENTRY: "Journal Entry",
  INVOICE: "Sales Invoice",
  BILL: "Purchase Bill",
  PAYMENT: "Payment",
  CUSTOMER_REFUND: "Customer Refund",
  PURCHASE_ORDER: "Purchase Order",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
  PURCHASE_DEBIT_NOTE: "Purchase Debit Note",
  SUPPLIER_REFUND: "Supplier Refund",
  CASH_EXPENSE: "Cash Expense",
  CONTACT: "Contact",
  BANK_RECONCILIATION: "Bank Reconciliation",
  INVENTORY_ADJUSTMENT: "Inventory Adjustment",
  WAREHOUSE_TRANSFER: "Warehouse Transfer",
  PURCHASE_RECEIPT: "Purchase Receipt",
  SALES_STOCK_ISSUE: "Sales Stock Issue",
  INVENTORY_VARIANCE_PROPOSAL: "Inventory Variance Proposal",
};

const prefixPattern = /^[A-Z0-9/-]+$/;

export interface NumberSequenceForm {
  prefix: string;
  nextNumber: string;
  padding: string;
}

export function numberSequenceScopeLabel(scope: string): string {
  return scopeLabels[scope] ?? titleCase(scope);
}

export function formatSequenceExample(prefix: string, nextNumber: number, padding: number): string {
  return `${prefix}${String(nextNumber).padStart(padding, "0")}`;
}

export function sequenceToForm(sequence: NumberSequenceSetting): NumberSequenceForm {
  return {
    prefix: sequence.prefix,
    nextNumber: String(sequence.nextNumber),
    padding: String(sequence.padding),
  };
}

export function validateNumberSequenceForm(form: NumberSequenceForm, currentNextNumber: number): string[] {
  const errors: string[] = [];
  const prefix = form.prefix.trim();
  const nextNumber = Number(form.nextNumber);
  const padding = Number(form.padding);

  if (!prefix) {
    errors.push("Prefix cannot be blank.");
  } else if (prefix.length > 12) {
    errors.push("Prefix must be 12 characters or fewer.");
  } else if (!prefixPattern.test(prefix)) {
    errors.push("Prefix can only contain uppercase letters, numbers, dash, and slash.");
  }

  if (!Number.isInteger(nextNumber) || nextNumber < 1) {
    errors.push("Next number must be a positive integer.");
  } else if (nextNumber < currentNextNumber) {
    errors.push("Next number cannot be lowered because that could create duplicate document numbers.");
  }

  if (!Number.isInteger(padding) || padding < 3 || padding > 10) {
    errors.push("Padding must be between 3 and 10.");
  }

  return errors;
}

export function buildNumberSequencePayload(form: NumberSequenceForm): { prefix: string; nextNumber: number; padding: number } {
  return {
    prefix: form.prefix.trim(),
    nextNumber: Number(form.nextNumber),
    padding: Number(form.padding),
  };
}

export function canEditNumberSequences(canManage: boolean): boolean {
  return canManage;
}

function titleCase(scope: string): string {
  return scope
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0)}${part.slice(1).toLowerCase()}`)
    .join(" ");
}
