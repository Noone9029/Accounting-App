import assert from "node:assert/strict";
import test from "node:test";
import { buildUaePintXml, buildUaeReadinessReport, deriveUaePeppolParticipantId, validateUaePintInput } from "../src";

test("derives UAE Peppol participant ID from a 10-digit TIN", () => {
  assert.equal(deriveUaePeppolParticipantId("1234567890"), "02351234567890");
});

test("builds readiness checks for organization and buyer endpoint data", () => {
  const report = buildUaeReadinessReport({
    organization: {
      legalName: "LedgerByte FZ LLC",
      tradeLicenseNumber: "TL-123",
      tin: "1234567890",
      trn: "100000000000003",
      addressLine1: "Business Bay",
      emirate: "Dubai",
      peppolParticipantId: "02351234567890",
      aspSelected: "Disabled mock ASP",
      aspOnboardingStatus: "NOT_STARTED",
    },
    buyer: {
      legalName: "Buyer LLC",
      tin: "2234567890",
      addressLine1: "Abu Dhabi",
      peppolParticipantId: "02352234567890",
      peppolEndpointStatus: "COLLECTED",
    },
  });

  assert.equal(report.status, "READY_FOR_VALIDATION");
  assert.equal(report.checks.every((check) => check.status !== "FAIL"), true);
  assert.match(report.warnings.join(" "), /not ASP accreditation/i);
});

test("reports missing buyer endpoint and credit-note reference errors", () => {
  const validation = validateUaePintInput({
    ...invoiceFixture(),
    kind: "credit-note",
    buyer: { ...invoiceFixture().buyer, peppolParticipantId: "" },
    creditNoteReason: "",
    originalInvoiceNumber: "",
  });

  assert.equal(validation.valid, false);
  assert.deepEqual(
    validation.issues.map((issue) => issue.code).sort(),
    ["BUYER_ENDPOINT_REQUIRED", "CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED", "CREDIT_NOTE_REASON_REQUIRED"].sort(),
  );
});

test("generates stable PINT-AE readiness XML for an invoice", () => {
  const result = buildUaePintXml(invoiceFixture());

  assert.equal(result.validation.valid, true);
  assert.match(result.xml, /<Invoice /);
  assert.match(result.xml, /<cbc:CustomizationID>urn:peppol:pint:ae:billing-1@ledgerbyte-readiness<\/cbc:CustomizationID>/);
  assert.match(result.xml, /<cbc:EndpointID schemeID="0235">02351234567890<\/cbc:EndpointID>/);
  assert.match(result.xml, /<cbc:PayableAmount currencyID="AED">1050.00<\/cbc:PayableAmount>/);
});

function invoiceFixture() {
  return {
    kind: "invoice" as const,
    documentNumber: "INV-0001",
    issueDate: "2026-06-14",
    currency: "AED",
    supplier: {
      legalName: "LedgerByte FZ LLC",
      peppolParticipantId: "02351234567890",
      tin: "1234567890",
      trn: "100000000000003",
      addressLine1: "Business Bay",
      emirate: "Dubai",
      countryCode: "AE",
    },
    buyer: {
      legalName: "Buyer LLC",
      peppolParticipantId: "02352234567890",
      tin: "2234567890",
      addressLine1: "Al Reem Island",
      emirate: "Abu Dhabi",
      countryCode: "AE",
    },
    lines: [
      {
        id: "1",
        description: "Bookkeeping services",
        quantity: "1",
        unitPrice: "1000",
        taxableAmount: "1000",
        taxAmount: "50",
        lineTotal: "1050",
      },
    ],
    subtotal: "1000",
    taxTotal: "50",
    total: "1050",
  };
}
