import { createHash } from "node:crypto";
import forge from "node-forge";

export * from "./compliance-checklist.js";

export type ZatcaEnvironment = "SANDBOX" | "SIMULATION" | "PRODUCTION";
export type ZatcaInvoiceType = "STANDARD_TAX_INVOICE" | "SIMPLIFIED_TAX_INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE";

export interface ZatcaAddressInput {
  buildingNumber?: string | null;
  streetName?: string | null;
  district?: string | null;
  city?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  additionalAddressNumber?: string | null;
}

export interface ZatcaSellerInput extends ZatcaAddressInput {
  name: string;
  vatNumber: string;
  companyIdType?: string | null;
  companyIdNumber?: string | null;
}

export interface ZatcaBuyerInput extends ZatcaAddressInput {
  name: string;
  vatNumber?: string | null;
}

export interface ZatcaInvoiceLineInput {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
  taxRateName?: string | null;
}

export interface ZatcaInvoiceInput {
  invoiceUuid: string;
  invoiceNumber: string;
  invoiceType: ZatcaInvoiceType;
  issueDate: string | Date;
  currency: string;
  seller: ZatcaSellerInput;
  buyer: ZatcaBuyerInput;
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  previousInvoiceHash: string;
  icv?: number | null;
  lines: ZatcaInvoiceLineInput[];
}

export interface ZatcaBuildResult {
  xml: string;
  xmlBase64: string;
  invoiceHash: string;
  qrCodeBase64: string;
}

export interface ZatcaSubmissionDraft {
  organizationId: string;
  invoiceId: string;
  environment: ZatcaEnvironment;
  invoiceXml: string;
  invoiceHash: string;
  uuid: string;
}

export interface ZatcaSubmissionResult {
  status: "PENDING" | "CLEARED" | "REPORTED" | "REJECTED" | "FAILED";
  responsePayload?: unknown;
}

export interface ZatcaCsrInput {
  sellerName: string;
  vatNumber: string;
  organizationIdentifier: string;
  organizationUnitName: string;
  organizationName: string;
  countryCode: string;
  city: string;
  deviceSerialNumber: string;
  solutionName: string;
  businessCategory: string;
}

export interface ZatcaCsrResult {
  privateKeyPem: string;
  csrPem: string;
}

export type ZatcaCsrSubjectAttribute = {
  name?: string;
  shortName?: string;
  value: string;
};

const ublInvoiceTypeCodes: Record<ZatcaInvoiceType, string> = {
  STANDARD_TAX_INVOICE: "388",
  SIMPLIFIED_TAX_INVOICE: "388",
  CREDIT_NOTE: "381",
  DEBIT_NOTE: "383",
};

export const initialPreviousInvoiceHash = "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRjMTI0N2QxYjU3NjY2YjA2N2Y4Y2YyOA==";

export function buildZatcaInvoicePayload(input: ZatcaInvoiceInput): ZatcaBuildResult {
  const xml = buildZatcaInvoiceXml(input);
  const invoiceHash = calculateInvoiceHash(xml);
  return {
    xml,
    xmlBase64: Buffer.from(xml, "utf8").toString("base64"),
    invoiceHash,
    qrCodeBase64: generateZatcaQrBase64({
      sellerName: input.seller.name,
      vatNumber: input.seller.vatNumber,
      timestamp: normalizeDateTime(input.issueDate),
      invoiceTotal: input.total,
      vatTotal: input.taxTotal,
    }),
  };
}

export function buildZatcaInvoiceXml(input: ZatcaInvoiceInput): string {
  const issue = splitIssueDateTime(input.issueDate);
  const lines = input.lines.map((line, index) => renderInvoiceLine(line, index + 1, input.currency)).join("\n");
  const icv = input.icv === null || input.icv === undefined ? "" : `<cbc:ID schemeID="ICV">${input.icv}</cbc:ID>`;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"',
    '  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"',
    '  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">',
    "  <!-- LedgerByte local ZATCA foundation skeleton. TODO: add official Phase 2 extensions, signatures, CSID stamp, and canonicalization. -->",
    `  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>`,
    `  <cbc:ID>${escapeXml(input.invoiceNumber)}</cbc:ID>`,
    `  <cbc:UUID>${escapeXml(input.invoiceUuid)}</cbc:UUID>`,
    icv ? `  ${icv}` : "",
    `  <cbc:IssueDate>${issue.date}</cbc:IssueDate>`,
    `  <cbc:IssueTime>${issue.time}</cbc:IssueTime>`,
    `  <cbc:InvoiceTypeCode name="${escapeXml(input.invoiceType)}">${ublInvoiceTypeCodes[input.invoiceType]}</cbc:InvoiceTypeCode>`,
    `  <cbc:DocumentCurrencyCode>${escapeXml(input.currency)}</cbc:DocumentCurrencyCode>`,
    `  <cbc:TaxCurrencyCode>${escapeXml(input.currency)}</cbc:TaxCurrencyCode>`,
    `  <cac:AdditionalDocumentReference>`,
    `    <cbc:ID>PIH</cbc:ID>`,
    `    <cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${escapeXml(input.previousInvoiceHash)}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment>`,
    `  </cac:AdditionalDocumentReference>`,
    renderParty("AccountingSupplierParty", input.seller, input.seller.vatNumber),
    renderParty("AccountingCustomerParty", input.buyer, input.buyer.vatNumber ?? null),
    renderTaxTotal(input.taxTotal, input.currency),
    renderLegalMonetaryTotal(input),
    lines,
    "</Invoice>",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function generateZatcaQrBase64(input: {
  sellerName: string;
  vatNumber: string;
  timestamp: string | Date;
  invoiceTotal: string;
  vatTotal: string;
}): string {
  // Basic Phase 1/early-groundwork TLV payload. TODO: add Phase 2 cryptographic tags after signing is implemented.
  const fields = [
    [1, input.sellerName],
    [2, input.vatNumber],
    [3, normalizeDateTime(input.timestamp)],
    [4, normalizeDecimal(input.invoiceTotal)],
    [5, normalizeDecimal(input.vatTotal)],
  ] as const;

  return Buffer.concat(fields.map(([tag, value]) => tlv(tag, value))).toString("base64");
}

export function calculateInvoiceHash(xml: string): string {
  return createHash("sha256").update(xml, "utf8").digest("base64");
}

export function generateEgsPrivateKeyPem(): string {
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  return forge.pki.privateKeyToPem(keys.privateKey);
}

export function buildZatcaCsrSubject(input: ZatcaCsrInput): ZatcaCsrSubjectAttribute[] {
  validateZatcaCsrInput(input);
  return [
    { name: "commonName", value: input.deviceSerialNumber.trim() },
    { name: "serialNumber", value: input.organizationIdentifier.trim() },
    { name: "organizationName", value: input.organizationName.trim() },
    { name: "organizationalUnitName", value: input.organizationUnitName.trim() },
    { name: "countryName", value: input.countryCode.trim().toUpperCase() },
    { name: "localityName", value: input.city.trim() },
    { name: "title", value: input.solutionName.trim() },
    { name: "description", value: input.businessCategory.trim() },
  ];
}

export function generateZatcaCsrPem(input: ZatcaCsrInput): ZatcaCsrResult {
  validateZatcaCsrInput(input);
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  csr.setSubject(buildZatcaCsrSubject(input));
  csr.setAttributes([
    {
      name: "extensionRequest",
      extensions: [
        {
          name: "subjectAltName",
          altNames: [
            { type: 6, value: `urn:ledgerbyte:zatca:device:${input.deviceSerialNumber.trim()}` },
            { type: 6, value: `urn:ledgerbyte:zatca:vat:${input.vatNumber.trim()}` },
          ],
        },
      ],
    },
  ]);
  csr.sign(keys.privateKey, forge.md.sha256.create());

  if (!csr.verify()) {
    throw new Error("Generated ZATCA CSR failed local verification.");
  }

  return {
    // Development helper output only. Production private keys must be generated and stored in KMS/secrets manager, never logged.
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    csrPem: forge.pki.certificationRequestToPem(csr),
  };
}

export function validateZatcaCsrInput(input: ZatcaCsrInput): void {
  requiredCsrText(input.sellerName, "sellerName");
  requiredCsrText(input.vatNumber, "vatNumber");
  requiredCsrText(input.organizationIdentifier, "organizationIdentifier");
  requiredCsrText(input.organizationUnitName, "organizationUnitName");
  requiredCsrText(input.organizationName, "organizationName");
  requiredCsrText(input.countryCode, "countryCode");
  requiredCsrText(input.city, "city");
  requiredCsrText(input.deviceSerialNumber, "deviceSerialNumber");
  requiredCsrText(input.solutionName, "solutionName");
  requiredCsrText(input.businessCategory, "businessCategory");

  if (input.countryCode.trim().toUpperCase() !== "SA") {
    throw new Error("countryCode must be SA for ZATCA CSR groundwork.");
  }
}

function renderParty(tagName: "AccountingSupplierParty" | "AccountingCustomerParty", party: ZatcaSellerInput | ZatcaBuyerInput, vatNumber: string | null): string {
  return [
    `  <cac:${tagName}>`,
    `    <cac:Party>`,
    `      <cac:PostalAddress>`,
    optionalXml("cbc:BuildingNumber", party.buildingNumber, 8),
    optionalXml("cbc:StreetName", party.streetName, 8),
    optionalXml("cbc:CitySubdivisionName", party.district, 8),
    optionalXml("cbc:CityName", party.city, 8),
    optionalXml("cbc:PostalZone", party.postalCode, 8),
    optionalXml("cbc:AdditionalStreetName", party.additionalAddressNumber, 8),
    `        <cac:Country><cbc:IdentificationCode>${escapeXml(party.countryCode ?? "SA")}</cbc:IdentificationCode></cac:Country>`,
    `      </cac:PostalAddress>`,
    vatNumber
      ? `      <cac:PartyTaxScheme><cbc:CompanyID>${escapeXml(vatNumber)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`
      : "",
    `      <cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(party.name)}</cbc:RegistrationName></cac:PartyLegalEntity>`,
    `    </cac:Party>`,
    `  </cac:${tagName}>`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function renderTaxTotal(taxTotal: string, currency: string): string {
  return [
    "  <cac:TaxTotal>",
    `    <cbc:TaxAmount currencyID="${escapeXml(currency)}">${normalizeDecimal(taxTotal)}</cbc:TaxAmount>`,
    "    <cac:TaxSubtotal>",
    `      <cbc:TaxAmount currencyID="${escapeXml(currency)}">${normalizeDecimal(taxTotal)}</cbc:TaxAmount>`,
    "      <cac:TaxCategory><cbc:ID>S</cbc:ID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory>",
    "    </cac:TaxSubtotal>",
    "  </cac:TaxTotal>",
  ].join("\n");
}

function renderLegalMonetaryTotal(input: ZatcaInvoiceInput): string {
  return [
    "  <cac:LegalMonetaryTotal>",
    `    <cbc:LineExtensionAmount currencyID="${escapeXml(input.currency)}">${normalizeDecimal(input.taxableTotal)}</cbc:LineExtensionAmount>`,
    `    <cbc:AllowanceTotalAmount currencyID="${escapeXml(input.currency)}">${normalizeDecimal(input.discountTotal)}</cbc:AllowanceTotalAmount>`,
    `    <cbc:TaxExclusiveAmount currencyID="${escapeXml(input.currency)}">${normalizeDecimal(input.taxableTotal)}</cbc:TaxExclusiveAmount>`,
    `    <cbc:TaxInclusiveAmount currencyID="${escapeXml(input.currency)}">${normalizeDecimal(input.total)}</cbc:TaxInclusiveAmount>`,
    `    <cbc:PayableAmount currencyID="${escapeXml(input.currency)}">${normalizeDecimal(input.total)}</cbc:PayableAmount>`,
    "  </cac:LegalMonetaryTotal>",
  ].join("\n");
}

function renderInvoiceLine(line: ZatcaInvoiceLineInput, lineNumber: number, currency: string): string {
  return [
    "  <cac:InvoiceLine>",
    `    <cbc:ID>${lineNumber}</cbc:ID>`,
    `    <cbc:InvoicedQuantity unitCode="PCE">${normalizeDecimal(line.quantity)}</cbc:InvoicedQuantity>`,
    `    <cbc:LineExtensionAmount currencyID="${escapeXml(currency)}">${normalizeDecimal(line.taxableAmount)}</cbc:LineExtensionAmount>`,
    "    <cac:TaxTotal>",
    `      <cbc:TaxAmount currencyID="${escapeXml(currency)}">${normalizeDecimal(line.taxAmount)}</cbc:TaxAmount>`,
    `      <cbc:RoundingAmount currencyID="${escapeXml(currency)}">${normalizeDecimal(line.lineTotal)}</cbc:RoundingAmount>`,
    "    </cac:TaxTotal>",
    "    <cac:Item>",
    `      <cbc:Name>${escapeXml(line.description)}</cbc:Name>`,
    line.taxRateName ? `      <cbc:Description>${escapeXml(line.taxRateName)}</cbc:Description>` : "",
    "    </cac:Item>",
    "    <cac:Price>",
    `      <cbc:PriceAmount currencyID="${escapeXml(currency)}">${normalizeDecimal(line.unitPrice)}</cbc:PriceAmount>`,
    "    </cac:Price>",
    "  </cac:InvoiceLine>",
  ]
    .filter((value) => value !== "")
    .join("\n");
}

function optionalXml(tagName: string, value: string | null | undefined, indent: number): string {
  const trimmed = value?.trim();
  return trimmed ? `${" ".repeat(indent)}<${tagName}>${escapeXml(trimmed)}</${tagName}>` : "";
}

function tlv(tag: number, value: string): Buffer {
  const encoded = Buffer.from(value, "utf8");
  if (encoded.byteLength > 255) {
    throw new Error(`ZATCA QR TLV value for tag ${tag} is too long.`);
  }
  return Buffer.concat([Buffer.from([tag, encoded.byteLength]), encoded]);
}

function splitIssueDateTime(value: string | Date): { date: string; time: string } {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: "1970-01-01", time: "00:00:00Z" };
  }
  const iso = date.toISOString();
  return { date: iso.slice(0, 10), time: `${iso.slice(11, 19)}Z` };
}

function normalizeDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function normalizeDecimal(value: string): string {
  const trimmed = String(value ?? "0").trim() || "0";
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [integer = "0", fraction = ""] = unsigned.split(".");
  return `${negative ? "-" : ""}${integer || "0"}.${`${fraction}00`.slice(0, 2)}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function requiredCsrText(value: string | null | undefined, field: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`ZATCA CSR field ${field} is required.`);
  }
  return trimmed;
}
