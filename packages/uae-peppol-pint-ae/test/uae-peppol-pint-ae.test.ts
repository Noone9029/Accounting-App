import assert from "node:assert/strict";
import test from "node:test";
import {
  ASP_PROVIDER_STATUSES,
  DISABLED_PROVIDER_EMITTED_STATUSES,
  DisabledAspProviderAdapter,
  MockAspProviderAdapter,
  UAE_ELECTRONIC_ADDRESS_SCHEME_ID,
  UAE_PINT_AE_CUSTOMIZATION_ID,
  UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES,
  UAE_PINT_AE_PROFILE_ID,
  UAE_PINT_AE_READINESS_CUSTOMIZATION_ID,
  UAE_PINT_AE_TRANSACTION_TYPE_FLAG_VALUES,
  buildUaeDocumentReadinessReport,
  buildUaePintAeTransactionTypeFlagCode,
  buildUaePartyReadinessReport,
  buildUaePintXml,
  buildUaeReadinessReport,
  createAspProviderAdapter,
  deriveUaePeppolParticipantId,
  documentLevelAllowanceUaePintAeInvoiceFixture,
  lineLevelAllowanceUaePintAeInvoiceFixture,
  redactAspProviderConfig,
  runUaePintAeFixtureSuite,
  serializeUaePintAeCreditNote,
  serializeUaePintAeInvoice,
  standardUaePintAeTaxCreditNoteFixture,
  standardUaePintAeTaxInvoiceFixture,
  summarizeUaePintAeFixtureResults,
  uaePintAeScenarioFixtureDefinitions,
  validateUaePintAeDocument,
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

test("generates official local PINT-AE XML for a UAE tax invoice", () => {
  const result = serializeUaePintAeInvoice(standardUaePintAeTaxInvoiceFixture());

  assert.equal(result.ok, true);
  assert.equal(result.validation.valid, true);
  assert.equal(result.metadata.localOnly, true);
  assert.equal(result.metadata.noAspValidation, true);
  assert.match(result.xml, /<Invoice /);
  assert.match(result.xml, new RegExp(`<cbc:CustomizationID>${escapeRegExp(UAE_PINT_AE_CUSTOMIZATION_ID)}<\\/cbc:CustomizationID>`));
  assert.match(result.xml, new RegExp(`<cbc:ProfileID>${escapeRegExp(UAE_PINT_AE_PROFILE_ID)}<\\/cbc:ProfileID>`));
  assert.match(result.xml, new RegExp(`<cbc:EndpointID schemeID="${UAE_ELECTRONIC_ADDRESS_SCHEME_ID}">02351234567890<\\/cbc:EndpointID>`));
  assert.match(result.xml, /<cbc:InvoiceTypeCode>380<\/cbc:InvoiceTypeCode>/);
  assert.match(result.xml, /<cbc:ProfileExecutionID>00000000<\/cbc:ProfileExecutionID>/);
  assert.match(result.xml, /<cbc:InvoicedQuantity unitCode="EA">1.00<\/cbc:InvoicedQuantity>/);
  assert.equal(result.xml.includes(UAE_PINT_AE_READINESS_CUSTOMIZATION_ID), false);
});

test("generates official local PINT-AE XML for a tax credit note with reason and original reference", () => {
  const result = serializeUaePintAeCreditNote(standardUaePintAeTaxCreditNoteFixture());

  assert.equal(result.ok, true);
  assert.equal(result.validation.valid, true);
  assert.match(result.xml, /<CreditNote /);
  assert.match(result.xml, /<cbc:CreditNoteTypeCode>381<\/cbc:CreditNoteTypeCode>/);
  assert.match(result.xml, /<cbc:ID>INV-0001<\/cbc:ID>/);
  assert.match(result.xml, /<cbc:Note>Billing adjustment<\/cbc:Note>/);
  assert.match(result.xml, /<cbc:CreditedQuantity unitCode="EA">1.00<\/cbc:CreditedQuantity>/);
  assert.equal(result.xml.includes(UAE_PINT_AE_READINESS_CUSTOMIZATION_ID), false);
});

test("returns structured official serializer errors for missing buyer endpoint and invalid TIN", () => {
  const validation = validateUaePintAeDocument({
    ...standardUaePintAeTaxInvoiceFixture(),
    buyer: { ...standardUaePintAeTaxInvoiceFixture().buyer, peppolParticipantId: "", tin: "bad" },
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.issues.some((issue) => issue.code === "BUYER_ENDPOINT_REQUIRED" && issue.fieldPath === "buyer.endpointId" && issue.source === "local-rule"), true);
  assert.equal(validation.issues.some((issue) => issue.code === "BUYER_TIN_INVALID" && issue.fieldPath === "buyer.tin"), true);
});

test("blocks official invoice XML for missing seller address and negative invoice values", () => {
  const result = serializeUaePintAeInvoice({
    ...standardUaePintAeTaxInvoiceFixture(),
    supplier: { ...standardUaePintAeTaxInvoiceFixture().supplier, addressLine1: "" },
    total: "-1050",
  });

  assert.equal(result.ok, false);
  assert.equal(result.xml, "");
  assert.equal(result.validation.issues.some((issue) => issue.code === "SELLER_ADDRESS_REQUIRED"), true);
  assert.equal(result.validation.issues.some((issue) => issue.code === "NEGATIVE_INVOICE_TOTAL_BLOCKED"), true);
});

test("blocks official credit note XML when reason or original reference is missing", () => {
  const result = serializeUaePintAeCreditNote({
    ...standardUaePintAeTaxCreditNoteFixture(),
    creditNoteReason: "",
    originalInvoiceNumber: "",
  });

  assert.equal(result.ok, false);
  assert.equal(result.xml, "");
  assert.equal(result.validation.issues.some((issue) => issue.code === "CREDIT_NOTE_REASON_REQUIRED"), true);
  assert.equal(result.validation.issues.some((issue) => issue.code === "CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED"), true);
});

test("maps source-backed commercial invoice type code", () => {
  const result = serializeUaePintAeInvoice({
    ...standardUaePintAeTaxInvoiceFixture(),
    documentType: "commercial-invoice",
    invoiceTypeCode: "",
    taxTotal: "0",
    total: "1000",
  });

  assert.equal(result.ok, true);
  assert.equal(result.validation.valid, true);
  assert.match(result.xml, /<cbc:InvoiceTypeCode>380<\/cbc:InvoiceTypeCode>/);
});

test("maps source-backed predefined endpoint scenarios", () => {
  const scenarioExpectations = [
    ["deemed-supply", "deemed-supply", "01000000"],
    ["export-receiver-not-registered", "exports", "00000001"],
    ["buyer-not-subject", undefined, "00000000"],
  ] as const;

  for (const [scenario, flag, expectedFlagCode] of scenarioExpectations) {
    const result = serializeUaePintAeInvoice({
      ...standardUaePintAeTaxInvoiceFixture(),
      buyer: {
        ...standardUaePintAeTaxInvoiceFixture().buyer,
        endpointId: "",
        peppolParticipantId: "",
        tin: null,
        trn: null,
      },
      predefinedEndpointScenario: scenario,
      transactionTypeFlags: flag ? [flag] : [],
    });

    assert.equal(result.ok, true);
    assert.equal(result.validation.valid, true);
    assert.match(result.xml, new RegExp(`<cbc:EndpointID schemeID="${UAE_ELECTRONIC_ADDRESS_SCHEME_ID}">${UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES[scenario]}<\\/cbc:EndpointID>`));
    assert.match(result.xml, new RegExp(`<cbc:ProfileExecutionID>${expectedFlagCode}<\\/cbc:ProfileExecutionID>`));
  }
});

test("serializes source-backed document-level and line-level allowances", () => {
  const documentAllowance = serializeUaePintAeInvoice(documentLevelAllowanceUaePintAeInvoiceFixture());
  const lineAllowance = serializeUaePintAeInvoice(lineLevelAllowanceUaePintAeInvoiceFixture());

  assert.equal(documentAllowance.ok, true);
  assert.equal(documentAllowance.validation.valid, true);
  assert.match(documentAllowance.xml, /<cbc:ChargeIndicator>false<\/cbc:ChargeIndicator>/);
  assert.match(documentAllowance.xml, /<cbc:AllowanceChargeReason>Customer discount<\/cbc:AllowanceChargeReason>/);
  assert.match(documentAllowance.xml, /<cbc:AllowanceTotalAmount currencyID="AED">100.00<\/cbc:AllowanceTotalAmount>/);
  assert.match(documentAllowance.xml, /<cbc:LineExtensionAmount currencyID="AED">1000.00<\/cbc:LineExtensionAmount>/);
  assert.match(documentAllowance.xml, /<cbc:TaxExclusiveAmount currencyID="AED">900.00<\/cbc:TaxExclusiveAmount>/);
  assert.match(documentAllowance.xml, /<cbc:PayableAmount currencyID="AED">945.00<\/cbc:PayableAmount>/);
  assert.match(documentAllowance.xml, /<cac:TaxCategory>\s*<cbc:ID>S<\/cbc:ID>\s*<cbc:Percent>5<\/cbc:Percent>/);

  assert.equal(lineAllowance.ok, true);
  assert.equal(lineAllowance.validation.valid, true);
  assert.match(lineAllowance.xml, /<cbc:AllowanceChargeReason>Line discount<\/cbc:AllowanceChargeReason>/);
  assert.match(lineAllowance.xml, /<cbc:LineExtensionAmount currencyID="AED">900.00<\/cbc:LineExtensionAmount>/);
  assert.equal(lineAllowance.xml.includes("<cbc:AllowanceTotalAmount"), false);
});

test("blocks unsafe allowance values and unsupported reason codes", () => {
  const negative = serializeUaePintAeInvoice({
    ...documentLevelAllowanceUaePintAeInvoiceFixture(),
    allowances: [{ amount: "-1", reason: "Bad discount", baseAmount: "1000", taxCategory: "S", taxRate: "5" }],
  });
  const unsupportedCode = serializeUaePintAeInvoice({
    ...documentLevelAllowanceUaePintAeInvoiceFixture(),
    allowances: [{ amount: "100", reasonCode: "95", baseAmount: "1000", taxCategory: "S", taxRate: "5" }],
  });

  assert.equal(negative.ok, false);
  assert.equal(negative.validation.issues.some((issue) => issue.code === "ALLOWANCE_AMOUNT_NEGATIVE" && issue.source === "local-rule"), true);
  assert.equal(unsupportedCode.ok, false);
  assert.equal(unsupportedCode.validation.issues.some((issue) => issue.code === "ALLOWANCE_REASON_CODE_OFFICIAL_MAPPING_REQUIRED" && issue.source === "official-doc-required"), true);
});

test("keeps reverse-charge blocked until official mapping is implemented", () => {
  const result = serializeUaePintAeInvoice({
    ...standardUaePintAeTaxInvoiceFixture(),
    reverseCharge: true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.xml, "");
  assert.equal(result.metadata.unknownOfficialMappings.includes("REVERSE_CHARGE_TRANSACTION_FLAG_OFFICIAL_MAPPING_REQUIRED"), true);
  assert.equal(result.validation.issues.some((issue) => issue.code === "REVERSE_CHARGE_TRANSACTION_FLAG_OFFICIAL_MAPPING_REQUIRED" && issue.source === "official-doc-required"), true);
});

test("builds source-backed transaction type flags", () => {
  assert.equal(UAE_PINT_AE_TRANSACTION_TYPE_FLAG_VALUES["free-trade-zone"], "10000000");
  assert.equal(UAE_PINT_AE_TRANSACTION_TYPE_FLAG_VALUES.exports, "00000001");
  assert.equal(buildUaePintAeTransactionTypeFlagCode(["summary-invoice", "exports"]), "00010001");
  assert.equal(buildUaePintAeTransactionTypeFlagCode(["free-trade-zone", "deemed-supply", "continuous-supply"]), "11001000");
});

test("does not silently guess unmapped transaction type flags", () => {
  const result = serializeUaePintAeInvoice({
    ...standardUaePintAeTaxInvoiceFixture(),
    transactionTypeFlags: ["unknown"],
  });

  assert.equal(result.ok, false);
  assert.equal(result.validation.issues.some((issue) => issue.code === "TRANSACTION_TYPE_FLAG_OFFICIAL_MAPPING_REQUIRED" && issue.source === "official-doc-required"), true);
});

test("blocks invalid explicit transaction type flag codes", () => {
  const result = serializeUaePintAeInvoice({
    ...standardUaePintAeTaxInvoiceFixture(),
    transactionTypeFlagCode: "not-official",
  });

  assert.equal(result.ok, false);
  assert.equal(result.validation.issues.some((issue) => issue.code === "TRANSACTION_TYPE_FLAG_CODE_INVALID" && issue.source === "local-rule"), true);
});

test("runs UAE PINT-AE scenario fixture validation suite", () => {
  const definitions = uaePintAeScenarioFixtureDefinitions();
  const results = runUaePintAeFixtureSuite(definitions);
  const summary = summarizeUaePintAeFixtureResults(results, definitions, "2026-06-16T00:00:00.000Z");

  assert.equal(results.every((result) => result.passed), true);
  assert.equal(summary.summaryType, "local QA summary");
  assert.equal(summary.certificationClaim, false);
  assert.equal(summary.legalComplianceEvidence, false);
  assert.equal(summary.totalFixtures, definitions.length);
  assert.equal(summary.failedFixtures, 0);
  assert.equal(summary.blockedFixtures, 1);
  assert.equal(summary.packageVersion, "0.1.0");
  assert.deepEqual(summary.scenariosNotCovered.sort(), ["provider-specific-payload-contract"].sort());

  const positiveResults = results.filter((result) => result.expectedOutcome === "pass");
  assert.equal(positiveResults.length, 9);
  for (const result of positiveResults) {
    assert.equal(result.actualOutcome, "pass");
    assert.equal(result.generatedXmlMetadata.customizationIdPresent, true);
    assert.equal(result.generatedXmlMetadata.profileIdPresent, true);
    assert.equal(result.generatedXmlMetadata.profileExecutionIdPresent, true);
    assert.equal(result.generatedXmlMetadata.endpointScheme0235Present, true);
  }

  assertFixturePassed(results, "commercial-invoice-380");
  assertFixturePassed(results, "export-receiver-not-registered");
  assertFixturePassed(results, "deemed-supply");
  assertFixturePassed(results, "buyer-not-subject");
  assertFixturePassed(results, "multi-line-mixed-values");
  assertFixturePassed(results, "document-level-discount-allowance-invoice");
  assertFixturePassed(results, "line-level-discount-allowance-invoice");
  assertFixtureFailedWith(results, "missing-buyer-endpoint", "BUYER_ENDPOINT_REQUIRED");
  assertFixtureFailedWith(results, "invalid-tin-trn", "SELLER_TIN_INVALID");
  assertFixtureFailedWith(results, "invalid-tin-trn", "SELLER_TRN_INVALID");
  assertFixtureFailedWith(results, "credit-note-missing-reason", "CREDIT_NOTE_REASON_REQUIRED");
  assertFixtureFailedWith(results, "credit-note-missing-original-reference", "CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED");
  assertFixtureFailedWith(results, "unsupported-legacy-transaction-flag", "TRANSACTION_TYPE_FLAG_OFFICIAL_MAPPING_REQUIRED");
  assertFixtureFailedWith(results, "allowance-exceeds-subtotal", "DOCUMENT_ALLOWANCE_EXCEEDS_SUBTOTAL");
  assertFixtureFailedWith(results, "negative-allowance", "ALLOWANCE_AMOUNT_NEGATIVE");
  assertFixtureFailedWith(results, "missing-allowance-reason", "ALLOWANCE_REASON_REQUIRED");
  assertFixtureFailedWith(results, "unsupported-allowance-reason-code", "ALLOWANCE_REASON_CODE_OFFICIAL_MAPPING_REQUIRED");
  assertFixtureFailedWith(results, "reverse-charge-blocked-official-mapping", "REVERSE_CHARGE_TRANSACTION_FLAG_OFFICIAL_MAPPING_REQUIRED");
  assert.equal(summary.providerBlockedItems.includes("provider-specific-payload-contract"), true);
  assert.equal(summary.blockedScenarios.some((item) => item.scenario === "reverse-charge-blocked-official-mapping" && item.source === "official-doc-required"), true);
  assert.equal(summary.blockedScenarios.some((item) => item.scenario === "provider-specific-payload-contract" && item.source === "provider-required-later"), true);
  assert.match(summary.knownGaps.join(" "), /Reverse-charge invoice XML remains blocked/);
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
  assert.deepEqual(future.listCapabilities(), []);

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertFixturePassed(results: ReturnType<typeof runUaePintAeFixtureSuite>, scenario: string): void {
  const result = results.find((item) => item.scenario === scenario);
  assert.ok(result, `${scenario} fixture result should exist`);
  assert.equal(result.passed, true);
  assert.equal(result.actualOutcome, "pass");
}

function assertFixtureFailedWith(results: ReturnType<typeof runUaePintAeFixtureSuite>, scenario: string, code: string): void {
  const result = results.find((item) => item.scenario === scenario);
  assert.ok(result, `${scenario} fixture result should exist`);
  assert.equal(result.passed, true);
  assert.equal(result.actualOutcome, "fail");
  assert.equal(result.errors.some((error) => error.code === code), true);
}
