import { createHash } from "node:crypto";
import forge from "node-forge";

export * from "./compliance-checklist.js";
export * from "./xml-mapping.js";
export * from "./xml-validation.js";

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
  supplyDate?: string | Date | null;
  currency: string;
  seller: ZatcaSellerInput;
  buyer: ZatcaBuyerInput;
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  previousInvoiceHash?: string | null;
  icv?: number | null;
  qrCodeBase64?: string | null;
  lines: ZatcaInvoiceLineInput[];
}

export interface ZatcaBuildResult {
  xml: string;
  xmlBase64: string;
  invoiceHash: string;
  qrCodeBase64: string;
}

const officialSellerIdentificationSchemeIds = new Set(["CRN", "MOM", "MLS", "SAG", "OTH", "700"]);

export interface ZatcaCanonicalHashInputResult {
  xmlForHash: string;
  transformsApplied: string[];
  officialC14n11Applied: false;
  blockingReasons: string[];
  warnings: string[];
}

export interface ZatcaInvoiceHashGroundworkResult {
  invoiceHash: string | null;
  officialHashComputed: false;
  sdkCommand: "fatoora -generateHash -invoice <filename>";
  canonicalization: ZatcaCanonicalHashInputResult;
  blockingReasons: string[];
  warnings: string[];
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

const zatcaTransactionCodeFlags: Record<ZatcaInvoiceType, string> = {
  STANDARD_TAX_INVOICE: "0100000",
  SIMPLIFIED_TAX_INVOICE: "0200000",
  CREDIT_NOTE: "0100000",
  DEBIT_NOTE: "0100000",
};

export const initialPreviousInvoiceHash = "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";
export const zatcaSdkGenerateHashCommand = "fatoora -generateHash -invoice <filename>" as const;

export function buildZatcaInvoicePayload(input: ZatcaInvoiceInput): ZatcaBuildResult {
  const qrCodeBase64 =
    input.qrCodeBase64 ??
    generateZatcaQrBase64({
      sellerName: input.seller.name,
      vatNumber: input.seller.vatNumber,
      timestamp: formatXmlDateTime(input.issueDate),
      invoiceTotal: input.total,
      vatTotal: input.taxTotal,
    });
  const xml = buildZatcaInvoiceXml({ ...input, qrCodeBase64 });
  const invoiceHash = calculateInvoiceHash(xml);
  return {
    xml,
    xmlBase64: Buffer.from(xml, "utf8").toString("base64"),
    invoiceHash,
    qrCodeBase64,
  };
}

export function buildZatcaInvoiceXml(input: ZatcaInvoiceInput): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"',
    '  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"',
    '  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">',
    buildZatcaExtensionPlaceholdersXml(),
    buildInvoiceHeaderXml(input),
    buildSupplierPartyXml(input.seller),
    buildCustomerPartyXml(input.buyer),
    buildDeliveryXml(input),
    buildTaxTotalXml(input),
    buildLegalMonetaryTotalXml(input),
    buildInvoiceLinesXml(input.lines, input.currency),
    "</Invoice>",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function buildZatcaExtensionPlaceholdersXml(): string {
  return [
    "  <!-- LedgerByte local ZATCA foundation skeleton. UBL child order now follows official SDK samples for unsigned XML fields. -->",
    "  <!-- TODO: ZATCA extension fields need official implementation. -->",
    "  <!-- TODO: signature block pending; canonicalization pending; invoice hash canonical source pending; PDF/A-3 embedding pending. -->",
  ].join("\n");
}

export function buildInvoiceHeaderXml(input: ZatcaInvoiceInput): string {
  const issue = splitIssueDateTime(input.issueDate);

  return [
    `  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>`,
    `  <cbc:ID>${escapeXml(input.invoiceNumber)}</cbc:ID>`,
    `  <cbc:UUID>${escapeXml(input.invoiceUuid)}</cbc:UUID>`,
    `  <cbc:IssueDate>${issue.date}</cbc:IssueDate>`,
    `  <cbc:IssueTime>${issue.time}</cbc:IssueTime>`,
    `  <cbc:InvoiceTypeCode name="${zatcaTransactionCodeFlags[input.invoiceType]}">${ublInvoiceTypeCodes[input.invoiceType]}</cbc:InvoiceTypeCode>`,
    `  <cbc:DocumentCurrencyCode>${escapeXml(input.currency)}</cbc:DocumentCurrencyCode>`,
    `  <cbc:TaxCurrencyCode>${escapeXml(input.currency)}</cbc:TaxCurrencyCode>`,
    buildAdditionalDocumentReferencesXml(input),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function buildAdditionalDocumentReferencesXml(input: ZatcaInvoiceInput): string {
  const qrCodeBase64 =
    input.qrCodeBase64 ??
    generateZatcaQrBase64({
      sellerName: input.seller.name,
      vatNumber: input.seller.vatNumber,
      timestamp: formatXmlDateTime(input.issueDate),
      invoiceTotal: input.total,
      vatTotal: input.taxTotal,
    });
  const references = [
    input.icv === null || input.icv === undefined
      ? ""
      : [
          `  <cac:AdditionalDocumentReference>`,
          `    <cbc:ID>ICV</cbc:ID>`,
          `    <cbc:UUID>${escapeXml(input.icv)}</cbc:UUID>`,
          `  </cac:AdditionalDocumentReference>`,
        ].join("\n"),
    buildBinaryAdditionalDocumentReferenceXml("PIH", resolvePreviousInvoiceHash(input.previousInvoiceHash)),
    qrCodeBase64 ? buildBinaryAdditionalDocumentReferenceXml("QR", qrCodeBase64) : "",
  ];

  return references.filter((line) => line !== "").join("\n");
}

function buildBinaryAdditionalDocumentReferenceXml(id: "PIH" | "QR", value: string): string {
  return [
    `  <cac:AdditionalDocumentReference>`,
    `    <cbc:ID>${id}</cbc:ID>`,
    `    <cac:Attachment>`,
    `      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${escapeXml(value)}</cbc:EmbeddedDocumentBinaryObject>`,
    `    </cac:Attachment>`,
    `  </cac:AdditionalDocumentReference>`,
  ].join("\n");
}

export function buildSupplierPartyXml(seller: ZatcaSellerInput): string {
  return buildPartyXml("AccountingSupplierParty", seller, seller.vatNumber);
}

export function buildCustomerPartyXml(buyer: ZatcaBuyerInput): string {
  return buildPartyXml("AccountingCustomerParty", buyer, buyer.vatNumber ?? null);
}

export function buildDeliveryXml(input: Pick<ZatcaInvoiceInput, "supplyDate">): string {
  if (!input.supplyDate) {
    return "";
  }

  return [
    "  <cac:Delivery>",
    `    <cbc:ActualDeliveryDate>${formatXmlDate(input.supplyDate)}</cbc:ActualDeliveryDate>`,
    "  </cac:Delivery>",
  ].join("\n");
}

export function buildTaxTotalXml(input: Pick<ZatcaInvoiceInput, "taxTotal" | "taxableTotal" | "currency">): string {
  const taxPercent = formatPercent(input.taxTotal, input.taxableTotal);
  return [
    "  <cac:TaxTotal>",
    `    <cbc:TaxAmount currencyID="${escapeXml(input.currency)}">${formatMoney(input.taxTotal)}</cbc:TaxAmount>`,
    "  </cac:TaxTotal>",
    "  <cac:TaxTotal>",
    `    <cbc:TaxAmount currencyID="${escapeXml(input.currency)}">${formatMoney(input.taxTotal)}</cbc:TaxAmount>`,
    "    <cac:TaxSubtotal>",
    `      <cbc:TaxableAmount currencyID="${escapeXml(input.currency)}">${formatMoney(input.taxableTotal)}</cbc:TaxableAmount>`,
    `      <cbc:TaxAmount currencyID="${escapeXml(input.currency)}">${formatMoney(input.taxTotal)}</cbc:TaxAmount>`,
    "      <cac:TaxCategory>",
    '        <cbc:ID schemeID="UN/ECE 5305" schemeAgencyID="6">S</cbc:ID>',
    `        <cbc:Percent>${taxPercent}</cbc:Percent>`,
    "        <cac:TaxScheme>",
    '          <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">VAT</cbc:ID>',
    "        </cac:TaxScheme>",
    "      </cac:TaxCategory>",
    "    </cac:TaxSubtotal>",
    "  </cac:TaxTotal>",
  ].join("\n");
}

export function buildLegalMonetaryTotalXml(input: ZatcaInvoiceInput): string {
  return [
    "  <cac:LegalMonetaryTotal>",
    `    <cbc:LineExtensionAmount currencyID="${escapeXml(input.currency)}">${formatMoney(input.subtotal)}</cbc:LineExtensionAmount>`,
    `    <cbc:TaxExclusiveAmount currencyID="${escapeXml(input.currency)}">${formatMoney(input.taxableTotal)}</cbc:TaxExclusiveAmount>`,
    `    <cbc:TaxInclusiveAmount currencyID="${escapeXml(input.currency)}">${formatMoney(input.total)}</cbc:TaxInclusiveAmount>`,
    `    <cbc:AllowanceTotalAmount currencyID="${escapeXml(input.currency)}">${formatMoney(input.discountTotal)}</cbc:AllowanceTotalAmount>`,
    `    <cbc:PrepaidAmount currencyID="${escapeXml(input.currency)}">0.00</cbc:PrepaidAmount>`,
    `    <cbc:PayableAmount currencyID="${escapeXml(input.currency)}">${formatMoney(input.total)}</cbc:PayableAmount>`,
    "  </cac:LegalMonetaryTotal>",
  ].join("\n");
}

export function buildInvoiceLinesXml(lines: ZatcaInvoiceLineInput[], currency: string): string {
  return lines.map((line, index) => buildInvoiceLineXml(line, index + 1, currency)).join("\n");
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
    [3, formatXmlDateTime(input.timestamp)],
    [4, formatMoney(input.invoiceTotal)],
    [5, formatMoney(input.vatTotal)],
  ] as const;

  return Buffer.concat(fields.map(([tag, value]) => tlv(tag, value))).toString("base64");
}

export function calculateInvoiceHash(xml: string): string {
  return createHash("sha256").update(xml, "utf8").digest("base64");
}

export function canonicalizeZatcaInvoiceXmlForHash(xml: string): ZatcaCanonicalHashInputResult {
  const withoutExtensions = removeXmlElementByPrefixAndName(xml, "ext", "UBLExtensions");
  const withoutQr = removeAdditionalDocumentReferenceById(withoutExtensions, "QR");
  const withoutSignature = removeXmlElementByPrefixAndName(withoutQr, "cac", "Signature");

  return {
    xmlForHash: withoutSignature,
    transformsApplied: [
      "removed ext:UBLExtensions",
      "removed cac:AdditionalDocumentReference where cbc:ID is QR",
      "removed cac:Signature",
    ],
    officialC14n11Applied: false,
    blockingReasons: ["Official C14N11 canonicalization is not implemented in LedgerByte core; use the official SDK -generateHash command as the hash oracle."],
    warnings: ["Local transform preparation only. This is not an official ZATCA invoice hash."],
  };
}

export function computeZatcaInvoiceHash(xml: string): ZatcaInvoiceHashGroundworkResult {
  const canonicalization = canonicalizeZatcaInvoiceXmlForHash(xml);
  return {
    invoiceHash: null,
    officialHashComputed: false,
    sdkCommand: zatcaSdkGenerateHashCommand,
    canonicalization,
    blockingReasons: [
      ...canonicalization.blockingReasons,
      "Official invoice hash computation is blocked until SDK -generateHash output is used or a verified C14N11 implementation is introduced.",
    ],
    warnings: canonicalization.warnings,
  };
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

function buildPartyXml(tagName: "AccountingSupplierParty" | "AccountingCustomerParty", party: ZatcaSellerInput | ZatcaBuyerInput, vatNumber: string | null): string {
  const partyIdentification = buildPartyIdentificationXml(party);
  return [
    `  <cac:${tagName}>`,
    `    <cac:Party>`,
    partyIdentification,
    `      <cac:PostalAddress>`,
    optionalXml("cbc:StreetName", party.streetName, 8),
    optionalXml("cbc:AdditionalStreetName", party.additionalAddressNumber, 8),
    optionalXml("cbc:BuildingNumber", party.buildingNumber, 8),
    optionalXml("cbc:CitySubdivisionName", party.district, 8),
    optionalXml("cbc:CityName", party.city, 8),
    optionalXml("cbc:PostalZone", party.postalCode, 8),
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

function buildPartyIdentificationXml(party: ZatcaSellerInput | ZatcaBuyerInput): string {
  if (!("companyIdNumber" in party)) {
    return "";
  }

  const companyIdNumber = party.companyIdNumber?.trim();
  const companyIdType = party.companyIdType?.trim().toUpperCase() ?? "";
  if (!companyIdNumber || !companyIdType || !officialSellerIdentificationSchemeIds.has(companyIdType) || !/^[a-zA-Z0-9]+$/.test(companyIdNumber)) {
    return "";
  }

  return [
    "      <cac:PartyIdentification>",
    `        <cbc:ID schemeID="${escapeXml(companyIdType)}">${escapeXml(companyIdNumber)}</cbc:ID>`,
    "      </cac:PartyIdentification>",
  ].join("\n");
}

function buildInvoiceLineXml(line: ZatcaInvoiceLineInput, lineNumber: number, currency: string): string {
  const taxPercent = formatPercent(line.taxAmount, line.taxableAmount);
  return [
    "  <cac:InvoiceLine>",
    `    <cbc:ID>${lineNumber}</cbc:ID>`,
    `    <cbc:InvoicedQuantity unitCode="PCE">${formatMoney(line.quantity)}</cbc:InvoicedQuantity>`,
    `    <cbc:LineExtensionAmount currencyID="${escapeXml(currency)}">${formatMoney(line.taxableAmount)}</cbc:LineExtensionAmount>`,
    "    <cac:TaxTotal>",
    `      <cbc:TaxAmount currencyID="${escapeXml(currency)}">${formatMoney(line.taxAmount)}</cbc:TaxAmount>`,
    `      <cbc:RoundingAmount currencyID="${escapeXml(currency)}">${formatMoney(line.lineTotal)}</cbc:RoundingAmount>`,
    "    </cac:TaxTotal>",
    "    <cac:Item>",
    line.taxRateName ? `      <cbc:Description>${escapeXml(line.taxRateName)}</cbc:Description>` : "",
    `      <cbc:Name>${escapeXml(line.description)}</cbc:Name>`,
    "      <cac:ClassifiedTaxCategory>",
    "        <cbc:ID>S</cbc:ID>",
    `        <cbc:Percent>${taxPercent}</cbc:Percent>`,
    "        <cac:TaxScheme>",
    "          <cbc:ID>VAT</cbc:ID>",
    "        </cac:TaxScheme>",
    "      </cac:ClassifiedTaxCategory>",
    "    </cac:Item>",
    "    <cac:Price>",
    `      <cbc:PriceAmount currencyID="${escapeXml(currency)}">${formatMoney(line.unitPrice)}</cbc:PriceAmount>`,
    "    </cac:Price>",
    "  </cac:InvoiceLine>",
  ]
    .filter((value) => value !== "")
    .join("\n");
}

function resolvePreviousInvoiceHash(previousInvoiceHash: string | null | undefined): string {
  const trimmed = previousInvoiceHash?.trim();
  return trimmed || initialPreviousInvoiceHash;
}

function removeXmlElementByPrefixAndName(xml: string, prefix: string, elementName: string): string {
  const tag = `${prefix}:${elementName}`;
  return xml.replace(new RegExp(`\\s*<${escapeRegExp(tag)}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${escapeRegExp(tag)}>`, "g"), "");
}

function removeAdditionalDocumentReferenceById(xml: string, id: string): string {
  return xml.replace(/\s*<cac:AdditionalDocumentReference(?:\s[^>]*)?>[\s\S]*?<\/cac:AdditionalDocumentReference>/g, (match) =>
    new RegExp(`<cbc:ID>\\s*${escapeRegExp(id)}\\s*<\\/cbc:ID>`).test(match) ? "" : match,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  const date = toDate(value);
  if (!date) {
    return { date: "1970-01-01", time: "00:00:00Z" };
  }
  const iso = date.toISOString();
  return { date: iso.slice(0, 10), time: `${iso.slice(11, 19)}Z` };
}

export function formatXmlDate(value: string | Date): string {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : "1970-01-01";
}

export function formatXmlDateTime(value: string | Date): string {
  const date = toDate(value);
  return date ? date.toISOString() : String(value);
}

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function formatMoney(value: string | number | null | undefined): string {
  const trimmed = String(value ?? "0").trim() || "0";
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [integer = "0", fraction = ""] = unsigned.split(".");
  return `${negative ? "-" : ""}${integer || "0"}.${`${fraction}00`.slice(0, 2)}`;
}

function formatPercent(taxAmount: string | number | null | undefined, taxableAmount: string | number | null | undefined): string {
  const tax = Number(taxAmount ?? 0);
  const taxable = Number(taxableAmount ?? 0);
  if (!Number.isFinite(tax) || !Number.isFinite(taxable) || taxable === 0) {
    return "0.00";
  }

  return formatMoney(((tax / taxable) * 100).toFixed(4));
}

export function escapeXml(value: string | number | null | undefined): string {
  return String(value ?? "")
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
