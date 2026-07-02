import assert from "node:assert/strict";
import test from "node:test";
import {
  ASP_PROVIDER_STATUSES,
  ASP_PROVIDER_ERROR_CODES,
  DISABLED_PROVIDER_EMITTED_STATUSES,
  DisabledAspProviderAdapter,
  MockAspProviderAdapter,
  UAE_ASP_PROVIDER_CAPABILITY_FLAGS,
  UAE_ELECTRONIC_ADDRESS_SCHEME_ID,
  UAE_PINT_AE_CUSTOMIZATION_ID,
  UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES,
  UAE_PINT_AE_PROFILE_ID,
  UAE_PINT_AE_READINESS_CUSTOMIZATION_ID,
  UAE_PINT_AE_SERIALIZER_MODES,
  UAE_TRANSMISSION_STATUSES,
  assertUaeTransmissionStatusAllowedForProviderMode,
  buildOfficialPintAeDraftPayload,
  buildReadinessXml,
  UAE_PINT_AE_TRANSACTION_TYPE_FLAG_VALUES,
  buildUaeBusinessProcessMetadata,
  buildUaeDocumentReadinessReport,
  buildUaePintAeTransactionTypeFlagCode,
  buildAspIdempotencyKey,
  createAspSubmissionOutboxDraft,
  createInMemoryUaeWebhookReplayGuard,
  createInMemoryAspWebhookReplayGuard,
  createUaeTransmissionAttemptDraft,
  createUaeTransmissionDraft,
  createUaeTransmissionTimelineEvent,
  classifyUaePredefinedEndpointScenario,
  buildUaePartyReadinessReport,
  buildUaePintXml,
  buildUaeReadinessReport,
  createAspProviderAdapter,
  deriveUaeParticipantIdFromTin,
  deriveUaePeppolParticipantId,
  isOfficialUaeCustomizationId,
  isOfficialUaeProfileId,
  isProductionProviderSuccessStatus,
  isUaeMockTransmissionStatus,
  normalizeAspProviderError,
  normalizeUaeEndpointId,
  normalizeUaeProviderError,
  parseWebhookEvent,
  redactAspProviderConfig,
  runUaePintAeFixtureSuite,
  serializeUaePintAeCreditNote,
  serializeUaePintAeInvoice,
  signFakeWebhookPayload,
  signLocalAspWebhookPayload,
  standardUaePintAeTaxCreditNoteFixture,
  standardUaePintAeTaxInvoiceFixture,
  summarizeUaePintAeFixtureResults,
  uaePintAeScenarioFixtureDefinitions,
  validateCreditNoteReferenceRequirement,
  validateNoNegativeInvoice,
  validateUaeEndpointScheme,
  validateUaePintAeDocument,
  validateUaePintInput,
  verifyWebhookSignature,
  verifyLocalAspWebhookSignature,
  normalizeWebhookEvent,
} from "../src";

test("derives UAE Peppol participant ID from a 10-digit TIN", () => {
  assert.equal(deriveUaePeppolParticipantId("1234567890"), "02351234567890");
});

test("exposes official UAE PINT-AE identifiers and endpoint validation helpers without production claims", () => {
  assert.equal(isOfficialUaeCustomizationId(UAE_PINT_AE_CUSTOMIZATION_ID), true);
  assert.equal(isOfficialUaeCustomizationId(UAE_PINT_AE_READINESS_CUSTOMIZATION_ID), false);
  assert.equal(isOfficialUaeProfileId(UAE_PINT_AE_PROFILE_ID), true);
  assert.equal(normalizeUaeEndpointId(" 0235 1234567890 "), "02351234567890");
  assert.equal(deriveUaeParticipantIdFromTin("123-456-7890"), "02351234567890");

  assert.deepEqual(validateUaeEndpointScheme("02351234567890"), { valid: true, schemeId: "0235", normalizedEndpointId: "02351234567890", issues: [] });
  assert.equal(validateUaeEndpointScheme("9900000099").valid, false);
  assert.deepEqual(validateCreditNoteReferenceRequirement({ kind: "credit-note", creditNoteReason: "", originalInvoiceNumber: "" }).issues, [
    "CREDIT_NOTE_REASON_REQUIRED",
    "CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED",
  ]);
  assert.equal(validateNoNegativeInvoice({ kind: "invoice", total: "-1" }).valid, false);

  const metadata = buildUaeBusinessProcessMetadata({ predefinedEndpointScenario: "deemed-supply", transactionTypeFlags: ["deemed-supply"] });
  assert.equal(metadata.productionCompliance, false);
  assert.equal(metadata.endpoint.scenario, "deemed-supply");
  assert.equal(metadata.endpoint.value, UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES["deemed-supply"]);
  assert.equal(classifyUaePredefinedEndpointScenario("9900000099"), "export-receiver-not-registered");
});

test("keeps readiness XML and official draft payloads explicitly separated from provider submission", () => {
  const readiness = buildReadinessXml(invoiceFixture());
  const officialDraft = buildOfficialPintAeDraftPayload(standardUaePintAeTaxInvoiceFixture());

  assert.equal(UAE_PINT_AE_SERIALIZER_MODES.READINESS_ONLY, "READINESS_ONLY");
  assert.equal(readiness.mode, "READINESS_ONLY");
  assert.equal(readiness.productionCompliance, false);
  assert.equal(readiness.officialSerializerComplete, false);
  assert.equal(readiness.xml.includes(UAE_PINT_AE_READINESS_CUSTOMIZATION_ID), true);

  assert.equal(officialDraft.mode, "OFFICIAL_DRAFT_LOCAL_ONLY");
  assert.equal(officialDraft.submission.mode, "PROVIDER_SUBMISSION_BLOCKED");
  assert.equal(officialDraft.productionCompliance, false);
  assert.equal(officialDraft.networkReady, false);
  assert.equal(officialDraft.aspSubmissionReady, false);
  assert.equal(officialDraft.officialSerializerComplete, false);
  assert.equal(officialDraft.submission.canSubmit, false);
  assert.doesNotMatch(JSON.stringify(officialDraft), /certified|approved|production compliant/i);
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
  assert.equal(summary.blockedFixtures, 3);
  assert.equal(summary.packageVersion, "0.1.0");
  assert.deepEqual(
    summary.scenariosNotCovered.sort(),
    ["discount-allowance-invoice", "provider-specific-payload-contract", "reverse-charge-invoice"].sort(),
  );

  const positiveResults = results.filter((result) => result.expectedOutcome === "pass");
  assert.equal(positiveResults.length, 7);
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
  assertFixtureFailedWith(results, "missing-buyer-endpoint", "BUYER_ENDPOINT_REQUIRED");
  assertFixtureFailedWith(results, "invalid-tin-trn", "SELLER_TIN_INVALID");
  assertFixtureFailedWith(results, "invalid-tin-trn", "SELLER_TRN_INVALID");
  assertFixtureFailedWith(results, "credit-note-missing-reason", "CREDIT_NOTE_REASON_REQUIRED");
  assertFixtureFailedWith(results, "credit-note-missing-original-reference", "CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED");
  assertFixtureFailedWith(results, "unsupported-legacy-transaction-flag", "TRANSACTION_TYPE_FLAG_OFFICIAL_MAPPING_REQUIRED");
  assert.equal(summary.providerBlockedItems.includes("provider-specific-payload-contract"), true);
  assert.match(summary.knownGaps.join(" "), /No source-backed UAE PINT-AE reverse-charge transaction flag mapping/);
  assert.match(summary.knownGaps.join(" "), /no allowance\/charge representation/i);
});

test("disabled ASP adapter blocks submission and never emits future delivery statuses", async () => {
  const adapter = new DisabledAspProviderAdapter();

  const validation = await adapter.validateDocument({ tenantId: "org-1", documentId: "doc-1" });
  const submission = await adapter.submitDocument({ tenantId: "org-1", documentId: "doc-1" });
  const status = await adapter.getDocumentStatus({ tenantId: "org-1", documentId: "doc-1" });
  const prepared = await adapter.prepareSubmission({ tenantId: "org-1", documentId: "doc-1" });

  assert.equal(validation.ok, false);
  assert.equal(validation.noNetwork, true);
  assert.equal(submission.ok, false);
  assert.equal(submission.externalReference, null);
  assert.equal(prepared.status, "BLOCKED_NO_ASP");
  assert.equal(status.timeline.some((item) => item.status === "PROVIDER_ACCEPTED" || item.status === "FTA_REPORTED" || item.status === "INBOUND_RECEIVED"), false);
  assert.equal(DISABLED_PROVIDER_EMITTED_STATUSES.includes("FTA_REPORTED"), false);
  assert.equal(adapter.isNetworkEnabled(), false);
  assert.equal(adapter.getCapabilities().productionEnabled, false);
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
  assert.equal(first.status, "ACCEPTED_MOCK");
  assert.equal(rejected.status, "REJECTED_MOCK");
  assert.equal(isUaeMockTransmissionStatus(first.status), true);
  assert.equal(isProductionProviderSuccessStatus(first.status), false);
  assert.equal(adapter.getCapabilities().networkEnabled, false);
  assert.equal(adapter.getCapabilities().productionEnabled, false);
  assert.match(first.message, /local contract testing only/i);
});

test("provider capability objects and config validation stay disabled or mock-only", () => {
  const disabled = new DisabledAspProviderAdapter();
  const mock = new MockAspProviderAdapter();

  assert.equal(disabled.getProviderId(), "DISABLED");
  assert.equal(mock.getProviderId(), "MOCK");
  assert.equal(disabled.validateConfig({ endpointUrl: "https://provider.example.test" }).valid, false);
  assert.equal(mock.validateConfig({ providerKey: "MOCK", mode: "MOCK", mockModeEnabled: true }).valid, true);
  assert.deepEqual(UAE_ASP_PROVIDER_CAPABILITY_FLAGS.disabled, disabled.getCapabilities());
  assert.equal(UAE_ASP_PROVIDER_CAPABILITY_FLAGS.mock.productionEnabled, false);
  assert.equal(mock.redactConfig({ apiKey: "plain", secret: "plain", webhookSecret: "plain" }).apiKey, "[REDACTED]");
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
  assert.equal(ASP_PROVIDER_STATUSES.includes("FTA_REPORTED"), true);
  assert.equal(new MockAspProviderAdapter().listCapabilities().includes("MOCK_SUBMISSION"), true);
});

test("builds deterministic ASP idempotency keys without embedding document identifiers", () => {
  const first = buildAspIdempotencyKey({
    tenantId: "org-secret",
    providerKey: "MOCK",
    operation: "submit",
    documentId: "invoice-123",
    payloadFingerprint: "payload-v1",
  });
  const second = buildAspIdempotencyKey({
    tenantId: "org-secret",
    providerKey: "MOCK",
    operation: "submit",
    documentId: "invoice-123",
    payloadFingerprint: "payload-v1",
  });
  const differentOperation = buildAspIdempotencyKey({
    tenantId: "org-secret",
    providerKey: "MOCK",
    operation: "status",
    documentId: "invoice-123",
    payloadFingerprint: "payload-v1",
  });

  assert.equal(first, second);
  assert.notEqual(first, differentOperation);
  assert.match(first, /^aspidem_[a-f0-9]{48}$/);
  assert.equal(first.includes("org-secret"), false);
  assert.equal(first.includes("invoice-123"), false);
});

test("models UAE transmission drafts, attempts, and timeline events without production status leakage", () => {
  const draft = createUaeTransmissionDraft({
    tenantId: "org-secret",
    documentId: "invoice-123",
    providerKey: "MOCK",
    documentNumber: "INV-100",
    payloadFingerprint: "fingerprint",
  });
  const attempt = createUaeTransmissionAttemptDraft({ draft, attemptNumber: 1, status: "QUEUED_MOCK" });
  const event = createUaeTransmissionTimelineEvent({ status: "ACCEPTED_MOCK", providerKey: "MOCK", message: "Accepted by local mock." });

  assert.equal(draft.status, "DRAFT");
  assert.equal(draft.productionCompliance, false);
  assert.equal(draft.idempotencyKey.includes("org-secret"), false);
  assert.equal(draft.idempotencyKey.includes("invoice-123"), false);
  assert.equal(attempt.noNetwork, true);
  assert.equal(event.mockOnly, true);
  assert.equal(UAE_TRANSMISSION_STATUSES.includes("FTA_REPORTED"), true);
  assert.equal(assertUaeTransmissionStatusAllowedForProviderMode("DISABLED", "FTA_REPORTED").allowed, false);
  assert.equal(assertUaeTransmissionStatusAllowedForProviderMode("MOCK", "ACCEPTED_MOCK").allowed, true);
  assert.equal(assertUaeTransmissionStatusAllowedForProviderMode("MOCK", "PROVIDER_ACCEPTED").allowed, false);
});

test("creates submission outbox drafts as local-only non-compliance records", () => {
  const draft = createAspSubmissionOutboxDraft({
    tenantId: "org-1",
    providerKey: "MOCK",
    documentId: "doc-1",
    operation: "submit",
  });

  assert.equal(draft.status, "DRAFT_ONLY");
  assert.equal(draft.noNetwork, true);
  assert.equal(draft.productionCompliance, false);
  assert.match(draft.idempotencyKey, /^aspidem_/);
});

test("verifies local ASP webhook signatures with fake secrets and rejects mismatches", () => {
  const payload = { provider: "MOCK", eventId: "evt-1", status: "ACCEPTED_MOCK" };
  const signature = signLocalAspWebhookPayload(payload, "local-test-secret");

  assert.equal(verifyLocalAspWebhookSignature({ payload, signature, secret: "local-test-secret" }), true);
  assert.equal(verifyLocalAspWebhookSignature({ payload: { ...payload, status: "REJECTED_MOCK" }, signature, secret: "local-test-secret" }), false);
  assert.equal(verifyLocalAspWebhookSignature({ payload, signature, secret: "" }), false);
});

test("parses and normalizes fake webhook events with timestamped replay protection", () => {
  const payload = { provider: "MOCK", eventId: "evt-1", status: "ACCEPTED_MOCK", documentId: "doc-1", rawBody: "private-body", secret: "plain" };
  const timestamp = "2026-07-02T00:00:00.000Z";
  const signature = signFakeWebhookPayload({ payload, secret: "local-test-secret", timestamp });
  const parsed = parseWebhookEvent(payload);
  const normalized = normalizeWebhookEvent(parsed);
  const guard = createInMemoryUaeWebhookReplayGuard({ now: new Date("2026-07-02T00:01:00.000Z"), maxAgeSeconds: 300 });

  assert.equal(verifyWebhookSignature({ payload, signature, secret: "local-test-secret", timestamp }), true);
  assert.equal(parsed.eventId, "evt-1");
  assert.equal(normalized.rawBodyHash.length, 64);
  assert.equal(JSON.stringify(normalized).includes("private-body"), false);
  assert.equal(JSON.stringify(normalized).includes("plain"), false);
  assert.equal(guard.checkAndRemember({ eventId: "evt-1", timestamp, signatureHash: normalized.signatureHash }).reason, "RECORDED");
  assert.equal(guard.checkAndRemember({ eventId: "evt-1", timestamp, signatureHash: normalized.signatureHash }).reason, "DUPLICATE");
  assert.equal(guard.checkAndRemember({ eventId: "evt-2", timestamp: "2026-07-01T23:00:00.000Z", signatureHash: "abc" }).reason, "STALE_TIMESTAMP");
});

test("guards local webhook replay with an in-memory test double", () => {
  const guard = createInMemoryAspWebhookReplayGuard(["evt-existing"]);

  assert.deepEqual(guard.checkAndRemember(""), { accepted: false, eventId: "", reason: "MISSING_EVENT_ID" });
  assert.deepEqual(guard.checkAndRemember("evt-existing"), { accepted: false, eventId: "evt-existing", reason: "DUPLICATE" });
  assert.deepEqual(guard.checkAndRemember("evt-new"), { accepted: true, eventId: "evt-new", reason: "RECORDED" });
  assert.deepEqual(guard.checkAndRemember("evt-new"), { accepted: false, eventId: "evt-new", reason: "DUPLICATE" });
});

test("normalizes ASP provider errors without leaking secret details or claiming compliance", () => {
  const error = normalizeAspProviderError({
    providerKey: "MOCK",
    statusCode: 503,
    code: "UPSTREAM_TIMEOUT",
    message: "Provider unavailable",
    details: {
      token: "plain-token",
      requestId: "req-1",
    },
  });

  assert.equal(error.status, "RETRYABLE_ERROR");
  assert.equal(error.retryable, true);
  assert.equal(error.noNetwork, true);
  assert.equal(error.productionCompliance, false);
  assert.deepEqual(error.details, { token: "[REDACTED]", requestId: "req-1" });
});

test("normalizes typed UAE provider errors deterministically without raw request bodies", () => {
  assert.equal(ASP_PROVIDER_ERROR_CODES.includes("ASP_ACCESS_REQUIRED"), true);
  const validation = normalizeUaeProviderError({
    providerKey: "MOCK",
    statusCode: 422,
    code: "receiver_not_found",
    message: "Receiver not found",
    details: {
      rawRequestBody: "<Invoice>private</Invoice>",
      apiToken: "plain-token",
      requestId: "req-1",
    },
  });
  const unknown = normalizeUaeProviderError({ providerKey: "MOCK", statusCode: 418, message: "Unexpected provider body" });

  assert.equal(validation.code, "RECEIVER_NOT_FOUND");
  assert.equal(validation.retryable, false);
  assert.equal(validation.productionCompliance, false);
  assert.deepEqual(validation.details, { rawRequestBody: "[REDACTED]", apiToken: "[REDACTED]", requestId: "req-1" });
  assert.equal(unknown.code, "UNKNOWN_PROVIDER_ERROR");
  assert.doesNotMatch(unknown.userMessage, /certified|approved|compliant/i);
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
