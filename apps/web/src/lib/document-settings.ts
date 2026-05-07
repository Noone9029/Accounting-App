import type { OrganizationDocumentSettings } from "./types";

export const documentTemplateOptions = ["standard", "compact", "detailed"] as const;

export type DocumentTemplateOption = (typeof documentTemplateOptions)[number];

export interface OrganizationDocumentSettingsForm {
  invoiceTitle: string;
  receiptTitle: string;
  statementTitle: string;
  footerText: string;
  primaryColor: string;
  accentColor: string;
  showTaxNumber: boolean;
  showPaymentSummary: boolean;
  showNotes: boolean;
  showTerms: boolean;
  defaultInvoiceTemplate: DocumentTemplateOption;
  defaultReceiptTemplate: DocumentTemplateOption;
  defaultStatementTemplate: DocumentTemplateOption;
}

export function settingsToForm(settings: OrganizationDocumentSettings): OrganizationDocumentSettingsForm {
  return {
    invoiceTitle: settings.invoiceTitle,
    receiptTitle: settings.receiptTitle,
    statementTitle: settings.statementTitle,
    footerText: settings.footerText,
    primaryColor: settings.primaryColor ?? "",
    accentColor: settings.accentColor ?? "",
    showTaxNumber: settings.showTaxNumber,
    showPaymentSummary: settings.showPaymentSummary,
    showNotes: settings.showNotes,
    showTerms: settings.showTerms,
    defaultInvoiceTemplate: settings.defaultInvoiceTemplate,
    defaultReceiptTemplate: settings.defaultReceiptTemplate,
    defaultStatementTemplate: settings.defaultStatementTemplate,
  };
}

export function buildDocumentSettingsPayload(form: OrganizationDocumentSettingsForm): Record<string, string | boolean | null> {
  return {
    invoiceTitle: form.invoiceTitle.trim(),
    receiptTitle: form.receiptTitle.trim(),
    statementTitle: form.statementTitle.trim(),
    footerText: form.footerText.trim(),
    primaryColor: nullableColor(form.primaryColor),
    accentColor: nullableColor(form.accentColor),
    showTaxNumber: form.showTaxNumber,
    showPaymentSummary: form.showPaymentSummary,
    showNotes: form.showNotes,
    showTerms: form.showTerms,
    defaultInvoiceTemplate: form.defaultInvoiceTemplate,
    defaultReceiptTemplate: form.defaultReceiptTemplate,
    defaultStatementTemplate: form.defaultStatementTemplate,
  };
}

export function isValidOptionalHexColor(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === "" || /^#[0-9a-fA-F]{6}$/.test(trimmed);
}

function nullableColor(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
