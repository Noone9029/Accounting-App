"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const EVIDENCE_PATH = "docs/zatca/evidence/arc-07b/official-sandbox-contracts.json";
const MAX_METADATA_BYTES = 1024 * 1024;
const EXPECTED_REVIEWED_CONTRACT_SHA256 = "bf564b600700f783515b9e4af46a31f428e27a5e6b8bdae5cf07156ed77e6950";
const REQUIRED_SOURCES = Object.freeze([
  Object.freeze({ sourceId: "zatca-clearance-api", fileName: "clearance.pdf", evidenceClass: "AUTHENTICATED_SWAGGER_PDF_EXPORT" }),
  Object.freeze({ sourceId: "zatca-compliance-csid-api", fileName: "compliance_csid.pdf", evidenceClass: "AUTHENTICATED_SWAGGER_PDF_EXPORT" }),
  Object.freeze({ sourceId: "zatca-compliance-invoice-api", fileName: "compliance_invoice.pdf", evidenceClass: "AUTHENTICATED_SWAGGER_PDF_EXPORT" }),
  Object.freeze({ sourceId: "zatca-detailed-guideline", fileName: "E-Invoicing_Detailed__Guideline.pdf", evidenceClass: "OFFICIAL_ZATCA_PDF" }),
  Object.freeze({ sourceId: "zatca-detailed-technical-guidelines", fileName: "E-invoicing_Detailed_Technical_Guidelines.pdf", evidenceClass: "OFFICIAL_ZATCA_PDF" }),
  Object.freeze({ sourceId: "zatca-fatoora-portal-manual", fileName: "Fatoora_Portal_User_Manual_English.pdf", evidenceClass: "OFFICIAL_ZATCA_PDF" }),
  Object.freeze({ sourceId: "zatca-onboarding-api", fileName: "onboarding.pdf", evidenceClass: "AUTHENTICATED_SWAGGER_PDF_EXPORT" }),
  Object.freeze({ sourceId: "zatca-renewal-api", fileName: "renewal.pdf", evidenceClass: "AUTHENTICATED_SWAGGER_PDF_EXPORT" }),
  Object.freeze({ sourceId: "zatca-reporting-api", fileName: "reporting.pdf", evidenceClass: "AUTHENTICATED_SWAGGER_PDF_EXPORT" }),
  Object.freeze({ sourceId: "zatca-developer-portal-manual-v3", fileName: "User_Manual_Developer_Portal_Manual_Version_3.pdf", evidenceClass: "OFFICIAL_ZATCA_PDF" }),
]);
const REQUIRED_GROUPS = Object.freeze([
  "environments",
  "operations",
  "authentication",
  "headers",
  "requestFields",
  "responseFields",
  "statusCodes",
  "credentialProgression",
  "otp",
  "csr",
  "complianceMatrix",
  "retry",
  "duplicates",
  "unpublished",
  "localPolicy",
]);
const REQUIRED_LEAVES = Object.freeze({
  environments: ["simulation", "developerPortal", "production"],
  operations: ["complianceCsid", "complianceInvoice", "productionCsid", "clearance", "reporting", "renewal"],
  authentication: ["complianceBasic", "productionBasic"],
  headers: ["otp", "acceptVersion", "acceptLanguage", "clearanceStatus", "contentType", "authorization"],
  requestFields: ["complianceCsid", "complianceInvoice", "productionCsid", "clearanceReporting", "renewal"],
  responseFields: ["certificateIssue", "invoiceValidation"],
  statusCodes: ["complianceCsid", "complianceInvoice", "productionCsid", "clearance", "reporting", "renewal"],
  credentialProgression: ["sequence"],
  otp: ["format", "validity", "entryPolicy"],
  csr: ["requestField", "requirements"],
  complianceMatrix: ["requiredDocuments"],
  retry: ["automaticRetry", "ambiguousTransmission"],
  duplicates: ["clearance208", "reporting409", "clearance303"],
  unpublished: ["rateLimit", "retryAfter", "backoff"],
  localPolicy: ["targetAllowlist", "redirects", "responseHandling"],
});
const ALLOWED_STATES = new Set([
  "CONFIRMED_AUTHENTICATED_OFFICIAL",
  "BLOCKED_AUTHENTICATED_CONTRACT_EVIDENCE",
  "NOT_APPLICABLE",
]);
const CONFIRMED_STATE = "CONFIRMED_AUTHENTICATED_OFFICIAL";
const BLOCKED_STATE = "BLOCKED_AUTHENTICATED_CONTRACT_EVIDENCE";
const NOT_APPLICABLE_STATE = "NOT_APPLICABLE";
const SOURCE_FIELDS = [
  "sourceId",
  "title",
  "fileName",
  "retrievedOn",
  "portalSection",
  "version",
  "officialLocator",
  "byteLength",
  "sha256",
  "evidenceClass",
  "redistributionClassification",
];
const TOP_LEVEL_FIELDS = [
  "schemaVersion",
  "arc",
  "retrievedOn",
  "contractSha256",
  "sources",
  "contract",
  "nonNormativeNotes",
  "safety",
];
const SAFETY_FIELDS = [
  "networkCallsMade",
  "documentBodiesRetained",
  "secretBodiesRetained",
  "otpAvailable",
  "approvalPresent",
  "hostedResourcesTouched",
  "rawOutputRetained",
  "localPathsRetained",
];
const FORBIDDEN_METADATA_KEYS = new Set([
  "body",
  "bodies",
  "content",
  "contents",
  "requestbody",
  "responsebody",
  "rawbody",
  "rawoutput",
  "stdout",
  "stderr",
  "localpath",
  "localpaths",
  "absolutepath",
  "filepath",
  "directorypath",
  "evidencedirectory",
  "password",
  "passwordvalue",
  "secret",
  "secretvalue",
  "token",
  "tokenvalue",
  "authorizationvalue",
  "otpvalue",
  "privatekey",
  "certificatebody",
  "csrbody",
  "payload",
  "cookie",
  "cookies",
  "code",
  "proto",
  "prototype",
  "constructor",
  "signedxml",
  "qrpayload",
]);
const ALLOWED_SAFETY_KEYS = new Set(SAFETY_FIELDS.map(normalizeKey));
const CSR_SUBJECT_FIELDS = new Set([
  "csr.common.name",
  "csr.serial.number",
  "csr.organization.identifier",
  "csr.organization.unit.name",
  "csr.organization.name",
  "csr.country.name",
  "csr.invoice.type",
  "csr.location.address",
  "csr.industry.business.category",
]);
const REQUIRED_OPERATIONS = Object.freeze({
  complianceCsid: Object.freeze({ method: "POST", path: "/compliance" }),
  complianceInvoice: Object.freeze({ method: "POST", path: "/compliance/invoices" }),
  productionCsid: Object.freeze({ method: "POST", path: "/production/csids" }),
  clearance: Object.freeze({ method: "POST", path: "/invoices/clearance/single" }),
  reporting: Object.freeze({ method: "POST", path: "/invoices/reporting/single" }),
  renewal: Object.freeze({ method: "PATCH", path: "/production/csids" }),
});
const EXPECTED_STATUS_CODES = Object.freeze({
  complianceCsid: Object.freeze([200, 400, 406, 500]),
  complianceInvoice: Object.freeze([200, 400, 401, 406, 500]),
  productionCsid: Object.freeze([200, 400, 401, 406, 500]),
  clearance: Object.freeze([200, 202, 208, 303, 400, 401, 500]),
  reporting: Object.freeze([200, 202, 400, 401, 406, 409, 500]),
  renewal: Object.freeze([200, 400, 401, 406, 428, 500]),
});

function validateOfficialSandboxContracts(options = {}) {
  return validateOfficialSandboxContractsWithExpectedDigest(
    options,
    EXPECTED_REVIEWED_CONTRACT_SHA256,
  );
}

function __testOnlyValidateOfficialSandboxContractsFixture(options = {}) {
  if (process.env.NODE_TEST_CONTEXT === undefined) return buildSafeValidationFailure();
  return validateOfficialSandboxContractsWithExpectedDigest(
    options,
    options.expectedReviewedContractSha256,
  );
}

function validateOfficialSandboxContractsWithExpectedDigest(options, expectedReviewedContractSha256) {
  try {
    return validateOfficialSandboxContractsUnchecked(options, expectedReviewedContractSha256);
  } catch {
    return buildSafeValidationFailure();
  }
}

function buildSafeValidationFailure() {
  return {
    schemaVersion: null,
    officialContractComplete: false,
    metadataValid: false,
    contractSha256: "",
    contractDigestVerified: false,
    sourceChecksumMetadataValid: false,
    sourceChecksumsVerified: false,
    restrictedEvidenceVerified: false,
    restrictedEvidenceFileCount: 0,
    sourceCount: 0,
    safetyValid: false,
    sandboxHostConfirmed: false,
    allRequiredPathsConfirmed: false,
    authenticationConfirmed: false,
    apiVersionConfirmed: false,
    complianceMatrixConfirmed: false,
    unpublishedItemsRecorded: false,
    networkCallsMade: false,
    blockers: [
      "ZATCA_OFFICIAL_CONTRACT_SCHEMA_INVALID",
      "ZATCA_OFFICIAL_CONTRACT_UNCONFIRMED",
    ],
  };
}

function validateOfficialSandboxContractsUnchecked(options = {}, expectedReviewedContractSha256) {
  const cwd = options.cwd || process.cwd();
  const restrictedMode = options.evidenceDirectory !== undefined;
  const read = readEvidence(cwd);
  const evidence = read.value;
  const blockers = [];
  const addBlocker = (code) => {
    if (!blockers.includes(code)) blockers.push(code);
  };

  const topLevelValid = read.ok && validateTopLevel(evidence);
  if (!topLevelValid) addBlocker("ZATCA_OFFICIAL_CONTRACT_SCHEMA_INVALID");

  const sourceValidation = validateSources(evidence.sources);
  if (sourceValidation.duplicateSourceId) addBlocker("ZATCA_OFFICIAL_SOURCE_ID_DUPLICATE");
  if (!sourceValidation.checksumsVerified) addBlocker("ZATCA_OFFICIAL_SOURCE_CHECKSUM_UNVERIFIED");
  if (!sourceValidation.officialDomains) addBlocker("ZATCA_OFFICIAL_SOURCE_DOMAIN_REJECTED");
  if (!sourceValidation.safeUrls) addBlocker("ZATCA_OFFICIAL_SOURCE_URL_UNSAFE");
  if (!sourceValidation.schemaValid) addBlocker("ZATCA_OFFICIAL_CONTRACT_SCHEMA_INVALID");

  const contractValidation = validateContract(evidence.contract, sourceValidation.sourceIds);
  if (contractValidation.unknownState) addBlocker("ZATCA_OFFICIAL_EVIDENCE_STATE_UNKNOWN");
  if (contractValidation.simulationSubstitution) addBlocker("ZATCA_SIMULATION_TARGET_SUBSTITUTION_REJECTED");
  if (!contractValidation.schemaValid) addBlocker("ZATCA_OFFICIAL_CONTRACT_SCHEMA_INVALID");

  const safetyValid = validateSafety(evidence.safety) && !containsUnsafeMetadata(evidence);
  if (!safetyValid) addBlocker("ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED");

  const computedContractSha256 = read.ok ? computeContractSha256(evidence) : "";
  const contractDigestVerified =
    isSha256(evidence.contractSha256) &&
    isSha256(expectedReviewedContractSha256) &&
    timingSafeDigestEqual(computedContractSha256, evidence.contractSha256) &&
    timingSafeDigestEqual(computedContractSha256, expectedReviewedContractSha256);
  if (!contractDigestVerified) addBlocker("ZATCA_OFFICIAL_CONTRACT_DIGEST_MISMATCH");

  let restrictedEvidenceVerified = false;
  if (restrictedMode) {
    restrictedEvidenceVerified =
      path.isAbsolute(options.evidenceDirectory) &&
      sourceValidation.schemaValid &&
      verifyRestrictedEvidenceDirectory(options.evidenceDirectory, evidence.sources);
    if (!restrictedEvidenceVerified) addBlocker("ZATCA_OFFICIAL_RESTRICTED_EVIDENCE_MISMATCH");
  }

  const metadataValid =
    topLevelValid &&
    sourceValidation.schemaValid &&
    sourceValidation.checksumsVerified &&
    sourceValidation.officialDomains &&
    sourceValidation.safeUrls &&
    contractValidation.schemaValid &&
    !contractValidation.unknownState &&
    !contractValidation.simulationSubstitution &&
    safetyValid &&
    contractDigestVerified;
  const officialContractComplete = metadataValid && (!restrictedMode || restrictedEvidenceVerified);
  if (!officialContractComplete) addBlocker("ZATCA_OFFICIAL_CONTRACT_UNCONFIRMED");

  return {
    schemaVersion: evidence.schemaVersion === 2 ? 2 : null,
    officialContractComplete,
    metadataValid,
    contractSha256: computedContractSha256,
    contractDigestVerified,
    sourceChecksumMetadataValid: sourceValidation.checksumsVerified,
    sourceChecksumsVerified: restrictedMode && restrictedEvidenceVerified,
    restrictedEvidenceVerified,
    restrictedEvidenceFileCount: restrictedEvidenceVerified ? REQUIRED_SOURCES.length : 0,
    sourceCount: sourceValidation.sourceCount,
    safetyValid,
    sandboxHostConfirmed: contractValidation.simulationTargetValid,
    allRequiredPathsConfirmed: contractValidation.operationsValid,
    authenticationConfirmed: contractValidation.authenticationValid,
    apiVersionConfirmed: contractValidation.apiVersionValid,
    complianceMatrixConfirmed: contractValidation.complianceMatrixValid,
    unpublishedItemsRecorded: contractValidation.unpublishedItemsRecorded,
    networkCallsMade: false,
    blockers,
  };
}

function validateTopLevel(evidence) {
  return (
    isPlainObject(evidence) &&
    hasExactKeys(evidence, TOP_LEVEL_FIELDS) &&
    evidence.schemaVersion === 2 &&
    evidence.arc === "ARC-07B-06F" &&
    isDate(evidence.retrievedOn) &&
    typeof evidence.contractSha256 === "string" &&
    Array.isArray(evidence.sources) &&
    isPlainObject(evidence.contract) &&
    Array.isArray(evidence.nonNormativeNotes) &&
    evidence.nonNormativeNotes.length <= 100 &&
    evidence.nonNormativeNotes.every((note) => typeof note === "string" && note.length > 0 && note.length <= 1000) &&
    isPlainObject(evidence.safety)
  );
}

function validateSources(sources) {
  const result = {
    schemaValid: false,
    duplicateSourceId: false,
    checksumsVerified: false,
    officialDomains: false,
    safeUrls: false,
    sourceCount: Array.isArray(sources) ? sources.length : 0,
    sourceIds: new Set(),
  };
  if (!Array.isArray(sources)) return result;

  const ids = sources.map((source) => source && source.sourceId);
  result.duplicateSourceId = ids.some((sourceId, index) => ids.indexOf(sourceId) !== index);
  const expectedById = new Map(REQUIRED_SOURCES.map((source) => [source.sourceId, source]));
  const schemaEntriesValid = sources.every((source) => {
    if (!isPlainObject(source) || !hasExactKeys(source, SOURCE_FIELDS)) return false;
    const expected = expectedById.get(source.sourceId);
    if (
      !expected ||
      source.fileName !== expected.fileName ||
      source.evidenceClass !== expected.evidenceClass ||
      source.redistributionClassification !== "METADATA_ONLY_DO_NOT_REDISTRIBUTE"
    ) return false;
    return (
      isSafeText(source.title, 500) &&
      isSafeText(source.portalSection, 500) &&
      isSafeText(source.version, 500) &&
      isDate(source.retrievedOn) &&
      Number.isSafeInteger(source.byteLength) &&
      source.byteLength > 0 &&
      typeof source.officialLocator === "string" &&
      typeof source.sha256 === "string"
    );
  });
  result.sourceIds = new Set(ids.filter((sourceId) => typeof sourceId === "string"));
  result.schemaValid =
    sources.length === REQUIRED_SOURCES.length &&
    !result.duplicateSourceId &&
    schemaEntriesValid &&
    result.sourceIds.size === REQUIRED_SOURCES.length;
  result.checksumsVerified =
    result.schemaValid &&
    sources.every((source) => isSha256(source.sha256) && !/^0{64}$/u.test(source.sha256));

  const urlResults = sources.map((source) => validateOfficialLocator(source));
  result.officialDomains =
    sources.length === REQUIRED_SOURCES.length &&
    urlResults.every((urlResult) => urlResult.officialDomain);
  result.safeUrls =
    sources.length === REQUIRED_SOURCES.length &&
    urlResults.every((urlResult) => urlResult.safe);
  return result;
}

function validateOfficialLocator(source) {
  if (!isPlainObject(source)) return { safe: false, officialDomain: false };
  if (source.evidenceClass === "AUTHENTICATED_SWAGGER_PDF_EXPORT" &&
      source.officialLocator === "Authenticated ZATCA Developer Portal Swagger export") {
    return { safe: true, officialDomain: true };
  }
  if (source.evidenceClass === "OFFICIAL_ZATCA_PDF" &&
      source.officialLocator === "Official ZATCA PDF publication") {
    return { safe: true, officialDomain: true };
  }
  return validateOfficialUrl(source.officialLocator);
}

function validateContract(contract, sourceIds) {
  const result = {
    schemaValid: false,
    unknownState: false,
    simulationSubstitution: false,
    simulationTargetValid: false,
    operationsValid: false,
    authenticationValid: false,
    apiVersionValid: false,
    complianceMatrixValid: false,
    unpublishedItemsRecorded: false,
  };
  if (!isPlainObject(contract) || !hasExactKeys(contract, REQUIRED_GROUPS)) return result;

  let groupsValid = true;
  for (const groupName of REQUIRED_GROUPS) {
    const group = contract[groupName];
    if (!isPlainObject(group) || !hasExactKeys(group, REQUIRED_LEAVES[groupName])) {
      groupsValid = false;
      continue;
    }
    for (const [leafName, leaf] of Object.entries(group)) {
      if (isPlainObject(leaf) && !ALLOWED_STATES.has(leaf.status)) result.unknownState = true;
      if (!validateLeaf(leaf, sourceIds)) groupsValid = false;
      if (leaf?.status !== expectedLeafState(groupName, leafName)) groupsValid = false;
    }
  }

  const simulation = validateSimulationEnvironment(contract.environments.simulation);
  result.simulationTargetValid = simulation.valid;
  result.simulationSubstitution = simulation.substitution;
  const environmentRestrictionsValid = validateEnvironmentRestrictions(contract.environments);
  result.operationsValid = validateOperations(contract.operations);
  result.authenticationValid =
    validateAuthentication(contract.authentication);
  result.apiVersionValid = validateHeaders(contract.headers);
  const requestResponseFieldsValid = validateRequestResponseFields(contract.requestFields, contract.responseFields);
  const credentialProgressionValid = validateCredentialProgression(contract.credentialProgression);
  const otpValid = validateOtp(contract.otp);
  const csrValid = validateCsr(contract.csr);
  result.complianceMatrixValid = validateComplianceMatrix(contract.complianceMatrix);
  const retryValid = validateRetryAndStatuses(contract.retry, contract.statusCodes);
  const duplicatesValid = validateDuplicates(contract.duplicates);
  result.unpublishedItemsRecorded = validateUnpublished(contract.unpublished);
  const localPolicyValid = validateLocalPolicy(contract.localPolicy);

  result.schemaValid =
    groupsValid &&
    !result.unknownState &&
    result.simulationTargetValid &&
    !result.simulationSubstitution &&
    environmentRestrictionsValid &&
    result.operationsValid &&
    result.authenticationValid &&
    result.apiVersionValid &&
    requestResponseFieldsValid &&
    credentialProgressionValid &&
    otpValid &&
    csrValid &&
    result.complianceMatrixValid &&
    retryValid &&
    duplicatesValid &&
    result.unpublishedItemsRecorded &&
    localPolicyValid;
  return result;
}

function validateLeaf(leaf, sourceIds) {
  if (!isPlainObject(leaf) || !hasExactKeys(leaf, ["value", "status", "sourceIds", "sourcePages"])) return false;
  if (!ALLOWED_STATES.has(leaf.status) || !isSafeJsonValue(leaf.value, 0)) return false;
  if (
    !Array.isArray(leaf.sourceIds) ||
    leaf.sourceIds.length === 0 ||
    new Set(leaf.sourceIds).size !== leaf.sourceIds.length ||
    !leaf.sourceIds.every((sourceId) => typeof sourceId === "string" && sourceIds.has(sourceId))
  ) return false;
  if (!Array.isArray(leaf.sourcePages) || leaf.sourcePages.length === 0) return false;
  return leaf.sourcePages.every(
    (sourcePage) =>
      isSafeText(sourcePage, 200) &&
      leaf.sourceIds.some((sourceId) => sourcePage === `${sourceId}:${extractPageToken(sourcePage)}`) &&
      /^[a-z0-9-]+:p[1-9]\d{0,3}$/u.test(sourcePage),
  );
}

function expectedLeafState(groupName, leafName) {
  if (groupName === "unpublished") return BLOCKED_STATE;
  if (
    groupName === "localPolicy" ||
    (groupName === "otp" && leafName === "entryPolicy") ||
    (groupName === "retry" && leafName === "ambiguousTransmission")
  ) return NOT_APPLICABLE_STATE;
  return CONFIRMED_STATE;
}

function extractPageToken(value) {
  const separator = typeof value === "string" ? value.lastIndexOf(":") : -1;
  return separator >= 0 ? value.slice(separator + 1) : "";
}

function validateSimulationEnvironment(leaf) {
  const values = collectStrings(leaf?.value);
  const urls = values.filter((value) => /^https?:\/\//iu.test(value));
  const substitution = urls.some((value) => {
    try {
      const pathname = new URL(value).pathname.toLowerCase();
      return /\/(?:core|developer-portal)(?:\/|$)/u.test(pathname);
    } catch {
      return true;
    }
  });
  const valid =
    leaf?.status === CONFIRMED_STATE &&
    urls.length === 1 &&
    validateOfficialUrl(urls[0]).safe &&
    (() => {
      try {
        return /\/simulation(?:\/|$)/u.test(new URL(urls[0]).pathname.toLowerCase());
      } catch {
        return false;
      }
    })();
  return { valid, substitution };
}

function validateEnvironmentRestrictions(environments) {
  const simulation = environments.simulation?.value;
  const developerPortal = environments.developerPortal?.value;
  const production = environments.production?.value;
  return (
    isPlainObject(simulation) &&
    simulation.baseUrl === "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation" &&
    simulation.allowed === true &&
    simulation.purpose === "DEVELOPER_INTEGRATION_SANDBOX_ONLY" &&
    simulation.interchangeableWithOtherEnvironments === false &&
    isPlainObject(developerPortal) &&
    developerPortal.baseUrl === "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal" &&
    developerPortal.allowed === false &&
    developerPortal.interchangeableWithSimulation === false &&
    isPlainObject(production) &&
    production.baseUrl === "https://gw-fatoora.zatca.gov.sa/e-invoicing/core" &&
    production.allowed === false &&
    production.interchangeableWithSimulation === false
  );
}

function validateOperations(operations) {
  return Object.entries(REQUIRED_OPERATIONS).every(([operationId, expected]) => {
    const leaf = operations[operationId];
    const value = leaf?.value;
    return (
      leaf?.status === CONFIRMED_STATE &&
      isPlainObject(value) &&
      value.method === expected.method &&
      value.path === expected.path &&
      !hasPathTraversal(value.path) &&
      value.environment === "simulation"
    );
  });
}

function validateAuthentication(authentication) {
  const compliance = authentication.complianceBasic?.value;
  const production = authentication.productionBasic?.value;
  return [compliance, production].every(
    (value) =>
      isPlainObject(value) &&
      value.scheme === "Basic" &&
      value.usernameField === "binarySecurityToken" &&
      value.passwordField === "secret",
  );
}

function validateHeaders(headers) {
  const otp = headers.otp?.value;
  const version = headers.acceptVersion?.value;
  const language = headers.acceptLanguage?.value;
  const clearance = headers.clearanceStatus?.value;
  const contentType = headers.contentType?.value;
  const authorization = headers.authorization?.value;
  return (
    isPlainObject(otp) &&
    otp.name === "OTP" &&
    sameStringSet(otp.requiredFor, ["complianceCsid", "renewal"]) &&
    isPlainObject(version) &&
    version.name === "Accept-Version" &&
    version.value === "V2" &&
    version.required === true &&
    isPlainObject(language) &&
    language.name === "Accept-Language" &&
    language.required === false &&
    sameStringSet(language.allowedValues, ["en", "ar"]) &&
    language.default === "en" &&
    isPlainObject(clearance) &&
    clearance.name === "Clearance-Status" &&
    clearance.required === true &&
    sameStringSet(clearance.allowedValues, ["0", "1"]) &&
    isPlainObject(contentType) &&
    contentType.name === "Content-Type" &&
    contentType.value === "application/json" &&
    isPlainObject(authorization) &&
    authorization.name === "Authorization" &&
    authorization.scheme === "Basic"
  );
}

function validateRequestResponseFields(requestFields, responseFields) {
  const complianceCsid = requestFields.complianceCsid?.value;
  const complianceInvoice = requestFields.complianceInvoice?.value;
  const productionCsid = requestFields.productionCsid?.value;
  const clearanceReporting = requestFields.clearanceReporting?.value;
  const renewal = requestFields.renewal?.value;
  const certificateIssue = responseFields.certificateIssue?.value;
  const invoiceValidation = responseFields.invoiceValidation?.value;
  return (
    isPlainObject(complianceCsid) &&
    hasExactKeys(complianceCsid, ["fields"]) &&
    sameStringSet(complianceCsid.fields, ["csr"]) &&
    isPlainObject(complianceInvoice) &&
    hasExactKeys(complianceInvoice, ["fields"]) &&
    sameStringSet(complianceInvoice.fields, ["invoiceHash", "uuid", "invoice"]) &&
    isPlainObject(productionCsid) &&
    hasExactKeys(productionCsid, ["fields"]) &&
    sameStringSet(productionCsid.fields, ["compliance_request_id"]) &&
    isPlainObject(clearanceReporting) &&
    hasExactKeys(clearanceReporting, ["fields", "operations"]) &&
    sameStringSet(clearanceReporting.fields, ["invoiceHash", "uuid", "invoice"]) &&
    sameStringSet(clearanceReporting.operations, ["clearance", "reporting"]) &&
    isPlainObject(renewal) &&
    hasExactKeys(renewal, ["fields", "credentialContext"]) &&
    sameStringSet(renewal.fields, ["csr"]) &&
    sameStringSet(renewal.credentialContext, ["currentCSID"]) &&
    isPlainObject(certificateIssue) &&
    hasExactKeys(certificateIssue, ["fields", "operations"]) &&
    sameStringSet(certificateIssue.fields, ["requestID", "dispositionMessage", "binarySecurityToken", "secret"]) &&
    sameStringSet(certificateIssue.operations, ["complianceCsid", "productionCsid", "renewal"]) &&
    isPlainObject(invoiceValidation) &&
    hasExactKeys(invoiceValidation, ["complianceInvoice", "clearance", "reporting"]) &&
    sameStringSet(invoiceValidation.complianceInvoice, [
      "validationResults",
      "reportingStatus",
      "clearanceStatus",
      "qrSellertStatus",
      "qrBuyertStatus",
    ]) &&
    sameStringSet(invoiceValidation.clearance, ["validationResults", "clearanceStatus", "clearedInvoice"]) &&
    sameStringSet(invoiceValidation.reporting, ["validationResults", "reportingStatus"])
  );
}

function validateCredentialProgression(credentialProgression) {
  const sequence = credentialProgression.sequence?.value;
  if (!Array.isArray(sequence) || sequence.length !== 5) return false;
  return (
    /OTP/iu.test(sequence[0]) &&
    /Compliance CSID/iu.test(sequence[1]) &&
    /compliance-document/iu.test(sequence[2]) &&
    /Simulation Production CSID/iu.test(sequence[3]) &&
    /clearance.*reporting|reporting.*clearance/iu.test(sequence[4])
  );
}

function validateOtp(otp) {
  const format = otp.format?.value;
  const validity = otp.validity?.value;
  const policy = otp.entryPolicy?.value;
  return (
    isPlainObject(format) &&
    format.length === 6 &&
    format.characterSet === "ASCII_DIGITS_0_TO_9" &&
    format.pattern === "^[0-9]{6}$" &&
    isPlainObject(validity) &&
    validity.duration === "PT1H" &&
    validity.minutes === 60 &&
    isPlainObject(policy) &&
    policy.oneShot === true &&
    policy.persisted === false &&
    policy.acceptedFromArguments === false &&
    policy.acceptedFromEnvironment === false &&
    policy.acceptedFromFiles === false
  );
}

function validateCsr(csr) {
  const requirements = csr.requirements?.value;
  const subjectFields = requirements?.subjectFields;
  return (
    isPlainObject(csr.requestField?.value) &&
    csr.requestField.value.name === "csr" &&
    isPlainObject(requirements) &&
    requirements.curve === "secp256k1" &&
    requirements.digest === "SHA-256" &&
    requirements.signature === "ECDSA-SHA256" &&
    Array.isArray(subjectFields) &&
    subjectFields.length === CSR_SUBJECT_FIELDS.size &&
    new Set(subjectFields).size === CSR_SUBJECT_FIELDS.size &&
    subjectFields.every((field) => CSR_SUBJECT_FIELDS.has(field)) &&
    isPlainObject(requirements.templates) &&
    requirements.templates.simulation === "PREZATCA-Code-Signing" &&
    requirements.templates.production === "ZATCA-Code-Signing"
  );
}

function validateComplianceMatrix(matrix) {
  const value = matrix.requiredDocuments?.value;
  const standard = ["standard invoice", "standard debit note", "standard credit note"];
  const simplified = ["simplified invoice", "simplified debit note", "simplified credit note"];
  return (
    matrix.requiredDocuments?.status === CONFIRMED_STATE &&
    isPlainObject(value) &&
    hasExactKeys(value, ["1000", "0100", "1100"]) &&
    sameStringSet(value["1000"], standard) &&
    sameStringSet(value["0100"], simplified) &&
    sameStringSet(value["1100"], [...standard, ...simplified])
  );
}

function validateRetryAndStatuses(retry, statusCodes) {
  const automaticRetry = retry.automaticRetry?.value;
  const ambiguousTransmission = retry.ambiguousTransmission?.value;
  return (
    isPlainObject(automaticRetry) &&
    sameNumberSet(automaticRetry.resendAfterFailureStatusCodes, [429, 500, 503, 504]) &&
    sameNumberSet(automaticRetry.retryWithSmallerPayloadStatusCodes, [413]) &&
    sameNumberSet(automaticRetry.correctRequestBeforeRetryStatusCodes, [400]) &&
    sameNumberSet(automaticRetry.correctAuthenticationBeforeRetryStatusCodes, [401]) &&
    isPlainObject(ambiguousTransmission) &&
    ambiguousTransmission.blindRetryAllowed === false &&
    ambiguousTransmission.bounded === true &&
    ambiguousTransmission.immutablePayloadRequired === true &&
    ambiguousTransmission.requireOutcomeReconciliation === true &&
    ambiguousTransmission.unresolvedOutcome === "UNCERTAIN" &&
    ambiguousTransmission.failClosed === true &&
    Object.entries(EXPECTED_STATUS_CODES).every(
      ([operationId, expected]) => sameNumberSet(statusCodes[operationId]?.value, expected),
    )
  );
}

function validateDuplicates(duplicates) {
  const clearance208 = duplicates.clearance208?.value;
  const reporting409 = duplicates.reporting409?.value;
  const clearance303 = duplicates.clearance303?.value;
  return (
    duplicates.clearance208?.status === CONFIRMED_STATE &&
    duplicates.reporting409?.status === CONFIRMED_STATE &&
    duplicates.clearance303?.status === CONFIRMED_STATE &&
    isPlainObject(clearance208) &&
    clearance208.statusCode === 208 &&
    /previously submitted/iu.test(String(clearance208.meaning)) &&
    /reconcile/iu.test(String(clearance208.action)) &&
    isPlainObject(reporting409) &&
    reporting409.statusCode === 409 &&
    /already reported successfully/iu.test(String(reporting409.meaning)) &&
    /reconcile/iu.test(String(reporting409.action)) &&
    isPlainObject(clearance303) &&
    clearance303.statusCode === 303 &&
    /clearance/iu.test(String(clearance303.meaning)) &&
    /\/invoices\/reporting\/single/iu.test(String(clearance303.action)) &&
    clearance303.genericRedirectAllowed === false
  );
}

function validateUnpublished(unpublished) {
  return REQUIRED_LEAVES.unpublished.every(
    (leafName) =>
      unpublished[leafName]?.status === BLOCKED_STATE &&
      unpublished[leafName]?.value === "UNPUBLISHED" &&
      Array.isArray(unpublished[leafName]?.sourcePages) &&
      unpublished[leafName].sourcePages.length > 0,
  );
}

function validateLocalPolicy(localPolicy) {
  const target = localPolicy.targetAllowlist?.value;
  const redirects = localPolicy.redirects?.value;
  const responses = localPolicy.responseHandling?.value;
  return (
    isPlainObject(target) &&
    target.exactBaseUrl === "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation" &&
    target.productionBaseUrlAllowed === false &&
    target.developerPortalBaseUrlAllowed === false &&
    target.deriveTargetFromInput === false &&
    isPlainObject(redirects) &&
    redirects.followGenericRedirects === false &&
    /reporting/iu.test(String(redirects.clearance303Action)) &&
    isPlainObject(responses) &&
    responses.retainResponseBodies === false &&
    responses.retainCredentials === false &&
    responses.retainOtp === false &&
    responses.failClosedOnUnexpectedStatus === true
  );
}

function validateSafety(safety) {
  return (
    isPlainObject(safety) &&
    hasExactKeys(safety, SAFETY_FIELDS) &&
    SAFETY_FIELDS.every((field) => safety[field] === false)
  );
}

function containsUnsafeMetadata(value, key = "", depth = 0) {
  if (depth > 30) return true;
  const normalizedKey = normalizeKey(key);
  if (FORBIDDEN_METADATA_KEYS.has(normalizedKey) && !ALLOWED_SAFETY_KEYS.has(normalizedKey)) return true;
  if (typeof value === "string") {
    if (containsUnsafeStringValue(value)) return true;
    if (hasPathTraversal(value)) return true;
    if (/^https?:\/\//iu.test(value)) {
      const urlResult = validateOfficialUrl(value);
      if (!urlResult.safe || !urlResult.officialDomain) return true;
    }
    return false;
  }
  if (Array.isArray(value)) return value.some((item) => containsUnsafeMetadata(item, key, depth + 1));
  if (isPlainObject(value)) {
    return Object.entries(value).some(([childKey, childValue]) =>
      containsUnsafeMetadata(childValue, childKey, depth + 1),
    );
  }
  return false;
}

function containsUnsafeStringValue(value) {
  return (
    /(?:^|[\s"'(])(?:[a-z]:[\\/]|\\\\[^\\\s]+[\\/])/iu.test(value) ||
    /(?:^|[\s"'(])\/(?:home|Users|tmp)\/[^\s]+/u.test(value) ||
    /(?:^|[\s"'(])file:/iu.test(value) ||
    /-----BEGIN (?:RSA |EC )?(?:PRIVATE KEY|PUBLIC KEY|CERTIFICATE(?: REQUEST)?)-----/iu.test(value) ||
    /\bAuthorization\s*[:=]\s*(?:Basic|Bearer)\s+\S+/iu.test(value) ||
    /\b(?:secret|password|binarySecurityToken|apiKey)\s*[:=]\s*\S+/iu.test(value) ||
    /\b(?:Cookie|Set-Cookie|session(?:Id|Token)?)\s*[:=]\s*\S+/iu.test(value) ||
    /\bOTP(?:\s+value)?\s*[:=]\s*[0-9]{6}\b/iu.test(value) ||
    /\b(?:otpValue|qrPayload|qrValue|qrCode)\s*[:=]\s*\S+/iu.test(value) ||
    /<\?(?:xml)\b|<Invoice(?:\s|>)/iu.test(value) ||
    /\b(?:Error|SyntaxError|TypeError|RangeError|ReferenceError|SAXParseException):\s+\S+/u.test(value) ||
    /\bUnexpected token\b.*\b(?:JSON|position|line|column)\b/iu.test(value) ||
    /\bmalformed (?:XML|namespace|document)\b/iu.test(value) ||
    /[A-Za-z0-9+/]{256,}={0,2}/u.test(value)
  );
}

function validateOfficialUrl(value) {
  const invalid = { safe: false, officialDomain: false };
  if (typeof value !== "string" || value.length === 0 || value.length > 2048 || hasPathTraversal(value) || value.includes("\\")) return invalid;
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const officialDomain = hostname === "zatca.gov.sa" || hostname.endsWith(".zatca.gov.sa");
    const safe =
      officialDomain &&
      parsed.protocol === "https:" &&
      parsed.username === "" &&
      parsed.password === "" &&
      parsed.port === "" &&
      parsed.search === "" &&
      parsed.hash === "";
    return { safe, officialDomain };
  } catch {
    return invalid;
  }
}

function verifyRestrictedEvidenceDirectory(evidenceDirectory, sources) {
  try {
    const directoryStat = fs.lstatSync(evidenceDirectory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) return false;
    const entries = fs.readdirSync(evidenceDirectory, { withFileTypes: true });
    if (
      entries.length !== REQUIRED_SOURCES.length ||
      entries.some((entry) => !entry.isFile() || entry.isSymbolicLink()) ||
      !sameStringSet(entries.map((entry) => entry.name), REQUIRED_SOURCES.map((source) => source.fileName))
    ) return false;

    const sourceByFileName = new Map(sources.map((source) => [source.fileName, source]));
    return REQUIRED_SOURCES.every((requiredSource) => {
      const source = sourceByFileName.get(requiredSource.fileName);
      if (!source) return false;
      const filePath = path.join(evidenceDirectory, requiredSource.fileName);
      const before = fs.lstatSync(filePath);
      if (!before.isFile() || before.isSymbolicLink() || before.size !== source.byteLength) return false;
      const actualSha256 = hashRegularFile(filePath, before.size);
      const after = fs.lstatSync(filePath);
      return (
        after.isFile() &&
        !after.isSymbolicLink() &&
        after.size === before.size &&
        after.mtimeMs === before.mtimeMs &&
        timingSafeDigestEqual(actualSha256, source.sha256)
      );
    });
  } catch {
    return false;
  }
}

function hashRegularFile(filePath, expectedBytes) {
  const hash = crypto.createHash("sha256");
  const buffer = Buffer.allocUnsafe(64 * 1024);
  const descriptor = fs.openSync(filePath, "r");
  let total = 0;
  try {
    while (true) {
      const bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > expectedBytes) throw new Error("evidence size changed");
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    buffer.fill(0);
    fs.closeSync(descriptor);
  }
  if (total !== expectedBytes) throw new Error("evidence size changed");
  return hash.digest("hex");
}

function readEvidence(cwd) {
  try {
    const target = path.join(cwd, EVIDENCE_PATH);
    const stat = fs.statSync(target);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_METADATA_BYTES) return { ok: false, value: {} };
    const value = parseJsonWithoutDuplicateMembers(fs.readFileSync(target, "utf8"));
    return isPlainObject(value) ? { ok: true, value } : { ok: false, value: {} };
  } catch {
    return { ok: false, value: {} };
  }
}

function parseJsonWithoutDuplicateMembers(text) {
  let index = 0;

  function skipWhitespace() {
    while (index < text.length && /[\u0009\u000a\u000d\u0020]/u.test(text[index])) index += 1;
  }

  function parseString() {
    const start = index;
    if (text[index] !== '"') throw new Error("invalid JSON string");
    index += 1;
    while (index < text.length) {
      const code = text.charCodeAt(index);
      if (code === 0x22) {
        index += 1;
        return JSON.parse(text.slice(start, index));
      }
      if (code === 0x5c) {
        index += 1;
        if (index >= text.length) throw new Error("invalid JSON escape");
        if (text[index] === "u") {
          if (!/^[0-9a-f]{4}$/iu.test(text.slice(index + 1, index + 5))) {
            throw new Error("invalid JSON unicode escape");
          }
          index += 5;
          continue;
        }
        if (!/^["\\/bfnrt]$/u.test(text[index])) throw new Error("invalid JSON escape");
        index += 1;
        continue;
      }
      if (code <= 0x1f) throw new Error("invalid JSON control character");
      index += 1;
    }
    throw new Error("unterminated JSON string");
  }

  function parseNumber() {
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(text.slice(index));
    if (!match) throw new Error("invalid JSON number");
    index += match[0].length;
  }

  function parseValue(depth) {
    if (depth > 64) throw new Error("JSON nesting limit exceeded");
    skipWhitespace();
    const token = text[index];
    if (token === "{") {
      index += 1;
      skipWhitespace();
      if (text[index] === "}") {
        index += 1;
        return;
      }
      const memberNames = new Set();
      while (index < text.length) {
        skipWhitespace();
        const memberName = parseString();
        if (memberNames.has(memberName)) throw new Error("duplicate JSON member");
        memberNames.add(memberName);
        skipWhitespace();
        if (text[index] !== ":") throw new Error("missing JSON member separator");
        index += 1;
        parseValue(depth + 1);
        skipWhitespace();
        if (text[index] === "}") {
          index += 1;
          return;
        }
        if (text[index] !== ",") throw new Error("missing JSON member delimiter");
        index += 1;
      }
      throw new Error("unterminated JSON object");
    }
    if (token === "[") {
      index += 1;
      skipWhitespace();
      if (text[index] === "]") {
        index += 1;
        return;
      }
      while (index < text.length) {
        parseValue(depth + 1);
        skipWhitespace();
        if (text[index] === "]") {
          index += 1;
          return;
        }
        if (text[index] !== ",") throw new Error("missing JSON array delimiter");
        index += 1;
      }
      throw new Error("unterminated JSON array");
    }
    if (token === '"') {
      parseString();
      return;
    }
    for (const literal of ["true", "false", "null"]) {
      if (text.startsWith(literal, index)) {
        index += literal.length;
        return;
      }
    }
    parseNumber();
  }

  if (typeof text !== "string" || text.length === 0 || text.length > MAX_METADATA_BYTES) {
    throw new Error("invalid JSON input");
  }
  parseValue(0);
  skipWhitespace();
  if (index !== text.length) throw new Error("trailing JSON data");
  return JSON.parse(text);
}

function computeContractSha256(value) {
  const digestInput = isPlainObject(value) ? { ...value } : value;
  if (isPlainObject(digestInput)) delete digestInput.contractSha256;
  return crypto.createHash("sha256").update(JSON.stringify(canonicalize(digestInput)), "utf8").digest("hex");
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    const result = Object.create(null);
    for (const key of Object.keys(value).sort()) {
      result[key] = canonicalize(value[key]);
    }
    return result;
  }
  return value;
}

function parseArgs(argv) {
  const result = { ok: true, evidenceDirectory: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json") continue;
    if (token === "--evidence-directory" && result.evidenceDirectory === undefined && index + 1 < argv.length) {
      result.evidenceDirectory = argv[index + 1];
      index += 1;
      continue;
    }
    result.ok = false;
  }
  if (result.evidenceDirectory !== undefined && !path.isAbsolute(result.evidenceDirectory)) result.ok = false;
  return result;
}

function runCli(argv = process.argv.slice(2), io = console) {
  const args = parseArgs(argv);
  if (!args.ok) {
    io.error(JSON.stringify({
      status: "INVALID_ARGUMENTS",
      officialContractComplete: false,
      restrictedEvidenceVerified: false,
      networkCallsMade: false,
    }));
    return 2;
  }
  const result = validateOfficialSandboxContracts({ evidenceDirectory: args.evidenceDirectory });
  io.log(JSON.stringify(result));
  return result.officialContractComplete ? 0 : 1;
}

function hasExactKeys(value, keys) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function isDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isSafeText(value, maxLength) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength && !/[\u0000-\u001f\u007f]/u.test(value);
}

function isSafeJsonValue(value, depth) {
  if (depth > 12) return false;
  if (value === null || typeof value === "boolean" || typeof value === "string") return typeof value !== "string" || value.length <= 10000;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 1000 && value.every((item) => isSafeJsonValue(item, depth + 1));
  if (isPlainObject(value)) {
    return Object.keys(value).length <= 100 && Object.values(value).every((item) => isSafeJsonValue(item, depth + 1));
  }
  return false;
}

function normalizeKey(value) {
  return String(value).replace(/[^a-z0-9]/giu, "").toLowerCase();
}

function normalizeAlgorithm(value) {
  return String(value).replace(/[^a-z0-9]/giu, "").toUpperCase();
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/iu.test(value);
}

function timingSafeDigestEqual(actual, expected) {
  if (!isSha256(actual) || !isSha256(expected)) return false;
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected.toLowerCase(), "hex"));
}

function hasPathTraversal(value) {
  if (typeof value !== "string") return false;
  let decoded = value;
  for (let count = 0; count < 3; count += 1) {
    if (/(^|[\\/])\.\.([\\/]|$)/u.test(decoded)) return true;
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return true;
    }
  }
  return /(^|[\\/])\.\.([\\/]|$)/u.test(decoded);
}

function collectStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (isPlainObject(value)) return Object.values(value).flatMap(collectStrings);
  return [];
}

function valueContains(value, expected) {
  return collectStrings(value).some((item) => item.includes(expected));
}

function sameStringSet(actual, expected) {
  return (
    Array.isArray(actual) &&
    Array.isArray(expected) &&
    actual.every((item) => typeof item === "string") &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    expected.every((item) => actual.includes(item))
  );
}

function sameNumberSet(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && new Set(actual).size === actual.length && expected.every((item) => actual.includes(item));
}

function includesNumbers(actual, expected) {
  return Array.isArray(actual) && expected.every((item) => actual.includes(item));
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  REQUIRED_GROUPS,
  REQUIRED_LEAVES,
  REQUIRED_SOURCES,
  canonicalize,
  computeContractSha256,
  parseArgs,
  runCli,
  validateOfficialSandboxContracts,
  __testOnlyValidateOfficialSandboxContractsFixture,
};
