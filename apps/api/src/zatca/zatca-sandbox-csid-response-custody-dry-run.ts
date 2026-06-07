export type ZatcaSandboxCsidResponseCustodyEnvironment = "SANDBOX" | "SIMULATION" | "PRODUCTION";

export type ZatcaSandboxCsidResponseCustodyContractEnvironment = "SANDBOX" | "SIMULATION" | "BLOCKED_PRODUCTION";

export type ZatcaSandboxCsidResponseCustodyProviderType =
  | "DISABLED"
  | "LOCAL_REFERENCE"
  | "MOCK_REFERENCE"
  | "FUTURE_EXTERNAL_KMS"
  | "FUTURE_EXTERNAL_HSM"
  | "FUTURE_MANAGED_SECRET_REFERENCE"
  | "FUTURE_SECRETS_MANAGER"
  | "FUTURE_KMS"
  | "FUTURE_ENCRYPTED_DB";

export type ZatcaSandboxCsidResponseCustodySchemaStatus = "METADATA_SCHEMA_VALID" | "METADATA_SCHEMA_INCOMPLETE";

export type ZatcaSandboxCsidResponseCustodyReadinessStatus =
  | "METADATA_ONLY_READY"
  | "BLOCKED_PENDING_APPROVAL"
  | "BLOCKED_NOT_CONFIGURED"
  | "BLOCKED_PRODUCTION";

export interface ZatcaSandboxCsidResponseCustodyDryRunInput {
  environment?: ZatcaSandboxCsidResponseCustodyEnvironment | string | null;
  egsUnitId?: string | null;
  organizationId?: string | null;
  requestReferenceAlias?: string | null;
  custodyProviderType?: ZatcaSandboxCsidResponseCustodyProviderType | string | null;
  custodyReferenceAlias?: string | null;
  certificateRequestId?: string | null;
  hasBinarySecurityToken?: boolean | null;
  hasSecret?: boolean | null;
  hasCertificate?: boolean | null;
  certificateFingerprint?: string | null;
  certificateSerialNumber?: string | null;
  certificateIssuer?: string | null;
  certificateSubject?: string | null;
  certificateExpiresAt?: string | null;
  responseCustodyReadinessStatus?: ZatcaSandboxCsidResponseCustodyReadinessStatus | string | null;
  blockers?: string[] | null;
  warnings?: string[] | null;
}

export interface ZatcaSandboxCsidSafeResponseCustodyContractSummary {
  environment: ZatcaSandboxCsidResponseCustodyContractEnvironment;
  metadataOnly: true;
  noNetwork: true;
  noRequestBodyCreated: true;
  noResponseBodyProcessed: true;
  noSecretMaterialPersisted: true;
  allowedMetadataFields: readonly string[];
  forbiddenFieldNames: readonly string[];
  futureCustodyShape: {
    tokenPolicy: "BOOLEAN_ONLY_NO_BODY";
    secretPolicy: "BOOLEAN_ONLY_NO_BODY";
    certificatePolicy: "METADATA_ONLY_NO_CERTIFICATE_BODY";
    providerPayloadPolicy: "NOT_ACCEPTED_IN_THIS_LANE";
    storagePolicy: "REFERENCE_ONLY_FUTURE_APPROVAL_REQUIRED";
  };
}

export interface ZatcaSandboxCsidResponseCustodyDryRunPlan {
  localOnly: true;
  dryRun: true;
  metadataOnly: true;
  custodyDryRunOnly: true;
  ready: false;
  schemaStatus: ZatcaSandboxCsidResponseCustodySchemaStatus;
  responseCustodyReadinessStatus: "BLOCKED_PENDING_APPROVAL";
  executionStatus: "BLOCKED_NOT_IMPLEMENTED";
  environment: ZatcaSandboxCsidResponseCustodyContractEnvironment;
  organizationIdPresent: boolean;
  egsUnitIdPresent: boolean;
  requestReferenceAliasPresent: boolean;
  custodyReferenceAliasPresent: boolean;
  certificateRequestIdPresent: boolean;
  custodyProviderType: ZatcaSandboxCsidResponseCustodyProviderType;
  hasBinarySecurityToken: boolean;
  hasSecret: boolean;
  hasCertificate: boolean;
  certificateMetadataPresent: boolean;
  noNetwork: true;
  noRequestBodyCreated: true;
  noResponseBodyProcessed: true;
  noSecretMaterialPersisted: true;
  noOtpValueAccepted: true;
  noCsrBodyAccepted: true;
  noPrivateKeyAccepted: true;
  noCertificateBodyAccepted: true;
  noTokenBodyAccepted: true;
  noProviderPayloadAccepted: true;
  realResponseCustodyImplemented: false;
  realRequestExecutionImplemented: false;
  realResponseProcessingImplemented: false;
  signingEnabled: false;
  clearanceReportingEnabled: false;
  pdfA3Enabled: false;
  productionCompliance: false;
  safeCustodyContractSummary: ZatcaSandboxCsidSafeResponseCustodyContractSummary;
  missingMetadata: string[];
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export const ZATCA_SANDBOX_CSID_RESPONSE_CUSTODY_ALLOWED_METADATA_FIELDS = [
  "environment",
  "egsUnitId",
  "organizationId",
  "requestReferenceAlias",
  "custodyProviderType",
  "custodyReferenceAlias",
  "certificateRequestId",
  "hasBinarySecurityToken",
  "hasSecret",
  "hasCertificate",
  "certificateFingerprint",
  "certificateSerialNumber",
  "certificateIssuer",
  "certificateSubject",
  "certificateExpiresAt",
  "responseCustodyReadinessStatus",
  "blockers",
  "warnings",
] as const;

export const ZATCA_SANDBOX_CSID_RESPONSE_CUSTODY_FORBIDDEN_FIELD_NAMES = [
  "otp",
  "privateKey",
  "privateKeyPem",
  "rawPrivateKey",
  "csrPem",
  "rawCsr",
  "csrBody",
  "rawCsid",
  "complianceCsidPem",
  "productionCsidPem",
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

const forbiddenKeyPattern = new RegExp(`^(${ZATCA_SANDBOX_CSID_RESPONSE_CUSTODY_FORBIDDEN_FIELD_NAMES.join("|")})$`, "i");
const forbiddenValuePattern =
  /-----BEGIN [A-Z ]+-----|<\?xml|<Invoice\b|<\w+:Invoice\b|binarySecurityToken\s*=|privateKey\s*=|rawPrivateKey\s*=|csrBody\s*=|rawCsr\s*=|rawCsid\s*=|certificateBody\s*=|rawCertificate\s*=|secret\s*=|token\s*=|Bearer\s+[A-Za-z0-9._-]+|signedXml\s*=|qrPayload\s*=|requestBody\s*=|responseBody\s*=|providerPayload\s*=/i;

export function assertZatcaSandboxCsidResponseCustodyMetadataSafe(value: unknown, path = "metadata"): void {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "string") {
    if (forbiddenValuePattern.test(value)) {
      throw new Error(`Sensitive ZATCA sandbox CSID response custody material is not allowed in ${path}.`);
    }
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertZatcaSandboxCsidResponseCustodyMetadataSafe(item, `${path}[${index}]`));
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenKeyPattern.test(key)) {
      throw new Error(`Sensitive ZATCA sandbox CSID response custody material is not allowed in ${path}.${key}.`);
    }
    assertZatcaSandboxCsidResponseCustodyMetadataSafe(nestedValue, `${path}.${key}`);
  }
}

export function buildZatcaSandboxCsidResponseCustodyDryRunPlan(
  input: ZatcaSandboxCsidResponseCustodyDryRunInput,
): ZatcaSandboxCsidResponseCustodyDryRunPlan {
  assertZatcaSandboxCsidResponseCustodyMetadataSafe(input);

  const environment = normalizeEnvironment(input.environment);
  const organizationIdPresent = hasText(input.organizationId);
  const egsUnitIdPresent = hasText(input.egsUnitId);
  const requestReferenceAliasPresent = hasText(input.requestReferenceAlias);
  const custodyReferenceAliasPresent = hasText(input.custodyReferenceAlias);
  const certificateRequestIdPresent = hasText(input.certificateRequestId);
  const custodyProviderType = normalizeCustodyProvider(input.custodyProviderType);
  const hasBinarySecurityToken = input.hasBinarySecurityToken === true;
  const hasSecret = input.hasSecret === true;
  const hasCertificate = input.hasCertificate === true;
  const certificateMetadataPresent =
    hasText(input.certificateFingerprint) ||
    hasText(input.certificateSerialNumber) ||
    hasText(input.certificateIssuer) ||
    hasText(input.certificateSubject) ||
    hasText(input.certificateExpiresAt);
  const missingMetadata: string[] = [];
  const blockers = new Set<string>();
  const warnings = new Set<string>(input.warnings?.filter(hasText) ?? []);

  if (!organizationIdPresent) missingMetadata.push("organizationId");
  if (!egsUnitIdPresent) missingMetadata.push("egsUnitId");
  if (!requestReferenceAliasPresent) missingMetadata.push("requestReferenceAlias");
  if (!custodyReferenceAliasPresent) missingMetadata.push("custodyReferenceAlias");

  if (!organizationIdPresent) blockers.add("organizationId metadata is required");
  if (!egsUnitIdPresent) blockers.add("egsUnitId metadata is required");
  if (!requestReferenceAliasPresent) blockers.add("sandbox CSID request reference alias metadata is required");
  if (!custodyReferenceAliasPresent) blockers.add("custody reference alias metadata is required");
  if (!hasBinarySecurityToken && !hasSecret && !hasCertificate) {
    blockers.add("response material presence metadata is required as booleans only");
  }
  if (hasCertificate && !certificateMetadataPresent) {
    blockers.add("certificate metadata is required as fingerprint, serial, issuer, subject, or expiry only");
  }
  if (environment === "BLOCKED_PRODUCTION") blockers.add("production CSID response custody planning is out of scope for the sandbox dry-run lane");
  if (custodyProviderType === "DISABLED") blockers.add("custody provider approval is required before real sandbox CSID response custody");

  blockers.add("real sandbox CSID response-body processing is not approved");
  blockers.add("real sandbox CSID response custody is not implemented");
  blockers.add("real ZATCA network calls are disabled");
  blockers.add("real request body creation is not implemented");
  blockers.add("real response body processing is not implemented");
  blockers.add("secret material persistence is not implemented");

  for (const blocker of input.blockers?.filter(hasText) ?? []) {
    blockers.add(blocker);
  }

  warnings.add("Sandbox portal access remains manual and reference-only; credentials, OTP, CSID, and request/response bodies must not enter LedgerByte.");
  warnings.add("This custody dry-run models response metadata only and must not be used as evidence of ZATCA production compliance.");

  return {
    localOnly: true,
    dryRun: true,
    metadataOnly: true,
    custodyDryRunOnly: true,
    ready: false,
    schemaStatus: missingMetadata.length === 0 ? "METADATA_SCHEMA_VALID" : "METADATA_SCHEMA_INCOMPLETE",
    responseCustodyReadinessStatus: "BLOCKED_PENDING_APPROVAL",
    executionStatus: "BLOCKED_NOT_IMPLEMENTED",
    environment,
    organizationIdPresent,
    egsUnitIdPresent,
    requestReferenceAliasPresent,
    custodyReferenceAliasPresent,
    certificateRequestIdPresent,
    custodyProviderType,
    hasBinarySecurityToken,
    hasSecret,
    hasCertificate,
    certificateMetadataPresent,
    noNetwork: true,
    noRequestBodyCreated: true,
    noResponseBodyProcessed: true,
    noSecretMaterialPersisted: true,
    noOtpValueAccepted: true,
    noCsrBodyAccepted: true,
    noPrivateKeyAccepted: true,
    noCertificateBodyAccepted: true,
    noTokenBodyAccepted: true,
    noProviderPayloadAccepted: true,
    realResponseCustodyImplemented: false,
    realRequestExecutionImplemented: false,
    realResponseProcessingImplemented: false,
    signingEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    productionCompliance: false,
    safeCustodyContractSummary: {
      environment,
      metadataOnly: true,
      noNetwork: true,
      noRequestBodyCreated: true,
      noResponseBodyProcessed: true,
      noSecretMaterialPersisted: true,
      allowedMetadataFields: ZATCA_SANDBOX_CSID_RESPONSE_CUSTODY_ALLOWED_METADATA_FIELDS,
      forbiddenFieldNames: ZATCA_SANDBOX_CSID_RESPONSE_CUSTODY_FORBIDDEN_FIELD_NAMES,
      futureCustodyShape: {
        tokenPolicy: "BOOLEAN_ONLY_NO_BODY",
        secretPolicy: "BOOLEAN_ONLY_NO_BODY",
        certificatePolicy: "METADATA_ONLY_NO_CERTIFICATE_BODY",
        providerPayloadPolicy: "NOT_ACCEPTED_IN_THIS_LANE",
        storagePolicy: "REFERENCE_ONLY_FUTURE_APPROVAL_REQUIRED",
      },
    },
    missingMetadata,
    blockers: [...blockers],
    warnings: [...warnings],
    recommendedNextSteps: [
      "Keep response custody dry-run metadata-only until sandbox CSID response processing is separately approved.",
      "Approve a real custody provider boundary before receiving or storing any sandbox token, secret, or certificate body.",
      "Use reference aliases and certificate metadata only; never store response bodies in normal application tables.",
      "Keep production CSID onboarding, signing, clearance/reporting, PDF-A-3, and production compliance claims blocked.",
    ],
  };
}

function normalizeEnvironment(value: string | null | undefined): ZatcaSandboxCsidResponseCustodyContractEnvironment {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "PRODUCTION") return "BLOCKED_PRODUCTION";
  if (normalized === "SIMULATION") return "SIMULATION";
  return "SANDBOX";
}

function normalizeCustodyProvider(value: string | null | undefined): ZatcaSandboxCsidResponseCustodyProviderType {
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
