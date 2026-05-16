import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildZatcaInvoiceXml,
  canonicalizeZatcaInvoiceXmlForHash,
  computeZatcaInvoiceHash,
  escapeXml,
  initialPreviousInvoiceHash,
  validateLocalZatcaXml,
  ZATCA_XML_FIELD_MAPPING,
  ZATCA_XML_FIELD_MAPPING_STATUSES,
  type ZatcaInvoiceInput,
} from "../src/index.ts";

describe("ZATCA XML mapping scaffold", () => {
  it("escapes XML-special characters", () => {
    assert.equal(escapeXml("A&B<C>\"D'"), "A&amp;B&lt;C&gt;&quot;D&apos;");
  });

  it("matches local standard invoice fixture", () => {
    const input = readFixtureInput("local-standard-tax-invoice");
    const expected = readFixtureXml("local-standard-tax-invoice");

    assert.equal(buildZatcaInvoiceXml(input), expected);
  });

  it("matches local simplified invoice fixture", () => {
    const input = readFixtureInput("local-simplified-tax-invoice");
    const expected = readFixtureXml("local-simplified-tax-invoice");

    assert.equal(buildZatcaInvoiceXml(input), expected);
  });

  it("generates deterministic XML for the same input", () => {
    const input = readFixtureInput("local-standard-tax-invoice");

    assert.equal(buildZatcaInvoiceXml(input), buildZatcaInvoiceXml(input));
  });

  it("orders UBL invoice header elements before ZATCA document references", () => {
    const xml = buildZatcaInvoiceXml(readFixtureInput("local-standard-tax-invoice"));
    const orderedMarkers = [
      "<cbc:ProfileID>",
      "<cbc:ID>STD-&amp;-001</cbc:ID>",
      "<cbc:UUID>",
      "<cbc:IssueDate>",
      "<cbc:IssueTime>",
      "<cbc:InvoiceTypeCode",
      "<cbc:DocumentCurrencyCode>",
      "<cbc:TaxCurrencyCode>",
      "<cbc:ID>ICV</cbc:ID>",
      "<cbc:ID>PIH</cbc:ID>",
    ];

    assertMarkersInOrder(xml, orderedMarkers);
  });

  it("emits official supply date structure after customer party for standard invoices", () => {
    const xml = buildZatcaInvoiceXml(readFixtureInput("local-standard-tax-invoice"));

    assert.match(
      xml,
      /<cac:Delivery>\n    <cbc:ActualDeliveryDate>2026-05-12<\/cbc:ActualDeliveryDate>\n  <\/cac:Delivery>/,
    );
    assertMarkersInOrder(xml, [
      "<cac:AccountingCustomerParty>",
      "<cac:Delivery>",
      "<cbc:ActualDeliveryDate>2026-05-12</cbc:ActualDeliveryDate>",
      "<cac:TaxTotal>",
    ]);
  });

  it("preserves official buyer PostalAddress child order including building number", () => {
    const xml = buildZatcaInvoiceXml(readFixtureInput("local-standard-tax-invoice"));

    assertMarkersInOrder(xml, [
      "<cac:AccountingCustomerParty>",
      "<cbc:StreetName>Prince Sultan</cbc:StreetName>",
      "<cbc:BuildingNumber>2322</cbc:BuildingNumber>",
      "<cbc:CitySubdivisionName>Al-Murabba</cbc:CitySubdivisionName>",
      "<cbc:CityName>Jeddah</cbc:CityName>",
      "<cbc:PostalZone>21442</cbc:PostalZone>",
      "<cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>",
    ]);
  });

  it("emits official ICV AdditionalDocumentReference structure", () => {
    const xml = buildZatcaInvoiceXml(readFixtureInput("local-standard-tax-invoice"));

    assert.match(
      xml,
      /<cac:AdditionalDocumentReference>\n    <cbc:ID>ICV<\/cbc:ID>\n    <cbc:UUID>42<\/cbc:UUID>\n  <\/cac:AdditionalDocumentReference>/,
    );
    assert.doesNotMatch(xml, /<cbc:ID schemeID="ICV">/);
  });

  it("emits official PIH AdditionalDocumentReference attachment structure", () => {
    const xml = buildZatcaInvoiceXml(readFixtureInput("local-standard-tax-invoice"));

    assert.match(
      xml,
      /<cac:AdditionalDocumentReference>\n    <cbc:ID>PIH<\/cbc:ID>\n    <cac:Attachment>\n      <cbc:EmbeddedDocumentBinaryObject mimeCode="text\/plain">NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==<\/cbc:EmbeddedDocumentBinaryObject>/,
    );
  });

  it("uses the official first invoice PIH fallback when no previous hash is supplied", () => {
    const input = { ...readFixtureInput("local-standard-tax-invoice"), previousInvoiceHash: undefined };
    const xml = buildZatcaInvoiceXml(input);

    assert.equal(initialPreviousInvoiceHash, "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==");
    assert.match(xml, new RegExp(`<cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${initialPreviousInvoiceHash}</cbc:EmbeddedDocumentBinaryObject>`));
  });

  it("renders an explicitly supplied PIH value instead of the first invoice fallback", () => {
    const xml = buildZatcaInvoiceXml({
      ...readFixtureInput("local-standard-tax-invoice"),
      previousInvoiceHash: "EXPLICIT_PREVIOUS_HASH_BASE64",
    });

    assert.match(xml, /<cbc:EmbeddedDocumentBinaryObject mimeCode="text\/plain">EXPLICIT_PREVIOUS_HASH_BASE64<\/cbc:EmbeddedDocumentBinaryObject>/);
    assert.doesNotMatch(xml, new RegExp(initialPreviousInvoiceHash));
  });

  it("emits official QR AdditionalDocumentReference attachment structure when QR content is available", () => {
    const input = readFixtureInput("local-simplified-tax-invoice");
    const xml = buildZatcaInvoiceXml({ ...input, qrCodeBase64: "LOCAL_DEV_QR_PLACEHOLDER" });

    assert.match(
      xml,
      /<cac:AdditionalDocumentReference>\n    <cbc:ID>QR<\/cbc:ID>\n    <cac:Attachment>\n      <cbc:EmbeddedDocumentBinaryObject mimeCode="text\/plain">LOCAL_DEV_QR_PLACEHOLDER<\/cbc:EmbeddedDocumentBinaryObject>/,
    );
  });

  it("maps invoice type transaction flags from official samples", () => {
    const standardXml = buildZatcaInvoiceXml(readFixtureInput("local-standard-tax-invoice"));
    const simplifiedXml = buildZatcaInvoiceXml(readFixtureInput("local-simplified-tax-invoice"));

    assert.match(standardXml, /<cbc:InvoiceTypeCode name="0100000">388<\/cbc:InvoiceTypeCode>/);
    assert.match(simplifiedXml, /<cbc:InvoiceTypeCode name="0200000">388<\/cbc:InvoiceTypeCode>/);
  });

  it("emits seller PartyIdentification only for official BR-KSA-08 scheme and alphanumeric value", () => {
    const input = readFixtureInput("local-standard-tax-invoice");
    const validXml = buildZatcaInvoiceXml({
      ...input,
      seller: { ...input.seller, companyIdType: "crn", companyIdNumber: "1010010000" },
    });
    const invalidXml = buildZatcaInvoiceXml({
      ...input,
      seller: { ...input.seller, companyIdType: "BAD", companyIdNumber: "CRN-123" },
    });

    assert.match(validXml, /<cac:PartyIdentification>\n        <cbc:ID schemeID="CRN">1010010000<\/cbc:ID>\n      <\/cac:PartyIdentification>/);
    assert.doesNotMatch(invalidXml, /<cac:PartyIdentification>/);
  });

  it("prepares documented hash input transforms without pretending to run official C14N11", () => {
    const xml = [
      '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">',
      "  <ext:UBLExtensions><ext:UBLExtension /></ext:UBLExtensions>",
      "  <cbc:ID>INV-1</cbc:ID>",
      "  <cac:AdditionalDocumentReference><cbc:ID>PIH</cbc:ID></cac:AdditionalDocumentReference>",
      "  <cac:AdditionalDocumentReference><cbc:ID>QR</cbc:ID></cac:AdditionalDocumentReference>",
      "  <cac:Signature><cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID></cac:Signature>",
      "</Invoice>",
    ].join("\n");

    const result = canonicalizeZatcaInvoiceXmlForHash(xml);

    assert.equal(result.officialC14n11Applied, false);
    assert.equal(result.xmlForHash.includes("<ext:UBLExtensions>"), false);
    assert.equal(result.xmlForHash.includes("<cbc:ID>QR</cbc:ID>"), false);
    assert.equal(result.xmlForHash.includes("<cac:Signature>"), false);
    assert.equal(result.xmlForHash.includes("<cbc:ID>PIH</cbc:ID>"), true);
    assert.ok(result.blockingReasons.some((reason) => reason.includes("C14N11")));
  });

  it("blocks local official invoice hash computation until SDK C14N11 hash output is used", () => {
    const result = computeZatcaInvoiceHash(buildZatcaInvoiceXml(readFixtureInput("local-standard-tax-invoice")));

    assert.equal(result.invoiceHash, null);
    assert.equal(result.officialHashComputed, false);
    assert.equal(result.sdkCommand, "fatoora -generateHash -invoice <filename>");
    assert.ok(result.blockingReasons.some((reason) => reason.includes("SDK")));
  });

  it("preserves Arabic and Unicode text", () => {
    const xml = buildZatcaInvoiceXml(readFixtureInput("local-simplified-tax-invoice"));

    assert.match(xml, /عميل نقدي/);
  });

  it("keeps XML field mapping ids unique and statuses valid", () => {
    const ids = ZATCA_XML_FIELD_MAPPING.map((item) => item.id);
    const validStatuses = new Set<string>(ZATCA_XML_FIELD_MAPPING_STATUSES);

    assert.equal(new Set(ids).size, ids.length);
    for (const item of ZATCA_XML_FIELD_MAPPING) {
      assert.ok(item.id);
      assert.ok(item.category);
      assert.ok(item.ledgerByteSource);
      assert.ok(item.xmlTarget);
      assert.ok(validStatuses.has(item.status));
    }
  });

  it("keeps production-required placeholder items visible", () => {
    assert.ok(
      ZATCA_XML_FIELD_MAPPING.some(
        (item) => item.requiredForProduction && (item.status === "PLACEHOLDER" || item.status === "NOT_STARTED" || item.status === "NEEDS_OFFICIAL_VERIFICATION"),
      ),
    );
  });

  it("local validation rejects missing seller VAT", () => {
    const input = readFixtureInput("local-standard-tax-invoice");
    const result = validateLocalZatcaXml({ ...input, seller: { ...input.seller, vatNumber: "" } });

    assert.equal(result.localOnly, true);
    assert.equal(result.officialValidation, false);
    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, ["Seller VAT number is required."]);
  });

  it("local validation rejects missing invoice lines", () => {
    const input = readFixtureInput("local-standard-tax-invoice");
    const result = validateLocalZatcaXml({ ...input, lines: [] });

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("At least one invoice line is required."));
  });

  it("warns about missing Saudi standard buyer building number without inserting fake XML data", () => {
    const input = readFixtureInput("local-standard-tax-invoice");
    const result = validateLocalZatcaXml({ ...input, buyer: { ...input.buyer, buildingNumber: null } });
    const xml = buildZatcaInvoiceXml({ ...input, buyer: { ...input.buyer, buildingNumber: null } });

    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((warning) => warning.includes("BR-KSA-63 readiness")));
    const customerPartyStart = xml.indexOf("<cac:AccountingCustomerParty>");
    const customerTaxSchemeStart = xml.indexOf("<cac:PartyTaxScheme>", customerPartyStart);
    const buyerAddressXml = xml.slice(customerPartyStart, customerTaxSchemeStart);
    assert.doesNotMatch(buyerAddressXml, /<cbc:BuildingNumber>/);
  });
});

function readFixtureInput(name: string): ZatcaInvoiceInput {
  return JSON.parse(readFileSync(new URL(`../fixtures/${name}.input.json`, import.meta.url), "utf8")) as ZatcaInvoiceInput;
}

function readFixtureXml(name: string): string {
  return readFileSync(new URL(`../fixtures/${name}.expected.xml`, import.meta.url), "utf8").trimEnd();
}

function assertMarkersInOrder(xml: string, markers: string[]): void {
  let previousIndex = -1;
  for (const marker of markers) {
    const index = xml.indexOf(marker, previousIndex + 1);
    assert.notEqual(index, -1, `Expected marker ${marker} to exist.`);
    assert.ok(index > previousIndex, `Expected marker ${marker} to appear after the previous marker.`);
    previousIndex = index;
  }
}
