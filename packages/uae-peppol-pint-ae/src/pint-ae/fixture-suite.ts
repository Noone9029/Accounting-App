import {
  UAE_ELECTRONIC_ADDRESS_SCHEME_ID,
  UAE_PINT_AE_CUSTOMIZATION_ID,
  UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES,
  UAE_PINT_AE_PROFILE_ID,
} from "./constants";
import {
  buyerNotSubjectUaePintAeInvoiceFixture,
  commercialUaePintAeInvoiceFixture,
  creditNoteMissingOriginalReferenceUaePintAeFixture,
  creditNoteMissingReasonUaePintAeFixture,
  deemedSupplyUaePintAeInvoiceFixture,
  exportReceiverNotRegisteredUaePintAeInvoiceFixture,
  invalidTinTrnUaePintAeInvoiceFixture,
  missingBuyerEndpointUaePintAeInvoiceFixture,
  multiLineUaePintAeTaxInvoiceFixture,
  standardUaePintAeTaxCreditNoteFixture,
  standardUaePintAeTaxInvoiceFixture,
  unsupportedLegacyTransactionFlagUaePintAeFixture,
} from "./fixtures";
import { resolveUaePintAeDocumentType, validateUaePintAeDocument } from "./rules";
import { serializeUaePintAeDocument } from "./serializer";
import type {
  UaePintAeFixtureDefinition,
  UaePintAeFixtureQaSummary,
  UaePintAeFixtureValidationResult,
  UaePintAeFixtureXmlMetadata,
  UaePintAeRuleResult,
} from "./types";

const UAE_PINT_AE_PACKAGE_VERSION = "0.1.0";

export function uaePintAeScenarioFixtureDefinitions(): UaePintAeFixtureDefinition[] {
  return [
    {
      name: "standard UAE tax invoice",
      scenario: "standard-tax-invoice",
      expectedOutcome: "pass",
      input: standardUaePintAeTaxInvoiceFixture(),
      expectedTransactionTypeFlagCode: "00000000",
    },
    {
      name: "commercial invoice type code 380",
      scenario: "commercial-invoice-380",
      expectedOutcome: "pass",
      input: commercialUaePintAeInvoiceFixture(),
      expectedTransactionTypeFlagCode: "00000000",
    },
    {
      name: "tax credit note with original invoice reference and reason",
      scenario: "tax-credit-note-reference-reason",
      expectedOutcome: "pass",
      input: standardUaePintAeTaxCreditNoteFixture(),
      expectedTransactionTypeFlagCode: "00000000",
    },
    {
      name: "export receiver not registered in Peppol",
      scenario: "export-receiver-not-registered",
      expectedOutcome: "pass",
      input: exportReceiverNotRegisteredUaePintAeInvoiceFixture(),
      expectedEndpointValue: UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES["export-receiver-not-registered"],
      expectedTransactionTypeFlagCode: "00000001",
    },
    {
      name: "deemed supply predefined endpoint",
      scenario: "deemed-supply",
      expectedOutcome: "pass",
      input: deemedSupplyUaePintAeInvoiceFixture(),
      expectedEndpointValue: UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES["deemed-supply"],
      expectedTransactionTypeFlagCode: "01000000",
    },
    {
      name: "buyer not subject to UAE eInvoicing regulations",
      scenario: "buyer-not-subject",
      expectedOutcome: "pass",
      input: buyerNotSubjectUaePintAeInvoiceFixture(),
      expectedEndpointValue: UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES["buyer-not-subject"],
      expectedTransactionTypeFlagCode: "00000000",
    },
    {
      name: "multi-line invoice with mixed line values",
      scenario: "multi-line-mixed-values",
      expectedOutcome: "pass",
      input: multiLineUaePintAeTaxInvoiceFixture(),
      expectedTransactionTypeFlagCode: "00000000",
    },
    {
      name: "missing buyer endpoint",
      scenario: "missing-buyer-endpoint",
      expectedOutcome: "fail",
      input: missingBuyerEndpointUaePintAeInvoiceFixture(),
      expectedErrorCodes: ["BUYER_ENDPOINT_REQUIRED"],
    },
    {
      name: "invalid TIN/TRN",
      scenario: "invalid-tin-trn",
      expectedOutcome: "fail",
      input: invalidTinTrnUaePintAeInvoiceFixture(),
      expectedErrorCodes: ["SELLER_TIN_INVALID", "SELLER_TRN_INVALID"],
    },
    {
      name: "credit note missing reason",
      scenario: "credit-note-missing-reason",
      expectedOutcome: "fail",
      input: creditNoteMissingReasonUaePintAeFixture(),
      expectedErrorCodes: ["CREDIT_NOTE_REASON_REQUIRED"],
    },
    {
      name: "credit note missing original reference",
      scenario: "credit-note-missing-original-reference",
      expectedOutcome: "fail",
      input: creditNoteMissingOriginalReferenceUaePintAeFixture(),
      expectedErrorCodes: ["CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED"],
    },
    {
      name: "unsupported legacy transaction flag",
      scenario: "unsupported-legacy-transaction-flag",
      expectedOutcome: "fail",
      input: unsupportedLegacyTransactionFlagUaePintAeFixture(),
      expectedErrorCodes: ["TRANSACTION_TYPE_FLAG_OFFICIAL_MAPPING_REQUIRED"],
    },
    {
      name: "reverse charge invoice",
      scenario: "reverse-charge-invoice",
      expectedOutcome: "blocked",
      knownGap: "No source-backed UAE PINT-AE reverse-charge transaction flag mapping is implemented in this package.",
      blockedReason: "official-doc-required",
    },
    {
      name: "discount/allowance invoice",
      scenario: "discount-allowance-invoice",
      expectedOutcome: "blocked",
      knownGap: "The current local invoice model has no allowance/charge representation, so no fixture is generated.",
      blockedReason: "model-gap",
    },
    {
      name: "provider-specific payload contract",
      scenario: "provider-specific-payload-contract",
      expectedOutcome: "blocked",
      knownGap: "Provider-specific request/response payloads require real ASP sandbox documentation and non-confidential evidence.",
      providerBlocked: true,
      blockedReason: "provider-evidence-required",
    },
  ];
}

export function validateUaePintAeFixture(definition: UaePintAeFixtureDefinition): UaePintAeFixtureValidationResult {
  if (definition.expectedOutcome === "blocked" || !definition.input) {
    return {
      fixtureName: definition.name,
      documentType: "not-represented",
      scenario: definition.scenario,
      expectedOutcome: definition.expectedOutcome,
      actualOutcome: "blocked",
      passed: definition.expectedOutcome === "blocked",
      errors: [],
      warnings: [definition.knownGap ?? definition.blockedReason ?? "Scenario is blocked."],
      generatedXmlMetadata: emptyXmlMetadata(),
    };
  }

  const validation = validateUaePintAeDocument(definition.input);
  const serialization = serializeUaePintAeDocument(definition.input);
  const actualOutcome = serialization.ok ? "pass" : "fail";
  const metadata = inspectFixtureXml(serialization.xml, definition);
  const errors = validation.issues.filter((issue) => issue.severity === "error");
  const warnings = validation.issues.filter((issue) => issue.severity !== "error").map((issue) => issue.message);
  const passed = didFixturePass(definition, actualOutcome, errors, metadata);

  return {
    fixtureName: definition.name,
    documentType: resolveUaePintAeDocumentType(definition.input),
    scenario: definition.scenario,
    expectedOutcome: definition.expectedOutcome,
    actualOutcome,
    passed,
    errors,
    warnings,
    generatedXmlMetadata: metadata,
  };
}

export function runUaePintAeFixtureSuite(definitions = uaePintAeScenarioFixtureDefinitions()): UaePintAeFixtureValidationResult[] {
  return definitions.map((definition) => validateUaePintAeFixture(definition));
}

export function summarizeUaePintAeFixtureResults(
  results = runUaePintAeFixtureSuite(),
  definitions = uaePintAeScenarioFixtureDefinitions(),
  timestamp = new Date().toISOString(),
): UaePintAeFixtureQaSummary {
  const blockedDefinitions = definitions.filter((definition) => definition.expectedOutcome === "blocked");
  return {
    summaryType: "local QA summary",
    certificationClaim: false,
    legalComplianceEvidence: false,
    totalFixtures: results.length,
    passedFixtures: results.filter((result) => result.passed).length,
    failedFixtures: results.filter((result) => !result.passed).length,
    blockedFixtures: results.filter((result) => result.actualOutcome === "blocked").length,
    scenariosCovered: results.filter((result) => result.actualOutcome !== "blocked").map((result) => result.scenario),
    scenariosNotCovered: blockedDefinitions.map((definition) => definition.scenario),
    knownGaps: blockedDefinitions.map((definition) => definition.knownGap ?? definition.name),
    providerBlockedItems: blockedDefinitions.filter((definition) => definition.providerBlocked === true).map((definition) => definition.scenario),
    timestamp,
    packageVersion: UAE_PINT_AE_PACKAGE_VERSION,
  };
}

function didFixturePass(
  definition: UaePintAeFixtureDefinition,
  actualOutcome: UaePintAeFixtureValidationResult["actualOutcome"],
  errors: UaePintAeRuleResult[],
  metadata: UaePintAeFixtureXmlMetadata,
): boolean {
  if (definition.expectedOutcome !== actualOutcome) {
    return false;
  }
  if (definition.expectedOutcome === "fail") {
    const errorCodes = new Set(errors.map((error) => error.code));
    return (definition.expectedErrorCodes ?? []).every((code) => errorCodes.has(code));
  }
  if (definition.expectedOutcome === "pass") {
    return (
      metadata.customizationIdPresent &&
      metadata.profileIdPresent &&
      metadata.profileExecutionIdPresent &&
      metadata.endpointScheme0235Present &&
      metadata.predefinedEndpointValuePresent &&
      metadata.expectedTransactionFlagPresent
    );
  }
  return true;
}

function inspectFixtureXml(xml: string, definition: UaePintAeFixtureDefinition): UaePintAeFixtureXmlMetadata {
  const expectedEndpointValue = definition.expectedEndpointValue;
  const expectedFlag = definition.expectedTransactionTypeFlagCode;
  return {
    customizationIdPresent: xml.includes(`<cbc:CustomizationID>${UAE_PINT_AE_CUSTOMIZATION_ID}</cbc:CustomizationID>`),
    profileIdPresent: xml.includes(`<cbc:ProfileID>${UAE_PINT_AE_PROFILE_ID}</cbc:ProfileID>`),
    profileExecutionIdPresent: /<cbc:ProfileExecutionID>[01]{8}<\/cbc:ProfileExecutionID>/.test(xml),
    endpointScheme0235Present: xml.includes(`schemeID="${UAE_ELECTRONIC_ADDRESS_SCHEME_ID}"`),
    predefinedEndpointValuePresent: expectedEndpointValue ? xml.includes(`>${expectedEndpointValue}</cbc:EndpointID>`) : true,
    expectedTransactionFlagPresent: expectedFlag ? xml.includes(`<cbc:ProfileExecutionID>${expectedFlag}</cbc:ProfileExecutionID>`) : true,
  };
}

function emptyXmlMetadata(): UaePintAeFixtureXmlMetadata {
  return {
    customizationIdPresent: false,
    profileIdPresent: false,
    profileExecutionIdPresent: false,
    endpointScheme0235Present: false,
    predefinedEndpointValuePresent: false,
    expectedTransactionFlagPresent: false,
  };
}
