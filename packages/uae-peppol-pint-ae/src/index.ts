export type UaePintDocumentKind = "invoice" | "credit-note";

export interface UaeParty {
  legalName?: string | null;
  peppolParticipantId?: string | null;
  tin?: string | null;
  trn?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  emirate?: string | null;
  countryCode?: string | null;
}

export interface UaePintLine {
  id: string;
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  taxableAmount: string | number;
  taxAmount: string | number;
  lineTotal: string | number;
}

export interface UaePintDocumentInput {
  kind: UaePintDocumentKind;
  documentNumber: string;
  issueDate: string;
  currency: string;
  supplier: UaeParty;
  buyer: UaeParty;
  lines: UaePintLine[];
  subtotal: string | number;
  taxTotal: string | number;
  total: string | number;
  creditNoteReason?: string | null;
  originalInvoiceNumber?: string | null;
}

export interface UaeReadinessInput {
  organization: UaeParty & {
    tradeLicenseNumber?: string | null;
    vatRegistrationStatus?: string | null;
    aspSelected?: string | null;
    aspOnboardingStatus?: string | null;
    businessActivity?: string | null;
  };
  buyer?: UaeParty & {
    peppolEndpointStatus?: string | null;
    preferredEinvoiceDeliveryMethod?: string | null;
  };
}

export interface UaeReadinessCheck {
  key: string;
  label: string;
  status: "PASS" | "WARNING" | "FAIL";
  detail: string;
}

export interface UaeReadinessReport {
  status: "READY_FOR_VALIDATION" | "NEEDS_DATA" | "BLOCKED";
  checks: UaeReadinessCheck[];
  warnings: string[];
}

export interface UaeValidationIssue {
  code: string;
  severity: "ERROR" | "WARNING";
  message: string;
}

export interface UaeValidationReport {
  valid: boolean;
  issues: UaeValidationIssue[];
}

export function normalizeDigits(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function deriveUaePeppolParticipantId(tin: string | null | undefined): string {
  const normalized = normalizeDigits(tin);
  if (!/^\d{10}$/.test(normalized)) {
    throw new Error("UAE TIN must be exactly 10 digits to derive a Peppol participant identifier.");
  }
  return `0235${normalized}`;
}

export function isValidUaeTin(value: string | null | undefined): boolean {
  return /^\d{10}$/.test(normalizeDigits(value));
}

export function isValidUaeTrn(value: string | null | undefined): boolean {
  return /^\d{15}$/.test(normalizeDigits(value));
}

export function buildUaeReadinessReport(input: UaeReadinessInput): UaeReadinessReport {
  const org = input.organization;
  const buyer = input.buyer;
  const checks: UaeReadinessCheck[] = [
    required("ORG_LEGAL_NAME", "Organization legal name", org.legalName),
    required("ORG_TRADE_LICENSE", "Trade license number", org.tradeLicenseNumber),
    identityCheck("ORG_TIN", "Organization 10-digit TIN", org.tin, isValidUaeTin),
    identityCheck("ORG_TRN", "Organization TRN", org.trn, isValidUaeTrn),
    required("ORG_ADDRESS", "UAE address", org.addressLine1),
    required("ORG_EMIRATE", "Emirate", org.emirate),
    participantCheck("ORG_PEPPOL_ID", "Organization Peppol participant ID", org.peppolParticipantId, org.tin),
    required("ORG_ASP_SELECTED", "ASP selected", org.aspSelected),
    required("ORG_ASP_ONBOARDING", "ASP onboarding status", org.aspOnboardingStatus),
  ];

  if (buyer) {
    checks.push(
      required("BUYER_LEGAL_NAME", "Buyer legal name", buyer.legalName),
      identityCheck("BUYER_TIN", "Buyer 10-digit TIN", buyer.tin, isValidUaeTin),
      required("BUYER_ADDRESS", "Buyer UAE address", buyer.addressLine1),
      participantCheck("BUYER_PEPPOL_ID", "Buyer Peppol participant ID", buyer.peppolParticipantId, buyer.tin),
      required("BUYER_ENDPOINT_STATUS", "Buyer endpoint status", buyer.peppolEndpointStatus),
    );
  }

  const failures = checks.filter((check) => check.status === "FAIL");
  const warnings = [
    "UAE readiness is local validation only; it is not ASP accreditation, FTA certification, or production submission.",
    "Real ASP payload contracts and retention/legal guarantees must be re-verified before provider-specific integration.",
  ];

  return {
    status: failures.length ? "NEEDS_DATA" : "READY_FOR_VALIDATION",
    checks,
    warnings,
  };
}

export function validateUaePintInput(input: UaePintDocumentInput): UaeValidationReport {
  const issues: UaeValidationIssue[] = [];
  requireText(issues, "DOCUMENT_NUMBER_REQUIRED", input.documentNumber, "Document number is required.");
  requireText(issues, "ISSUE_DATE_REQUIRED", input.issueDate, "Issue date is required.");
  requireText(issues, "CURRENCY_REQUIRED", input.currency, "Currency is required.");
  validateParty(issues, "SUPPLIER", input.supplier);
  validateParty(issues, "BUYER", input.buyer);

  if (!input.lines.length) {
    issues.push({ code: "LINES_REQUIRED", severity: "ERROR", message: "At least one invoice or credit-note line is required." });
  }
  for (const line of input.lines) {
    requireText(issues, "LINE_DESCRIPTION_REQUIRED", line.description, `Line ${line.id} description is required.`);
  }
  if (input.kind === "credit-note") {
    requireText(issues, "CREDIT_NOTE_REASON_REQUIRED", input.creditNoteReason, "Credit notes require a reason.");
    requireText(issues, "CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED", input.originalInvoiceNumber, "Credit notes require an original invoice reference.");
  }

  return { valid: issues.every((issue) => issue.severity !== "ERROR"), issues };
}

export function buildUaePintXml(input: UaePintDocumentInput): { xml: string; validation: UaeValidationReport } {
  const validation = validateUaePintInput(input);
  if (!validation.valid) {
    return { xml: "", validation };
  }

  const root = input.kind === "credit-note" ? "CreditNote" : "Invoice";
  const lines = input.lines
    .map(
      (line) => `
    <cac:${root}Line>
      <cbc:ID>${escapeXml(line.id)}</cbc:ID>
      <cbc:InvoicedQuantity>${formatAmount(line.quantity)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${escapeXml(input.currency)}">${formatAmount(line.taxableAmount)}</cbc:LineExtensionAmount>
      <cac:Item><cbc:Name>${escapeXml(line.description)}</cbc:Name></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="${escapeXml(input.currency)}">${formatAmount(line.unitPrice)}</cbc:PriceAmount></cac:Price>
    </cac:${root}Line>`,
    )
    .join("");

  const creditNoteReference =
    input.kind === "credit-note"
      ? `
  <cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${escapeXml(input.originalInvoiceNumber ?? "")}</cbc:ID></cac:InvoiceDocumentReference></cac:BillingReference>
  <cbc:Note>${escapeXml(input.creditNoteReason ?? "")}</cbc:Note>`
      : "";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<${root} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${root}-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:peppol:pint:ae:billing-1@ledgerbyte-readiness</cbc:CustomizationID>
  <cbc:ProfileID>urn:peppol:bis:billing</cbc:ProfileID>
  <cbc:ID>${escapeXml(input.documentNumber)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(input.issueDate)}</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>${escapeXml(input.currency)}</cbc:DocumentCurrencyCode>${creditNoteReference}
${partyXml("AccountingSupplierParty", input.supplier)}
${partyXml("AccountingCustomerParty", input.buyer)}
  <cac:TaxTotal><cbc:TaxAmount currencyID="${escapeXml(input.currency)}">${formatAmount(input.taxTotal)}</cbc:TaxAmount></cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escapeXml(input.currency)}">${formatAmount(input.subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXml(input.currency)}">${formatAmount(input.total)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${escapeXml(input.currency)}">${formatAmount(input.total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${lines}
</${root}>`;

  return { xml, validation };
}

function validateParty(issues: UaeValidationIssue[], prefix: string, party: UaeParty): void {
  requireText(issues, `${prefix}_LEGAL_NAME_REQUIRED`, party.legalName, `${prefix.toLowerCase()} legal name is required.`);
  requireText(issues, `${prefix}_ENDPOINT_REQUIRED`, party.peppolParticipantId, `${prefix.toLowerCase()} Peppol participant ID is required.`);
  requireText(issues, `${prefix}_ADDRESS_REQUIRED`, party.addressLine1, `${prefix.toLowerCase()} UAE address is required.`);
  if (party.tin && !isValidUaeTin(party.tin)) {
    issues.push({ code: `${prefix}_TIN_INVALID`, severity: "ERROR", message: `${prefix.toLowerCase()} TIN must be 10 digits.` });
  }
  if (party.trn && !isValidUaeTrn(party.trn)) {
    issues.push({ code: `${prefix}_TRN_INVALID`, severity: "ERROR", message: `${prefix.toLowerCase()} TRN must be 15 digits.` });
  }
}

function partyXml(role: "AccountingSupplierParty" | "AccountingCustomerParty", party: UaeParty): string {
  return `  <cac:${role}>
    <cac:Party>
      <cbc:EndpointID schemeID="0235">${escapeXml(party.peppolParticipantId ?? "")}</cbc:EndpointID>
      <cac:PartyName><cbc:Name>${escapeXml(party.legalName ?? "")}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(party.addressLine1 ?? "")}</cbc:StreetName>
        <cbc:AdditionalStreetName>${escapeXml(party.addressLine2 ?? "")}</cbc:AdditionalStreetName>
        <cbc:CityName>${escapeXml(party.city ?? party.emirate ?? "")}</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>${escapeXml(party.countryCode ?? "AE")}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme><cbc:CompanyID>${escapeXml(party.trn ?? party.tin ?? "")}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
    </cac:Party>
  </cac:${role}>`;
}

function required(key: string, label: string, value: string | null | undefined): UaeReadinessCheck {
  const present = Boolean(String(value ?? "").trim());
  return { key, label, status: present ? "PASS" : "FAIL", detail: present ? "Configured." : `${label} is missing.` };
}

function identityCheck(key: string, label: string, value: string | null | undefined, validator: (value: string | null | undefined) => boolean): UaeReadinessCheck {
  if (!String(value ?? "").trim()) {
    return { key, label, status: "FAIL", detail: `${label} is missing.` };
  }
  return validator(value) ? { key, label, status: "PASS", detail: "Configured." } : { key, label, status: "FAIL", detail: `${label} has an invalid format.` };
}

function participantCheck(key: string, label: string, participantId: string | null | undefined, tin: string | null | undefined): UaeReadinessCheck {
  const expected = isValidUaeTin(tin) ? deriveUaePeppolParticipantId(tin) : null;
  if (!String(participantId ?? "").trim()) {
    return { key, label, status: "FAIL", detail: expected ? `${label} is missing; expected ${expected}.` : `${label} is missing.` };
  }
  return expected && participantId !== expected
    ? { key, label, status: "WARNING", detail: `${label} is configured but does not match expected ${expected}.` }
    : { key, label, status: "PASS", detail: "Configured." };
}

function requireText(issues: UaeValidationIssue[], code: string, value: string | null | undefined, message: string): void {
  if (!String(value ?? "").trim()) {
    issues.push({ code, severity: "ERROR", message });
  }
}

function formatAmount(value: string | number): string {
  return Number(value).toFixed(2);
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
