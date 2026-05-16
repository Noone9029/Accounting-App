import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildZatcaInvoiceXml,
  escapeXml,
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
      /<cac:AdditionalDocumentReference>\n    <cbc:ID>PIH<\/cbc:ID>\n    <cac:Attachment>\n      <cbc:EmbeddedDocumentBinaryObject mimeCode="text\/plain">NWZlY2Vi/,
    );
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
    const index = xml.indexOf(marker);
    assert.notEqual(index, -1, `Expected marker ${marker} to exist.`);
    assert.ok(index > previousIndex, `Expected marker ${marker} to appear after the previous marker.`);
    previousIndex = index;
  }
}
