type ZatcaInvoiceInput = import("./index.js").ZatcaInvoiceInput;

export interface ZatcaLocalXmlValidationResult {
  localOnly: true;
  officialValidation: false;
  valid: boolean;
  safeErrorCodes: string[];
  errors: string[];
  warnings: string[];
}

export function validateLocalZatcaXml(input: ZatcaInvoiceInput): ZatcaLocalXmlValidationResult {
  const errors: string[] = [];
  const safeErrorCodes: string[] = [];
  const warnings = [
    "Local LedgerByte XML checks only. This is not official ZATCA SDK validation and is not legal certification.",
  ];

  requireText(input.invoiceNumber, "Invoice number is required.", "ZATCA_INPUT_INVOICE_NUMBER_REQUIRED", errors, safeErrorCodes);
  requireText(input.invoiceUuid, "Invoice UUID is required.", "ZATCA_INPUT_INVOICE_UUID_REQUIRED", errors, safeErrorCodes);
  requireText(input.seller?.name, "Seller name is required.", "ZATCA_INPUT_SELLER_NAME_REQUIRED", errors, safeErrorCodes);
  requireText(input.seller?.vatNumber, "Seller VAT number is required.", "ZATCA_INPUT_SELLER_VAT_REQUIRED", errors, safeErrorCodes);
  if (String(input.seller?.vatNumber ?? "").trim() && !isValidSaudiVatNumber(input.seller.vatNumber)) {
    errors.push("Seller VAT number must be a 15-digit Saudi VAT number that starts and ends with 3.");
    safeErrorCodes.push("ZATCA_INPUT_SELLER_VAT_FORMAT");
  }
  requireText(input.issueDate instanceof Date ? input.issueDate.toISOString() : input.issueDate, "Issue date is required.", "ZATCA_INPUT_ISSUE_DATE_REQUIRED", errors, safeErrorCodes);
  if (!isSupportedInvoiceType(input.invoiceType)) {
    errors.push("Invoice type must be one of the supported ZATCA invoice types.");
    safeErrorCodes.push("ZATCA_INPUT_INVOICE_TYPE_UNSUPPORTED");
  }
  if (String(input.currency ?? "").trim() !== "SAR") {
    errors.push("Invoice currency must be SAR for the supported Saudi local fixture profile.");
    safeErrorCodes.push("ZATCA_INPUT_CURRENCY_UNSUPPORTED");
  }
  if (!String(input.seller?.companyIdNumber ?? "").trim()) {
    errors.push("Seller identification number is required for the supported local fixture profile.");
    safeErrorCodes.push("ZATCA_INPUT_SELLER_IDENTIFICATION_REQUIRED");
  }
  if (!isSupportedSellerIdentificationScheme(input.seller?.companyIdType)) {
    errors.push("Seller identification scheme is not supported for the local fixture profile.");
    safeErrorCodes.push("ZATCA_INPUT_SELLER_IDENTIFICATION_SCHEME");
  }
  if (!isValidIcv(input.icv)) {
    errors.push("Invoice counter value must be a positive integer.");
    safeErrorCodes.push("ZATCA_INPUT_ICV_INVALID");
  }
  if (!isStrictBase64(input.previousInvoiceHash)) {
    errors.push("Previous invoice hash must be a valid base64 value.");
    safeErrorCodes.push("ZATCA_INPUT_PIH_INVALID");
  }
  if (input.requirePhase2Qr && input.invoiceType === "SIMPLIFIED_TAX_INVOICE" && !String(input.qrCodeBase64 ?? "").trim()) {
    errors.push("A signed simplified invoice requires a Phase 2 QR value.");
    safeErrorCodes.push("ZATCA_SIGNING_PHASE2_QR_REQUIRED");
  }

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    errors.push("At least one invoice line is required.");
    safeErrorCodes.push("ZATCA_INPUT_LINE_REQUIRED");
  }

  checkNonNegative(input.subtotal, "Invoice subtotal", errors);
  checkNonNegative(input.discountTotal, "Invoice discount total", errors);
  checkNonNegative(input.taxableTotal, "Invoice taxable total", errors);
  checkNonNegative(input.taxTotal, "Invoice tax total", errors);
  checkNonNegative(input.total, "Invoice total", errors);

  if (isCreditOrDebitNote(input.invoiceType)) {
    requireText(input.billingReferenceInvoiceNumber, "Original invoice reference is required for credit and debit notes.", "ZATCA_INPUT_NOTE_REFERENCE_REQUIRED", errors, safeErrorCodes);
    requireText(input.noteReason, "Credit and debit note reason is required.", "ZATCA_INPUT_NOTE_REASON_REQUIRED", errors, safeErrorCodes);
    const paymentMeansCode = String(input.paymentMeansCode ?? "10").trim();
    if (!["1", "10", "30", "42", "48"].includes(paymentMeansCode)) {
      errors.push("Payment means code must be one of the official local fixture codes: 1, 10, 30, 42, or 48.");
      safeErrorCodes.push("ZATCA_INPUT_PAYMENT_MEANS_UNSUPPORTED");
    }
  }

  input.lines?.forEach((line, index) => {
    const label = `Invoice line ${index + 1}`;
    requireText(line.description, `${label} description is required.`, "ZATCA_INPUT_LINE_DESCRIPTION_REQUIRED", errors, safeErrorCodes);
    requireText(line.quantity, `${label} quantity is required.`, "ZATCA_INPUT_LINE_QUANTITY_REQUIRED", errors, safeErrorCodes);
    requireText(line.unitPrice, `${label} unit price is required.`, "ZATCA_INPUT_LINE_UNIT_PRICE_REQUIRED", errors, safeErrorCodes);
    requireText(line.lineTotal, `${label} total is required.`, "ZATCA_INPUT_LINE_TOTAL_REQUIRED", errors, safeErrorCodes);
    checkNonNegative(line.quantity, `${label} quantity`, errors);
    checkNonNegative(line.unitPrice, `${label} unit price`, errors);
    checkNonNegative(line.taxableAmount, `${label} taxable amount`, errors);
    checkNonNegative(line.taxAmount, `${label} tax amount`, errors);
    checkNonNegative(line.lineTotal, `${label} total`, errors);
  });

  validateMonetaryTotals(input, errors, safeErrorCodes);

  addBuyerAddressReadinessWarnings(input, warnings);

  return {
    localOnly: true,
    officialValidation: false,
    valid: errors.length === 0,
    safeErrorCodes: [...new Set(safeErrorCodes)],
    errors,
    warnings,
  };
}

function validateMonetaryTotals(input: ZatcaInvoiceInput, errors: string[], safeErrorCodes: string[]): void {
  const subtotal = Number(input.subtotal);
  const discount = Number(input.discountTotal);
  const taxable = Number(input.taxableTotal);
  const tax = Number(input.taxTotal);
  const total = Number(input.total);
  const payable = Number(input.payableTotal ?? input.total);
  const allowance = Number(input.documentAllowanceTotal ?? input.discountTotal);
  if ([subtotal, discount, taxable, tax, total].every(Number.isFinite)) {
    if (!sameMoney(taxable, subtotal - discount)) {
      errors.push("Taxable total must equal subtotal less document discount.");
      safeErrorCodes.push("ZATCA_INPUT_TAX_EXCLUSIVE_TOTAL_MISMATCH");
    }
    if (!sameMoney(total, taxable + tax)) {
      errors.push("Invoice total must equal taxable total plus VAT total.");
      safeErrorCodes.push("ZATCA_INPUT_TAX_INCLUSIVE_TOTAL_MISMATCH");
    }
    if (!sameMoney(payable, total)) {
      errors.push("Payable total must equal the legal monetary total.");
      safeErrorCodes.push("ZATCA_INPUT_PAYABLE_TOTAL_MISMATCH");
    }
    if (!sameMoney(allowance, discount)) {
      errors.push("Allowance total must equal the document allowance entries.");
      safeErrorCodes.push("ZATCA_INPUT_ALLOWANCE_TOTAL_MISMATCH");
    }

    const lineVatAmounts = input.lines?.map((line) => Number(line.taxAmount)) ?? [];
    if (sameMoney(discount, 0) && lineVatAmounts.length > 0 && lineVatAmounts.every(Number.isFinite)) {
      const lineVatTotal = lineVatAmounts.reduce((sum, value) => sum + value, 0);
      if (!sameMoney(tax, lineVatTotal)) {
        errors.push("VAT total must equal the sum of invoice-line VAT amounts when no document allowance applies.");
        safeErrorCodes.push("ZATCA_INPUT_VAT_TOTAL_MISMATCH");
      }
    }
  }
  const lineTaxableTotal = input.lines?.map((line) => Number(line.taxableAmount)).reduce((sum, value) => sum + value, 0);
  if (Number.isFinite(lineTaxableTotal) && !sameMoney(subtotal, lineTaxableTotal!)) {
    errors.push("Invoice subtotal must equal the sum of invoice-line taxable amounts.");
    safeErrorCodes.push("ZATCA_INPUT_LINE_EXTENSION_TOTAL_MISMATCH");
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

function isSupportedSellerIdentificationScheme(value: string | null | undefined): boolean {
  return ["CRN", "MOM", "MLS", "700", "SAG", "NAT", "GCC", "IQA", "PAS", "OTH"].includes(String(value ?? "").trim().toUpperCase());
}

function isValidIcv(value: number | null | undefined): boolean {
  return Number.isInteger(value) && Number(value) > 0;
}

function isStrictBase64(value: string | null | undefined): boolean {
  const text = String(value ?? "").trim();
  if (!text || !/^[A-Za-z0-9+/]+={0,2}$/.test(text) || text.length % 4 !== 0) return false;
  return Buffer.from(text, "base64").toString("base64") === text;
}

function requireText(value: string | null | undefined, message: string, code: string, errors: string[], safeErrorCodes: string[]): void {
  if (!String(value ?? "").trim()) {
    errors.push(message);
    safeErrorCodes.push(code);
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
