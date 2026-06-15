import {
  UAE_PINT_AE_DOCUMENT_TYPE_CODES,
  UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES,
  UAE_PINT_AE_TRANSACTION_TYPE_FLAG_VALUES,
  isValidUaePintAePredefinedEndpointValue,
  isValidUaePintAeEndpointId,
  isValidUaeTin,
  isValidUaeTrn,
  resolveUaePintAeBuyerEndpointId,
  resolveUaePintAeEndpointId,
  resolveUaePintAeTransactionTypeFlagCode,
} from "./constants";
import type { UaePintAeAllowance, UaePintAeDocumentInput, UaePintAeDocumentType, UaePintAeParty, UaePintAeRuleResult, UaePintAeValidationResult } from "./types";

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
  validateParty(issues, "buyer", input.buyer, input.predefinedEndpointScenario ? resolveUaePintAeBuyerEndpointId(input) : null);
  validateLines(issues, input);
  validateTotals(issues, input);

  if (input.kind === "invoice" && toAmount(input.total) < 0) {
    issues.push({ code: "NEGATIVE_INVOICE_TOTAL_BLOCKED", severity: "error", message: "UAE invoice generation does not allow negative invoice totals.", fieldPath: "total", source: "local-rule" });
  }

  if (input.kind === "credit-note") {
    requireText(issues, "CREDIT_NOTE_REASON_REQUIRED", input.creditNoteReason, "Credit notes require a reason.", "creditNoteReason");
    requireText(issues, "CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED", input.originalInvoiceNumber, "Credit notes require an original invoice reference.", "originalInvoiceNumber");
  }

  if (input.predefinedEndpointScenario && !UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES[input.predefinedEndpointScenario]) {
    issues.push({
      code: "PREDEFINED_ENDPOINT_OFFICIAL_VALUE_REQUIRED",
      severity: "error",
      message: `${input.predefinedEndpointScenario} requires an official predefined endpoint value before XML can be generated.`,
      fieldPath: "predefinedEndpointScenario",
      source: "official-doc-required",
    });
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
  const transactionTypeFlagCode = resolveUaePintAeTransactionTypeFlagCode(input);
  if (!/^[01]{8}$/.test(transactionTypeFlagCode)) {
    issues.push({
      code: "TRANSACTION_TYPE_FLAG_CODE_INVALID",
      severity: "error",
      message: "UAE PINT-AE transaction type flag code must be an 8-position string containing only 0 or 1.",
      fieldPath: "transactionTypeFlagCode",
      source: "local-rule",
    });
  }

  if (input.reverseCharge === true) {
    issues.push({
      code: "REVERSE_CHARGE_TRANSACTION_FLAG_OFFICIAL_MAPPING_REQUIRED",
      severity: "error",
      message: "Reverse-charge PINT-AE serialization is blocked until an official UAE transaction flag and required VAT-category mapping are source-backed in this package.",
      fieldPath: "reverseCharge",
      source: "official-doc-required",
    });
  }

  return { valid: !issues.some((issue) => issue.severity === "error"), issues };
}

function validateParty(issues: UaePintAeRuleResult[], fieldPath: "supplier" | "buyer", party: UaePintAeParty, endpointOverride: string | null = null): void {
  const label = fieldPath === "supplier" ? "Seller" : "Buyer";
  const endpoint = endpointOverride ?? resolveUaePintAeEndpointId(party);
  requireText(issues, `${label.toUpperCase()}_LEGAL_NAME_REQUIRED`, party.legalName, `${label} legal name is required.`, `${fieldPath}.legalName`);
  requireText(issues, `${label.toUpperCase()}_ENDPOINT_REQUIRED`, endpoint, `${label} endpoint is required.`, `${fieldPath}.endpointId`);
  if (endpoint && endpointOverride && !isValidUaePintAePredefinedEndpointValue(endpoint)) {
    issues.push({ code: `${label.toUpperCase()}_ENDPOINT_INVALID`, severity: "error", message: `${label} predefined endpoint is not a source-backed UAE PINT-AE predefined endpoint value.`, fieldPath: `${fieldPath}.endpointId`, source: "local-rule" });
  } else if (endpoint && !endpointOverride && !isValidUaePintAeEndpointId(endpoint)) {
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
    validateAllowances(issues, line.allowances, `${prefix}.allowances`, "line", toAmount(line.quantity) * toAmount(line.unitPrice));
    const lineAllowanceTotal = sumAllowances(line.allowances);
    const expectedTaxableAmount = toAmount(line.quantity) * toAmount(line.unitPrice) - lineAllowanceTotal;
    if (!amountsClose(expectedTaxableAmount, toAmount(line.taxableAmount))) {
      issues.push({
        code: "LINE_TAXABLE_AMOUNT_MISMATCH",
        severity: "error",
        message: `Line ${index + 1} taxable amount must equal quantity times unit price minus line allowances.`,
        fieldPath: `${prefix}.taxableAmount`,
        source: "local-rule",
      });
    }
  });
}

function validateTotals(issues: UaePintAeRuleResult[], input: UaePintAeDocumentInput): void {
  requireAmount(issues, "TAX_TOTAL_REQUIRED", input.taxTotal, "Tax total is required.", "taxTotal");
  requireAmount(issues, "DOCUMENT_TOTAL_REQUIRED", input.total, "Document total is required.", "total");
  const lineExtensionTotal = input.lines.reduce((sum, line) => sum + toAmount(line.taxableAmount), 0);
  const allowanceTotal = sumAllowances(input.allowances);
  validateAllowances(issues, input.allowances, "allowances", "document", lineExtensionTotal);
  if (input.lines.length && !amountsClose(lineExtensionTotal - allowanceTotal, toAmount(input.subtotal))) {
    issues.push({
      code: "SUBTOTAL_MISMATCH",
      severity: "error",
      message: "Line extension totals minus document allowances do not match document subtotal.",
      fieldPath: "subtotal",
      source: "local-rule",
    });
  }
  if (!amountsClose(toAmount(input.subtotal) + toAmount(input.taxTotal), toAmount(input.total))) {
    issues.push({ code: "DOCUMENT_TOTAL_MISMATCH", severity: "error", message: "Subtotal plus tax total does not match document total.", fieldPath: "total", source: "local-rule" });
  }
}

function validateAllowances(
  issues: UaePintAeRuleResult[],
  allowances: readonly UaePintAeAllowance[] | null | undefined,
  fieldPath: string,
  level: "document" | "line",
  baseAmount: number,
): void {
  const allowanceTotal = sumAllowances(allowances);
  if (allowanceTotal > baseAmount + 0.01) {
    issues.push({
      code: level === "document" ? "DOCUMENT_ALLOWANCE_EXCEEDS_SUBTOTAL" : "LINE_ALLOWANCE_EXCEEDS_BASE_AMOUNT",
      severity: "error",
      message: level === "document" ? "Document allowance total cannot exceed the line extension total." : "Line allowance total cannot exceed quantity times unit price.",
      fieldPath,
      source: "local-rule",
    });
  }

  allowances?.forEach((allowance, index) => {
    const prefix = `${fieldPath}.${index}`;
    const amount = toAmount(allowance.amount);
    requireAmount(issues, "ALLOWANCE_AMOUNT_REQUIRED", allowance.amount, "Allowance amount is required.", `${prefix}.amount`);
    if (amount < 0) {
      issues.push({ code: "ALLOWANCE_AMOUNT_NEGATIVE", severity: "error", message: "Allowance amount must be non-negative.", fieldPath: `${prefix}.amount`, source: "local-rule" });
    }
    if (allowance.baseAmount !== null && allowance.baseAmount !== undefined && amount > toAmount(allowance.baseAmount) + 0.01) {
      issues.push({
        code: "ALLOWANCE_EXCEEDS_BASE_AMOUNT",
        severity: "error",
        message: "Allowance amount cannot exceed its stated base amount.",
        fieldPath: `${prefix}.amount`,
        source: "local-rule",
      });
    }
    if (!String(allowance.reason ?? "").trim() && !String(allowance.reasonCode ?? "").trim()) {
      issues.push({
        code: "ALLOWANCE_REASON_REQUIRED",
        severity: "error",
        message: "Allowance reason text is required unless a source-backed reason code is implemented.",
        fieldPath: `${prefix}.reason`,
        source: "local-rule",
      });
    }
    if (String(allowance.reasonCode ?? "").trim()) {
      issues.push({
        code: "ALLOWANCE_REASON_CODE_OFFICIAL_MAPPING_REQUIRED",
        severity: "error",
        message: "Allowance reason codes are blocked until the package implements a source-backed code-list mapping.",
        fieldPath: `${prefix}.reasonCode`,
        source: "official-doc-required",
      });
    }
    if (level === "document") {
      requireText(issues, "DOCUMENT_ALLOWANCE_TAX_CATEGORY_REQUIRED", allowance.taxCategory, "Document-level allowances require a VAT category.", `${prefix}.taxCategory`);
      requireAmount(issues, "DOCUMENT_ALLOWANCE_TAX_RATE_REQUIRED", allowance.taxRate ?? "", "Document-level allowances require a VAT rate.", `${prefix}.taxRate`);
    }
  });
}

function requireText(issues: UaePintAeRuleResult[], code: string, value: string | null | undefined, message: string, fieldPath: string): void {
  if (!String(value ?? "").trim()) {
    issues.push({ code, severity: "error", message, fieldPath, source: "local-rule" });
  }
}

function requireAmount(issues: UaePintAeRuleResult[], code: string, value: string | number, message: string, fieldPath: string): void {
  if (!String(value ?? "").trim() || !Number.isFinite(toAmount(value))) {
    issues.push({ code, severity: "error", message, fieldPath, source: "local-rule" });
  }
}

function toAmount(value: string | number): number {
  return Number(value);
}

function sumAllowances(allowances: readonly UaePintAeAllowance[] | null | undefined): number {
  return (allowances ?? []).reduce((sum, allowance) => sum + toAmount(allowance.amount), 0);
}

function amountsClose(left: number, right: number): boolean {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 0.01;
}
