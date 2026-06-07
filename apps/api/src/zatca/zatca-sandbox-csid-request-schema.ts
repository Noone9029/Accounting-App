export type ZatcaSandboxCsidRequestEnvironment = "SANDBOX" | "SIMULATION" | "PRODUCTION";

export type ZatcaSandboxCsidRequestContractEnvironment = "SANDBOX" | "SIMULATION" | "BLOCKED_PRODUCTION";

export type ZatcaSandboxCsidCustodyProviderType =
  | "DISABLED"
  | "LOCAL_REFERENCE"
  | "MOCK_REFERENCE"
  | "FUTURE_EXTERNAL_KMS"
  | "FUTURE_EXTERNAL_HSM"
  | "FUTURE_MANAGED_SECRET_REFERENCE"
  | "FUTURE_SECRETS_MANAGER"
  | "FUTURE_KMS"
  | "FUTURE_ENCRYPTED_DB";

export type ZatcaSandboxCsidSchemaStatus = "METADATA_SCHEMA_VALID" | "METADATA_SCHEMA_INCOMPLETE";

export type ZatcaSandboxCsidRequestReadinessStatus =
  | "METADATA_ONLY_READY"
  | "BLOCKED_PENDING_APPROVAL"
  | "BLOCKED_NOT_CONFIGURED"
  | "BLOCKED_PRODUCTION";

export interface ZatcaSandboxCsidRequestSchemaInput {
  environment?: ZatcaSandboxCsidRequestEnvironment | string | null;
  egsUnitId?: string | null;
  organizationId?: string | null;
  csrReferenceAlias?: string | null;
  csrMetadataReference?: string | null;
  certificateRequestId?: string | null;
  otpRequired?: boolean | null;
  custodyProviderType?: ZatcaSandboxCsidCustodyProviderType | string | null;
  custodyReferenceAlias?: string | null;
  requestReadinessStatus?: ZatcaSandboxCsidRequestReadinessStatus | string | null;
  blockers?: string[] | null;
  warnings?: string[] | null;
}

export interface ZatcaSandboxCsidSafeRequestContractSummary {
  environment: ZatcaSandboxCsidRequestContractEnvironment;
  metadataOnly: true;
  noNetwork: true;
  noRequestBodyCreated: true;
  noResponseBodyProcessed: true;
  noOtpValueAccepted: true;
  noCsrBodyAccepted: true;
  allowedMetadataFields: readonly string[];
  forbiddenFieldNames: readonly string[];
  futureRequestShape: {
    method: "POST";
    endpointPath: "/compliance";
    bodyPolicy: "NOT_CREATED_IN_THIS_LANE";
    headerPolicy: "OTP_REQUIRED_LATER_BUT_NOT_ACCEPTED_HERE";
  };
}

export interface ZatcaSandboxCsidRequestSchemaPlan {
  localOnly: true;
  dryRun: true;
  metadataOnly: true;
  schemaOnly: true;
  ready: false;
  schemaStatus: ZatcaSandboxCsidSchemaStatus;
  requestReadinessStatus: "BLOCKED_PENDING_APPROVAL";
  executionStatus: "BLOCKED_NOT_IMPLEMENTED";
  environment: ZatcaSandboxCsidRequestContractEnvironment;
  organizationIdPresent: boolean;
  egsUnitIdPresent: boolean;
  csrMetadataPresent: boolean;
  certificateRequestIdPresent: boolean;
  custodyProviderType: ZatcaSandboxCsidCustodyProviderType;
  custodyReferenceAliasPresent: boolean;
  otpRequired: boolean;
  otpValueAccepted: false;
  noNetwork: true;
  noRequestBodyCreated: true;
  noResponseBodyProcessed: true;
  noOtpValueAccepted: true;
  noCsrBodyAccepted: true;
  noPrivateKeyAccepted: true;
  noCertificateBodyAccepted: true;
  noTokenBodyAccepted: true;
  noProviderPayloadAccepted: true;
  realRequestExecutionImplemented: false;
  realResponseProcessingImplemented: false;
  signingEnabled: false;
  clearanceReportingEnabled: false;
  pdfA3Enabled: false;
  productionCompliance: false;
  safeRequestContractSummary: ZatcaSandboxCsidSafeRequestContractSummary;
  missingMetadata: string[];
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export const ZATCA_SANDBOX_CSID_ALLOWED_METADATA_FIELDS = [
  "environment",
  "egsUnitId",
  "organizationId",
  "csrReferenceAlias",
  "csrMetadataReference",
  "certificateRequestId",
  "otpRequired",
  "custodyProviderType",
  "custodyReferenceAlias",
  "requestReadinessStatus",
  "blockers",
  "warnings",
] as const;

export const ZATCA_SANDBOX_CSID_FORBIDDEN_FIELD_NAMES = [
  "otp",
  "privateKey",
  "privateKeyPem",
  "rawPrivateKey",
  "csrPem",
  "rawCsr",
  "csrBody",
  "certificate",
  "certificatePem",
  "rawCertificate",
  "certificateBody",
  "binarySecurityToken",
  "binarySecurityTokenBody",
  "secret",
  "secretBody",
  "token",
  "tokenBody",
  "requestBody",
  "responseBody",
  "providerPayload",
  "signedXml",
  "qrPayload",
] as const;

const forbiddenKeyPattern = new RegExp(`^(${ZATCA_SANDBOX_CSID_FORBIDDEN_FIELD_NAMES.join("|")})$`, "i");
const forbiddenValuePattern =
  /-----BEGIN [A-Z ]+-----|<\?xml|<Invoice\b|<\w+:Invoice\b|binarySecurityToken\s*=|privateKey\s*=|rawPrivateKey\s*=|csrBody\s*=|certificateBody\s*=|secret\s*=|token\s*=|Bearer\s+[A-Za-z0-9._-]+|signedXml\s*=|qrPayload\s*=|requestBody\s*=|responseBody\s*=|providerPayload\s*=/i;

export function assertZatcaSandboxCsidRequestSchemaMetadataSafe(value: unknown, path = "metadata"): void {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "string") {
    if (forbiddenValuePattern.test(value)) {
      throw new Error(`Sensitive ZATCA sandbox CSID request material is not allowed in ${path}.`);
    }
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertZatcaSandboxCsidRequestSchemaMetadataSafe(item, `${path}[${index}]`));
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenKeyPattern.test(key)) {
      throw new Error(`Sensitive ZATCA sandbox CSID request material is not allowed in ${path}.${key}.`);
    }
    assertZatcaSandboxCsidRequestSchemaMetadataSafe(nestedValue, `${path}.${key}`);
  }
}

export function buildZatcaSandboxCsidRequestSchemaPlan(input: ZatcaSandboxCsidRequestSchemaInput): ZatcaSandboxCsidRequestSchemaPlan {
  assertZatcaSandboxCsidRequestSchemaMetadataSafe(input);

  const environment = normalizeEnvironment(input.environment);
  const organizationIdPresent = hasText(input.organizationId);
  const egsUnitIdPresent = hasText(input.egsUnitId);
  const csrMetadataPresent = hasText(input.csrReferenceAlias) || hasText(input.csrMetadataReference) || hasText(input.certificateRequestId);
  const certificateRequestIdPresent = hasText(input.certificateRequestId);
  const custodyProviderType = normalizeCustodyProvider(input.custodyProviderType);
  const custodyReferenceAliasPresent = hasText(input.custodyReferenceAlias);
  const otpRequired = input.otpRequired === true;
  const missingMetadata: string[] = [];
  const blockers = new Set<string>();
  const warnings = new Set<string>(input.warnings?.filter(hasText) ?? []);

  if (!organizationIdPresent) missingMetadata.push("organizationId");
  if (!egsUnitIdPresent) missingMetadata.push("egsUnitId");
  if (!csrMetadataPresent) missingMetadata.push("csr metadata reference");

  if (!organizationIdPresent) blockers.add("organizationId metadata is required");
  if (!egsUnitIdPresent) blockers.add("egsUnitId metadata is required");
  if (!csrMetadataPresent) blockers.add("CSR metadata reference or certificate request metadata is required");
  if (!otpRequired) blockers.add("OTP is required by the official sandbox compliance CSID flow, but OTP values are not accepted in this planner");
  if (environment === "BLOCKED_PRODUCTION") blockers.add("production CSID request planning is out of scope for the sandbox schema lane");
  if (custodyProviderType === "DISABLED") blockers.add("custody provider approval is required before real sandbox CSID response handling");
  if (!custodyReferenceAliasPresent) blockers.add("custody reference alias metadata is required before response custody dry-run");

  blockers.add("real sandbox OTP capture is not approved");
  blockers.add("real sandbox CSID request execution is not approved");
  blockers.add("real ZATCA network calls are disabled");
  blockers.add("real request body creation is not implemented");
  blockers.add("real response body processing is not implemented");

  for (const blocker of input.blockers?.filter(hasText) ?? []) {
    blockers.add(blocker);
  }

  warnings.add("Sandbox portal access remains manual and reference-only; credentials, OTP, CSID, and request/response bodies must not enter LedgerByte.");
  warnings.add("This planner models metadata only and must not be used as evidence of ZATCA production compliance.");

  return {
    localOnly: true,
    dryRun: true,
    metadataOnly: true,
    schemaOnly: true,
    ready: false,
    schemaStatus: missingMetadata.length === 0 ? "METADATA_SCHEMA_VALID" : "METADATA_SCHEMA_INCOMPLETE",
    requestReadinessStatus: "BLOCKED_PENDING_APPROVAL",
    executionStatus: "BLOCKED_NOT_IMPLEMENTED",
    environment,
    organizationIdPresent,
    egsUnitIdPresent,
    csrMetadataPresent,
    certificateRequestIdPresent,
    custodyProviderType,
    custodyReferenceAliasPresent,
    otpRequired,
    otpValueAccepted: false,
    noNetwork: true,
    noRequestBodyCreated: true,
    noResponseBodyProcessed: true,
    noOtpValueAccepted: true,
    noCsrBodyAccepted: true,
    noPrivateKeyAccepted: true,
    noCertificateBodyAccepted: true,
    noTokenBodyAccepted: true,
    noProviderPayloadAccepted: true,
    realRequestExecutionImplemented: false,
    realResponseProcessingImplemented: false,
    signingEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    productionCompliance: false,
    safeRequestContractSummary: {
      environment,
      metadataOnly: true,
      noNetwork: true,
      noRequestBodyCreated: true,
      noResponseBodyProcessed: true,
      noOtpValueAccepted: true,
      noCsrBodyAccepted: true,
      allowedMetadataFields: ZATCA_SANDBOX_CSID_ALLOWED_METADATA_FIELDS,
      forbiddenFieldNames: ZATCA_SANDBOX_CSID_FORBIDDEN_FIELD_NAMES,
      futureRequestShape: {
        method: "POST",
        endpointPath: "/compliance",
        bodyPolicy: "NOT_CREATED_IN_THIS_LANE",
        headerPolicy: "OTP_REQUIRED_LATER_BUT_NOT_ACCEPTED_HERE",
      },
    },
    missingMetadata,
    blockers: [...blockers],
    warnings: [...warnings],
    recommendedNextSteps: [
      "Keep this schema planner metadata-only until sandbox CSID request execution is separately approved.",
      "Approve manual sandbox OTP handling before any future request execution lane.",
      "Use custody provider references only; never store CSR, OTP, token, secret, certificate, request, or response bodies in normal application tables.",
      "Keep production CSID onboarding, signing, clearance/reporting, PDF-A-3, and production compliance claims blocked.",
    ],
  };
}

function normalizeEnvironment(value: string | null | undefined): ZatcaSandboxCsidRequestContractEnvironment {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "PRODUCTION") return "BLOCKED_PRODUCTION";
  if (normalized === "SIMULATION") return "SIMULATION";
  return "SANDBOX";
}

function normalizeCustodyProvider(value: string | null | undefined): ZatcaSandboxCsidCustodyProviderType {
  const normalized = value?.trim().toUpperCase().replace(/[-\s]/g, "_");
  switch (normalized) {
    case "LOCAL_REFERENCE":
      return "LOCAL_REFERENCE";
    case "MOCK_REFERENCE":
      return "MOCK_REFERENCE";
    case "FUTURE_EXTERNAL_KMS":
    case "EXTERNAL_KMS":
      return "FUTURE_EXTERNAL_KMS";
    case "FUTURE_EXTERNAL_HSM":
    case "EXTERNAL_HSM":
      return "FUTURE_EXTERNAL_HSM";
    case "FUTURE_MANAGED_SECRET_REFERENCE":
    case "MANAGED_SECRET_REFERENCE":
      return "FUTURE_MANAGED_SECRET_REFERENCE";
    case "FUTURE_SECRETS_MANAGER":
    case "SECRETS_MANAGER":
      return "FUTURE_SECRETS_MANAGER";
    case "FUTURE_KMS":
    case "KMS":
      return "FUTURE_KMS";
    case "FUTURE_ENCRYPTED_DB":
    case "ENCRYPTED_DB":
      return "FUTURE_ENCRYPTED_DB";
    default:
      return "DISABLED";
  }
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
