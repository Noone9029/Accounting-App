import { UAE_ELECTRONIC_ADDRESS_SCHEME_ID, UAE_PINT_AE_CUSTOMIZATION_ID, UAE_PINT_AE_PROFILE_ID, resolveUaePintAeBuyerEndpointId, resolveUaePintAeEndpointId, resolveUaePintAeTransactionTypeFlagCode } from "./constants";
import { resolveUaePintAeDocumentType, resolveUaePintAeInvoiceTypeCode, validateUaePintAeDocument } from "./rules";
import type { UaePintAeAllowance, UaePintAeDocumentInput, UaePintAeLine, UaePintAeParty, UaePintAeSerializationMetadata, UaePintAeSerializationResult } from "./types";

export function serializeUaePintAeInvoice(input: UaePintAeDocumentInput): UaePintAeSerializationResult {
  return serializeUaePintAeDocument({ ...input, kind: "invoice" });
}

export function serializeUaePintAeCreditNote(input: UaePintAeDocumentInput): UaePintAeSerializationResult {
  return serializeUaePintAeDocument({ ...input, kind: "credit-note" });
}

export function serializeUaePintAeDocument(input: UaePintAeDocumentInput): UaePintAeSerializationResult {
  const validation = validateUaePintAeDocument(input);
  const documentType = resolveUaePintAeDocumentType(input);
  const metadata: UaePintAeSerializationMetadata = {
    customizationId: UAE_PINT_AE_CUSTOMIZATION_ID,
    profileId: UAE_PINT_AE_PROFILE_ID,
    endpointSchemeId: UAE_ELECTRONIC_ADDRESS_SCHEME_ID,
    documentKind: input.kind,
    documentType,
    localOnly: true,
    noNetwork: true,
    noAspValidation: true,
    noFtaReporting: true,
    productionCompliance: false,
    unknownOfficialMappings: validation.issues.filter((issue) => issue.source === "official-doc-required").map((issue) => issue.code),
  };
  if (!validation.valid) {
    return { ok: false, xml: "", validation, metadata };
  }

  const root = input.kind === "credit-note" ? "CreditNote" : "Invoice";
  const lineElement = input.kind === "credit-note" ? "CreditNoteLine" : "InvoiceLine";
  const quantityElement = input.kind === "credit-note" ? "CreditedQuantity" : "InvoicedQuantity";
  const creditNoteReference =
    input.kind === "credit-note"
      ? `
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${escapeXml(input.originalInvoiceNumber ?? "")}</cbc:ID>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>
  <cbc:Note>${escapeXml(input.creditNoteReason ?? "")}</cbc:Note>`
      : "";
  const dueDate = input.paymentDueDate ? `\n  <cbc:DueDate>${escapeXml(input.paymentDueDate)}</cbc:DueDate>` : "";
  const transactionFlag = `\n  <cbc:ProfileExecutionID>${escapeXml(resolveUaePintAeTransactionTypeFlagCode(input))}</cbc:ProfileExecutionID>`;
  const documentAllowanceTotal = sumAllowances(input.allowances);
  const lineExtensionTotal = input.lines.reduce((sum, line) => sum + Number(line.taxableAmount), 0);
  const documentAllowancesXml = (input.allowances ?? []).map((allowance) => documentAllowanceXml(allowance, input.currency)).join("");
  const allowanceTotalXml =
    documentAllowanceTotal > 0
      ? `\n    <cbc:AllowanceTotalAmount currencyID="${escapeXml(input.currency)}">${formatAmount(documentAllowanceTotal)}</cbc:AllowanceTotalAmount>`
      : "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<${root} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${root}-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>${UAE_PINT_AE_CUSTOMIZATION_ID}</cbc:CustomizationID>
  <cbc:ProfileID>${UAE_PINT_AE_PROFILE_ID}</cbc:ProfileID>
  <cbc:ID>${escapeXml(input.documentNumber)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(input.issueDate)}</cbc:IssueDate>
  <cbc:${input.kind === "credit-note" ? "CreditNoteTypeCode" : "InvoiceTypeCode"}>${escapeXml(resolveUaePintAeInvoiceTypeCode(input))}</cbc:${input.kind === "credit-note" ? "CreditNoteTypeCode" : "InvoiceTypeCode"}>
  <cbc:DocumentCurrencyCode>${escapeXml(input.currency)}</cbc:DocumentCurrencyCode>${dueDate}${transactionFlag}${creditNoteReference}
${partyXml("AccountingSupplierParty", input.supplier)}
${partyXml("AccountingCustomerParty", input.buyer, resolveUaePintAeBuyerEndpointId(input))}
${documentAllowancesXml}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escapeXml(input.currency)}">${formatAmount(input.taxTotal)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escapeXml(input.currency)}">${formatAmount(lineExtensionTotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${escapeXml(input.currency)}">${formatAmount(input.subtotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXml(input.currency)}">${formatAmount(input.total)}</cbc:TaxInclusiveAmount>
    ${allowanceTotalXml}
    <cbc:PayableAmount currencyID="${escapeXml(input.currency)}">${formatAmount(input.total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${input.lines.map((line) => lineXml(lineElement, quantityElement, line, input.currency)).join("")}
</${root}>`;

  return { ok: true, xml, validation, metadata };
}

function partyXml(role: "AccountingSupplierParty" | "AccountingCustomerParty", party: UaePintAeParty, endpointOverride: string | null = null): string {
  return `  <cac:${role}>
    <cac:Party>
      <cbc:EndpointID schemeID="${UAE_ELECTRONIC_ADDRESS_SCHEME_ID}">${escapeXml(endpointOverride ?? resolveUaePintAeEndpointId(party))}</cbc:EndpointID>
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

function lineXml(lineElement: "InvoiceLine" | "CreditNoteLine", quantityElement: "InvoicedQuantity" | "CreditedQuantity", line: UaePintAeLine, currency: string): string {
  return `
  <cac:${lineElement}>
    <cbc:ID>${escapeXml(line.id)}</cbc:ID>
    <cbc:${quantityElement} unitCode="${escapeXml(line.unitCode ?? "")}">${formatAmount(line.quantity)}</cbc:${quantityElement}>
    <cbc:LineExtensionAmount currencyID="${escapeXml(currency)}">${formatAmount(line.taxableAmount)}</cbc:LineExtensionAmount>
${(line.allowances ?? []).map((allowance) => lineAllowanceXml(allowance, currency)).join("")}
    <cac:Item>
      <cbc:Name>${escapeXml(line.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory><cbc:ID>${escapeXml(line.taxCategory ?? "")}</cbc:ID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${escapeXml(currency)}">${formatAmount(line.unitPrice)}</cbc:PriceAmount></cac:Price>
  </cac:${lineElement}>`;
}

function documentAllowanceXml(allowance: UaePintAeAllowance, currency: string): string {
  const baseAmount = allowance.baseAmount !== null && allowance.baseAmount !== undefined ? `\n    <cbc:BaseAmount currencyID="${escapeXml(currency)}">${formatAmount(allowance.baseAmount)}</cbc:BaseAmount>` : "";
  const taxRate = allowance.taxRate !== null && allowance.taxRate !== undefined ? `\n      <cbc:Percent>${formatPercent(allowance.taxRate)}</cbc:Percent>` : "";
  return `
  <cac:AllowanceCharge>
    <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
    <cbc:AllowanceChargeReason>${escapeXml(allowance.reason ?? "")}</cbc:AllowanceChargeReason>
    <cbc:Amount currencyID="${escapeXml(currency)}">${formatAmount(allowance.amount)}</cbc:Amount>${baseAmount}
    <cac:TaxCategory>
      <cbc:ID>${escapeXml(allowance.taxCategory ?? "")}</cbc:ID>${taxRate}
      <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
    </cac:TaxCategory>
  </cac:AllowanceCharge>`;
}

function lineAllowanceXml(allowance: UaePintAeAllowance, currency: string): string {
  const baseAmount = allowance.baseAmount !== null && allowance.baseAmount !== undefined ? `\n      <cbc:BaseAmount currencyID="${escapeXml(currency)}">${formatAmount(allowance.baseAmount)}</cbc:BaseAmount>` : "";
  return `    <cac:AllowanceCharge>
      <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
      <cbc:AllowanceChargeReason>${escapeXml(allowance.reason ?? "")}</cbc:AllowanceChargeReason>
      <cbc:Amount currencyID="${escapeXml(currency)}">${formatAmount(allowance.amount)}</cbc:Amount>${baseAmount}
    </cac:AllowanceCharge>
`;
}

function formatAmount(value: string | number): string {
  return Number(value).toFixed(2);
}

function formatPercent(value: string | number): string {
  return String(Number(value));
}

function sumAllowances(allowances: readonly UaePintAeAllowance[] | null | undefined): number {
  return (allowances ?? []).reduce((sum, allowance) => sum + Number(allowance.amount), 0);
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
