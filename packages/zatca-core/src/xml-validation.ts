import type { ZatcaInvoiceInput } from "./index.js";

export interface ZatcaLocalXmlValidationResult {
  localOnly: true;
  officialValidation: false;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateLocalZatcaXml(input: ZatcaInvoiceInput): ZatcaLocalXmlValidationResult {
  const errors: string[] = [];
  const warnings = [
    "Local LedgerByte XML checks only. This is not official ZATCA SDK validation and is not legal certification.",
  ];

  requireText(input.invoiceNumber, "Invoice number is required.", errors);
  requireText(input.invoiceUuid, "Invoice UUID is required.", errors);
  requireText(input.seller?.name, "Seller name is required.", errors);
  requireText(input.seller?.vatNumber, "Seller VAT number is required.", errors);
  requireText(input.issueDate instanceof Date ? input.issueDate.toISOString() : input.issueDate, "Issue date is required.", errors);

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    errors.push("At least one invoice line is required.");
  }

  checkNonNegative(input.subtotal, "Invoice subtotal", errors);
  checkNonNegative(input.discountTotal, "Invoice discount total", errors);
  checkNonNegative(input.taxableTotal, "Invoice taxable total", errors);
  checkNonNegative(input.taxTotal, "Invoice tax total", errors);
  checkNonNegative(input.total, "Invoice total", errors);

  input.lines?.forEach((line, index) => {
    const label = `Invoice line ${index + 1}`;
    requireText(line.description, `${label} description is required.`, errors);
    requireText(line.quantity, `${label} quantity is required.`, errors);
    requireText(line.unitPrice, `${label} unit price is required.`, errors);
    requireText(line.lineTotal, `${label} total is required.`, errors);
    checkNonNegative(line.quantity, `${label} quantity`, errors);
    checkNonNegative(line.unitPrice, `${label} unit price`, errors);
    checkNonNegative(line.taxableAmount, `${label} taxable amount`, errors);
    checkNonNegative(line.taxAmount, `${label} tax amount`, errors);
    checkNonNegative(line.lineTotal, `${label} total`, errors);
  });

  return {
    localOnly: true,
    officialValidation: false,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function requireText(value: string | null | undefined, message: string, errors: string[]): void {
  if (!String(value ?? "").trim()) {
    errors.push(message);
  }
}

function checkNonNegative(value: string | number | null | undefined, label: string, errors: string[]): void {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    errors.push(`${label} must be numeric.`);
    return;
  }
  if (number < 0) {
    errors.push(`${label} must be non-negative.`);
  }
}
