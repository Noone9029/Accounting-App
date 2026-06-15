import assert from "node:assert/strict";
import test from "node:test";
import {
  ASP_PROVIDER_STATUSES,
  DISABLED_PROVIDER_EMITTED_STATUSES,
  DisabledAspProviderAdapter,
  MockAspProviderAdapter,
  buildUaeDocumentReadinessReport,
  buildUaePartyReadinessReport,
  buildUaePintXml,
  buildUaeReadinessReport,
  createAspProviderAdapter,
  deriveUaePeppolParticipantId,
  redactAspProviderConfig,
  validateUaePintInput,
} from "../src";

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

test("calculates invoice readiness and blocks local XML generation when endpoints are missing", () => {
  const report = buildUaeDocumentReadinessReport({
    ...invoiceFixture(),
    supplier: { ...invoiceFixture().supplier, peppolParticipantId: "" },
    buyer: { ...invoiceFixture().buyer, peppolParticipantId: "" },
  });

  assert.equal(report.status, "NEEDS_DATA");
  assert.equal(report.canAttemptLocalXmlGeneration, false);
  assert.match(report.peppolParticipant.checks.map((check) => check.detail).join(" "), /Seller Peppol participant ID is missing/i);
  assert.match(report.peppolParticipant.checks.map((check) => check.detail).join(" "), /Buyer Peppol participant ID is missing/i);
  assert.equal(report.validation.issues.some((issue) => issue.code === "SUPPLIER_ENDPOINT_REQUIRED"), true);
  assert.equal(report.validation.issues.some((issue) => issue.code === "BUYER_ENDPOINT_REQUIRED"), true);
});

test("flags invalid UAE tax identities and invalid participant identifiers", () => {
  const report = buildUaeDocumentReadinessReport({
    ...invoiceFixture(),
    supplier: { ...invoiceFixture().supplier, tin: "123", trn: "100", peppolParticipantId: "bad-id" },
  });

  assert.equal(report.canAttemptLocalXmlGeneration, false);
  assert.equal(report.validation.issues.some((issue) => issue.code === "SUPPLIER_TIN_INVALID"), true);
  assert.equal(report.validation.issues.some((issue) => issue.code === "SUPPLIER_TRN_INVALID"), true);
  assert.equal(report.validation.issues.some((issue) => issue.code === "SUPPLIER_ENDPOINT_INVALID"), true);
  assert.match(report.peppolParticipant.checks.map((check) => check.detail).join(" "), /must use scheme 0235/i);
});

test("calculates contact party readiness without blocking normal bookkeeping creation", () => {
  const report = buildUaePartyReadinessReport("Buyer", {
    legalName: "Buyer LLC",
    tin: "2234567890",
    trn: "200000000000003",
    addressLine1: "Al Reem Island",
    emirate: "Abu Dhabi",
    peppolParticipantId: "02352234567890",
    peppolEndpointStatus: "COLLECTED",
    preferredEinvoiceDeliveryMethod: "PEPPOL",
  });

  assert.equal(report.status, "READY_FOR_VALIDATION");
  assert.equal(report.checks.every((check) => check.status !== "FAIL"), true);
});

test("generates stable PINT-AE readiness XML for an invoice", () => {
  const result = buildUaePintXml(invoiceFixture());

  assert.equal(result.validation.valid, true);
  assert.match(result.xml, /<Invoice /);
  assert.match(result.xml, /<cbc:CustomizationID>urn:peppol:pint:ae:billing-1@ledgerbyte-readiness<\/cbc:CustomizationID>/);
  assert.match(result.xml, /<cbc:EndpointID schemeID="0235">02351234567890<\/cbc:EndpointID>/);
  assert.match(result.xml, /<cbc:PayableAmount currencyID="AED">1050.00<\/cbc:PayableAmount>/);
});

test("disabled ASP adapter blocks submission and never emits future delivery statuses", async () => {
  const adapter = new DisabledAspProviderAdapter();

  const validation = await adapter.validateDocument({ tenantId: "org-1", documentId: "doc-1" });
  const submission = await adapter.submitDocument({ tenantId: "org-1", documentId: "doc-1" });
  const status = await adapter.getDocumentStatus({ tenantId: "org-1", documentId: "doc-1" });

  assert.equal(validation.ok, false);
  assert.equal(validation.noNetwork, true);
  assert.equal(submission.ok, false);
  assert.equal(submission.externalReference, null);
  assert.equal(status.timeline.some((item) => item.status === "REPORTED_TO_FTA" || item.status === "DELIVERED_TO_BUYER" || item.status === "SENT_TO_ASP"), false);
  assert.equal(DISABLED_PROVIDER_EMITTED_STATUSES.includes("REPORTED_TO_FTA"), false);
});

test("disabled and mock adapters do not perform network calls", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = (() => {
    fetchCount += 1;
    throw new Error("network should not be called");
  }) as typeof fetch;
  try {
    await new DisabledAspProviderAdapter().healthCheck();
    await new MockAspProviderAdapter().submitDocument({ tenantId: "org-1", documentId: "doc-1", explicitMockMode: true });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(fetchCount, 0);
});

test("mock ASP adapter is deterministic and marks responses as test-only", async () => {
  const adapter = new MockAspProviderAdapter();

  const first = await adapter.submitDocument({ tenantId: "org-1", documentId: "doc-1", explicitMockMode: true, scenario: "SUBMISSION_ACCEPTED" });
  const second = await adapter.submitDocument({ tenantId: "org-1", documentId: "doc-1", explicitMockMode: true, scenario: "SUBMISSION_ACCEPTED" });
  const rejected = await adapter.submitDocument({ tenantId: "org-1", documentId: "doc-1", explicitMockMode: true, scenario: "SUBMISSION_REJECTED" });

  assert.equal(first.externalReference, second.externalReference);
  assert.equal(first.mockOnly, true);
  assert.equal(first.productionCompliance, false);
  assert.equal(first.status, "ASP_ACCEPTED");
  assert.equal(rejected.status, "ASP_REJECTED");
  assert.match(first.message, /local contract testing only/i);
});

test("provider factory falls back safely and blocks future providers and external URLs", async () => {
  assert.equal(createAspProviderAdapter().providerKey, "DISABLED");
  assert.equal(createAspProviderAdapter({ providerKey: "MOCK", mode: "MOCK", mockModeEnabled: false }).providerKey, "DISABLED");
  assert.equal(createAspProviderAdapter({ providerKey: "MOCK", mode: "MOCK", mockModeEnabled: true }).providerKey, "MOCK");

  const future = createAspProviderAdapter({ providerKey: "FUTURE_CLEARTAX", mode: "FUTURE" });
  const futureResult = await future.submitDocument({ tenantId: "org-1", documentId: "doc-1" });
  assert.equal(futureResult.ok, false);
  assert.equal(futureResult.issues.includes("ASP_PROVIDER_NOT_IMPLEMENTED"), true);

  assert.throws(() => createAspProviderAdapter({ providerKey: "FUTURE_GENERIC_ASP", mode: "FUTURE", endpointUrl: "https://provider.example.test" }), /External ASP provider URLs are disabled/);
});

test("provider config redaction hides secrets and exposes capability/status constants", () => {
  const redacted = redactAspProviderConfig({
    providerKey: "MOCK",
    mode: "MOCK",
    mockModeEnabled: true,
    apiKey: "plain-api-key",
    secret: "plain-secret",
    webhookSecret: "plain-webhook-secret",
    metadata: { token: "plain-token", safeLabel: "Mock" },
  });

  assert.equal(redacted.apiKey, "[REDACTED]");
  assert.equal(redacted.secret, "[REDACTED]");
  assert.equal(redacted.webhookSecret, "[REDACTED]");
  assert.deepEqual(redacted.metadata, { token: "[REDACTED]", safeLabel: "Mock" });
  assert.equal(ASP_PROVIDER_STATUSES.includes("REPORTED_TO_FTA"), true);
  assert.equal(new MockAspProviderAdapter().listCapabilities().includes("MOCK_SUBMISSION"), true);
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
