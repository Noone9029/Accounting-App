import {
  UAE_PINT_AE_DOCUMENT_TYPE_CODES,
  UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES,
  UAE_PINT_AE_TRANSACTION_TYPE_FLAG_VALUES,
  isValidUaePintAeEndpointId,
  isValidUaeTin,
  isValidUaeTrn,
  resolveUaePintAeEndpointId,
} from "./constants";
import type { UaePintAeDocumentInput, UaePintAeDocumentType, UaePintAeParty, UaePintAeRuleResult, UaePintAeValidationResult } from "./types";

export function resolveUaePintAeDocumentType(input: Pick<UaePintAeDocumentInput, "kind" | "documentType" | "taxTotal">): UaePintAeDocumentType {
  if (input.documentType) {
    return input.documentType;
  }
  const hasTax = toAmount(input.taxTotal) > 0;
  if (input.kind === "credit-note") {
    return hasTax ? "tax-credit-note" : "credit-note";
  }
  return hasTax ? "tax-invoice" : "commercial-invoice";
}

export function resolveUaePintAeInvoiceTypeCode(input: UaePintAeDocumentInput): string {
  const explicitCode = String(input.invoiceTypeCode ?? "").trim();
  if (explicitCode) {
    return explicitCode;
  }
  return UAE_PINT_AE_DOCUMENT_TYPE_CODES[resolveUaePintAeDocumentType(input)] ?? "";
}

export function validateUaePintAeDocument(input: UaePintAeDocumentInput): UaePintAeValidationResult {
  const issues: UaePintAeRuleResult[] = [];
  const documentType = resolveUaePintAeDocumentType(input);

  requireText(issues, "DOCUMENT_NUMBER_REQUIRED", input.documentNumber, "Document number is required.", "documentNumber");
  requireText(issues, "ISSUE_DATE_REQUIRED", input.issueDate, "Issue date is required.", "issueDate");
  requireText(issues, "INVOICE_CURRENCY_REQUIRED", input.currency, "Invoice currency is required.", "currency");
  requireText(issues, "INVOICE_TYPE_REQUIRED", documentType, "Invoice document type is required.", "documentType");

  if (!resolveUaePintAeInvoiceTypeCode(input)) {
    issues.push({
      code: "INVOICE_TYPE_CODE_OFFICIAL_VALUE_REQUIRED",
      severity: "error",
      message: `${documentType} does not have a source-backed UAE PINT-AE invoice type code in this package yet.`,
      fieldPath: "invoiceTypeCode",
      source: "official-doc-required",
    });
  }

  validateParty(issues, "supplier", input.supplier);
  validateParty(issues, "buyer", input.buyer);
  validateLines(issues, input);
  validateTotals(issues, input);

  if (input.kind === "invoice" && toAmount(input.total) < 0) {
    issues.push({ code: "NEGATIVE_INVOICE_TOTAL_BLOCKED", severity: "error", message: "UAE invoice generation does not allow negative invoice totals.", fieldPath: "total", source: "local-rule" });
  }

  if (input.kind === "credit-note") {
    requireText(issues, "CREDIT_NOTE_REASON_REQUIRED", input.creditNoteReason, "Credit notes require a reason.", "creditNoteReason");
    requireText(issues, "CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED", input.originalInvoiceNumber, "Credit notes require an original invoice reference.", "originalInvoiceNumber");
  }

  if (input.predefinedEndpointScenario) {
    const scenarioValue = UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES[input.predefinedEndpointScenario];
    if (!scenarioValue) {
      issues.push({
        code: "PREDEFINED_ENDPOINT_OFFICIAL_VALUE_REQUIRED",
        severity: "error",
        message: `${input.predefinedEndpointScenario} requires an official predefined endpoint value before XML can be generated.`,
        fieldPath: "predefinedEndpointScenario",
        source: "official-doc-required",
      });
    }
  }

  if (input.transactionTypeFlags?.length) {
    const unsupportedFlags = input.transactionTypeFlags.filter((flag) => !UAE_PINT_AE_TRANSACTION_TYPE_FLAG_VALUES[flag]);
    if (unsupportedFlags.length) {
      issues.push({
        code: "TRANSACTION_TYPE_FLAG_OFFICIAL_MAPPING_REQUIRED",
        severity: "error",
        message: `Transaction type flag mapping requires official UAE PINT-AE source values: ${unsupportedFlags.join(", ")}.`,
        fieldPath: "transactionTypeFlags",
        source: "official-doc-required",
      });
    }
  }

  return { valid: !issues.some((issue) => issue.severity === "error"), issues };
}

function validateParty(issues: UaePintAeRuleResult[], fieldPath: "supplier" | "buyer", party: UaePintAeParty): void {
  const label = fieldPath === "supplier" ? "Seller" : "Buyer";
  const endpoint = resolveUaePintAeEndpointId(party);
  requireText(issues, `${label.toUpperCase()}_LEGAL_NAME_REQUIRED`, party.legalName, `${label} legal name is required.`, `${fieldPath}.legalName`);
  requireText(issues, `${label.toUpperCase()}_ENDPOINT_REQUIRED`, endpoint, `${label} endpoint is required.`, `${fieldPath}.endpointId`);
  if (endpoint && !isValidUaePintAeEndpointId(endpoint)) {
    issues.push({ code: `${label.toUpperCase()}_ENDPOINT_INVALID`, severity: "error", message: `${label} endpoint must use scheme 0235 followed by a 10-digit UAE TIN.`, fieldPath: `${fieldPath}.endpointId`, source: "local-rule" });
  }
  requireText(issues, `${label.toUpperCase()}_ADDRESS_REQUIRED`, party.addressLine1, `${label} address is required.`, `${fieldPath}.addressLine1`);
  requireText(issues, `${label.toUpperCase()}_CITY_OR_EMIRATE_REQUIRED`, party.city ?? party.emirate, `${label} city or emirate is required.`, `${fieldPath}.city`);
  if (party.tin && !isValidUaeTin(party.tin)) {
    issues.push({ code: `${label.toUpperCase()}_TIN_INVALID`, severity: "error", message: `${label} TIN must be 10 digits.`, fieldPath: `${fieldPath}.tin`, source: "local-rule" });
  }
  if (party.trn && !isValidUaeTrn(party.trn)) {
    issues.push({ code: `${label.toUpperCase()}_TRN_INVALID`, severity: "error", message: `${label} TRN must be 15 digits.`, fieldPath: `${fieldPath}.trn`, source: "local-rule" });
  }
}

function validateLines(issues: UaePintAeRuleResult[], input: UaePintAeDocumentInput): void {
  if (!input.lines.length) {
    issues.push({ code: "LINE_ITEMS_REQUIRED", severity: "error", message: "At least one line item is required.", fieldPath: "lines", source: "local-rule" });
  }
  input.lines.forEach((line, index) => {
    const prefix = `lines.${index}`;
    requireText(issues, "LINE_ID_REQUIRED", line.id, `Line ${index + 1} ID is required.`, `${prefix}.id`);
    requireText(issues, "LINE_DESCRIPTION_REQUIRED", line.description, `Line ${index + 1} item name is required.`, `${prefix}.description`);
    if (toAmount(line.quantity) <= 0) {
      issues.push({ code: "LINE_QUANTITY_REQUIRED", severity: "error", message: `Line ${index + 1} quantity must be greater than zero.`, fieldPath: `${prefix}.quantity`, source: "local-rule" });
    }
    requireText(issues, "LINE_UNIT_CODE_REQUIRED", line.unitCode, `Line ${index + 1} unit code is required.`, `${prefix}.unitCode`);
    requireText(issues, "LINE_TAX_CATEGORY_REQUIRED", line.taxCategory, `Line ${index + 1} VAT/tax category is required.`, `${prefix}.taxCategory`);
  });
}

function validateTotals(issues: UaePintAeRuleResult[], input: UaePintAeDocumentInput): void {
  requireAmount(issues, "TAX_TOTAL_REQUIRED", input.taxTotal, "Tax total is required.", "taxTotal");
  requireAmount(issues, "DOCUMENT_TOTAL_REQUIRED", input.total, "Document total is required.", "total");
  const lineSubtotal = input.lines.reduce((sum, line) => sum + toAmount(line.taxableAmount), 0);
  if (input.lines.length && !amountsClose(lineSubtotal, toAmount(input.subtotal))) {
    issues.push({ code: "SUBTOTAL_MISMATCH", severity: "error", message: "Line extension totals do not match document subtotal.", fieldPath: "subtotal", source: "local-rule" });
  }
  if (!amountsClose(toAmount(input.subtotal) + toAmount(input.taxTotal), toAmount(input.total))) {
    issues.push({ code: "DOCUMENT_TOTAL_MISMATCH", severity: "error", message: "Subtotal plus tax total does not match document total.", fieldPath: "total", source: "local-rule" });
  }
}

function requireText(issues: UaePintAeRuleResult[], code: string, value: string | null | undefined, message: string, fieldPath: string): void {
  if (!String(value ?? "").trim()) {
    issues.push({ code, severity: "error", message, fieldPath, source: "local-rule" });
  }
}

function requireAmount(issues: UaePintAeRuleResult[], code: string, value: string | number, message: string, fieldPath: string): void {
  if (!Number.isFinite(toAmount(value))) {
    issues.push({ code, severity: "error", message, fieldPath, source: "local-rule" });
  }
}

function toAmount(value: string | number): number {
  return Number(value);
}

function amountsClose(left: number, right: number): boolean {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 0.01;
}
