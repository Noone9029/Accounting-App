export const ZATCA_SANDBOX_CSID_EXECUTION_APPROVAL_GATE_PHRASE =
  "I approve LedgerByte sandbox CSID execution approval gate planning only: recognize approval metadata but do not request OTP, do not request CSID, do not call ZATCA, do not create request bodies, do not process response bodies, do not store secrets, do not sign, do not clear/report, do not create PDF-A-3, and do not claim production compliance.";

export type ZatcaSandboxCsidExecutionApprovalEnvironment = "SANDBOX" | "SIMULATION" | "PRODUCTION";
export type ZatcaSandboxCsidExecutionApprovalContractEnvironment = "SANDBOX" | "SIMULATION" | "BLOCKED_PRODUCTION";

export type ZatcaSandboxCsidExecutionApprovalGateStatus =
  | "APPROVAL_REQUIRED"
  | "APPROVAL_PHRASE_INVALID"
  | "APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED"
  | "BLOCKED_SANDBOX_ACCESS_NOT_CONFIRMED"
  | "BLOCKED_OTP_CAPTURE_NOT_APPROVED"
  | "BLOCKED_CUSTODY_PROVIDER_NOT_APPROVED"
  | "BLOCKED_REQUEST_BODY_CREATION_NOT_APPROVED"
  | "BLOCKED_RESPONSE_BODY_PROCESSING_NOT_APPROVED"
  | "BLOCKED_REAL_NETWORK_DISABLED"
  | "BLOCKED_PRODUCTION_COMPLIANCE_FALSE";

export type ZatcaSandboxCsidExecutionApprovalNextBoundary =
  | "SANDBOX_EXECUTION_APPROVAL_PHRASE"
  | "SANDBOX_ACCESS_AND_OTP_CAPTURE_APPROVAL"
  | "CUSTODY_PROVIDER_APPROVAL"
  | "REQUEST_BODY_CREATION_APPROVAL"
  | "RESPONSE_BODY_PROCESSING_APPROVAL"
  | "REAL_NETWORK_EXECUTION_APPROVAL"
  | "PRODUCTION_REMAINS_BLOCKED";

export interface ZatcaSandboxCsidExecutionApprovalGateInput {
  environment?: ZatcaSandboxCsidExecutionApprovalEnvironment | string | null;
  organizationId?: string | null;
  egsUnitId?: string | null;
  approvalPhrase?: string | null;
  sandboxAccessConfirmed?: boolean | null;
  otpCaptureApproved?: boolean | null;
  custodyProviderApproved?: boolean | null;
  requestBodyCreationApproved?: boolean | null;
  responseBodyProcessingApproved?: boolean | null;
  realNetworkEnabled?: boolean | null;
  blockers?: string[] | null;
  warnings?: string[] | null;
}

export interface ZatcaSandboxCsidExecutionApprovalGatePlan {
  localOnly: true;
  dryRun: true;
  metadataOnly: true;
  approvalGateOnly: true;
  ready: false;
  primaryStatus: ZatcaSandboxCsidExecutionApprovalGateStatus;
  statuses: ZatcaSandboxCsidExecutionApprovalGateStatus[];
  environment: ZatcaSandboxCsidExecutionApprovalContractEnvironment;
  organizationIdPresent: boolean;
  egsUnitIdPresent: boolean;
  approvalPhraseRequired: true;
  approvalPhraseProvided: boolean;
  approvalPhraseRecognized: boolean;
  approvalPhraseStored: false;
  approvalPhraseEchoed: false;
  executionAllowed: false;
  noNetwork: true;
  noOtpCaptured: true;
  noCsidRequested: true;
  noRequestBodyCreated: true;
  noResponseBodyProcessed: true;
  noSecretMaterialPersisted: true;
  noPrivateKeyAccepted: true;
  noCertificateBodyAccepted: true;
  noCsrBodyAccepted: true;
  noProviderPayloadAccepted: true;
  realExecutionImplemented: false;
  realResponseCustodyImplemented: false;
  signingEnabled: false;
  clearanceReportingEnabled: false;
  pdfA3Enabled: false;
  productionCompliance: false;
  sandboxPortalReference: {
    url: "https://sandbox.zatca.gov.sa/IntegrationSandbox";
    referenceOnly: true;
    loginAttempted: false;
    otpRequested: false;
    csidRequested: false;
    requestBodyCreated: false;
    responseBodyProcessed: false;
  };
  prerequisites: {
    sandboxAccessConfirmed: boolean;
    otpCaptureApproved: boolean;
    custodyProviderApproved: boolean;
    requestBodyCreationApproved: boolean;
    responseBodyProcessingApproved: boolean;
    realNetworkEnabled: boolean;
  };
  nextRequiredApprovalBoundary: ZatcaSandboxCsidExecutionApprovalNextBoundary;
  forbiddenFieldNames: readonly string[];
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export const ZATCA_SANDBOX_CSID_EXECUTION_APPROVAL_ALLOWED_METADATA_FIELDS = [
  "environment",
  "organizationId",
  "egsUnitId",
  "approvalPhrase",
  "sandboxAccessConfirmed",
  "otpCaptureApproved",
  "custodyProviderApproved",
  "requestBodyCreationApproved",
  "responseBodyProcessingApproved",
  "realNetworkEnabled",
  "blockers",
  "warnings",
] as const;

export const ZATCA_SANDBOX_CSID_EXECUTION_APPROVAL_FORBIDDEN_FIELD_NAMES = [
  "otp",
  "otpValue",
  "csid",
  "complianceCsid",
  "productionCsid",
  "privateKey",
  "privateKeyPem",
  "rawPrivateKey",
  "csrPem",
  "rawCsr",
  "csrBody",
  "certificateBody",
  "rawCertificate",
  "binarySecurityToken",
  "binarySecurityTokenBody",
  "secret",
  "secretBody",
  "token",
  "requestBody",
  "responseBody",
  "providerPayload",
  "signedXml",
  "qrPayload",
  "password",
  "authHeader",
  "authorization",
] as const;

const forbiddenKeyPattern = new RegExp(`^(${ZATCA_SANDBOX_CSID_EXECUTION_APPROVAL_FORBIDDEN_FIELD_NAMES.join("|")})$`, "i");
const forbiddenValuePattern =
  /-----BEGIN [A-Z ]+-----|<\?xml|<Invoice\b|<\w+:Invoice\b|binarySecurityToken\s*=|otp\s*=|otpValue\s*=|csid\s*=|privateKey\s*=|rawPrivateKey\s*=|csrBody\s*=|rawCsr\s*=|certificateBody\s*=|rawCertificate\s*=|secret\s*=|token\s*=|Bearer\s+[A-Za-z0-9._-]+|signedXml\s*=|qrPayload\s*=|requestBody\s*=|responseBody\s*=|providerPayload\s*=/i;

export function assertZatcaSandboxCsidExecutionApprovalGateMetadataSafe(value: unknown, path = "metadata"): void {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "string") {
    if (forbiddenValuePattern.test(value)) {
      throw new Error(`Sensitive ZATCA sandbox CSID execution approval material is not allowed in ${path}.`);
    }
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertZatcaSandboxCsidExecutionApprovalGateMetadataSafe(item, `${path}[${index}]`));
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenKeyPattern.test(key)) {
      throw new Error(`Sensitive ZATCA sandbox CSID execution approval material is not allowed in ${path}.${key}.`);
    }
    assertZatcaSandboxCsidExecutionApprovalGateMetadataSafe(nestedValue, `${path}.${key}`);
  }
}

export function buildZatcaSandboxCsidExecutionApprovalGatePlan(
  input: ZatcaSandboxCsidExecutionApprovalGateInput,
): ZatcaSandboxCsidExecutionApprovalGatePlan {
  assertZatcaSandboxCsidExecutionApprovalGateMetadataSafe(input);

  const environment = normalizeEnvironment(input.environment);
  const organizationIdPresent = hasText(input.organizationId);
  const egsUnitIdPresent = hasText(input.egsUnitId);
  const approvalPhraseProvided = hasText(input.approvalPhrase);
  const approvalPhraseRecognized = input.approvalPhrase === ZATCA_SANDBOX_CSID_EXECUTION_APPROVAL_GATE_PHRASE;
  const sandboxAccessConfirmed = input.sandboxAccessConfirmed === true;
  const otpCaptureApproved = input.otpCaptureApproved === true;
  const custodyProviderApproved = input.custodyProviderApproved === true;
  const requestBodyCreationApproved = input.requestBodyCreationApproved === true;
  const responseBodyProcessingApproved = input.responseBodyProcessingApproved === true;
  const realNetworkEnabled = input.realNetworkEnabled === true;
  const statuses = new Set<ZatcaSandboxCsidExecutionApprovalGateStatus>();
  const blockers = new Set<string>(input.blockers?.filter(hasText) ?? []);
  const warnings = new Set<string>(input.warnings?.filter(hasText) ?? []);

  if (!approvalPhraseProvided) {
    statuses.add("APPROVAL_REQUIRED");
    blockers.add("exact sandbox CSID execution approval-gate phrase is required as metadata");
  } else if (!approvalPhraseRecognized) {
    statuses.add("APPROVAL_PHRASE_INVALID");
    blockers.add("approval phrase did not match the exact approval-gate planning phrase");
  } else {
    statuses.add("APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED");
    blockers.add("approval phrase is recognized as metadata only; sandbox CSID execution remains blocked");
  }

  if (!organizationIdPresent) blockers.add("organizationId metadata is required");
  if (!egsUnitIdPresent) blockers.add("egsUnitId metadata is required");
  if (!sandboxAccessConfirmed) {
    statuses.add("BLOCKED_SANDBOX_ACCESS_NOT_CONFIRMED");
    blockers.add("sandbox portal access is not confirmed and remains reference-only");
  }
  if (!otpCaptureApproved) {
    statuses.add("BLOCKED_OTP_CAPTURE_NOT_APPROVED");
    blockers.add("manual sandbox OTP capture is not approved");
  }
  if (!custodyProviderApproved) {
    statuses.add("BLOCKED_CUSTODY_PROVIDER_NOT_APPROVED");
    blockers.add("real custody provider approval is missing");
  }
  if (!requestBodyCreationApproved) {
    statuses.add("BLOCKED_REQUEST_BODY_CREATION_NOT_APPROVED");
    blockers.add("real sandbox CSID request-body creation is not approved");
  }
  if (!responseBodyProcessingApproved) {
    statuses.add("BLOCKED_RESPONSE_BODY_PROCESSING_NOT_APPROVED");
    blockers.add("real sandbox CSID response-body processing is not approved");
  }
  if (!realNetworkEnabled) {
    statuses.add("BLOCKED_REAL_NETWORK_DISABLED");
    blockers.add("real ZATCA network calls are disabled");
  }
  statuses.add("BLOCKED_PRODUCTION_COMPLIANCE_FALSE");
  blockers.add("production CSID execution is out of scope and production compliance remains false");

  if (environment === "BLOCKED_PRODUCTION") {
    blockers.add("production EGS units cannot use the sandbox CSID execution approval gate");
  }

  warnings.add("Sandbox portal URL is documented only as a future access reference; this gate does not log in, collect OTP, request CSID, create a request body, process a response body, or call ZATCA.");
  warnings.add("The exact phrase is recognized only as approval metadata and must not be treated as authorization to execute sandbox CSID requests.");

  return {
    localOnly: true,
    dryRun: true,
    metadataOnly: true,
    approvalGateOnly: true,
    ready: false,
    primaryStatus: getPrimaryStatus(statuses),
    statuses: [...statuses],
    environment,
    organizationIdPresent,
    egsUnitIdPresent,
    approvalPhraseRequired: true,
    approvalPhraseProvided,
    approvalPhraseRecognized,
    approvalPhraseStored: false,
    approvalPhraseEchoed: false,
    executionAllowed: false,
    noNetwork: true,
    noOtpCaptured: true,
    noCsidRequested: true,
    noRequestBodyCreated: true,
    noResponseBodyProcessed: true,
    noSecretMaterialPersisted: true,
    noPrivateKeyAccepted: true,
    noCertificateBodyAccepted: true,
    noCsrBodyAccepted: true,
    noProviderPayloadAccepted: true,
    realExecutionImplemented: false,
    realResponseCustodyImplemented: false,
    signingEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    productionCompliance: false,
    sandboxPortalReference: {
      url: "https://sandbox.zatca.gov.sa/IntegrationSandbox",
      referenceOnly: true,
      loginAttempted: false,
      otpRequested: false,
      csidRequested: false,
      requestBodyCreated: false,
      responseBodyProcessed: false,
    },
    prerequisites: {
      sandboxAccessConfirmed,
      otpCaptureApproved,
      custodyProviderApproved,
      requestBodyCreationApproved,
      responseBodyProcessingApproved,
      realNetworkEnabled,
    },
    nextRequiredApprovalBoundary: getNextRequiredApprovalBoundary({
      approvalPhraseProvided,
      approvalPhraseRecognized,
      sandboxAccessConfirmed,
      otpCaptureApproved,
      custodyProviderApproved,
      requestBodyCreationApproved,
      responseBodyProcessingApproved,
      realNetworkEnabled,
    }),
    forbiddenFieldNames: ZATCA_SANDBOX_CSID_EXECUTION_APPROVAL_FORBIDDEN_FIELD_NAMES,
    blockers: [...blockers],
    warnings: [...warnings],
    recommendedNextSteps: [
      "Keep this gate metadata-only until a separate sandbox-only execution lane is explicitly approved.",
      "Approve sandbox access and manual OTP capture separately before any future request execution.",
      "Approve custody provider, request-body creation, response-body processing, and real network boundaries separately.",
      "Keep signing, clearance/reporting, PDF-A-3, production CSID lifecycle, and production compliance claims blocked.",
    ],
  };
}

function normalizeEnvironment(value: string | null | undefined): ZatcaSandboxCsidExecutionApprovalContractEnvironment {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "PRODUCTION") return "BLOCKED_PRODUCTION";
  if (normalized === "SIMULATION") return "SIMULATION";
  return "SANDBOX";
}

function getPrimaryStatus(statuses: Set<ZatcaSandboxCsidExecutionApprovalGateStatus>): ZatcaSandboxCsidExecutionApprovalGateStatus {
  if (statuses.has("APPROVAL_REQUIRED")) return "APPROVAL_REQUIRED";
  if (statuses.has("APPROVAL_PHRASE_INVALID")) return "APPROVAL_PHRASE_INVALID";
  if (statuses.has("APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED")) return "APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED";
  return "BLOCKED_PRODUCTION_COMPLIANCE_FALSE";
}

function getNextRequiredApprovalBoundary(input: {
  approvalPhraseProvided: boolean;
  approvalPhraseRecognized: boolean;
  sandboxAccessConfirmed: boolean;
  otpCaptureApproved: boolean;
  custodyProviderApproved: boolean;
  requestBodyCreationApproved: boolean;
  responseBodyProcessingApproved: boolean;
  realNetworkEnabled: boolean;
}): ZatcaSandboxCsidExecutionApprovalNextBoundary {
  if (!input.approvalPhraseProvided || !input.approvalPhraseRecognized) return "SANDBOX_EXECUTION_APPROVAL_PHRASE";
  if (!input.sandboxAccessConfirmed || !input.otpCaptureApproved) return "SANDBOX_ACCESS_AND_OTP_CAPTURE_APPROVAL";
  if (!input.custodyProviderApproved) return "CUSTODY_PROVIDER_APPROVAL";
  if (!input.requestBodyCreationApproved) return "REQUEST_BODY_CREATION_APPROVAL";
  if (!input.responseBodyProcessingApproved) return "RESPONSE_BODY_PROCESSING_APPROVAL";
  if (!input.realNetworkEnabled) return "REAL_NETWORK_EXECUTION_APPROVAL";
  return "PRODUCTION_REMAINS_BLOCKED";
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
