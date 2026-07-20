type ZatcaInvoiceInput = import("./index.js").ZatcaInvoiceInput;

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
  if (String(input.seller?.vatNumber ?? "").trim() && !isValidSaudiVatNumber(input.seller.vatNumber)) {
    errors.push("Seller VAT number must be a 15-digit Saudi VAT number that starts and ends with 3.");
  }
  requireText(input.issueDate instanceof Date ? input.issueDate.toISOString() : input.issueDate, "Issue date is required.", errors);
  if (!isSupportedInvoiceType(input.invoiceType)) {
    errors.push("Invoice type must be one of the supported ZATCA invoice types.");
  }

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    errors.push("At least one invoice line is required.");
  }

  checkNonNegative(input.subtotal, "Invoice subtotal", errors);
  checkNonNegative(input.discountTotal, "Invoice discount total", errors);
  checkNonNegative(input.taxableTotal, "Invoice taxable total", errors);
  checkNonNegative(input.taxTotal, "Invoice tax total", errors);
  checkNonNegative(input.total, "Invoice total", errors);

  if (isCreditOrDebitNote(input.invoiceType)) {
    requireText(input.billingReferenceInvoiceNumber, "Original invoice reference is required for credit and debit notes.", errors);
    requireText(input.noteReason, "Credit and debit note reason is required.", errors);
    const paymentMeansCode = String(input.paymentMeansCode ?? "10").trim();
    if (!["1", "10", "30", "42", "48"].includes(paymentMeansCode)) {
      errors.push("Payment means code must be one of the official local fixture codes: 1, 10, 30, 42, or 48.");
    }
  }

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

  validateMonetaryTotals(input, errors);

  addBuyerAddressReadinessWarnings(input, warnings);

  return {
    localOnly: true,
    officialValidation: false,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateMonetaryTotals(input: ZatcaInvoiceInput, errors: string[]): void {
  const subtotal = Number(input.subtotal);
  const discount = Number(input.discountTotal);
  const taxable = Number(input.taxableTotal);
  const tax = Number(input.taxTotal);
  const total = Number(input.total);
  if ([subtotal, discount, taxable, tax, total].every(Number.isFinite)) {
    if (!sameMoney(taxable, subtotal - discount)) {
      errors.push("Taxable total must equal subtotal less document discount.");
    }
    if (!sameMoney(total, taxable + tax)) {
      errors.push("Invoice total must equal taxable total plus VAT total.");
    }

    const lineVatAmounts = input.lines?.map((line) => Number(line.taxAmount)) ?? [];
    if (sameMoney(discount, 0) && lineVatAmounts.length > 0 && lineVatAmounts.every(Number.isFinite)) {
      const lineVatTotal = lineVatAmounts.reduce((sum, value) => sum + value, 0);
      if (!sameMoney(tax, lineVatTotal)) {
        errors.push("VAT total must equal the sum of invoice-line VAT amounts when no document allowance applies.");
      }
    }
  }
}

function sameMoney(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.00001;
}

function isValidSaudiVatNumber(value: string | null | undefined): boolean {
  return /^3\d{13}3$/.test(String(value ?? "").trim());
}

function addBuyerAddressReadinessWarnings(input: ZatcaInvoiceInput, warnings: string[]): void {
  const buyerCountryCode = String(input.buyer?.countryCode ?? "SA").trim().toUpperCase();
  const standardBuyerAddressRulesApply = buyerCountryCode === "SA" && input.invoiceType !== "SIMPLIFIED_TAX_INVOICE";
  if (!standardBuyerAddressRulesApply) {
    return;
  }

  const requiredFields = [
    ["StreetName", input.buyer.streetName],
    ["BuildingNumber", input.buyer.buildingNumber],
    ["PostalZone", input.buyer.postalCode],
    ["CityName", input.buyer.city],
    ["CitySubdivisionName", input.buyer.district],
    ["Country/IdentificationCode", input.buyer.countryCode],
  ];
  const missingFields = requiredFields.filter(([, value]) => !String(value ?? "").trim()).map(([field]) => field);

  if (missingFields.length > 0) {
    warnings.push(
      `BR-KSA-63 readiness: Saudi standard buyer address is missing ${missingFields.join(", ")}. Populate real contact address data; LedgerByte does not hardcode fake buyer address values.`,
    );
  }

  const buildingNumber = String(input.buyer.buildingNumber ?? "").trim();
  if (buildingNumber && !/^[0-9]{4}$/.test(buildingNumber)) {
    warnings.push("Saudi buyer BuildingNumber should be 4 digits for clean ZATCA buyer address validation.");
  }
}

function isCreditOrDebitNote(invoiceType: ZatcaInvoiceInput["invoiceType"]): boolean {
  return invoiceType === "CREDIT_NOTE" || invoiceType === "DEBIT_NOTE";
}

function isSupportedInvoiceType(invoiceType: unknown): boolean {
  return ["STANDARD_TAX_INVOICE", "SIMPLIFIED_TAX_INVOICE", "CREDIT_NOTE", "DEBIT_NOTE"].includes(String(invoiceType));
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
